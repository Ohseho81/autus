"""
═══════════════════════════════════════════════════════════════════════════════
💰 AUTUS Agent - Financial Agent (금융 자율 주행)
═══════════════════════════════════════════════════════════════════════════════

Cash-flow Autopilot, Budget Enforcement, Auto Bill Payment
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime

from .types import (
    FinancialAgentConfig, FinancialAction, Bill, Expense,
    AgentAction,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 기본 설정
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_FINANCIAL_CONFIG = FinancialAgentConfig(
    id='financial_agent_default',
    type='financial',
    enabled=True,
    permission_level='suggest',
    execution_hours={'start': 9, 'end': 21},
    require_confirmation_above=100000,
    learning_enabled=True,
    auto_pay_bills=True,
    bill_payment_buffer=3,
    auto_rebalance=False,
    rebalance_threshold=5.0,
    risk_tolerance='moderate',
    budget_enforcement=True,
    category_limits={
        'dining': 500000,
        'shopping': 300000,
        'entertainment': 200000,
        'transport': 150000,
    },
)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 청구서 분석
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_bills(
    bills: List[Bill],
    config: FinancialAgentConfig,
    current_cash: float
) -> List[FinancialAction]:
    """예정된 청구서 분석"""
    actions: List[FinancialAction] = []
    now = datetime.now()
    buffer_days = config.bill_payment_buffer
    
    for bill in bills:
        if bill.status == 'paid':
            continue
        
        days_until_due = (bill.due_date - now).days
        
        # 납부일 임박
        if 0 <= days_until_due <= buffer_days:
            can_pay = current_cash >= bill.amount
            
            if config.auto_pay_bills and bill.auto_pay and can_pay:
                actions.append(_create_bill_payment_action(bill, config, 'auto'))
            elif not can_pay:
                actions.append(_create_bill_alert_action(bill, current_cash))
            else:
                actions.append(_create_bill_payment_action(bill, config, 'suggest'))
        
        # 연체
        if days_until_due < 0 and bill.status != 'overdue':
            actions.append(FinancialAction(
                id=f'fin_overdue_{bill.id}_{datetime.now().timestamp()}',
                agent_type='financial',
                timestamp=now,
                action_type='budget_alert',
                description=f'⚠️ {bill.name} 연체 ({abs(days_until_due)}일 경과)',
                target_nodes=['n01', 'n03'],
                status='pending',
                requires_approval=False,
                estimated_time_saved=0,
                estimated_energy_saved=0,
                reasoning='연체된 청구서가 있습니다. 즉시 처리가 필요합니다.',
                confidence=1.0,
                amount=bill.amount,
                category=bill.category,
            ))
    
    return actions


def _create_bill_payment_action(
    bill: Bill,
    config: FinancialAgentConfig,
    mode: str
) -> FinancialAction:
    """청구서 납부 액션 생성"""
    is_auto = mode == 'auto' and config.permission_level != 'observe'
    
    return FinancialAction(
        id=f'fin_pay_{bill.id}_{datetime.now().timestamp()}',
        agent_type='financial',
        timestamp=datetime.now(),
        action_type='bill_payment',
        description=f'{bill.name} 납부 ({bill.amount:,}원)',
        target_nodes=['n01', 'n03'],
        status='executed' if is_auto else 'pending',
        requires_approval=not is_auto and bill.amount > config.require_confirmation_above,
        estimated_time_saved=15,
        estimated_energy_saved=0.02,
        reasoning=f'납부일 {config.bill_payment_buffer}일 전 자동 처리',
        confidence=0.95,
        amount=bill.amount,
        from_account=bill.linked_account,
        category=bill.category,
    )


def _create_bill_alert_action(bill: Bill, current_cash: float) -> FinancialAction:
    """청구서 경고 액션 생성"""
    return FinancialAction(
        id=f'fin_alert_{bill.id}_{datetime.now().timestamp()}',
        agent_type='financial',
        timestamp=datetime.now(),
        action_type='budget_alert',
        description=f'⚠️ {bill.name} 납부 자금 부족 (필요: {bill.amount:,}, 현재: {current_cash:,})',
        target_nodes=['n01', 'n05'],
        status='pending',
        requires_approval=False,
        estimated_time_saved=0,
        estimated_energy_saved=0,
        reasoning='청구서 납부를 위한 현금이 부족합니다.',
        confidence=1.0,
        amount=int(bill.amount - current_cash),
        category=bill.category,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 예산 관리
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_budget(
    expenses: List[Expense],
    config: FinancialAgentConfig
) -> List[FinancialAction]:
    """예산 분석 및 경고"""
    actions: List[FinancialAction] = []
    
    if not config.budget_enforcement:
        return actions
    
    # 카테고리별 지출 합계
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)
    
    category_totals: Dict[str, int] = {}
    for expense in expenses:
        if expense.timestamp >= month_start:
            category_totals[expense.category] = category_totals.get(expense.category, 0) + expense.amount
    
    # 예산 초과 체크
    for category, limit in config.category_limits.items():
        spent = category_totals.get(category, 0)
        percentage = (spent / limit) * 100 if limit > 0 else 0
        
        if percentage >= 100:
            actions.append(FinancialAction(
                id=f'fin_budget_over_{category}_{datetime.now().timestamp()}',
                agent_type='financial',
                timestamp=now,
                action_type='budget_alert',
                description=f'🚨 {category} 예산 초과 ({percentage:.0f}%)',
                target_nodes=['n03'],
                status='pending',
                requires_approval=False,
                estimated_time_saved=0,
                estimated_energy_saved=0.01,
                reasoning=f'이번 달 {category} 예산 {limit:,}원을 초과했습니다.',
                confidence=1.0,
                amount=spent - limit,
                category=category,
            ))
        elif percentage >= 80:
            actions.append(FinancialAction(
                id=f'fin_budget_warn_{category}_{datetime.now().timestamp()}',
                agent_type='financial',
                timestamp=now,
                action_type='budget_alert',
                description=f'⚠️ {category} 예산 80% 도달',
                target_nodes=['n03'],
                status='executed' if config.permission_level == 'autonomous' else 'pending',
                requires_approval=False,
                estimated_time_saved=5,
                estimated_energy_saved=0.01,
                reasoning=f'{category} 지출이 예산의 {percentage:.0f}%에 도달했습니다.',
                confidence=0.9,
                amount=limit - spent,
                category=category,
            ))
    
    return actions


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Financial Agent 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_financial_agent(
    nodes: Dict,
    bills: List[Bill],
    expenses: List[Expense],
    config: FinancialAgentConfig
) -> List[FinancialAction]:
    """Financial Agent 실행"""
    if not config.enabled:
        return []
    
    current_cash = getattr(nodes.get('n01'), 'value', 0) if nodes.get('n01') else 0
    
    all_actions: List[FinancialAction] = []
    
    # 1. 청구서 분석
    bill_actions = analyze_bills(bills, config, current_cash)
    all_actions.extend(bill_actions)
    
    # 2. 예산 분석
    budget_actions = analyze_budget(expenses, config)
    all_actions.extend(budget_actions)
    
    # 3. 우선순위 정렬
    def priority_key(a: FinancialAction) -> int:
        if a.action_type == 'budget_alert' and '연체' in a.description:
            return 0
        if a.action_type == 'budget_alert' and '초과' in a.description:
            return 1
        return 2
    
    all_actions.sort(key=priority_key)
    
    return all_actions


def get_deleted_financial_worries(actions: List[FinancialAction]) -> List[str]:
    """삭제된 금융 걱정 목록"""
    worries: List[str] = []
    
    executed_bills = [a for a in actions if a.action_type == 'bill_payment' and a.status == 'executed']
    if executed_bills:
        worries.append(f'"이번 달 {len(executed_bills)}건의 청구서는 언제 내지?" → 자동 처리됨')
    
    budget_alerts = [a for a in actions if a.action_type == 'budget_alert' and '초과' not in a.description]
    if budget_alerts:
        worries.append('"예산 얼마나 썼지?" → 자동 모니터링 중')
    
    return worries
