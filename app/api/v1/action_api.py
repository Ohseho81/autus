"""
AUTUS Action API
ACTION 실행 → AUDIT 생성
되돌릴 수 없는 기록 생성 행위
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid
import sqlite3
import json
import os

router = APIRouter(prefix="/api/v1/action", tags=["action"])

DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")


def get_db():
    """SQLite 연결"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_audit_table():
    """Audit 테이블 초기화 (수정/삭제 불가 구조)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Audit 테이블 생성
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit (
            audit_id        TEXT PRIMARY KEY,
            entity_type     TEXT NOT NULL,
            entity_id       TEXT NOT NULL,
            snapshot        TEXT NOT NULL,
            created_at      TEXT DEFAULT (datetime('now')),
            immutable       INTEGER DEFAULT 1
        )
    """)
    
    # 인덱스
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_audit_created 
        ON audit(created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_audit_entity 
        ON audit(entity_type, entity_id)
    """)
    
    conn.commit()
    conn.close()


# 서버 시작 시 테이블 초기화
init_audit_table()


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION EXECUTE — 핵심 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/execute")
async def execute_action(payload: dict):
    """
    ACTION 실행 → AUDIT 1건 생성
    
    - 성공/실패만 반환
    - 메시지, 설명, 되돌리기 ❌
    - DB row 생성 = 물리적 기록
    """
    action = payload.get("action")
    
    if not action:
        raise HTTPException(status_code=400, detail="ACTION_REQUIRED")
    
    # 허용된 ACTION만
    allowed_actions = ["RECOVER", "DEFRICTION", "SHOCK_DAMP", "LOCK", "HOLD", "REJECT"]
    if action not in allowed_actions:
        raise HTTPException(status_code=400, detail="ACTION_NOT_ALLOWED")
    
    # SYSTEM_RED 체크
    system_state = payload.get("system_state", "GREEN")
    if system_state == "RED":
        raise HTTPException(status_code=403, detail="SYSTEM_RED_BLOCKED")
    
    # Audit ID 생성
    audit_id = f"AUD-{uuid.uuid4().hex[:12].upper()}"
    
    # 스냅샷 생성
    snapshot = {
        "action": action,
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "system_state": system_state,
        "risk": payload.get("risk"),
        "entropy": payload.get("entropy"),
        "person_id": payload.get("person_id"),
        "commit_id": payload.get("commit_id"),
        "source": "UI",
        "immutable": True
    }
    
    # DB INSERT
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO audit (audit_id, entity_type, entity_id, snapshot, immutable)
            VALUES (?, 'action', ?, ?, 1)
        """, (audit_id, action, json.dumps(snapshot)))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AUDIT_WRITE_FAILED: {str(e)}")
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # Slack 알림 (비동기, 실패해도 ACTION은 성공)
    # ═══════════════════════════════════════════════════════════════════════════════
    try:
        from app.integrations.slack import notify_action_executed, SLACK_ENABLED
        if SLACK_ENABLED:
            import asyncio
            asyncio.create_task(notify_action_executed(
                action=action,
                audit_id=audit_id,
                risk=payload.get("risk", 0),
                system_state=system_state,
                person_id=payload.get("person_id"),
            ))
    except Exception as slack_err:
        # Slack 실패해도 ACTION은 성공
        import logging
        logging.getLogger("autus").warning(f"[Slack] Notification failed: {slack_err}")
    
    return {
        "audit_id": audit_id,
        "locked": True,
        "action": action,
        "timestamp": snapshot["executed_at"]
    }


@router.get("/allowed")
async def get_allowed_actions():
    """허용된 ACTION 목록"""
    return {
        "actions": [
            {"key": "RECOVER", "label": "회복", "description": "Recovery 개선"},
            {"key": "DEFRICTION", "label": "비효율 제거", "description": "Friction 감소"},
            {"key": "SHOCK_DAMP", "label": "충격 완화", "description": "Shock 흡수"},
            {"key": "LOCK", "label": "잠금", "description": "Commit 고정"},
            {"key": "HOLD", "label": "보류", "description": "결정 보류"},
            {"key": "REJECT", "label": "거부", "description": "Commit 거부"}
        ]
    }


@router.get("/history")
async def get_action_history(limit: int = 10):
    """ACTION 실행 이력"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT audit_id, entity_id as action, snapshot, created_at
        FROM audit
        WHERE entity_type = 'action'
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "history": [
            {
                "audit_id": row["audit_id"],
                "action": row["action"],
                "snapshot": json.loads(row["snapshot"]),
                "created_at": row["created_at"]
            }
            for row in rows
        ]
    }


@router.get("/count")
async def get_action_count():
    """총 ACTION 실행 횟수"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) as total FROM audit WHERE entity_type = 'action'
    """)
    
    result = cursor.fetchone()
    conn.close()
    
    return {"total": result["total"]}
