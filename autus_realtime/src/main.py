"""
AUTUS Realtime API Server
=========================
FastAPI + WebSocket

엔드포인트:
- GET /health: 헬스 체크
- GET /state: 현재 상태
- POST /state/init: 상태 초기화
- WS /ws: 실시간 WebSocket

WS 프로토콜:
- STATE_SNAPSHOT: 접속 직후 1회
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- STATE_PATCH: 서버 → UI (델타)
"""

from datetime import datetime
import json
import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import STATE_PATH, AUDIT_PATH, HOST, PORT
from .state_store import StateStore, RealtimeState
from .audit import append_audit
from .services.predictor import PredictorService, PredictorIO
from .engine.baselines import compute_person_baseline_v12
from .ingest.csv_reader import load_money_normalized, load_burn_normalized


# ═══════════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════════

APP = FastAPI(
    title="AUTUS Realtime",
    description="SehoOS EP10 - Real-time Physics Map",
    version="0.1.0"
)

# CORS
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State Store
state_store = StateStore(STATE_PATH)

# Predictor Service
predictor = PredictorService(audit_path=AUDIT_PATH)


# ═══════════════════════════════════════════════════════════════════════════
# REST Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@APP.get("/health")
def health():
    """헬스 체크"""
    return {"ok": True, "ts": datetime.now().isoformat()}


@APP.get("/state")
def get_state():
    """현재 상태 조회"""
    st = state_store.get() or state_store.load()
    if st is None:
        return JSONResponse({"error": "state_not_initialized"}, status_code=404)
    return st.__dict__


@APP.post("/state/init")
def init_state():
    """
    상태 초기화
    - CSV 로드
    - Baseline 계산
    - Top 5 팀 선정
    """
    # 정규화된 데이터 로드
    money = load_money_normalized()
    burn = load_burn_normalized()
    
    if len(money) == 0:
        return JSONResponse({"error": "no_money_events"}, status_code=400)
    
    # tag_count 추가
    money_exp = money.copy()
    money_exp["tag_count"] = money_exp["people_tags"].apply(
        lambda s: len([t for t in str(s).split(";") if t.strip()])
    )
    
    # Baseline 계산
    baseline = compute_person_baseline_v12(money_exp, min_events=1)
    
    if len(baseline) == 0:
        return JSONResponse({"error": "no_baseline"}, status_code=400)
    
    # Top 5 팀 선정
    top = baseline.sort_values("base_rate_per_min", ascending=False).head(5)["person_id"].tolist()
    
    # 노드 생성 (위치는 기본값)
    nodes = {}
    for pid in baseline["person_id"].tolist():
        row = baseline[baseline["person_id"] == pid].iloc[0]
        nodes[pid] = {
            "lat": 37.50,
            "lng": 127.02,
            "money_label": float(row["base_rate_per_min"])
        }
    
    # 상태 저장
    st = RealtimeState(
        current_team=top,
        nodes=nodes,
        last_kpi={
            "net_7d_pred": 0.0,
            "entropy_7d_pred": 0.0,
            "velocity_7d_pred": 0.0,
            "best_team_score_pred": 0.0
        },
        meta={
            "industry_id": "GENERIC",
            "customer_id": "CUST-001",
            "project_id": "PROJ-ALPHA"
        }
    )
    state_store.save(st)
    
    append_audit(AUDIT_PATH, {"type": "StateInit", "team": top})
    
    return {"ok": True, "current_team": top, "node_count": len(nodes)}


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket
# ═══════════════════════════════════════════════════════════════════════════

