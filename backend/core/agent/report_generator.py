"""
═══════════════════════════════════════════════════════════════════════════════
📊 AUTUS Agent - Report Generator & Freedom Metrics
═══════════════════════════════════════════════════════════════════════════════

AGI 대리인의 일일 실행 보고서 생성
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime

from .types import (
    DailyAgentReport, AgentAction, AgentType, FreedomMetrics,
    EnergyState, EnergySaved, LeapfrogIndex,
)
from .energy_tracker import calculate_daily_energy_saved

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 일일 보고서 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_daily_report(
    date: datetime,
    financial_actions: List[AgentAction],
    decision_actions: List[AgentAction],
    social_actions: List[AgentAction],
    energy_saved: List[EnergySaved],
    energy_state: EnergyState,
    nodes: Dict,
    total_decisions_today: int,
    deleted_worries: Dict[str, List[str]]
) -> DailyAgentReport:
    """일일 보고서 생성"""
    all_actions = financial_actions + decision_actions + social_actions
    
    # 액션별 집계
    actions_by_agent = {
        'financial': len(financial_actions),
        'decision': len(decision_actions),
        'social': len(social_actions),
        'location': 0,
    }
    
    executed = [a for a in all_actions if a.status == 'executed']
    success_rate = len(executed) / len(all_actions) if all_actions else 0
    
    # 절약된 자원
    time_saved = sum(a.actual_time_saved or a.estimated_time_saved for a in all_actions)
    energy_report = calculate_daily_energy_saved(energy_saved)
    
    # 삭제된 걱정 통합
    all_deleted_worries = (
        deleted_worries.get('financial', []) +
        deleted_worries.get('brain_fog', []) +
        deleted_worries.get('guilt', [])
    )
    
    # 자유 지표
    decisions_saved = len([
        a for a in decision_actions 
        if a.action_type == 'auto_decide' and a.status == 'executed'
    ])
    
    filtered_info = sum(
        getattr(a, 'filtered_count', 0) or 0
        for a in decision_actions if a.action_type == 'info_filter'
    )
    
    declined_requests = len([
        a for a in social_actions 
        if a.action_type == 'decline_request' and a.status == 'executed'
    ])
    
    # 순수 의지 결정 비율
    pure_will_decisions = total_decisions_today - decisions_saved
    freedom_score = _calculate_freedom_score(
        time_saved, energy_report['total'], pure_will_decisions, total_decisions_today
    )
    
    # 초월 지수
    leapfrog = _calculate_leapfrog_index(
        time_saved, energy_report['total'], energy_state.net_available_energy
    )
    
    # 인사이트 생성
    insights = _generate_insights(all_actions, energy_saved, energy_state, deleted_worries)
    recommendations = _generate_recommendations(all_actions, energy_state)
    
    return DailyAgentReport(
        date=date,
        total_actions=len(all_actions),
        actions_by_agent=actions_by_agent,
        success_rate=success_rate,
        time_saved=time_saved,
        decisions_saved=decisions_saved,
        energy_preserved=energy_report['total'],
        deleted_worries=all_deleted_worries,
        filtered_information=filtered_info,
        declined_requests=declined_requests,
        freedom_score=freedom_score,
        pure_will_decisions=pure_will_decisions,
        total_decisions=total_decisions_today,
        leapfrog_index=leapfrog,
        actions=all_actions,
        insights=insights,
        recommendations=recommendations,
    )


def _calculate_freedom_score(
    time_saved: int,
    energy_saved: float,
    pure_will_decisions: int,
    total_decisions: int
) -> int:
    """자유 점수 계산"""
    # 시간 자유 (최대 25점)
    time_score = min(25, (time_saved / 240) * 25)
    
    # 에너지 자유 (최대 25점)
    energy_score = min(25, energy_saved * 100)
    
    # 의지 자유 (최대 25점)
    will_ratio = pure_will_decisions / total_decisions if total_decisions > 0 else 0.5
    will_score = will_ratio * 25
    
    # 기본 점수 (25점)
    base_score = 25
    
    return round(base_score + time_score + energy_score + will_score)


def _calculate_leapfrog_index(
    time_saved: int,
    energy_saved: float,
    current_energy: float
) -> LeapfrogIndex:
    """초월 지수 계산"""
    # 현재 효율성
    current_efficiency = 1 + (time_saved / 1440) + energy_saved
    
    # 타겟 효율성 (엘리트 그룹)
    target_efficiency = 1.5
    
    # 도달 예상 일수
    daily_growth = 0.01
    gap = target_efficiency - current_efficiency
    days_to_target = int(gap / daily_growth) if gap > 0 else 0
    
    # 백분위
    percentile_rank = min(99, round(current_efficiency * 50))
    
    return LeapfrogIndex(
        current_efficiency=round(current_efficiency, 2),
        target_efficiency=target_efficiency,
        days_to_target=days_to_target,
        percentile_rank=percentile_rank,
    )


def _generate_insights(
    actions: List[AgentAction],
    energy_saved: List[EnergySaved],
    energy_state: EnergyState,
    deleted_worries: Dict[str, List[str]]
) -> List[str]:
    """인사이트 생성"""
    insights = []
    
    # 시간 절약
    time_saved = sum(a.actual_time_saved or a.estimated_time_saved for a in actions)
    if time_saved > 0:
        hours = time_saved // 60
        minutes = time_saved % 60
        time_str = f'{hours}시간 ' if hours > 0 else ''
        insights.append(
            f'오늘 {time_str}{minutes}분을 절약했습니다. '
            f'남들의 24시간을 당신은 {24 + hours + (minutes/60):.1f}시간으로 살았습니다.'
        )
    
    # 에너지 보존
    energy_report = calculate_daily_energy_saved(energy_saved)
    if energy_report['total'] > 0.1:
        insights.append(
            f'인지 에너지 {energy_report["total"] * 100:.0f}%가 보존되었습니다. '
            f'이 에너지는 창의적 작업에 투입할 수 있습니다.'
        )
    
    # 걱정 삭제
    total_worries = sum(len(v) for v in deleted_worries.values())
    if total_worries > 0:
        insights.append(
            f'{total_worries}개의 불필요한 걱정과 고민이 삭제되었습니다. '
            f'당신의 뇌는 이제 Top-1 목표에만 집중할 수 있습니다.'
        )
    
    # 에너지 상태
    if energy_state.net_available_energy > 0.7:
        insights.append(
            f'현재 순수 가용 에너지가 {energy_state.net_available_energy * 100:.0f}%로 최적 상태입니다. '
            f'고집중 작업에 적합한 시간입니다.'
        )
    elif energy_state.net_available_energy < 0.3:
        insights.append(
            f'에너지가 {energy_state.net_available_energy * 100:.0f}%로 낮습니다. '
            f'휴식을 권장합니다: {energy_state.optimal_rest_time}'
        )
    
    return insights


def _generate_recommendations(
    actions: List[AgentAction],
    energy_state: EnergyState
) -> List[str]:
    """권장 사항 생성"""
    recommendations = []
    
    # 대기 중인 액션
    pending = [a for a in actions if a.status == 'pending']
    if len(pending) > 5:
        recommendations.append(
            f'{len(pending)}개의 액션이 승인 대기 중입니다. '
            f'자동 실행 권한을 높이면 더 많은 시간을 절약할 수 있습니다.'
        )
    
    # 에너지 관리
    if energy_state.burn_rate > 0.1:
        recommendations.append(
            '에너지 소모율이 높습니다. 컨텍스트 스위칭을 줄이고 배칭 작업을 권장합니다.'
        )
    
    return recommendations


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자유 메트릭스 계산
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_freedom_metrics(
    reports: List[DailyAgentReport],
    nodes: Dict
) -> FreedomMetrics:
    """자유 메트릭스 계산"""
    recent = reports[-7:] if reports else []
    
    # 재무 자유
    cash_pressure = getattr(nodes.get('n01'), 'pressure', 0.5) if nodes.get('n01') else 0.5
    runway_pressure = getattr(nodes.get('n05'), 'pressure', 0.5) if nodes.get('n05') else 0.5
    financial_score = round((1 - (cash_pressure + runway_pressure) / 2) * 100)
    
    automated_bills = sum(
        1 for r in recent for a in r.actions 
        if getattr(a, 'action_type', None) == 'bill_payment' and a.status == 'executed'
    )
    
    # 정신 자유
    decisions_automated = sum(r.decisions_saved for r in recent)
    info_filtered = sum(r.filtered_information for r in recent)
    avg_energy = sum(r.energy_preserved for r in recent) / max(1, len(recent))
    mental_score = round(50 + avg_energy * 50)
    
    # 사회 자유
    auto_replies = sum(
        1 for r in recent for a in r.actions
        if getattr(a, 'action_type', None) == 'auto_reply'
    )
    declined = sum(r.declined_requests for r in recent)
    social_score = round(50 + (auto_replies + declined) * 2)
    
    # 종합
    total_freedom = round((financial_score + mental_score + social_score + 60) / 4)
    
    # 트렌드
    freedom_trend = 'stable'
    if len(recent) >= 3:
        first_half = recent[:len(recent)//2]
        second_half = recent[len(recent)//2:]
        first_avg = sum(r.freedom_score for r in first_half) / len(first_half) if first_half else 0
        second_avg = sum(r.freedom_score for r in second_half) / len(second_half) if second_half else 0
        
        if second_avg > first_avg + 5:
            freedom_trend = 'increasing'
        elif second_avg < first_avg - 5:
            freedom_trend = 'decreasing'
    
    return FreedomMetrics(
        financial={'score': financial_score, 'automated_bills': automated_bills},
        mental={'score': mental_score, 'decisions_automated': decisions_automated, 'info_filtered': info_filtered},
        social={'score': social_score, 'auto_replies': auto_replies, 'declined_obligations': declined},
        locational={'score': 60, 'remote_capability': 0.6},
        total_freedom=total_freedom,
        freedom_trend=freedom_trend,
        next_milestone=_get_next_milestone(total_freedom),
    )


def _get_next_milestone(current_freedom: int) -> str:
    """다음 마일스톤"""
    if current_freedom < 50:
        return '기본 자동화 완료 (50점)'
    if current_freedom < 70:
        return '심화 자동화 (70점)'
    if current_freedom < 85:
        return '완전 자율 주행 (85점)'
    if current_freedom < 95:
        return '초월적 자유 (95점)'
    return '인간 한계 돌파'


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 보고서 포맷팅
# ═══════════════════════════════════════════════════════════════════════════════

def format_report_text(report: DailyAgentReport) -> str:
    """보고서 텍스트 포맷팅"""
    hours = report.time_saved // 60
    minutes = report.time_saved % 60
    
    worries_text = '\n'.join(f'• {w}' for w in report.deleted_worries) if report.deleted_worries else '• 없음'
    insights_text = '\n'.join(f'• {i}' for i in report.insights) if report.insights else '• 없음'
    recommendations_text = '\n'.join(f'• {r}' for r in report.recommendations) if report.recommendations else '• 없음'
    
    return f"""
