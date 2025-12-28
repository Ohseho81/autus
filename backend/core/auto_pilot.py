"""
AUTUS Auto-Pilot System
========================

자동화된 관계 관리 시스템

Features:
1. Auto-Reply: 저시너지 노드 자동 응답
2. Auto-Block: 엔트로피 노드 자동 차단
3. Auto-Amplify: 고시너지 노드 자동 증폭
4. 7-Day Synergy Projection: 주간 시너지 예측

Physics:
- z >= 0.8: 골든 볼륨 (증폭 대상)
- z >= 0.3: 안정권 (유지)
- z >= -0.3: 마찰권 (자동 응답)
- z < -0.3: 엔트로피권 (차단/정리)

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import math
import random


# ================================================================
# CONSTANTS
# ================================================================

class AutoPilotConfig:
    """자동 조종 설정"""
    
    # 시너지 임계값
    GOLDEN_THRESHOLD = 0.8
    STABLE_THRESHOLD = 0.3
    FRICTION_THRESHOLD = -0.3
    ENTROPY_THRESHOLD = -0.5
    
    # 자동 응답 설정
    AUTO_REPLY_DELAY_HOURS = 24      # 24시간 지연 응답
    AUTO_REPLY_MAX_PER_DAY = 10      # 일일 최대 자동 응답
    
    # 자동 차단 설정
    AUTO_BLOCK_COOLDOWN_DAYS = 7     # 차단 후 재평가 기간
    
    # 시간 절약 계산
    AVG_REPLY_TIME_MINUTES = 15      # 평균 응답 시간
    AVG_MEETING_TIME_MINUTES = 60    # 평균 미팅 시간


# ================================================================
# ENUMS
# ================================================================

class AutoAction(Enum):
    """자동 액션 유형"""
    AMPLIFY = "amplify"           # 증폭 (골든 볼륨)
    MAINTAIN = "maintain"         # 유지 (안정권)
    DELAY_REPLY = "delay_reply"   # 지연 응답 (마찰권)
    AUTO_REPLY = "auto_reply"     # 자동 응답 (마찰권)
    SOFT_BLOCK = "soft_block"     # 소프트 차단 (엔트로피권)
    HARD_BLOCK = "hard_block"     # 하드 차단 (블랙홀)


class MessageTemplate(Enum):
    """자동 메시지 템플릿"""
    BUSY = "busy"
    DELEGATE = "delegate"
    DECLINE = "decline"
    RESCHEDULE = "reschedule"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class AutoReplyRule:
    """자동 응답 규칙"""
    id: str
    synergy_range: Tuple[float, float]
    action: AutoAction
    delay_hours: int
    template: MessageTemplate
    message: str
    enabled: bool = True


@dataclass
class AutoReplyResult:
    """자동 응답 결과"""
    node_id: str
    node_name: str
    synergy: float
    action: AutoAction
    message: str
    scheduled_at: datetime
    time_saved_minutes: int


@dataclass
class BlockedNode:
    """차단된 노드"""
    id: str
    name: str
    synergy: float
    blocked_at: datetime
    reason: str
    block_type: AutoAction
    review_at: datetime


@dataclass 
class SynergyProjection:
    """시너지 예측"""
    date: datetime
    node_id: str
    node_name: str
    current_synergy: float
    projected_synergy: float
    trend: str  # "rising", "stable", "declining"
    confidence: float
    recommended_action: str


@dataclass
class WeeklyProjectionReport:
    """주간 예측 리포트"""
    generated_at: datetime
    total_nodes: int
    golden_projected: int
    at_risk_nodes: List[Dict]
    rising_stars: List[Dict]
    daily_projections: List[Dict]
    total_time_saved: float
    value_projection: float


# ================================================================
# AUTO-REPLY ENGINE
# ================================================================

class AutoReplyEngine:
    """
    자동 응답 엔진
    
    저시너지 노드에 대한 자동 응답 관리
    """
    
    def __init__(self):
        self.rules = self._init_default_rules()
        self.pending_replies: List[AutoReplyResult] = []
        self.reply_history: List[AutoReplyResult] = []
    
    def _init_default_rules(self) -> List[AutoReplyRule]:
        """기본 규칙 초기화"""
        return [
            AutoReplyRule(
                id="rule_delay_friction",
                synergy_range=(-0.3, 0.3),
                action=AutoAction.DELAY_REPLY,
                delay_hours=24,
                template=MessageTemplate.BUSY,
                message="현재 중요한 프로젝트에 집중하고 있어 답변이 늦어질 수 있습니다. 긴급한 건은 별도로 말씀해 주세요.",
            ),
            AutoReplyRule(
                id="rule_auto_entropy",
                synergy_range=(-0.5, -0.3),
                action=AutoAction.AUTO_REPLY,
                delay_hours=48,
                template=MessageTemplate.DELEGATE,
                message="확인했습니다. 관련 담당자에게 전달드리겠습니다.",
            ),
            AutoReplyRule(
                id="rule_decline_blackhole",
                synergy_range=(-1.0, -0.5),
                action=AutoAction.SOFT_BLOCK,
                delay_hours=72,
                template=MessageTemplate.DECLINE,
                message="감사합니다만, 현재 일정상 어렵습니다.",
            ),
        ]
    
    def classify_node(self, synergy: float) -> AutoAction:
        """노드 분류"""
        if synergy >= AutoPilotConfig.GOLDEN_THRESHOLD:
            return AutoAction.AMPLIFY
        elif synergy >= AutoPilotConfig.STABLE_THRESHOLD:
            return AutoAction.MAINTAIN
        elif synergy >= AutoPilotConfig.FRICTION_THRESHOLD:
            return AutoAction.DELAY_REPLY
        elif synergy >= AutoPilotConfig.ENTROPY_THRESHOLD:
            return AutoAction.AUTO_REPLY
        else:
            return AutoAction.SOFT_BLOCK
    
    def get_rule_for_synergy(self, synergy: float) -> Optional[AutoReplyRule]:
        """시너지에 맞는 규칙 반환"""
        for rule in self.rules:
            if rule.synergy_range[0] <= synergy < rule.synergy_range[1]:
                return rule
        return None
    
    def generate_auto_reply(
        self,
        node_id: str,
        node_name: str,
        synergy: float,
        incoming_message: str = ""
    ) -> Optional[AutoReplyResult]:
        """자동 응답 생성"""
        action = self.classify_node(synergy)
        
        # 골든/안정권은 자동 응답 안 함
        if action in [AutoAction.AMPLIFY, AutoAction.MAINTAIN]:
            return None
        
        rule = self.get_rule_for_synergy(synergy)
        if not rule or not rule.enabled:
            return None
        
        scheduled_at = datetime.now() + timedelta(hours=rule.delay_hours)
        
        result = AutoReplyResult(
            node_id=node_id,
            node_name=node_name,
            synergy=synergy,
            action=action,
            message=rule.message,
            scheduled_at=scheduled_at,
            time_saved_minutes=AutoPilotConfig.AVG_REPLY_TIME_MINUTES,
        )
        
        self.pending_replies.append(result)
        return result
    
    def process_incoming_messages(
        self,
        messages: List[Dict]
    ) -> Dict:
        """들어오는 메시지 일괄 처리"""
        auto_replies = []
        manual_required = []
        
        for msg in messages:
            synergy = msg.get("synergy", 0)
            
            if synergy >= AutoPilotConfig.STABLE_THRESHOLD:
                # 안정권 이상은 수동 응답
                manual_required.append(msg)
            else:
                # 그 외는 자동 응답
                reply = self.generate_auto_reply(
                    node_id=msg["node_id"],
                    node_name=msg["node_name"],
                    synergy=synergy,
                    incoming_message=msg.get("content", ""),
                )
                if reply:
                    auto_replies.append(reply)
        
        total_time_saved = sum(r.time_saved_minutes for r in auto_replies)
        
        return {
            "auto_replies": [
                {
                    "node_id": r.node_id,
                    "node_name": r.node_name,
                    "synergy": r.synergy,
                    "action": r.action.value,
                    "message": r.message,
                    "scheduled_at": r.scheduled_at.isoformat(),
                    "time_saved": r.time_saved_minutes,
                }
                for r in auto_replies
            ],
            "manual_required": manual_required,
            "stats": {
                "total_messages": len(messages),
                "auto_handled": len(auto_replies),
                "manual_required": len(manual_required),
                "time_saved_minutes": total_time_saved,
                "time_saved_hours": round(total_time_saved / 60, 1),
            },
        }
    
    def get_pending_replies(self) -> Dict:
        """대기 중인 자동 응답"""
        now = datetime.now()
        
        ready = []
        pending = []
        
        for reply in self.pending_replies:
            if reply.scheduled_at <= now:
                ready.append(reply)
            else:
                pending.append(reply)
        
        return {
            "ready_to_send": [
                {
                    "node_id": r.node_id,
                    "node_name": r.node_name,
                    "message": r.message,
                    "scheduled_at": r.scheduled_at.isoformat(),
                }
                for r in ready
            ],
            "pending": [
                {
                    "node_id": r.node_id,
                    "node_name": r.node_name,
                    "message": r.message,
                    "scheduled_at": r.scheduled_at.isoformat(),
                    "hours_until": (r.scheduled_at - now).total_seconds() / 3600,
                }
                for r in pending
            ],
        }


# ================================================================
# AUTO-BLOCK ENGINE
# ================================================================

class AutoBlockEngine:
    """
    자동 차단 엔진
    
    엔트로피 노드 자동 정리
    """
    
    def __init__(self):
        self.blocked_nodes: List[BlockedNode] = []
        self.block_history: List[Dict] = []
    
    def should_block(self, synergy: float, interaction_count: int = 0) -> bool:
        """차단 여부 판단"""
        # 엔트로피 임계값 이하
        if synergy < AutoPilotConfig.ENTROPY_THRESHOLD:
            return True
        
        # 마찰권인데 상호작용이 없는 경우
        if synergy < AutoPilotConfig.FRICTION_THRESHOLD and interaction_count == 0:
            return True
        
        return False
    
    def block_node(
        self,
        node_id: str,
        node_name: str,
        synergy: float,
        reason: str = ""
    ) -> BlockedNode:
        """노드 차단"""
        block_type = (
            AutoAction.HARD_BLOCK 
            if synergy < -0.7 
            else AutoAction.SOFT_BLOCK
        )
        
        review_days = (
            30 if block_type == AutoAction.HARD_BLOCK
            else AutoPilotConfig.AUTO_BLOCK_COOLDOWN_DAYS
        )
        
        blocked = BlockedNode(
            id=node_id,
            name=node_name,
            synergy=synergy,
            blocked_at=datetime.now(),
            reason=reason or f"시너지 {synergy:.2f} - 엔트로피 임계값 이하",
            block_type=block_type,
            review_at=datetime.now() + timedelta(days=review_days),
        )
        
        self.blocked_nodes.append(blocked)
        self.block_history.append({
            "node_id": node_id,
            "blocked_at": blocked.blocked_at.isoformat(),
            "synergy": synergy,
        })
        
        return blocked
    
    def scan_and_block(
        self,
        nodes: List[Dict]
    ) -> Dict:
        """노드 스캔 및 자동 차단"""
        blocked = []
        safe = []
        
        for node in nodes:
            synergy = node.get("synergy", 0)
            
            if self.should_block(synergy, node.get("interaction_count", 0)):
                result = self.block_node(
                    node_id=node["id"],
                    node_name=node["name"],
                    synergy=synergy,
                )
                blocked.append(result)
            else:
                safe.append(node)
        
        # 차단으로 절약되는 시간 계산
        time_saved = len(blocked) * (
            AutoPilotConfig.AVG_REPLY_TIME_MINUTES + 
            AutoPilotConfig.AVG_MEETING_TIME_MINUTES / 4  # 미팅 확률 25%
        )
        
        return {
            "blocked": [
                {
                    "id": b.id,
                    "name": b.name,
                    "synergy": b.synergy,
                    "block_type": b.block_type.value,
                    "reason": b.reason,
                    "review_at": b.review_at.isoformat(),
                }
                for b in blocked
            ],
            "safe_count": len(safe),
            "stats": {
                "total_scanned": len(nodes),
                "blocked_count": len(blocked),
                "time_saved_minutes": time_saved,
                "time_saved_hours": round(time_saved / 60, 1),
            },
        }
    
    def get_review_due(self) -> List[BlockedNode]:
        """재평가 대상 조회"""
        now = datetime.now()
        return [b for b in self.blocked_nodes if b.review_at <= now]
    
    def unblock_node(self, node_id: str) -> bool:
        """노드 차단 해제"""
        for i, blocked in enumerate(self.blocked_nodes):
            if blocked.id == node_id:
                self.blocked_nodes.pop(i)
                return True
        return False


# ================================================================
# 7-DAY SYNERGY PROJECTION ENGINE
# ================================================================

class SynergyProjectionEngine:
    """
    7일 시너지 예측 엔진
    
    Monte Carlo 기반 미래 시너지 예측
    """
    
    def __init__(self):
        self.projection_cache: Dict[str, List[SynergyProjection]] = {}
    
    def project_single_node(
        self,
        node_id: str,
        node_name: str,
        current_synergy: float,
        recent_trend: float = 0.0,  # 최근 7일 변화율
        days: int = 7
    ) -> List[SynergyProjection]:
        """단일 노드 시너지 예측"""
        projections = []
        
        # 기본 추세 (관성)
        base_trend = recent_trend if recent_trend != 0 else random.uniform(-0.02, 0.02)
        
        # 시너지별 특성
        if current_synergy >= 0.8:
            # 골든 볼륨: 안정적 상승
            trend_factor = 0.01
            volatility = 0.02
        elif current_synergy >= 0.3:
            # 안정권: 약간의 변동
            trend_factor = 0.0
            volatility = 0.03
        elif current_synergy >= -0.3:
            # 마찰권: 하락 경향
            trend_factor = -0.02
            volatility = 0.05
        else:
            # 엔트로피권: 급격한 하락
            trend_factor = -0.05
            volatility = 0.08
        
        synergy = current_synergy
        
        for day in range(1, days + 1):
            # 랜덤 워크 + 추세
            daily_change = (
                base_trend + 
                trend_factor + 
                random.gauss(0, volatility)
            )
            
            synergy = max(-1.0, min(1.0, synergy + daily_change))
            
            # 추세 결정
            if synergy > current_synergy + 0.05:
                trend = "rising"
            elif synergy < current_synergy - 0.05:
                trend = "declining"
            else:
                trend = "stable"
            
            # 신뢰도 (시간이 지날수록 감소)
            confidence = max(0.5, 1.0 - day * 0.05)
            
            # 권장 액션
            if synergy >= 0.8:
                action = "증폭 유지"
            elif synergy >= 0.3:
                action = "안정 유지"
            elif synergy >= -0.3:
                action = "관계 재검토"
            else:
                action = "정리 권장"
            
            projections.append(SynergyProjection(
                date=datetime.now() + timedelta(days=day),
                node_id=node_id,
                node_name=node_name,
                current_synergy=current_synergy,
                projected_synergy=round(synergy, 3),
                trend=trend,
                confidence=round(confidence, 2),
                recommended_action=action,
            ))
        
        return projections
    
    def generate_weekly_report(
        self,
        nodes: List[Dict],
        system_entropy: float = 0.0,
        system_efficiency: float = 1.0
    ) -> WeeklyProjectionReport:
        """주간 예측 리포트 생성"""
        all_projections = []
        at_risk = []
        rising_stars = []
        
        for node in nodes:
            projections = self.project_single_node(
                node_id=node["id"],
                node_name=node["name"],
                current_synergy=node["synergy"],
                recent_trend=node.get("trend", 0),
            )
            all_projections.extend(projections)
            
            # 7일 후 예측
            final = projections[-1]
            
            # 위험 노드 (골든 → 비골든)
            if node["synergy"] >= 0.8 and final.projected_synergy < 0.8:
                at_risk.append({
                    "id": node["id"],
                    "name": node["name"],
                    "current": node["synergy"],
                    "projected": final.projected_synergy,
                    "action": "즉시 관계 강화 필요",
                })
            
            # 라이징 스타 (비골든 → 골든)
            if node["synergy"] < 0.8 and final.projected_synergy >= 0.8:
                rising_stars.append({
                    "id": node["id"],
                    "name": node["name"],
                    "current": node["synergy"],
                    "projected": final.projected_synergy,
                    "action": "집중 육성 대상",
                })
        
        # 일별 요약
        daily_summary = []
        for day in range(1, 8):
            day_projections = [
                p for p in all_projections
                if (p.date - datetime.now()).days == day
            ]
            
            golden_count = sum(
                1 for p in day_projections 
                if p.projected_synergy >= 0.8
            )
            
            avg_synergy = (
                sum(p.projected_synergy for p in day_projections) / 
                len(day_projections) if day_projections else 0
            )
            
            daily_summary.append({
                "day": day,
                "date": (datetime.now() + timedelta(days=day)).strftime("%Y-%m-%d"),
                "golden_count": golden_count,
                "avg_synergy": round(avg_synergy, 3),
            })
        
        # 총 절약 시간 예측
        entropy_nodes = sum(1 for n in nodes if n["synergy"] < -0.3)
        time_saved = entropy_nodes * 2.5  # 노드당 2.5시간
        
        # 가치 예측
        total_revenue = sum(n.get("revenue", 0) for n in nodes if n["synergy"] > 0)
        value_projection = total_revenue * (1 + system_efficiency * 0.15)  # 주간 15% 성장
        
        return WeeklyProjectionReport(
            generated_at=datetime.now(),
            total_nodes=len(nodes),
            golden_projected=daily_summary[-1]["golden_count"] if daily_summary else 0,
            at_risk_nodes=at_risk,
            rising_stars=rising_stars,
            daily_projections=daily_summary,
            total_time_saved=time_saved,
            value_projection=value_projection,
        )


# ================================================================
# UNIFIED AUTO-PILOT SYSTEM
# ================================================================

class AutoPilotSystem:
    """
    통합 자동 조종 시스템
    
    Auto-Reply + Auto-Block + Projection
    """
    
    def __init__(self):
        self.auto_reply = AutoReplyEngine()
        self.auto_block = AutoBlockEngine()
        self.projection = SynergyProjectionEngine()
    
    def run_daily_automation(
        self,
        nodes: List[Dict],
        incoming_messages: List[Dict] = None
    ) -> Dict:
        """일일 자동화 실행"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "auto_reply": None,
            "auto_block": None,
            "projection": None,
            "total_stats": {},
        }
        
        # 1. 자동 응답 처리
        if incoming_messages:
            results["auto_reply"] = self.auto_reply.process_incoming_messages(
                incoming_messages
            )
        
        # 2. 자동 차단 스캔
        entropy_nodes = [n for n in nodes if n.get("synergy", 0) < -0.3]
        if entropy_nodes:
            results["auto_block"] = self.auto_block.scan_and_block(entropy_nodes)
        
        # 3. 주간 예측 생성
        results["projection"] = self._format_projection(
            self.projection.generate_weekly_report(nodes)
        )
        
        # 4. 통합 통계
        time_saved = 0
        if results["auto_reply"]:
            time_saved += results["auto_reply"]["stats"]["time_saved_minutes"]
        if results["auto_block"]:
            time_saved += results["auto_block"]["stats"]["time_saved_minutes"]
        
        results["total_stats"] = {
            "time_saved_minutes": time_saved,
            "time_saved_hours": round(time_saved / 60, 1),
            "auto_replies_pending": len(self.auto_reply.pending_replies),
            "nodes_blocked": len(self.auto_block.blocked_nodes),
        }
        
        return results
    
    def _format_projection(self, report: WeeklyProjectionReport) -> Dict:
        """예측 리포트 포맷"""
        return {
            "generated_at": report.generated_at.isoformat(),
            "summary": {
                "total_nodes": report.total_nodes,
                "golden_projected_day7": report.golden_projected,
                "time_saved_hours": report.total_time_saved,
                "value_projection": report.value_projection,
            },
            "at_risk_nodes": report.at_risk_nodes,
            "rising_stars": report.rising_stars,
            "daily_forecast": report.daily_projections,
        }
    
    def get_dashboard_data(self) -> Dict:
        """대시보드 데이터"""
        pending = self.auto_reply.get_pending_replies()
        
        return {
            "auto_reply": {
                "pending_count": len(pending["pending"]),
                "ready_count": len(pending["ready_to_send"]),
                "next_scheduled": pending["pending"][0] if pending["pending"] else None,
            },
            "auto_block": {
                "blocked_count": len(self.auto_block.blocked_nodes),
                "review_due": len(self.auto_block.get_review_due()),
            },
        }


