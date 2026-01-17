"""
AUTUS 하이브리드 LangGraph 노드
==============================

TypeDB + Pinecone + DeepSeek-R1/Llama 3.3 통합

아키텍처:
```
사용자 명령 → LangGraph Orchestration
              ↓
Analyzer → TypeDB (복잡 관계·상수·계수 쿼리)
              ↓
Retrieval → Pinecone (벡터 검색: 릴리스 노트·샘플 텍스트 임베딩)
              ↓
Checker/Safety Guard → TypeDB symbolic inference + Pinecone cosine sim
              ↓
Updater → Canary (Vercel) + TypeDB 메트릭 업데이트
              ↓
Reporter → TypeDB 규칙 기반 상수 재계산 + Pinecone freshness 확인
```
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, TypedDict
from enum import Enum

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 하이브리드 상태 정의
# ═══════════════════════════════════════════════════════════════════════════════

class HybridState(TypedDict, total=False):
    """하이브리드 LangGraph 상태"""
    # 기본
    user_id: str
    goal: str
    messages: list[str]
    
    # TypeDB 결과
    typedb_coefficients: dict
    typedb_breaking_techs: list[str]
    typedb_risk_inference: dict
    
    # Pinecone 결과
    pinecone_matches: list[dict]
    pinecone_similarity: float
    
    # LLM 결과
    llm_analysis: str
    llm_prediction: dict
    
    # Safety
    safety_route: str
    safety_details: dict
    
    # 최종
    final_report: str
    success: bool


# ═══════════════════════════════════════════════════════════════════════════════
# 하이브리드 노드
# ═══════════════════════════════════════════════════════════════════════════════

def typedb_coefficient_node(state: HybridState) -> dict:
    """
    TypeDB 계수 조회 노드
    
    1-12-144 그래프에서 사용자 계수 계산
    """
    from .typedb_client import TypeDBClient
    
    logger.info("📊 TypeDB 계수 조회 노드 실행")
    
    client = TypeDBClient()
    client.connect()
    
    user_id = state.get("user_id", "user_ohseho_001")
    coefficients = client.query_user_coefficients(user_id)
    
    # 고위험 기술 조회
    high_risk_techs = client.query_high_risk_technologies()
    breaking_techs = [t["tech_name"] for t in high_risk_techs]
    
    # Inertia Debt Rolling Average
    inertia_avg = client.query_inertia_debt_rolling_average(user_id)
    
    client.close()
    
    return {
        "typedb_coefficients": {
            **coefficients,
            "inertia_debt_avg": inertia_avg,
        },
        "typedb_breaking_techs": breaking_techs,
        "messages": state.get("messages", []) + ["TypeDB 계수 조회 완료"],
    }


def pinecone_retrieval_node(state: HybridState) -> dict:
    """
    Pinecone 벡터 검색 노드
    
    릴리스 노트, 기술 문서 검색
    """
    from .pinecone_client import PineconeClient
    
    logger.info("🔍 Pinecone 벡터 검색 노드 실행")
    
    client = PineconeClient()
    client.connect()
    
    goal = state.get("goal", "")
    
    # 목표를 임베딩으로 변환 (실제로는 OpenAI/Claude 임베딩)
    # 여기서는 간단한 해시 기반 벡터 사용
    query_embedding = _generate_mock_embedding(goal)
    
    # 릴리스 노트 검색
    matches = client.search_release_notes(
        query_embedding=query_embedding,
        top_k=5,
    )
    
    # Behavior Drift 체크 (이전 기준선과 비교)
    drift_result = client.check_behavior_drift(
        model="gpt-4o-mini",
        input_hash=_hash_text(goal)[:8],
        new_embedding=query_embedding,
    )
    
    return {
        "pinecone_matches": matches,
        "pinecone_similarity": drift_result.get("similarity", 1.0),
        "messages": state.get("messages", []) + ["Pinecone 검색 완료"],
    }


def llm_analysis_node(state: HybridState) -> dict:
    """
    LLM 분석 노드
    
    DeepSeek-R1 (reasoning) 또는 Llama 3.3 (instruction) 선택
    """
    from .llm_selector import LLMSelector, TaskType
    
    logger.info("🤖 LLM 분석 노드 실행")
    
    selector = LLMSelector()
    
    # TypeDB 결과를 기반으로 분석 프롬프트 구성
    coefficients = state.get("typedb_coefficients", {})
    breaking_techs = state.get("typedb_breaking_techs", [])
    pinecone_matches = state.get("pinecone_matches", [])
    
    prompt = f"""