═══════════════════════════════════════════════════════════════
🤖 AUTUS AGI Agent Report: {report.date.strftime('%Y. %m. %d.')}
"당신이 몰입하거나 휴식하는 동안, 아우투스는 당신의 우주를 정돈했습니다."
═══════════════════════════════════════════════════════════════

📊 자율 실행 요약
──────────────────
• 총 실행: {report.total_actions}건 (성공률 {report.success_rate * 100:.0f}%)
  - 금융: {report.actions_by_agent.get('financial', 0)}건
  - 의사결정: {report.actions_by_agent.get('decision', 0)}건
  - 사회적: {report.actions_by_agent.get('social', 0)}건

⏰ 절약된 자원
──────────────────
• 확보된 시간: {f'{hours}시간 ' if hours > 0 else ''}{minutes}분
• 대리 결정: {report.decisions_saved}건
• 보존된 에너지: {report.energy_preserved * 100:.0f}%

🗑️ 삭제된 엔트로피
──────────────────
{worries_text}
• 필터링된 정보: {report.filtered_information}개
• 거절된 요청: {report.declined_requests}건

🕊️ 자유 지표
──────────────────
• 자유 점수: {report.freedom_score}/100
• 순수 의지 결정: {report.pure_will_decisions}/{report.total_decisions}건

🚀 초월 지수
──────────────────
• 현재 효율성: {report.leapfrog_index.current_efficiency}x
• 타겟 대비: {report.leapfrog_index.percentile_rank}%ile
• 목표 도달: {report.leapfrog_index.days_to_target}일

💡 인사이트
──────────────────
{insights_text}

📌 권장 사항
──────────────────
{recommendations_text}

═══════════════════════════════════════════════════════════════
"당신은 이제 인간의 한계를 지웠습니다."
═══════════════════════════════════════════════════════════════
""".strip()