@APP.websocket("/ws")
async def ws(ws: WebSocket):
    """
    실시간 WebSocket
    
    프로토콜:
    1. 접속 → STATE_SNAPSHOT 전송
    2. INPUT_APPLY 수신 → PREDICT_RESULT 반환
    """
    await ws.accept()
    
    # 상태 로드
    st = state_store.get() or state_store.load()
    if st is None:
        await ws.send_text(json.dumps({
            "type": "ERROR",
            "ts": datetime.now().isoformat(),
            "payload": {"error": "state_not_initialized"}
        }))
        await ws.close()
        return
    
    # 1. STATE_SNAPSHOT 전송 (1회)
    snapshot = {
        "type": "STATE_SNAPSHOT",
        "ts": datetime.now().isoformat(),
        "payload": {
            "map": {
                "nodes": [
                    {"person_id": pid, **st.nodes[pid]}
                    for pid in st.nodes
                ]
            },
            "kpi": {
                **st.last_kpi,
                "best_team": st.current_team
            },
            "meta": st.meta,
        },
    }
    await ws.send_text(json.dumps(snapshot, ensure_ascii=False))
    
    append_audit(AUDIT_PATH, {"type": "WSConnect", "snapshot_sent": True})
    
    # 데이터 프리로드 (v0)
    money = load_money_normalized()
    burn = load_burn_normalized()
    
    money_exp = money.copy()
    money_exp["tag_count"] = money_exp["people_tags"].apply(
        lambda s: len([t for t in str(s).split(";") if t.strip()])
    )
    baseline = compute_person_baseline_v12(money_exp, min_events=1)
    
    io = PredictorIO(money=money, burn=burn, baseline=baseline)
    
    # 2. 메시지 수신 루프
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            
            if msg.get("type") != "INPUT_APPLY":
                # 다른 메시지 타입은 무시
                continue
            
            input_payload = msg.get("payload", {})
            
            # 예측 실행
            result = predictor.predict_after_input(st, io, input_payload)
            
            # SWAP 적용시 팀 업데이트
            if input_payload.get("input_type") == "SWAP":
                st.current_team = result["kpi"]["best_team"]
            
            # KPI 업데이트
            st.last_kpi = {
                k: result["kpi"][k]
                for k in ["net_7d_pred", "entropy_7d_pred", "velocity_7d_pred", "best_team_score_pred"]
            }
            state_store.save(st)
            
            # PREDICT_RESULT 전송
            out = {
                "type": "PREDICT_RESULT",
                "ts": datetime.now().isoformat(),
                "payload": result
            }
            await ws.send_text(json.dumps(out, ensure_ascii=False))
    
    except WebSocketDisconnect:
        append_audit(AUDIT_PATH, {"type": "WSDisconnect"})


# ═══════════════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:APP", host=HOST, port=PORT, reload=True)












"""
AUTUS Realtime API Server
=========================
FastAPI + WebSocket

엔드포인트:
- GET /health: 헬스 체크
- GET /state: 현재 상태
- POST /state/init: 상태 초기화
- WS /ws: 실시간 WebSocket

WS 프로토콜:
- STATE_SNAPSHOT: 접속 직후 1회
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- STATE_PATCH: 서버 → UI (델타)
"""

from datetime import datetime
import json
import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import STATE_PATH, AUDIT_PATH, HOST, PORT
from .state_store import StateStore, RealtimeState
from .audit import append_audit
from .services.predictor import PredictorService, PredictorIO
from .engine.baselines import compute_person_baseline_v12
from .ingest.csv_reader import load_money_normalized, load_burn_normalized


# ═══════════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════════

APP = FastAPI(
    title="AUTUS Realtime",
    description="SehoOS EP10 - Real-time Physics Map",
    version="0.1.0"
)

# CORS
APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State Store
state_store = StateStore(STATE_PATH)

# Predictor Service
predictor = PredictorService(audit_path=AUDIT_PATH)


# ═══════════════════════════════════════════════════════════════════════════
# REST Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@APP.get("/health")
def health():
    """헬스 체크"""
    return {"ok": True, "ts": datetime.now().isoformat()}


@APP.get("/state")
def get_state():
    """현재 상태 조회"""
    st = state_store.get() or state_store.load()
    if st is None:
        return JSONResponse({"error": "state_not_initialized"}, status_code=404)
    return st.__dict__