AUTUS 분석 요청:

목표: {state.get("goal", "")}

사용자 계수:
- 연결 밀도: {coefficients.get("connectivity_density", 0):.2%}
- 영향력: {coefficients.get("influence_score", 0):.2%}
- Inertia Debt 평균: {coefficients.get("inertia_debt_avg", 0):.3f}

고위험 기술: {", ".join(breaking_techs) if breaking_techs else "없음"}

관련 릴리스 노트: {len(pinecone_matches)}개 발견

다음을 분석하세요:
1. 목표 달성 가능성 (0-100%)
2. 주요 위험 요소
3. 권장 조치

JSON 형식으로 응답하세요.
"""
    
    # Reasoning 태스크이므로 DeepSeek-R1 선택
    response = selector.generate(
        prompt=prompt,
        task_type=TaskType.REASONING,
        temperature=0.3,
    )
    
    # 예측 파싱 시도
    prediction = _parse_json_response(response.content)
    
    return {
        "llm_analysis": response.content,
        "llm_prediction": prediction,
        "messages": state.get("messages", []) + [
            f"LLM 분석 완료 ({response.provider.value}/{response.model})"
        ],
    }


def hybrid_safety_guard_node(state: HybridState) -> dict:
    """
    하이브리드 Safety Guard 노드
    
    TypeDB inference + Pinecone drift + LLM prediction 종합
    """
    logger.info("🛡️ 하이브리드 Safety Guard 노드 실행")
    
    # 입력 수집
    coefficients = state.get("typedb_coefficients", {})
    pinecone_sim = state.get("pinecone_similarity", 1.0)
    prediction = state.get("llm_prediction", {})
    breaking_techs = state.get("typedb_breaking_techs", [])
    
    # 위험 요소 평가
    risks = []
    
    # 1. Inertia Debt 체크
    inertia_avg = coefficients.get("inertia_debt_avg", 0)
    if inertia_avg > 0.7:
        risks.append(f"Inertia Debt 높음: {inertia_avg:.3f}")
    
    # 2. Behavior Drift 체크
    if pinecone_sim < 0.92:
        risks.append(f"Behavior Drift 감지: sim={pinecone_sim:.3f}")
    
    # 3. Breaking Changes 체크
    if breaking_techs:
        risks.append(f"Breaking Change 기술: {', '.join(breaking_techs)}")
    
    # 4. LLM 예측 위험도 체크
    if prediction.get("risk_level") in ["HIGH", "CRITICAL"]:
        risks.append(f"LLM 위험 예측: {prediction.get('risk_level')}")
    
    # 라우팅 결정
    if len(risks) >= 3:
        route = "human_escalation"
    elif len(risks) >= 2:
        route = "throttle"
    elif len(risks) == 1:
        route = "continue_with_caution"
    else:
        route = "continue"
    
    return {
        "safety_route": route,
        "safety_details": {
            "risks": risks,
            "risk_count": len(risks),
            "inertia_debt_avg": inertia_avg,
            "pinecone_similarity": pinecone_sim,
            "breaking_techs_count": len(breaking_techs),
        },
        "messages": state.get("messages", []) + [f"Safety Guard: {route}"],
    }


def hybrid_report_node(state: HybridState) -> dict:
    """
    하이브리드 리포트 노드
    
    Llama 3.3으로 최종 보고서 생성
    """
    from .llm_selector import LLMSelector, TaskType
    
    logger.info("📝 하이브리드 리포트 노드 실행")
    
    selector = LLMSelector()
    
    # 보고서 프롬프트
    prompt = f"""
AUTUS 분석 결과 보고서를 작성하세요.

목표: {state.get("goal", "")}

Safety Guard 결과: {state.get("safety_route", "")}
위험 요소: {state.get("safety_details", {}).get("risks", [])}

LLM 분석: {state.get("llm_analysis", "")[:500]}

