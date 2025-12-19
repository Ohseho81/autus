"""ContractEntropy Engine v1.0"""
from dataclasses import dataclass, field
from typing import List
from enum import Enum
import hashlib, time
from datetime import datetime

class ContractType(str, Enum):
    CONTRACT = "CONTRACT"
    OBLIGATION = "OBLIGATION"
    REPORT = "REPORT"

class ContractStatus(str, Enum):
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    RESOLVED = "RESOLVED"

@dataclass
class ContractEvent:
    contract_id: str
    contract_type: ContractType
    owner: str
    counterparty: str
    due_date: str
    progress: float = 0.0
    alignment: float = 1.0
    status: ContractStatus = ContractStatus.PENDING
    created_at: float = field(default_factory=time.time)
    evidence_hash: str = ""

TYPE_WEIGHTS = {ContractType.CONTRACT: 1.5, ContractType.OBLIGATION: 1.0, ContractType.REPORT: 0.8}

def calc_time_overdue(due_date):
    try:
        due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        days = (datetime.now() - due.replace(tzinfo=None)).days
        return 1.0 + max(0, days * 0.1)
    except: return 1.0

def calc_contract_entropy(c):
    return TYPE_WEIGHTS.get(c.contract_type, 1.0) * (1-c.progress) * calc_time_overdue(c.due_date) * (1-c.alignment)

def calc_total_contract_entropy(contracts):
    if not contracts: return 0.0
    total = sum(calc_contract_entropy(c) for c in contracts if c.status != ContractStatus.RESOLVED)
    return min(1.0, total / len(contracts))
