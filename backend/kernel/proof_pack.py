"""
Proof Pack v1 - The Product
============================
아우투스가 생성하는 최종 산출물 (JSON + PDF)
시장에 남기는 표준 규격
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID, uuid4
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

# ============================================
# Proof Pack Models
# ============================================

class ProofIntent(BaseModel):
    """의도 (무엇을 하려 했는가)"""
    summary: str
    purpose: str
    requested_by: Optional[str] = None

class ProofLogic(BaseModel):
    """판단 근거 (왜 그렇게 결정했는가)"""
    basis_type: Literal["GAP_ANALYSIS", "LEGAL_BASIS", "PRECEDENT", "USER_OVERRIDE"]
    basis_content: str
    decision: str
    confidence: float = 1.0

class ProofExecution(BaseModel):
    """실행 결과 (무엇을 했는가)"""
    action: str
    status: Literal["SUCCESS", "FAILED", "PENDING", "CANCELLED"]
    result_data: Optional[Dict[str, Any]] = None
    executed_at: datetime = Field(default_factory=datetime.now)

class ProofSignature(BaseModel):
    """서명 (누가 책임지는가)"""
    system_sign: str
    entity_sign: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ProofMeta(BaseModel):
    """메타데이터"""
    org_type: Literal["SMB", "GOV"]
    org_id: str
    motion_type: str
    entity_id: str
    rule_applied: Optional[str] = None

class ProofPack(BaseModel):
    """
    증빙 패키지 - AUTUS의 최종 산출물
    
    모든 동작의 결과로 생성되는 불변의 기록
    """
    proof_id: str  # SHA256 해시
    timestamp: datetime = Field(default_factory=datetime.now)
    meta: ProofMeta
    intent: ProofIntent
    logic: ProofLogic
    execution: ProofExecution
    signature: ProofSignature
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }
    
    def to_json(self) -> str:
        """JSON 문자열로 변환"""
        return self.model_dump_json(indent=2)
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return self.model_dump()

# ============================================
# Proof Pack Generator
# ============================================

class ProofPackGenerator:
    """증빙 패키지 생성기"""
    
    SYSTEM_PRIVATE_KEY = "autus_kernel_v1_secret"  # 실제로는 환경변수에서
    
    @classmethod
    def generate_proof_id(cls, data: Dict[str, Any]) -> str:
        """
        결정론적 Proof ID 생성
        동일한 입력 = 동일한 ID (무결성 보장)
        """
        canonical = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()
    
    @classmethod
    def sign_system(cls, proof_id: str) -> str:
        """시스템 서명 생성"""
        payload = f"{proof_id}:{cls.SYSTEM_PRIVATE_KEY}"
        return hashlib.sha256(payload.encode()).hexdigest()[:32]
    
    @classmethod
    def create(
        cls,
        org_type: str,
        org_id: str,
        motion_type: str,
        entity_id: str,
        intent_summary: str,
        intent_purpose: str,
        basis_type: str,
        basis_content: str,
        decision: str,
        action: str,
        status: str,
        result_data: Optional[Dict] = None,
        rule_applied: Optional[str] = None,
        entity_sign: Optional[str] = None,
    ) -> ProofPack:
        """
        증빙 패키지 생성
        
        Args:
            org_type: "SMB" | "GOV"
            motion_type: "M01" ~ "M10"
            ...
        """
        # 1. 메타데이터
        meta = ProofMeta(
            org_type=org_type,
            org_id=org_id,
            motion_type=motion_type,
            entity_id=entity_id,
            rule_applied=rule_applied
        )
        
        # 2. 의도
        intent = ProofIntent(
            summary=intent_summary,
            purpose=intent_purpose,
            requested_by=entity_id
        )
        
        # 3. 판단 근거
        logic = ProofLogic(
            basis_type=basis_type,
            basis_content=basis_content,
            decision=decision
        )
        
        # 4. 실행 결과
        execution = ProofExecution(
            action=action,
            status=status,
            result_data=result_data
        )
        
        # 5. Proof ID 생성
        proof_data = {
            "meta": meta.model_dump(),
            "intent": intent.model_dump(),
            "logic": logic.model_dump(),
            "execution": execution.model_dump()
        }
        proof_id = cls.generate_proof_id(proof_data)
        
        # 6. 서명
        signature = ProofSignature(
            system_sign=cls.sign_system(proof_id),
            entity_sign=entity_sign
        )
        
        # 7. 최종 패키지
        proof_pack = ProofPack(
            proof_id=proof_id,
            meta=meta,
            intent=intent,
            logic=logic,
            execution=execution,
            signature=signature
        )
        
        logger.info(f"Created ProofPack: {proof_id[:16]}...")
        
        return proof_pack

# ============================================
# PDF Generator (Template)
# ============================================

def generate_proof_pdf_html(proof: ProofPack) -> str:
    """Proof Pack을 PDF용 HTML로 변환"""
    
    status_color = {
        "SUCCESS": "#22c55e",
        "FAILED": "#ef4444",
        "PENDING": "#f59e0b",
        "CANCELLED": "#6b7280"
    }
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>AUTUS Proof Pack - {proof.proof_id[:16]}</title>
        <style>
            body {{ font-family: 'Noto Sans KR', sans-serif; padding: 40px; background: #f9fafb; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 40px; }}
            .header {{ text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }}
            .logo {{ font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
            .proof-id {{ font-family: monospace; font-size: 12px; color: #6b7280; margin-top: 10px; }}
            .section {{ margin-bottom: 24px; }}
            .section-title {{ font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }}
            .section-content {{ background: #f3f4f6; border-radius: 12px; padding: 16px; }}
            .field {{ display: flex; margin-bottom: 8px; }}
            .field-label {{ width: 120px; font-weight: 600; color: #6b7280; }}
            .field-value {{ flex: 1; color: #111827; }}
            .status {{ display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; color: white; background: {status_color.get(proof.execution.status, '#6b7280')}; }}
            .signature {{ font-family: monospace; font-size: 11px; word-break: break-all; color: #9ca3af; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏛️ AUTUS</div>
                <div style="font-size: 18px; margin-top: 10px;">증빙 패키지 (Proof Pack)</div>
                <div class="proof-id">ID: {proof.proof_id}</div>
            </div>
            
            <div class="section">
                <div class="section-title">📋 메타정보</div>
                <div class="section-content">
                    <div class="field"><span class="field-label">조직 유형</span><span class="field-value">{proof.meta.org_type}</span></div>
                    <div class="field"><span class="field-label">동작 유형</span><span class="field-value">{proof.meta.motion_type}</span></div>
                    <div class="field"><span class="field-label">요청자</span><span class="field-value">{proof.meta.entity_id}</span></div>
                    <div class="field"><span class="field-label">적용 규칙</span><span class="field-value">{proof.meta.rule_applied or 'N/A'}</span></div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">💡 의도</div>
                <div class="section-content">
                    <div class="field"><span class="field-label">요약</span><span class="field-value">{proof.intent.summary}</span></div>
                    <div class="field"><span class="field-label">목적</span><span class="field-value">{proof.intent.purpose}</span></div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">⚖️ 판단 근거</div>
                <div class="section-content">
                    <div class="field"><span class="field-label">근거 유형</span><span class="field-value">{proof.logic.basis_type}</span></div>
                    <div class="field"><span class="field-label">근거 내용</span><span class="field-value">{proof.logic.basis_content}</span></div>
                    <div class="field"><span class="field-label">결정</span><span class="field-value">{proof.logic.decision}</span></div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">🚀 실행 결과</div>
                <div class="section-content">
                    <div class="field"><span class="field-label">수행 작업</span><span class="field-value">{proof.execution.action}</span></div>
                    <div class="field"><span class="field-label">상태</span><span class="field-value"><span class="status">{proof.execution.status}</span></span></div>
                    <div class="field"><span class="field-label">실행 시각</span><span class="field-value">{proof.execution.executed_at.isoformat()}</span></div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">🔐 서명</div>
                <div class="section-content">
                    <div class="field"><span class="field-label">시스템 서명</span><span class="signature">{proof.signature.system_sign}</span></div>
                    <div class="field"><span class="field-label">사용자 서명</span><span class="signature">{proof.signature.entity_sign or 'N/A'}</span></div>
                </div>
            </div>
            
            <div class="footer">
                Generated by AUTUS Kernel v1.0<br>
                {proof.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}
            </div>
        </div>
    </body>
    </html>
    """
    
    return html