@APP.post("/state/init")
def init_state():
    """
    상태 초기화
    - CSV 로드
    - Baseline 계산
    - Top 5 팀 선정
    """
    # 정규화된 데이터 로드
    money = load_money_normalized()
    burn = load_burn_normalized()
    
    if len(money) == 0:
        return JSONResponse({"error": "no_money_events"}, status_code=400)
    
    # tag_count 추가
    money_exp = money.copy()
    money_exp["tag_count"] = money_exp["people_tags"].apply(
        lambda s: len([t for t in str(s).split(";") if t.strip()])
    )
    
    # Baseline 계산
    baseline = compute_person_baseline_v12(money_exp, min_events=1)
    
    if len(baseline) == 0:
        return JSONResponse({"error": "no_baseline"}, status_code=400)
    
    # Top 5 팀 선정
    top = baseline.sort_values("base_rate_per_min", ascending=False).head(5)["person_id"].tolist()
    
    # 노드 생성 (위치는 기본값)
    nodes = {}
    for pid in baseline["person_id"].tolist():
        row = baseline[baseline["person_id"] == pid].iloc[0]
        nodes[pid] = {
            "lat": 37.50,
            "lng": 127.02,
            "money_label": float(row["base_rate_per_min"])
        }
    
    # 상태 저장
    st = RealtimeState(
        current_team=top,
        nodes=nodes,
        last_kpi={
            "net_7d_pred": 0.0,
            "entropy_7d_pred": 0.0,
            "velocity_7d_pred": 0.0,
            "best_team_score_pred": 0.0
        },
        meta={
            "industry_id": "GENERIC",
            "customer_id": "CUST-001",
            "project_id": "PROJ-ALPHA"
        }
    )
    state_store.save(st)
    
    append_audit(AUDIT_PATH, {"type": "StateInit", "team": top})
    
    return {"ok": True, "current_team": top, "node_count": len(nodes)}


# ═══════════════════════════════════════════════════════════════════════════
# WebSocket
# ═══════════════════════════════════════════════════════════════════════════

@APP.websocket("/ws")
async def ws(ws: WebSocket):
    """
    실시간 WebSocket
    
    프로토콜:
    1. 접속 → STATE_SNAPSHOT 전송
    2. INPUT_APPLY 수신 → PREDICT_RESULT 반환
    """
    await ws.accept()
    
    # 상태 로드
    st = state_store.get() or state_store.load()
    if st is None:
        await ws.send_text(json.dumps({
            "type": "ERROR",
            "ts": datetime.now().isoformat(),
            "payload": {"error": "state_not_initialized"}
        }))
        await ws.close()
        return
    
    # 1. STATE_SNAPSHOT 전송 (1회)
    snapshot = {
        "type": "STATE_SNAPSHOT",
        "ts": datetime.now().isoformat(),
        "payload": {
            "map": {
                "nodes": [
                    {"person_id": pid, **st.nodes[pid]}
                    for pid in st.nodes
                ]
            },
            "kpi": {
                **st.last_kpi,
                "best_team": st.current_team
            },
            "meta": st.meta,
        },
    }
    await ws.send_text(json.dumps(snapshot, ensure_ascii=False))
    
    append_audit(AUDIT_PATH, {"type": "WSConnect", "snapshot_sent": True})
    
    # 데이터 프리로드 (v0)
    money = load_money_normalized()
    burn = load_burn_normalized()
    
    money_exp = money.copy()
    money_exp["tag_count"] = money_exp["people_tags"].apply(
        lambda s: len([t for t in str(s).split(";") if t.strip()])
    )
    baseline = compute_person_baseline_v12(money_exp, min_events=1)
    
    io = PredictorIO(money=money, burn=burn, baseline=baseline)
    
    # 2. 메시지 수신 루프
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            
            if msg.get("type") != "INPUT_APPLY":
                # 다른 메시지 타입은 무시
                continue
            
            input_payload = msg.get("payload", {})
            
            # 예측 실행
            result = predictor.predict_after_input(st, io, input_payload)
            
            # SWAP 적용시 팀 업데이트
            if input_payload.get("input_type") == "SWAP":
                st.current_team = result["kpi"]["best_team"]
            
            # KPI 업데이트
            st.last_kpi = {
                k: result["kpi"][k]
                for k in ["net_7d_pred", "entropy_7d_pred", "velocity_7d_pred", "best_team_score_pred"]
            }
            state_store.save(st)
            
            # PREDICT_RESULT 전송
            out = {
                "type": "PREDICT_RESULT",
                "ts": datetime.now().isoformat(),
                "payload": result
            }
            await ws.send_text(json.dumps(out, ensure_ascii=False))
    
    except WebSocketDisconnect:
        append_audit(AUDIT_PATH, {"type": "WSDisconnect"})


# ═══════════════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:APP", host=HOST, port=PORT, reload=True)


















