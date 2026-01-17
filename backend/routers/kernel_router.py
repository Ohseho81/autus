"""
AUTUS Kernel API Router
========================
The Stealth Standard - EP10

Endpoints:
- Motion Taxonomy
- ABL-R Schema
- Smart Router
- Proof Pack
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from kernel import (
    MotionType, MOTION_REGISTRY, get_motion, validate_inputs,
    SmartRouter, RouterDecision, RouterAction,
    ProofPackGenerator, ProofPack, generate_proof_pdf_html,
    GapAnalysisEngine, GapInput, GapOutput, GapThresholds, gap_engine
)
from kernel.ablr_schema import (
    Entity, AuthorityConstraint, BudgetExponent, ReferenceSource,
    OrgType, RoleType, get_schema_sql
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kernel", tags=["Kernel - The Stealth Standard"])

# Smart Router Instance
smart_router = SmartRouter()

# ============================================
# Request/Response Models
# ============================================

class MotionRequest(BaseModel):
    org_type: str  # "SMB" | "GOV"
    org_id: str
    motion_type: str  # "M01" ~ "M10"
    entity_id: str
    inputs: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

class MotionResponse(BaseModel):
    success: bool
    motion_type: str
    routing_decision: Dict[str, Any]
    proof_pack: Optional[Dict[str, Any]] = None
    message: str

class ProofPackRequest(BaseModel):
    org_type: str
    org_id: str
    motion_type: str
    entity_id: str
    intent_summary: str
    intent_purpose: str
    basis_type: str
    basis_content: str
    decision: str
    action: str
    status: str
    result_data: Optional[Dict] = None
    rule_applied: Optional[str] = None

# ============================================
# Motion Taxonomy Endpoints
# ============================================

@router.get("/motions")
async def list_motions():
    """10대 핵심 동작 목록"""
    return {
        "motions": [
            {
                "id": m.motion_id,
                "name_ko": m.name_ko,
                "name_en": m.name_en,
                "description": m.description,
                "required_inputs": m.required_inputs,
                "proof_output": m.proof_pack_output,
                "risk_level": m.risk_level
            }
            for m in MOTION_REGISTRY.values()
        ]
    }

@router.get("/motions/{motion_id}")
async def get_motion_detail(motion_id: str):
    """특정 동작 상세 정보"""
    motion = get_motion(motion_id)
    if not motion:
        raise HTTPException(status_code=404, detail=f"Motion {motion_id} not found")
    
    return {
        "id": motion.motion_id,
        "name_ko": motion.name_ko,
        "name_en": motion.name_en,
        "description": motion.description,
        "required_inputs": motion.required_inputs,
        "proof_output": motion.proof_pack_output,
        "risk_level": motion.risk_level
    }

# ============================================
# Smart Router Endpoints
# ============================================

@router.get("/router/rules")
async def get_router_rules():
    """라우팅 규칙 목록 (헌법)"""
    return {
        "rules": smart_router.get_rules_json(),
        "total": len(smart_router.rules)
    }

@router.post("/router/decide")
async def route_motion(request: MotionRequest) -> MotionResponse:
    """
    동작 라우팅 결정
    
    1. 입력 검증
    2. 컨텍스트 분석
    3. 규칙 매칭
    4. 결정 반환 (+ 자동실행시 Proof Pack 생성)
    """
    # 1. 동작 검증
    motion = get_motion(request.motion_type)
    if not motion:
        raise HTTPException(status_code=400, detail=f"Invalid motion: {request.motion_type}")
    
    # 2. 입력 검증
    is_valid, missing = validate_inputs(request.motion_type, request.inputs)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Missing inputs: {missing}")
    
    # 3. 라우팅 컨텍스트 구성
    context = {
        "org_type": request.org_type,
        "motion_type": request.motion_type,
        "entity_id": request.entity_id,
        "risk_level": motion.risk_level,
        **(request.context or {})
    }
    
    # 4. 라우팅 결정
    decision: RouterDecision = smart_router.route(context)
    
    logger.info(f"Motion {request.motion_type} routed: {decision.action.value}")
    
    # 5. 자동 실행시 Proof Pack 생성
    proof_pack = None
    if decision.action == RouterAction.AUTO_EXECUTE:
        proof = ProofPackGenerator.create(
            org_type=request.org_type,
            org_id=request.org_id,
            motion_type=request.motion_type,
            entity_id=request.entity_id,
            intent_summary=request.inputs.get("summary", "Auto-executed task"),
            intent_purpose=request.inputs.get("purpose", "Routine operation"),
            basis_type="PRECEDENT" if request.org_type == "GOV" else "GAP_ANALYSIS",
            basis_content=decision.message,
            decision="AUTO_APPROVED",
            action=f"Executed {motion.name_en}",
            status="SUCCESS",
            rule_applied=decision.rule_id
        )
        proof_pack = proof.to_dict()
    
    return MotionResponse(
        success=True,
        motion_type=request.motion_type,
        routing_decision={
            "action": decision.action.value,
            "target": decision.target,
            "message": decision.message,
            "rule_id": decision.rule_id
        },
        proof_pack=proof_pack,
        message=decision.message
    )

# ============================================
# Proof Pack Endpoints
# ============================================

@router.post("/proof/create")
async def create_proof_pack(request: ProofPackRequest):
    """증빙 패키지 생성"""
    proof = ProofPackGenerator.create(
        org_type=request.org_type,
        org_id=request.org_id,
        motion_type=request.motion_type,
        entity_id=request.entity_id,
        intent_summary=request.intent_summary,
        intent_purpose=request.intent_purpose,
        basis_type=request.basis_type,
        basis_content=request.basis_content,
        decision=request.decision,
        action=request.action,
        status=request.status,
        result_data=request.result_data,
        rule_applied=request.rule_applied
    )
    
    return {
        "success": True,
        "proof_pack": proof.to_dict()
    }

@router.get("/proof/{proof_id}/pdf", response_class=HTMLResponse)
async def get_proof_pdf(proof_id: str):
    """증빙 패키지 PDF (HTML 버전)"""
    # 실제로는 DB에서 조회
    # 데모용 더미 데이터
    proof = ProofPackGenerator.create(
        org_type="SMB",
        org_id="org_demo",
        motion_type="M08",
        entity_id="user_123",
        intent_summary="디자인팀 SW 구독 갱신",
        intent_purpose="업무 효율화",
        basis_type="GAP_ANALYSIS",
        basis_content="글로벌 표준($15) 대비 현재안($50)이 비효율적",
        decision="UPGRADE_AND_RUN",
        action="Changed subscription to Figma ($15)",
        status="SUCCESS"
    )
    
    html = generate_proof_pdf_html(proof)
    return HTMLResponse(content=html)

# ============================================
# ABL-R Schema Endpoints
# ============================================

@router.get("/schema/sql")
async def get_ablr_schema():
    """ABL-R SQL 스키마"""
    return {
        "schema": get_schema_sql(),
        "tables": ["entities", "authority_constraints", "budget_exponents", "reference_sources", "proof_packs"]
    }

@router.get("/schema/models")
async def get_schema_models():
    """ABL-R 모델 정의"""
    return {
        "models": {
            "Entity": Entity.model_json_schema(),
            "AuthorityConstraint": AuthorityConstraint.model_json_schema(),
            "BudgetExponent": BudgetExponent.model_json_schema(),
            "ReferenceSource": ReferenceSource.model_json_schema(),
        }
    }

# ============================================
# ORG DNA Lock (조직 헌법 선택)
# ============================================

@router.post("/org/initialize")
async def initialize_org_dna(
    org_id: str,
    org_type: str,
    org_name: str,
    admin_entity_id: str
):
    """
    조직 DNA 초기화 (ORG_DNA_LOCK)
    
    고객이 처음 들어올 때 헌법을 선택하게 함
    - SMB: 시장 표준 기반 라우팅
    - GOV: 법적 근거 기반 라우팅
    """
    # 1. Master Entity 생성
    master = Entity(
        org_id=org_id,
        entity_name=org_name,
        role_type=RoleType.MASTER
    )
    
    # 2. 기본 제약 설정
    constraints = [
        AuthorityConstraint(
            entity_id=master.entity_id,
            constraint_key="ORG_TYPE",
            constraint_value=org_type,
            is_immutable=True  # 변경 불가!
        )
    ]
    
    # 3. 기본 예산 한도 (SMB용)
    budgets = []
    if org_type == "SMB":
        budgets = [
            BudgetExponent(
                entity_id=master.entity_id,
                motion_type="M04",  # 지출
                limit_key="MAX_AMOUNT",
                limit_value=10000000  # 1천만원
            ),
            BudgetExponent(
                entity_id=master.entity_id,
                motion_type="M08",  # 구매
                limit_key="MAX_AMOUNT", 
                limit_value=5000000  # 5백만원
            )
        ]
    
    return {
        "success": True,
        "message": f"조직 DNA가 '{org_type}' 모드로 잠겼습니다 (변경 불가)",
        "org_dna": {
            "org_id": org_id,
            "org_type": org_type,
            "locked_at": datetime.now().isoformat()
        },
        "master_entity": master.model_dump(),
        "constraints": [c.model_dump() for c in constraints],
        "budgets": [b.model_dump() for b in budgets]
    }

# ============================================
# A3: Gap Analysis Engine (SMB 사장 보고)
# ============================================

class GapAnalyzeRequest(BaseModel):
    """Gap 분석 요청"""
    org_id: str
    org_name: str
    task_name: str
    motion_type: str = "M08"
    
    # Option A: 현행 (Human)
    option_a_who: str
    option_a_invest: str
    option_a_result: str
    option_a_price: float
    option_a_days: float = 1.0
    option_a_risk: int = 2
    
    # Option B: AUTUS 제안
    option_b_who: str = "AUTUS Agent"
    option_b_invest: str = "500원 (즉시)"
    option_b_result: str = "글로벌 최적가 적용"
    option_b_price: float = 0
    option_b_days: float = 0
    option_b_risk: int = 1
    
    # Reference
    reference_source: str = "GLOBAL_STANDARD"
    confidence: float = 0.85

class GapAnalyzeResponse(BaseModel):
    """Gap 분석 결과"""
    success: bool
    decision: str
    reason: str
    price_gap_percent: float
    saved_amount: str
    proof_payload: Dict[str, Any]

@router.post("/gap/analyze", response_model=GapAnalyzeResponse)
async def analyze_gap(request: GapAnalyzeRequest):
    """
    A3: Gap Analysis - SMB 사장 보고용 분석
    
    Option A (현행) vs Option B (AUTUS 제안) 비교 후
    - 기준 초과시: BOSS_REPORT (사장 결재 필요)
    - 기준 이내시: AUTO_EXECUTE (자동 실행)
    """
    gi = GapInput(
        org_id=request.org_id,
        org_name=request.org_name,
        task_name=request.task_name,
        motion_type=request.motion_type,
        
        option_a_who=request.option_a_who,
        option_a_invest_label=request.option_a_invest,
        option_a_result_label=request.option_a_result,
        option_a_price_krw=request.option_a_price,
        option_a_lead_time_days=request.option_a_days,
        option_a_risk_level=request.option_a_risk,
        
        option_b_who=request.option_b_who,
        option_b_invest_label=request.option_b_invest,
        option_b_result_label=request.option_b_result,
        option_b_price_krw=request.option_b_price,
        option_b_lead_time_days=request.option_b_days,
        option_b_risk_level=request.option_b_risk,
        
        reference_source=request.reference_source,
        confidence=request.confidence,
    )
    
    result = gap_engine.analyze(gi)
    
    logger.info(f"Gap Analysis: {request.task_name} -> {result.decision}")
    
    return GapAnalyzeResponse(
        success=True,
        decision=result.decision,
        reason=result.reason,
        price_gap_percent=round(result.price_gap_percent, 1),
        saved_amount=f"{result.saved_amount_krw:,.0f} KRW",
        proof_payload=result.proof_pack_payload
    )

@router.post("/gap/report")
async def generate_boss_report(request: GapAnalyzeRequest):
    """
    A2+A3: Gap 분석 → 사장 보고용 Proof Pack 생성
    
    End-to-end: 분석 + PDF HTML 생성
    """
    # 1. Gap 분석
    gi = GapInput(
        org_id=request.org_id,
        org_name=request.org_name,
        task_name=request.task_name,
        motion_type=request.motion_type,
        
        option_a_who=request.option_a_who,
        option_a_invest_label=request.option_a_invest,
        option_a_result_label=request.option_a_result,
        option_a_price_krw=request.option_a_price,
        option_a_lead_time_days=request.option_a_days,
        option_a_risk_level=request.option_a_risk,
        
        option_b_who=request.option_b_who,
        option_b_invest_label=request.option_b_invest,
        option_b_result_label=request.option_b_result,
        option_b_price_krw=request.option_b_price,
        option_b_lead_time_days=request.option_b_days,
        option_b_risk_level=request.option_b_risk,
        
        reference_source=request.reference_source,
        confidence=request.confidence,
    )
    
    gap_result = gap_engine.analyze(gi)
    payload = gap_result.proof_pack_payload
    
    # 2. Proof Pack 생성
    proof = ProofPackGenerator.create(
        org_type="SMB",
        org_id=request.org_id,
        motion_type=request.motion_type,
        entity_id="boss_report",
        intent_summary=request.task_name,
        intent_purpose=f"Gap: {gap_result.price_gap_percent:.1f}% | 절감: {gap_result.saved_amount_krw:,.0f}원",
        basis_type="GAP_ANALYSIS",
        basis_content=gap_result.reason,
        decision=gap_result.decision,
        action=f"Option B 적용시 {gap_result.saved_amount_krw:,.0f}원 절감",
        status="PENDING",
        result_data=payload.get("gap_data"),
        rule_applied="SMB_PRICE_GAP"
    )
    
    return {
        "success": True,
        "decision": gap_result.decision,
        "gap_analysis": {
            "price_gap_percent": round(gap_result.price_gap_percent, 1),
            "saved_amount": f"{gap_result.saved_amount_krw:,.0f} KRW",
            "reason": gap_result.reason
        },
        "proof_pack": proof.to_dict(),
        "reference": payload.get("reference")
    }
