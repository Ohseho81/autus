"""
ABL-R Schema - Minimal Kernel
==============================
Authority-Budget-Liability-Reference
조직의 DNA를 담는 데이터베이스 스키마
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

# ============================================
# Enums
# ============================================

class RoleType(str, Enum):
    DRAFTER = "DRAFTER"      # 기안자
    APPROVER = "APPROVER"    # 승인자
    AUDITOR = "AUDITOR"      # 감사자
    MASTER = "MASTER"        # 최고 권한자

class OrgType(str, Enum):
    SMB = "SMB"              # 중소기업 (시장 표준 기반)
    GOV = "GOV"              # 공공기관 (법적 근거 기반)

# ============================================
# 1. ENTITY (개체: 사람, 봇, 부서)
# ============================================

class Entity(BaseModel):
    entity_id: UUID = Field(default_factory=uuid4)
    org_id: UUID
    entity_name: str
    role_type: RoleType
    created_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {UUID: str, datetime: lambda v: v.isoformat()}

# ============================================
# 2. AUTHORITY (Constant: 제약)
# ============================================

class AuthorityConstraint(BaseModel):
    """
    변하지 않는 제약 조건
    예: 보안등급, 부서코드
    """
    constraint_id: UUID = Field(default_factory=uuid4)
    entity_id: UUID
    constraint_key: str      # 예: 'SECURITY_CLEARANCE', 'DEPT_CODE'
    constraint_value: str    # 예: 'TOP_SECRET', 'FINANCE'
    is_immutable: bool = True
    
    class Config:
        json_encoders = {UUID: str}

# ============================================
# 3. BUDGET (Exponent: 한도/리스크)
# ============================================

class BudgetExponent(BaseModel):
    """
    변동 가능한 한도/예산
    예: 지출 한도, 구매 한도
    """
    exponent_id: UUID = Field(default_factory=uuid4)
    entity_id: UUID
    motion_type: str         # 예: 'M04' (지출)
    limit_key: str           # 예: 'MAX_AMOUNT'
    limit_value: float       # 예: 1000000 (100만원)
    current_usage: float = 0.0
    
    def remaining(self) -> float:
        """남은 한도"""
        return self.limit_value - self.current_usage
    
    def can_spend(self, amount: float) -> bool:
        """지출 가능 여부"""
        return self.remaining() >= amount
    
    class Config:
        json_encoders = {UUID: str}

# ============================================
# 4. REFERENCE (Reference: 판단 근거 - 핵심!)
# ============================================

class ReferenceSource(BaseModel):
    """
    판단의 근거가 되는 참조 데이터
    - SMB: 시장 표준/글로벌 데이터
    - GOV: 법적 근거/판례
    """
    ref_id: UUID = Field(default_factory=uuid4)
    org_type: OrgType
    
    # SMB용: 글로벌/시장 표준 데이터
    market_standard_data: Optional[Dict[str, Any]] = None
    # 예: {"avg_cost": 5000, "best_practice_ver": "3.0"}
    
    # Gov용: 법적 근거 및 판례
    legal_basis_id: Optional[str] = None  # 예: "지방재정법_제12조"
    precedent_case_id: Optional[UUID] = None  # 내부 성공 사례 ID
    
    last_updated: datetime = Field(default_factory=datetime.now)
    
    def get_basis(self) -> Dict[str, Any]:
        """조직 유형에 맞는 근거 반환"""
        if self.org_type == OrgType.SMB:
            return {
                "type": "GAP_ANALYSIS",
                "data": self.market_standard_data or {}
            }
        else:  # GOV
            return {
                "type": "LEGAL_BASIS",
                "legal_id": self.legal_basis_id,
                "precedent_id": str(self.precedent_case_id) if self.precedent_case_id else None
            }
    
    class Config:
        json_encoders = {UUID: str, datetime: lambda v: v.isoformat()}

# ============================================
# SQL Schema Generator
# ============================================

ABLR_SCHEMA_SQL = """
-- AUTUS ABL-R Schema v1.0
-- Authority-Budget-Liability-Reference

-- 1. ENTITY (개체: 사람, 봇, 부서)
CREATE TABLE IF NOT EXISTS entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    role_type VARCHAR(20) CHECK (role_type IN ('DRAFTER', 'APPROVER', 'AUDITOR', 'MASTER')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. AUTHORITY (Constant: 제약)
CREATE TABLE IF NOT EXISTS authority_constraints (
    constraint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
    constraint_key VARCHAR(50) NOT NULL,
    constraint_value VARCHAR(100) NOT NULL,
    is_immutable BOOLEAN DEFAULT TRUE,
    UNIQUE(entity_id, constraint_key)
);

-- 3. BUDGET (Exponent: 한도/리스크)
CREATE TABLE IF NOT EXISTS budget_exponents (
    exponent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(entity_id) ON DELETE CASCADE,
    motion_type VARCHAR(10) NOT NULL,
    limit_key VARCHAR(50) NOT NULL,
    limit_value NUMERIC NOT NULL DEFAULT 0,
    current_usage NUMERIC DEFAULT 0,
    UNIQUE(entity_id, motion_type, limit_key)
);

-- 4. REFERENCE (Reference: 판단 근거)
CREATE TABLE IF NOT EXISTS reference_sources (
    ref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_type VARCHAR(10) CHECK (org_type IN ('SMB', 'GOV')),
    market_standard_data JSONB,
    legal_basis_id VARCHAR(50),
    precedent_case_id UUID,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 5. PROOF PACKS (증빙 패키지)
CREATE TABLE IF NOT EXISTS proof_packs (
    proof_id VARCHAR(64) PRIMARY KEY,
    org_id UUID NOT NULL,
    entity_id UUID REFERENCES entities(entity_id),
    motion_type VARCHAR(10) NOT NULL,
    intent JSONB NOT NULL,
    logic JSONB NOT NULL,
    execution JSONB NOT NULL,
    signature JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entities_org ON entities(org_id);
CREATE INDEX IF NOT EXISTS idx_budget_entity ON budget_exponents(entity_id);
CREATE INDEX IF NOT EXISTS idx_proofs_motion ON proof_packs(motion_type);
CREATE INDEX IF NOT EXISTS idx_proofs_created ON proof_packs(created_at DESC);
"""

def get_schema_sql() -> str:
    """ABL-R SQL 스키마 반환"""
    return ABLR_SCHEMA_SQL
