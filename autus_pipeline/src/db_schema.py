#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Schema                                        ║
║                                                                                           ║
║  Layer 3: 데이터베이스 스키마 정의                                                          ║
║  - SQLite (로컬 개발)                                                                      ║
║  - PostgreSQL (프로덕션)                                                                   ║
║                                                                                           ║
║  테이블:                                                                                   ║
║  1. events - Money/Burn 이벤트 저장                                                        ║
║  2. insights - LLM 분석 인사이트                                                           ║
║  3. archives - 삭제된 데이터 요약                                                          ║
║  4. proposals - 개선 제안 (승인 대기)                                                      ║
║  5. flywheel_history - Flywheel 사이클 이력                                               ║
║  6. agent_logs - 에이전트 실행 로그                                                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════════════════

class EventType(str, Enum):
    CASH_IN = "CASH_IN"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    MRR = "MRR"
    COST_SAVED = "COST_SAVED"
    INVEST_CONFIRMED = "INVEST_CONFIRMED"
    DELIVERY_COMPLETE = "DELIVERY_COMPLETE"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    REFERRAL_TO_CONTRACT = "REFERRAL_TO_CONTRACT"


class BurnType(str, Enum):
    DELAY = "DELAY"
    REWORK = "REWORK"
    PREVENTED = "PREVENTED"
    FIXED = "FIXED"
    MISCOMMUNICATION = "MISCOMMUNICATION"
    DEFECT = "DEFECT"


class ProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXECUTED = "EXECUTED"


class AgentRole(str, Enum):
    RESEARCHER = "RESEARCHER"
    ANALYZER = "ANALYZER"
    EXECUTOR = "EXECUTOR"
    REPORTER = "REPORTER"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Data Classes (ORM-like)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class MoneyEvent:
    """Money 이벤트 스키마"""
    event_id: str
    date: str
    event_type: str
    currency: str
    amount: float
    people_tags: str
    effective_minutes: int
    evidence_id: str
    recommendation_type: str
    customer_id: str  # v1.3 필수
    project_id: Optional[str] = None
    amount_krw: Optional[float] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "date": self.date,
            "event_type": self.event_type,
            "currency": self.currency,
            "amount": self.amount,
            "people_tags": self.people_tags,
            "effective_minutes": self.effective_minutes,
            "evidence_id": self.evidence_id,
            "recommendation_type": self.recommendation_type,
            "customer_id": self.customer_id,
            "project_id": self.project_id,
            "amount_krw": self.amount_krw,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MoneyEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BurnEvent:
    """Burn 이벤트 스키마"""
    burn_id: str
    date: str
    burn_type: str
    loss_minutes: int
    evidence_id: str
    person_or_edge: Optional[str] = None
    prevented_by: Optional[str] = None
    prevented_minutes: Optional[int] = None
    week_id: Optional[str] = None
    processed: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "burn_id": self.burn_id,
            "date": self.date,
            "burn_type": self.burn_type,
            "loss_minutes": self.loss_minutes,
            "evidence_id": self.evidence_id,
            "person_or_edge": self.person_or_edge,
            "prevented_by": self.prevented_by,
            "prevented_minutes": self.prevented_minutes,
            "week_id": self.week_id,
            "processed": self.processed,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BurnEvent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Insight:
    """LLM 분석 인사이트"""
    insight_id: str
    week_id: str
    source: str  # "PIPELINE", "PILLARS", "LOOP"
    category: str  # "PATTERN", "ANOMALY", "RECOMMENDATION"
    content: str
    confidence: float  # 0.0 ~ 1.0
    metadata: str = "{}"  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "insight_id": self.insight_id,
            "week_id": self.week_id,
            "source": self.source,
            "category": self.category,
            "content": self.content,
            "confidence": self.confidence,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }


@dataclass
class Archive:
    """삭제된 데이터 요약"""
    archive_id: str
    original_type: str  # "MONEY_EVENT", "BURN_EVENT", "INSIGHT"
    original_id: str
    summary: str  # LLM 생성 요약
    reason: str  # "LOW_QUALITY", "INACTIVE", "DUPLICATE"
    original_data: str  # JSON string
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "archive_id": self.archive_id,
            "original_type": self.original_type,
            "original_id": self.original_id,
            "summary": self.summary,
            "reason": self.reason,
            "original_data": self.original_data,
            "created_at": self.created_at,
        }


@dataclass
class Proposal:
    """개선 제안 (Human-in-the-Loop)"""
    proposal_id: str
    week_id: str
    trigger: str  # "HIGH_ENTROPY", "LOW_ROI", "WEAK_PILLAR"
    analysis: str  # Reflexion 분석 결과
    suggestion: str  # 구체적 개선 제안
    expected_impact: str  # 예상 효과
    status: str = ProposalStatus.PENDING.value
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    executed_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "week_id": self.week_id,
            "trigger": self.trigger,
            "analysis": self.analysis,
            "suggestion": self.suggestion,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at,
            "executed_at": self.executed_at,
            "created_at": self.created_at,
        }