# ================================================================
# TEST
# ================================================================

def test_auto_pilot_system():
    """Auto-Pilot 시스템 테스트"""
    print("=" * 70)
    print("AUTUS Auto-Pilot System Test")
    print("=" * 70)
    
    # 샘플 노드
    nodes = [
        {"id": "K", "name": "김대표", "synergy": 0.95, "revenue": 5000000},
        {"id": "Z", "name": "이사장", "synergy": 0.88, "revenue": 3000000},
        {"id": "P", "name": "박이사", "synergy": 0.72, "revenue": 2000000},
        {"id": "L", "name": "이과장", "synergy": 0.45, "revenue": 1000000},
        {"id": "C", "name": "최대리", "synergy": 0.12, "revenue": 500000},
        {"id": "H", "name": "한주임", "synergy": -0.25, "revenue": 200000},
        {"id": "J", "name": "정사원", "synergy": -0.45, "revenue": 100000},
        {"id": "M", "name": "문인턴", "synergy": -0.72, "revenue": 0},
    ]
    
    # 샘플 메시지
    messages = [
        {"node_id": "K", "node_name": "김대표", "synergy": 0.95, "content": "미팅 요청"},
        {"node_id": "H", "node_name": "한주임", "synergy": -0.25, "content": "자료 요청"},
        {"node_id": "J", "node_name": "정사원", "synergy": -0.45, "content": "질문있습니다"},
        {"node_id": "M", "node_name": "문인턴", "synergy": -0.72, "content": "확인 부탁"},
    ]
    
    # 시스템 초기화
    autopilot = AutoPilotSystem()
    
    # 일일 자동화 실행
    results = autopilot.run_daily_automation(nodes, messages)
    
    print("\n[1. 자동 응답 결과]")
    if results["auto_reply"]:
        stats = results["auto_reply"]["stats"]
        print(f"  총 메시지: {stats['total_messages']}")
        print(f"  자동 처리: {stats['auto_handled']}")
        print(f"  수동 필요: {stats['manual_required']}")
        print(f"  절약 시간: {stats['time_saved_hours']}시간")
    
    print("\n[2. 자동 차단 결과]")
    if results["auto_block"]:
        stats = results["auto_block"]["stats"]
        print(f"  스캔 노드: {stats['total_scanned']}")
        print(f"  차단 노드: {stats['blocked_count']}")
        print(f"  절약 시간: {stats['time_saved_hours']}시간")
    
    print("\n[3. 7일 시너지 예측]")
    if results["projection"]:
        proj = results["projection"]
        print(f"  현재 노드: {proj['summary']['total_nodes']}")
        print(f"  7일 후 골든: {proj['summary']['golden_projected_day7']}")
    
    print("\n[4. 통합 통계]")
    stats = results["total_stats"]
    print(f"  총 절약 시간: {stats['time_saved_hours']}시간")
    
    print("\n" + "=" * 70)
    print("✅ Auto-Pilot System Test Complete")
    
    return autopilot


if __name__ == "__main__":
    test_auto_pilot_system()