한국어로 간결하게 작성하세요. 포함 항목:
1. 요약 (2-3문장)
2. 주요 발견 사항
3. 권장 조치
4. 다음 단계
"""
    
    # Summarization 태스크이므로 Llama 3.3 선택
    response = selector.generate(
        prompt=prompt,
        task_type=TaskType.SUMMARIZATION,
        temperature=0.5,
    )
    
    return {
        "final_report": response.content,
        "success": state.get("safety_route") in ["continue", "continue_with_caution"],
        "messages": state.get("messages", []) + ["최종 보고서 생성 완료"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 하이브리드 그래프 빌더
# ═══════════════════════════════════════════════════════════════════════════════

def build_hybrid_graph():
    """
    하이브리드 LangGraph 그래프 빌드
    
    Returns:
        CompiledGraph: 컴파일된 그래프
    """
    try:
        from langgraph.graph import StateGraph, END
        
        workflow = StateGraph(HybridState)
        
        # 노드 추가
        workflow.add_node("typedb_coefficients", typedb_coefficient_node)
        workflow.add_node("pinecone_retrieval", pinecone_retrieval_node)
        workflow.add_node("llm_analysis", llm_analysis_node)
        workflow.add_node("safety_guard", hybrid_safety_guard_node)
        workflow.add_node("report", hybrid_report_node)
        
        # 엣지 정의
        workflow.set_entry_point("typedb_coefficients")
        workflow.add_edge("typedb_coefficients", "pinecone_retrieval")
        workflow.add_edge("pinecone_retrieval", "llm_analysis")
        workflow.add_edge("llm_analysis", "safety_guard")
        
        # 조건부 라우팅
        def route_after_safety(state: HybridState) -> str:
            route = state.get("safety_route", "continue")
            if route == "human_escalation":
                return END  # 즉시 종료 (escalation 필요)
            return "report"
        
        workflow.add_conditional_edges(
            "safety_guard",
            route_after_safety,
            {
                END: END,
                "report": "report",
            }
        )
        
        workflow.add_edge("report", END)
        
        # 컴파일
        from langgraph.checkpoint.memory import MemorySaver
        graph = workflow.compile(checkpointer=MemorySaver())
        
        logger.info("✅ 하이브리드 LangGraph 그래프 빌드 완료")
        return graph
        
    except ImportError:
        logger.warning("langgraph 패키지가 설치되지 않았습니다. Fallback 사용.")
        return None


def run_hybrid_workflow(
    user_id: str = "user_ohseho_001",
    goal: str = "HR 온보딩 프로세스 최적화",
    verbose: bool = True,
) -> HybridState:
    """
    하이브리드 워크플로우 실행
    
    Args:
        user_id: 사용자 ID
        goal: 목표
        verbose: 상세 출력
        
    Returns:
        HybridState: 최종 상태
    """
    logger.info(f"🚀 하이브리드 워크플로우 시작: {goal}")
    
    initial_state: HybridState = {
        "user_id": user_id,
        "goal": goal,
        "messages": [],
    }
    
    graph = build_hybrid_graph()
    
    if graph:
        # LangGraph 사용
        config = {"configurable": {"thread_id": f"hybrid_{user_id}"}}
        result = graph.invoke(initial_state, config)
    else:
        # Fallback: 순차 실행
        logger.info("Fallback 모드: 순차 실행")
        
        state = initial_state
        state.update(typedb_coefficient_node(state))
        state.update(pinecone_retrieval_node(state))
        state.update(llm_analysis_node(state))
        state.update(hybrid_safety_guard_node(state))
        
        if state.get("safety_route") != "human_escalation":
            state.update(hybrid_report_node(state))
        
        result = state
    
    if verbose:
        print("\n" + "=" * 60)
        print("🏛️ AUTUS 하이브리드 워크플로우 결과")
        print("=" * 60)
        print(f"\n목표: {goal}")
        print(f"Safety Route: {result.get('safety_route')}")
        print(f"성공: {result.get('success', False)}")
        print(f"\n메시지:")
        for msg in result.get("messages", []):
            print(f"  - {msg}")
        if result.get("final_report"):
            print(f"\n📝 최종 보고서:\n{result.get('final_report')}")
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 헬퍼 함수
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_mock_embedding(text: str, dim: int = 1536) -> list[float]:
    """Mock 임베딩 생성"""
    import hashlib
    hash_bytes = hashlib.sha256(text.encode()).digest()
    vector = []
    for i in range(dim):
        byte_val = hash_bytes[i % len(hash_bytes)]
        vector.append((byte_val / 255.0) * 2 - 1)
    return vector


def _hash_text(text: str) -> str:
    """텍스트 해시"""
    import hashlib
    return hashlib.md5(text.encode()).hexdigest()


def _parse_json_response(response: str) -> dict:
    """JSON 응답 파싱"""
    import json
    
    # JSON 블록 추출 시도
    if "```json" in response:
        start = response.find("```json") + 7
        end = response.find("```", start)
        response = response[start:end].strip()
    elif "```" in response:
        start = response.find("```") + 3
        end = response.find("```", start)
        response = response[start:end].strip()
    
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"raw": response, "error": "JSON 파싱 실패"}
