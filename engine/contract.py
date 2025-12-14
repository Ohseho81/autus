"""
ContractEntropy Engine v1.0
계약/책임/보고 엔트로피 + 자동 감사
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime
import hashlib
import time

# ============================================================
# 6.1 Contract 타입
# ============================================================
class ContractType(str, Enum):
    CONTRACT = "CONTRACT"       # 법적 계약/협약
    OBLIGATION = "OBLIGATION"   # 내부 책임/업무
    REPORT = "REPORT"           # 보고/공시/자료 제출

# ============================================================
# 6.2 상태 머신
# ============================================================
class ContractStatus(str, Enum):
    PENDING = "PENDING"     # 미착수
    PARTIAL = "PARTIAL"     # 진행 중/부분 이행
    RESOLVED = "RESOLVED"   # 완료/종결

# ============================================================
# Contract 이벤트
# ============================================================
@dataclass
class ContractEvent:
    contract_id: str
    contract_type: ContractType
    owner: str
    counterparty: str
    due_date: str  # ISO format
    progress: float = 0.0  # 0~1
    alignment: float = 1.0
    status: ContractStatus = ContractStatus.PENDING
    created_at: float = field(default_factory=time.time)
    last_update: float = field(default_factory=time.time)
    evidence_hash: str = ""
    
    def __post_init__(self):
        if not self.evidence_hash:
            self.evidence_hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        data = f"{self.contract_id}:{self.owner}:{self.counterparty}:{self.due_date}:{self.progress}"
        return "0x" + hashlib.sha256(data.encode()).hexdigest()[:8].upper()
    
    def update_progress(self, progress: float):
        self.progress = max(0, min(1, progress))
        self.last_update = time.time()
        self.evidence_hash = self._compute_hash()
        
        if self.progress >= 1.0:
            self.status = ContractStatus.RESOLVED
        elif self.progress > 0:
            self.status = ContractStatus.PARTIAL

# ============================================================
# Weight by Type
# ============================================================
TYPE_WEIGHTS = {
    ContractType.CONTRACT: 1.5,
    ContractType.OBLIGATION: 1.0,
    ContractType.REPORT: 0.8
}

# ============================================================
# 7.1 개별 계약 엔트로피
# ============================================================
def calc_time_overdue_factor(due_date: str) -> float:
    """
    TimeOverdueFactor ≥ 1 (기한 초과 시 증가)
    """
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        now = datetime.now(due.tzinfo) if due.tzinfo else datetime.now()
        
        days_diff = (now - due).days
        
        if days_diff <= 0:
            return 1.0  # 기한 내
        else:
            return 1.0 + (days_diff * 0.1)  # 하루당 10% 증가
    except:
        return 1.0

def calc_contract_entropy(contract: ContractEvent) -> float:
    """
    ContractEntropy_i = Weight(type) × (1 - Progress) × TimeOverdueFactor × (1 - Alignment)
    """
    weight = TYPE_WEIGHTS.get(contract.contract_type, 1.0)
    progress_factor = 1.0 - contract.progress
    time_factor = calc_time_overdue_factor(contract.due_date)
    alignment_factor = 1.0 - contract.alignment
    
    return weight * progress_factor * time_factor * alignment_factor

# ============================================================
# 7.2 누적 ContractEntropy
# ============================================================
def calc_total_contract_entropy(contracts: List[ContractEvent]) -> float:
    """
    TotalContractEntropy = Σ ContractEntropy_i
    """
    if not contracts:
        return 0.0
    
    total = sum(calc_contract_entropy(c) for c in contracts if c.status != ContractStatus.RESOLVED)
    return min(1.0, total / len(contracts))  # 정규화

# ============================================================
# 8. 자동 감사 규칙
# ============================================================
class AuditReason(str, Enum):
    OVERDUE = "OVERDUE"
    LOW_PROGRESS = "LOW_PROGRESS"
    OVERDUE_LOW_PROGRESS = "OVERDUE_LOW_PROGRESS"
    ALIGNMENT_DROP = "ALIGNMENT_DROP"
    PRESSURE_SPIKE = "PRESSURE_SPIKE"
    STAGNANT = "STAGNANT"

@dataclass
class AuditFlag:
    contract_id: str
    reason: AuditReason
    impact: float
    details: str = ""
    ts: float = field(default_factory=time.time)

def check_audit_triggers(
    contract: ContractEvent,
    prev_alignment: float = None,
    external_pressure: float = 0.0
) -> List[AuditFlag]:
    """자동 감사 트리거 체크"""
    flags = []
    
    # 기한 초과
    time_factor = calc_time_overdue_factor(contract.due_date)
    is_overdue = time_factor > 1.0
    
    # Progress 정체 (30% 미만)
    is_low_progress = contract.progress < 0.3
    
    # 복합 조건
    if is_overdue and is_low_progress:
        flags.append(AuditFlag(
            contract_id=contract.contract_id,
            reason=AuditReason.OVERDUE_LOW_PROGRESS,
            impact=calc_contract_entropy(contract),
            details=f"Overdue by {(time_factor-1)*10:.0f} days, progress {contract.progress*100:.0f}%"
        ))
    elif is_overdue:
        flags.append(AuditFlag(
            contract_id=contract.contract_id,
            reason=AuditReason.OVERDUE,
            impact=calc_contract_entropy(contract) * 0.5,
            details=f"Overdue by {(time_factor-1)*10:.0f} days"
        ))
    elif is_low_progress:
        flags.append(AuditFlag(
            contract_id=contract.contract_id,
            reason=AuditReason.LOW_PROGRESS,
            impact=calc_contract_entropy(contract) * 0.3,
            details=f"Progress only {contract.progress*100:.0f}%"
        ))
    
    # Alignment 급락
    if prev_alignment and (prev_alignment - contract.alignment) > 0.2:
        flags.append(AuditFlag(
            contract_id=contract.contract_id,
            reason=AuditReason.ALIGNMENT_DROP,
            impact=0.1,
            details=f"Alignment dropped from {prev_alignment:.2f} to {contract.alignment:.2f}"
        ))
    
    # ExternalPressure 급증
    if external_pressure > 0.7:
        flags.append(AuditFlag(
            contract_id=contract.contract_id,
            reason=AuditReason.PRESSURE_SPIKE,
            impact=external_pressure * 0.2,
            details=f"External pressure at {external_pressure:.2f}"
        ))
    
    return flags

# ============================================================
# 감사 로그
# ============================================================
@dataclass
class AuditLog:
    """자동 감사 로그"""
    logs: List[AuditFlag] = field(default_factory=list)
    
    def add(self, flag: AuditFlag):
        self.logs.append(flag)
    
    def get_recent(self, n: int = 10) -> List[AuditFlag]:
        return sorted(self.logs, key=lambda x: x.ts, reverse=True)[:n]
    
    def get_by_contract(self, contract_id: str) -> List[AuditFlag]:
        return [f for f in self.logs if f.contract_id == contract_id]
    
    def total_impact(self) -> float:
        return sum(f.impact for f in self.logs)

# ============================================================
# 통합 처리
# ============================================================
@dataclass
class ContractEntropyResult:
    total_entropy: float
    contracts_count: int
    unresolved_count: int
    audit_flags: List[AuditFlag]

def process_contracts(
    contracts: List[ContractEvent],
    external_pressure: float = 0.0
) -> ContractEntropyResult:
    """전체 계약 처리"""
    audit_flags = []
    
    for c in contracts:
        if c.status != ContractStatus.RESOLVED:
            flags = check_audit_triggers(c, external_pressure=external_pressure)
            audit_flags.extend(flags)
    
    unresolved = [c for c in contracts if c.status != ContractStatus.RESOLVED]
    
    return ContractEntropyResult(
        total_entropy=round(calc_total_contract_entropy(contracts), 4),
        contracts_count=len(contracts),
        unresolved_count=len(unresolved),
        audit_flags=audit_flags
    )

# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    contracts = [
        ContractEvent(
            contract_id="CTR_001",
            contract_type=ContractType.REPORT,
            owner="ORG_001",
            counterparty="CITY_001",
            due_date="2025-12-10",  # 과거 (기한 초과)
            progress=0.4,
            alignment=0.62
        ),
        ContractEvent(
            contract_id="CTR_002",
            contract_type=ContractType.CONTRACT,
            owner="ORG_001",
            counterparty="NAT_001",
            due_date="2025-12-25",  # 미래
            progress=0.7,
            alignment=0.85
        )
    ]
    
    result = process_contracts(contracts, external_pressure=0.3)
    
    print(f"Total Entropy: {result.total_entropy}")
    print(f"Contracts: {result.contracts_count}")
    print(f"Unresolved: {result.unresolved_count}")
    print(f"Audit Flags: {len(result.audit_flags)}")
    for f in result.audit_flags:
        print(f"  - {f.contract_id}: {f.reason.value} (impact: {f.impact:.3f})")
