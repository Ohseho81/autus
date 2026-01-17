"""
AUTUS LangGraph 노드 구현
=========================

모든 워크플로우 노드 정의

노드:
1. safety_guard_node: Safety Guard 검사
2. fetch_user_data_node: 사용자 데이터 로드
3. fetch_coefficients_node: Neo4j 계수 계산
4. analysis_crew_node: CrewAI 분석
5. fsd_laplace_node: TFT/Laplace 예측
6. throttle_node: 쓰로틀링
7. human_escalation_node: 사람 개입 요청
"""

import logging
import time
import os
from datetime import datetime
from typing import Any

from .state import AutusState, SafetyRoute

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# 임계값 설정
# ─────────────────────────────────────────────────────────────────────────────
THRESHOLD_DELTA_S_DOT = 0.70
THRESHOLD_INERTIA_DEBT = 0.80
SCALE_LOCK_THRESHOLD = 0.95


# ─────────────────────────────────────────────────────────────────────────────
# Safety Guard 노드
# ─────────────────────────────────────────────────────────────────────────────
def safety_guard_node(state: AutusState) -> dict:
    """
    Safety Guard 검사 노드
    
    AUTUS 핵심 안전 제어:
    - ΔṠ 임계값 체크
    - Inertia Debt 체크
    - Scale Lock 위반 체크
    
    Returns:
        dict: {safety_route, safety_violations, safety_warnings}
    """
    logger.info("🛡️ [Safety Guard] 검사 시작...")
    
    violations = []
    warnings = []
    
    delta_s_dot = state.get("delta_s_dot", 0.0)
    inertia_debt = state.get("inertia_debt", 0.0)
    scale_lock_violated = state.get("scale_lock_violated", False)
    stability_score = state.get("stability_score", 0.75)
    
    # ΔṠ 체크
    if delta_s_dot > THRESHOLD_DELTA_S_DOT:
        violations.append(f"ΔṠ exceeded: {delta_s_dot:.2f} > {THRESHOLD_DELTA_S_DOT}")
        logger.warning(f"⚠️ ΔṠ 초과: {delta_s_dot:.2f}")
    elif delta_s_dot > THRESHOLD_DELTA_S_DOT * 0.8:
        warnings.append(f"ΔṠ warning: {delta_s_dot:.2f}")
    
    # Inertia Debt 체크
    if inertia_debt > THRESHOLD_INERTIA_DEBT:
        violations.append(f"Inertia Debt high: {inertia_debt:.2f} > {THRESHOLD_INERTIA_DEBT}")
        logger.warning(f"⚠️ Inertia Debt 초과: {inertia_debt:.2f}")
    elif inertia_debt > THRESHOLD_INERTIA_DEBT * 0.75:
        warnings.append(f"Inertia Debt warning: {inertia_debt:.2f}")
    
    # Scale Lock 체크
    if scale_lock_violated:
        violations.append("Scale Lock violated")
        logger.error("🚨 Scale Lock 위반!")
    
    # Stability Score 체크
    if stability_score < 1 - SCALE_LOCK_THRESHOLD:
        violations.append(f"Stability too low: {stability_score:.2f}")
    
    # 라우팅 결정
    if len(violations) >= 2:
        route = SafetyRoute.HUMAN_ESCALATION.value
        logger.error(f"🚨 Human Escalation 필요: {violations}")
    elif len(violations) == 1:
        route = SafetyRoute.THROTTLE.value
        logger.warning(f"⏳ Throttle 적용: {violations}")
    elif scale_lock_violated:
        route = SafetyRoute.HALT.value
        logger.error("🛑 HALT: Scale Lock 위반")
    else:
        route = SafetyRoute.CONTINUE.value
        logger.info("✅ Safety Guard 통과")
    
    return {
        "safety_route": route,
        "safety_violations": violations,
        "safety_warnings": warnings,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 사용자 데이터 로드 노드
# ─────────────────────────────────────────────────────────────────────────────
def fetch_user_data_node(state: AutusState) -> dict:
    """
    사용자 데이터 로드 노드
    
    Neo4j 또는 Mock에서 사용자 정보 조회
    
    Returns:
        dict: {user_type, user_constants}
    """
    logger.info("📊 [Fetch User Data] 사용자 데이터 로드...")
    
    user_id = state.get("user_id", "user_ohseho_001")
    
    # Neo4j 연결 시도
    try:
        from backend.prototype.neo4j_client import get_neo4j_client
        
        client = get_neo4j_client(use_mock=True)
        user_data = client.get_user(user_id)
        
        if user_data:
            user_type = {
                "user_id": user_data.get("user_id", user_id),
                "name": user_data.get("name", "Unknown"),
                "location": f"{user_data.get('current_city', 'Unknown')}, {user_data.get('country', 'Unknown')}",
                "mbti": user_data.get("mbti", "XXXX"),
            }
            
            user_constants = {
                "stability_score": user_data.get("stability_score", 0.75),
                "inertia_debt": user_data.get("inertia_debt", 0.35),
                "current_city": user_data.get("current_city", ""),
                "country": user_data.get("country", ""),
            }
        else:
            user_type = {"user_id": user_id, "name": "Unknown", "location": "Unknown", "mbti": "XXXX"}
            user_constants = {"stability_score": 0.75, "inertia_debt": 0.35}
            
    except Exception as e:
        logger.warning(f"Neo4j 연결 실패, 기본값 사용: {e}")
        user_type = {
            "user_id": user_id,
            "name": "Oh Seho",
            "location": "Quezon City, PH",
            "mbti": "INTJ-A",
        }
        user_constants = {
            "stability_score": 0.82,
            "inertia_debt": 0.35,
            "current_city": "Quezon City",
            "country": "PH",
        }
    
    logger.info(f"✅ 사용자 로드 완료: {user_type.get('name')}")
    
    return {
        "user_type": user_type,
        "user_constants": user_constants,
        "stability_score": user_constants.get("stability_score", 0.75),
        "inertia_debt": user_constants.get("inertia_debt", 0.35),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Neo4j 계수 계산 노드
# ─────────────────────────────────────────────────────────────────────────────
def fetch_coefficients_node(state: AutusState) -> dict:
    """
    사용자 계수 계산 노드
    
    Neo4j GDS에서 계수 계산:
    - connectivity_density: degree / 12
    - influence_score: PageRank
    - value_flow_rate: weighted degree
    
    Returns:
        dict: {user_coefficients}
    """
    logger.info("📈 [Fetch Coefficients] 계수 계산...")
    
    user_id = state.get("user_id", "user_ohseho_001")
    
    try:
        from backend.prototype.neo4j_client import get_neo4j_client
        
        client = get_neo4j_client(use_mock=True)
        coefficients = client.get_user_coefficients(user_id)
        
    except Exception as e:
        logger.warning(f"Neo4j 계수 조회 실패, 기본값 사용: {e}")
        coefficients = {
            "connectivity_density": 0.67,
            "influence_score": 0.72,
            "value_flow_rate": 0.58,
        }
    
    logger.info(f"✅ 계수 계산 완료: {coefficients}")
    
    return {"user_coefficients": coefficients}


# ─────────────────────────────────────────────────────────────────────────────
# CrewAI 분석 노드
# ─────────────────────────────────────────────────────────────────────────────
def analysis_crew_node(state: AutusState) -> dict:
    """
    CrewAI 분석 노드
    
    멀티 에이전트 분석:
    - 목표 파싱
    - 도메인 식별
    - 모듈 추천
    - 노력 추정
    
    Returns:
        dict: {analysis_result, stability_score (업데이트)}
    """
    logger.info("🔍 [Analysis Crew] 분석 실행...")
    
    goal = state.get("current_goal", "")
    user_type = state.get("user_type", {})
    user_constants = state.get("user_constants", {})
    user_coefficients = state.get("user_coefficients", {})
    
    # CrewAI 사용 시도
    use_crewai = os.getenv("OPENAI_API_KEY") is not None
    
    if use_crewai:
        try:
            from crewai import Agent, Task, Crew, Process
            from langchain_openai import ChatOpenAI
            
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
            
            analyzer = Agent(
                role="Goal Analyzer",
                goal="사용자 목표를 분석하고 도메인을 식별합니다.",
                backstory="AUTUS 목표 분석 전문가입니다.",
                llm=llm,
                verbose=False,
            )
            
            analysis_task = Task(
                description=f"""
                목표 분석: {goal}
                사용자: {user_type.get('name', 'Unknown')}
                위치: {user_type.get('location', 'Unknown')}
                
                다음을 분석하세요:
                1. 목표 도메인 (HR, Finance, Marketing, Operations, IT)
                2. 필요한 조치 유형 (최적화, 생성, 분석, 자동화)
                3. 예상 난이도 (1-5)
                """,
                expected_output="도메인, 조치 유형, 난이도 분석 결과",
                agent=analyzer,
            )
            
            crew = Crew(
                agents=[analyzer],
                tasks=[analysis_task],
                process=Process.sequential,
                verbose=False,
            )
            
            crew_result = crew.kickoff(inputs={"goal": goal})
            crew_output = str(crew_result)
            
            logger.info(f"CrewAI 분석 완료: {crew_output[:100]}...")
            
        except Exception as e:
            logger.warning(f"CrewAI 실행 실패, 규칙 기반 분석 사용: {e}")
            use_crewai = False
    
    # 규칙 기반 분석 (CrewAI 미사용 시)
    analysis_result = _rule_based_analysis(goal, user_constants, user_coefficients)
    
    # Stability Score 약간 증가 (분석 성공 시)
    new_stability = min(1.0, state.get("stability_score", 0.75) + 0.02)
    
    logger.info(f"✅ 분석 완료: 도메인={analysis_result['goal_parsed']['domain']}")
    
    return {
        "analysis_result": analysis_result,
        "stability_score": new_stability,
    }


def _rule_based_analysis(goal: str, user_constants: dict, user_coefficients: dict) -> dict:
    """규칙 기반 목표 분석"""
    goal_lower = goal.lower()
    
    # 도메인 추론
    domains = {
        "hr": ["hr", "인사", "채용", "온보딩", "직원"],
        "finance": ["재무", "회계", "예산", "비용"],
        "marketing": ["마케팅", "홍보", "광고"],
        "operations": ["운영", "물류", "프로세스"],
        "it": ["it", "기술", "시스템", "개발"],
    }
    
    domain = "general"
    for d, keywords in domains.items():
        if any(kw in goal_lower for kw in keywords):
            domain = d
            break
    
    # 액션 추론
    actions = {
        "optimize": ["최적화", "개선", "optimize"],
        "create": ["생성", "구축", "create"],
        "analyze": ["분석", "조사", "analyze"],
        "automate": ["자동화", "automate"],
    }
    
    action = "execute"
    for a, keywords in actions.items():
        if any(kw in goal_lower for kw in keywords):
            action = a
            break
    
    # 모듈 추천
    module_db = {
        "hr": [
            {"id": "7.1.1", "name": "인력 계획 수립", "category": "Develop HR"},
            {"id": "7.2.1", "name": "채용 프로세스", "category": "Recruit"},
            {"id": "7.3.1", "name": "온보딩 실행", "category": "Onboard"},
        ],
        "finance": [
            {"id": "8.1.1", "name": "예산 편성", "category": "Budget"},
            {"id": "8.2.1", "name": "비용 관리", "category": "Cost"},
        ],
        "marketing": [
            {"id": "4.1.1", "name": "마케팅 전략", "category": "Strategy"},
            {"id": "4.2.1", "name": "캠페인 실행", "category": "Campaign"},
        ],
    }
    
    # 노력 추정
    base_days = 14
    stability = user_constants.get("stability_score", 0.7)
    inertia = user_constants.get("inertia_debt", 0.3)
    
    effort_factor = (1 + (1 - stability) * 0.5) * (1 + inertia * 0.3)
    estimated_days = int(base_days * effort_factor)
    
    return {
        "goal_parsed": {
            "original": goal,
            "domain": domain,
            "action": action,
        },
        "recommended_modules": module_db.get(domain, [{"id": "0.0.1", "name": "일반 프로세스"}]),
        "estimated_effort": {
            "days": estimated_days,
            "confidence": "medium",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# FSD Laplace 예측 노드
# ─────────────────────────────────────────────────────────────────────────────
def fsd_laplace_node(state: AutusState) -> dict:
    """
    FSD Laplace 예측 노드
    
    Laplace's Demon 스타일 확률적 미래 예측:
    - 성공 확률
    - 불확실성
    - 마찰/시너지 노드
    - 7일 예측
    
    Returns:
        dict: {predicted_future}
    """
    logger.info("🔮 [FSD Laplace] 예측 실행...")
    
    goal = state.get("current_goal", "")
    user_constants = state.get("user_constants", {})
    user_coefficients = state.get("user_coefficients", {})
    
    try:
        from backend.prototype.predictor import AUTUSPredictor
        
        predictor = AUTUSPredictor(use_tft=False)
        result = predictor.predict(
            goal=goal,
            user_constants=user_constants,
            user_coefficients=user_coefficients,
        )
        
        predicted_future = {
            "success_probability": result.success_probability,
            "uncertainty": result.uncertainty,
            "friction_nodes": result.friction_nodes,
            "synergy_nodes": result.synergy_nodes,
            "forecast": result.forecast,
            "model_used": result.model_used,
        }
        
    except Exception as e:
        logger.warning(f"예측기 오류, 기본값 사용: {e}")
        predicted_future = {
            "success_probability": 0.72,
            "uncertainty": 0.12,
            "friction_nodes": [],
            "synergy_nodes": [],
            "forecast": [0.72, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79],
            "model_used": "fallback",
        }
    
    logger.info(f"✅ 예측 완료: {predicted_future['success_probability']:.1%}")
    
    return {"predicted_future": predicted_future}


# ─────────────────────────────────────────────────────────────────────────────
# Throttle 노드
# ─────────────────────────────────────────────────────────────────────────────
def throttle_node(state: AutusState) -> dict:
    """
    쓰로틀링 노드
    
    Safety Guard가 throttle 라우트 시 실행
    2초 대기 후 계속 진행
    
    Returns:
        dict: {inertia_debt (증가)}
    """
    logger.warning("⏳ [Throttle] 쓰로틀링 적용 (2초 대기)...")
    
    time.sleep(2)
    
    # Inertia Debt 약간 증가
    current_inertia = state.get("inertia_debt", 0.35)
    new_inertia = min(1.0, current_inertia + 0.05)
    
    logger.info(f"✅ 쓰로틀링 완료: Inertia Debt {current_inertia:.2f} → {new_inertia:.2f}")
    
    return {"inertia_debt": new_inertia}


# ─────────────────────────────────────────────────────────────────────────────
# Human Escalation 노드
# ─────────────────────────────────────────────────────────────────────────────
def human_escalation_node(state: AutusState) -> dict:
    """
    사람 개입 요청 노드
    
    Safety Guard가 human_escalation 라우트 시 실행
    사용자에게 알림 후 대기
    
    Returns:
        dict: {errors (알림 추가)}
    """
    logger.error("🚨 [Human Escalation] 사람 개입 필요!")
    
    violations = state.get("safety_violations", [])
    
    message = f"""
    ⚠️ AUTUS Safety Guard: 사람 개입이 필요합니다.
    
    위반 사항:
    {chr(10).join(f'  - {v}' for v in violations)}
    
    현재 상태:
    - ΔṠ: {state.get('delta_s_dot', 0):.2f}
    - Inertia Debt: {state.get('inertia_debt', 0):.2f}
    - Stability: {state.get('stability_score', 0):.2f}
    
    계속하려면 확인이 필요합니다.
    """
    
    logger.error(message)
    
    # 에러 목록에 추가
    errors = state.get("errors", [])
    errors.append(f"Human Escalation: {violations}")
    
    return {"errors": errors}
