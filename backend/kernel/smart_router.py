"""
Smart Router Rules v1
======================
"누가, 무엇을 할 때, 어디로 보내는가?"를 결정하는 헌법
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Literal
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# ============================================
# Router Actions
# ============================================

class RouterAction(str, Enum):
    AUTO_EXECUTE = "AUTO_EXECUTE"        # 자동 실행
    FORCE_ROUTE = "FORCE_ROUTE"          # 강제 라우팅
    REQUEST_APPROVAL = "REQUEST_APPROVAL" # 승인 요청
    BLOCK = "BLOCK"                       # 차단

@dataclass
class RouterDecision:
    """라우팅 결정 결과"""
    action: RouterAction
    target: Optional[str] = None
    message: str = ""
    rule_id: Optional[str] = None
    confidence: float = 1.0

# ============================================
# Rule Definitions
# ============================================

@dataclass
class RouterRule:
    """라우팅 규칙"""
    rule_id: str
    comment: str
    conditions: Dict[str, Any]
    action: RouterAction
    target: Optional[str] = None
    message: str = ""
    priority: int = 0  # 높을수록 우선

# ============================================
# Default Rules (헌법)
# ============================================

DEFAULT_RULES: List[RouterRule] = [
    # SMB Rules
    RouterRule(
        rule_id="SMB_PRICE_GAP",
        comment="SMB: 비용이 글로벌 표준보다 10% 이상 비싸면 사장 보고 강제",
        conditions={
            "org_type": "SMB",
            "motion_type": "M08",
            "gap_threshold": 0.10
        },
        action=RouterAction.FORCE_ROUTE,
        target="BOSS_APPROVAL",
        message="🚨 글로벌 최저가 대비 10% 이상 비쌉니다. 사장님 승인이 필요합니다.",
        priority=10
    ),
    RouterRule(
        rule_id="SMB_BUDGET_EXCEED",
        comment="SMB: 예산 한도 초과시 차단",
        conditions={
            "org_type": "SMB",
            "budget_exceeded": True
        },
        action=RouterAction.BLOCK,
        message="❌ 예산 한도를 초과했습니다. 예산 증액 후 재시도하세요.",
        priority=100
    ),
    RouterRule(
        rule_id="SMB_LOW_RISK_AUTO",
        comment="SMB: 저위험 반복 작업 자동 실행",
        conditions={
            "org_type": "SMB",
            "risk_level": {"<=": 2},
            "is_repeated": True
        },
        action=RouterAction.AUTO_EXECUTE,
        message="✅ 저위험 반복 작업으로 자동 처리됩니다.",
        priority=5
    ),
    
    # GOV Rules
    RouterRule(
        rule_id="GOV_NO_LEGAL_BASIS",
        comment="GOV: 신규 시도인데 법적 근거가 없으면 감사실 검토 강제",
        conditions={
            "org_type": "GOV",
            "is_new_attempt": True,
            "legal_basis_found": False
        },
        action=RouterAction.FORCE_ROUTE,
        target="AUDIT_REVIEW",
        message="⚠️ 법적 근거가 불명확합니다. 감사실 사전 검토가 필요합니다.",
        priority=20
    ),
    RouterRule(
        rule_id="GOV_PRECEDENT_MATCH",
        comment="GOV: 반복 업무이고 성공 사례와 99% 일치하면 자동 실행",
        conditions={
            "org_type": "GOV",
            "is_repeated": True,
            "precedent_match": {">=": 0.99}
        },
        action=RouterAction.AUTO_EXECUTE,
        message="✅ 표준 성공 사례에 근거하여 자동 처리합니다.",
        priority=15
    ),
    RouterRule(
        rule_id="GOV_HIGH_RISK",
        comment="GOV: 고위험 작업은 다단계 결재 필수",
        conditions={
            "org_type": "GOV",
            "risk_level": {">=": 4}
        },
        action=RouterAction.REQUEST_APPROVAL,
        target="MULTI_LEVEL",
        message="📋 고위험 작업입니다. 다단계 결재가 필요합니다.",
        priority=25
    ),
    
    # Universal Rules
    RouterRule(
        rule_id="CONTRACT_ALWAYS_APPROVE",
        comment="계약(M05)은 항상 승인 필요",
        conditions={
            "motion_type": "M05"
        },
        action=RouterAction.REQUEST_APPROVAL,
        target="LEGAL_REVIEW",
        message="📝 계약 체결은 법무 검토가 필요합니다.",
        priority=50
    ),
    RouterRule(
        rule_id="AUTH_DELEGATION_APPROVE",
        comment="위임(M10)은 상위자 승인 필요",
        conditions={
            "motion_type": "M10"
        },
        action=RouterAction.REQUEST_APPROVAL,
        target="SUPERIOR",
        message="🔐 권한 위임은 상위자 승인이 필요합니다.",
        priority=50
    ),
]

# ============================================
# Smart Router Engine
# ============================================

class SmartRouter:
    """스마트 라우터 엔진"""
    
    def __init__(self, custom_rules: Optional[List[RouterRule]] = None):
        self.rules = sorted(
            DEFAULT_RULES + (custom_rules or []),
            key=lambda r: r.priority,
            reverse=True
        )
    
    def route(self, context: Dict[str, Any]) -> RouterDecision:
        """
        컨텍스트를 분석하여 라우팅 결정
        
        Args:
            context: {
                "org_type": "SMB" | "GOV",
                "motion_type": "M01" ~ "M10",
                "entity_id": str,
                "risk_level": int,
                "is_repeated": bool,
                "budget_exceeded": bool,
                "gap_analysis": {"value": float},
                "legal_basis_found": bool,
                "precedent_match": float,
                ...
            }
        """
        logger.debug(f"Routing context: {context}")
        
        for rule in self.rules:
            if self._match_conditions(rule.conditions, context):
                logger.info(f"Matched rule: {rule.rule_id}")
                return RouterDecision(
                    action=rule.action,
                    target=rule.target,
                    message=rule.message,
                    rule_id=rule.rule_id
                )
        
        # 기본: 승인 요청
        return RouterDecision(
            action=RouterAction.REQUEST_APPROVAL,
            target="DEFAULT",
            message="일반 승인 프로세스를 진행합니다.",
            rule_id="DEFAULT"
        )
    
    def _match_conditions(self, conditions: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """조건 매칭"""
        for key, expected in conditions.items():
            actual = context.get(key)
            
            # 딕셔너리 연산자 처리 (>=, <=, >, <)
            if isinstance(expected, dict):
                for op, val in expected.items():
                    if op == ">=" and not (actual is not None and actual >= val):
                        return False
                    if op == "<=" and not (actual is not None and actual <= val):
                        return False
                    if op == ">" and not (actual is not None and actual > val):
                        return False
                    if op == "<" and not (actual is not None and actual < val):
                        return False
            else:
                # 단순 일치
                if actual != expected:
                    return False
        
        return True
    
    def add_rule(self, rule: RouterRule):
        """규칙 추가"""
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def get_rules_json(self) -> List[Dict]:
        """규칙을 JSON으로 반환"""
        return [
            {
                "rule_id": r.rule_id,
                "comment": r.comment,
                "conditions": r.conditions,
                "action": r.action.value,
                "target": r.target,
                "message": r.message,
                "priority": r.priority
            }
            for r in self.rules
        ]

# Singleton instance
router = SmartRouter()