@dataclass
class FlywheelCycle:
    """Flywheel 사이클 이력"""
    cycle_id: str
    week_id: str
    
    # KPI
    net_krw: float
    mint_krw: float
    burn_krw: float
    entropy_ratio: float
    
    # 5 Pillars
    vision_score: float
    risk_score: float
    innovation_score: float
    learning_score: float
    impact_score: float
    total_pillar_score: float
    
    # Flywheel
    velocity: float
    momentum: float
    invest_krw: float
    grow_krw: float
    profit_krw: float
    reinvest_krw: float
    
    # Team
    team: str  # JSON array
    team_score: float
    
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "week_id": self.week_id,
            "net_krw": self.net_krw,
            "mint_krw": self.mint_krw,
            "burn_krw": self.burn_krw,
            "entropy_ratio": self.entropy_ratio,
            "vision_score": self.vision_score,
            "risk_score": self.risk_score,
            "innovation_score": self.innovation_score,
            "learning_score": self.learning_score,
            "impact_score": self.impact_score,
            "total_pillar_score": self.total_pillar_score,
            "velocity": self.velocity,
            "momentum": self.momentum,
            "invest_krw": self.invest_krw,
            "grow_krw": self.grow_krw,
            "profit_krw": self.profit_krw,
            "reinvest_krw": self.reinvest_krw,
            "team": self.team,
            "team_score": self.team_score,
            "created_at": self.created_at,
        }


@dataclass
class AgentLog:
    """에이전트 실행 로그"""
    log_id: str
    agent_role: str
    task: str
    input_data: str  # JSON
    output_data: str  # JSON
    success: bool
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "log_id": self.log_id,
            "agent_role": self.agent_role,
            "task": self.task,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "success": self.success,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "created_at": self.created_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SQL Schema Definitions
# ═══════════════════════════════════════════════════════════════════════════════════════════

SQLITE_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    amount_krw REAL,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    burn_type TEXT NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    person_or_edge TEXT,
    prevented_by TEXT,
    prevented_minutes INTEGER,
    week_id TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id TEXT PRIMARY KEY,
    original_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    reason TEXT NOT NULL,
    original_data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    approved_at TEXT,
    executed_at TEXT,
    created_at TEXT NOT NULL
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL UNIQUE,
    net_krw REAL NOT NULL,
    mint_krw REAL NOT NULL,
    burn_krw REAL NOT NULL,
    entropy_ratio REAL NOT NULL,
    vision_score REAL NOT NULL,
    risk_score REAL NOT NULL,
    innovation_score REAL NOT NULL,
    learning_score REAL NOT NULL,
    impact_score REAL NOT NULL,
    total_pillar_score REAL NOT NULL,
    velocity REAL NOT NULL,
    momentum REAL NOT NULL,
    invest_krw REAL NOT NULL,
    grow_krw REAL NOT NULL,
    profit_krw REAL NOT NULL,
    reinvest_krw REAL NOT NULL,
    team TEXT NOT NULL,
    team_score REAL NOT NULL,
    created_at TEXT NOT NULL
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id TEXT PRIMARY KEY,
    agent_role TEXT NOT NULL,
    task TEXT NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    success INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""

POSTGRESQL_SCHEMA = """
-- Money Events
CREATE TABLE IF NOT EXISTS money_events (
    event_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    people_tags TEXT NOT NULL,
    effective_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    amount_krw DECIMAL(15,2),
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Burn Events
CREATE TABLE IF NOT EXISTS burn_events (
    burn_id VARCHAR(255) PRIMARY KEY,
    date DATE NOT NULL,
    burn_type VARCHAR(50) NOT NULL,
    loss_minutes INTEGER NOT NULL,
    evidence_id VARCHAR(255) NOT NULL,
    person_or_edge VARCHAR(255),
    prevented_by VARCHAR(255),
    prevented_minutes INTEGER,
    week_id VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    insight_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archives
CREATE TABLE IF NOT EXISTS archives (
    archive_id VARCHAR(255) PRIMARY KEY,
    original_type VARCHAR(50) NOT NULL,
    original_id VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    original_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    proposal_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL,
    trigger VARCHAR(50) NOT NULL,
    analysis TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flywheel History
CREATE TABLE IF NOT EXISTS flywheel_history (
    cycle_id VARCHAR(255) PRIMARY KEY,
    week_id VARCHAR(20) NOT NULL UNIQUE,
    net_krw DECIMAL(15,2) NOT NULL,
    mint_krw DECIMAL(15,2) NOT NULL,
    burn_krw DECIMAL(15,2) NOT NULL,
    entropy_ratio DECIMAL(5,4) NOT NULL,
    vision_score DECIMAL(5,4) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    innovation_score DECIMAL(5,4) NOT NULL,
    learning_score DECIMAL(5,4) NOT NULL,
    impact_score DECIMAL(5,4) NOT NULL,
    total_pillar_score DECIMAL(5,4) NOT NULL,
    velocity DECIMAL(5,4) NOT NULL,
    momentum DECIMAL(5,4) NOT NULL,
    invest_krw DECIMAL(15,2) NOT NULL,
    grow_krw DECIMAL(15,2) NOT NULL,
    profit_krw DECIMAL(15,2) NOT NULL,
    reinvest_krw DECIMAL(15,2) NOT NULL,
    team JSONB NOT NULL,
    team_score DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Agent Logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id VARCHAR(255) PRIMARY KEY,
    agent_role VARCHAR(50) NOT NULL,
    task TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_money_events_week ON money_events(week_id);
CREATE INDEX IF NOT EXISTS idx_money_events_processed ON money_events(processed);
CREATE INDEX IF NOT EXISTS idx_burn_events_week ON burn_events(week_id);
CREATE INDEX IF NOT EXISTS idx_insights_week ON insights(week_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_flywheel_week ON flywheel_history(week_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_role ON agent_logs(agent_role);
"""




















