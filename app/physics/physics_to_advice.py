"""
AUTUS Physics-to-Advice Matching Engine (Bezos Edition)
========================================================

물리량 → 조언 매칭 및 데이터 계보 추적

기능:
1. DataLineage - Raw Data → Physics Metric 추적
2. Motion-based Advice Logic - 노드 상태 기반 조언
3. Transparency Feature - 원인 추적 표시

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
from enum import Enum
import hashlib
import json


# ================================================================
# ENUMS
# ================================================================

class RawDataType(str, Enum):
    AUDIO_TONE = "AUDIO_TONE"
    AUDIO_STT = "AUDIO_STT"
    SCREEN_OCR = "SCREEN_OCR"
    SCREEN_APP = "SCREEN_APP"
    VIDEO_GAZE = "VIDEO_GAZE"
    VIDEO_EXPRESSION = "VIDEO_EXPRESSION"
    LOG_ACTIVITY = "LOG_ACTIVITY"
    LOG_CLICK = "LOG_CLICK"
    BIO_HRV = "BIO_HRV"
    BIO_KEYSTROKE = "BIO_KEYSTROKE"
    CONTEXT_TIME = "CONTEXT_TIME"
    CONTEXT_LOCATION = "CONTEXT_LOCATION"
    LINK_CALENDAR = "LINK_CALENDAR"
    LINK_MARKET = "LINK_MARKET"
    INTUITION_FEEDBACK = "INTUITION_FEEDBACK"


class PhysicsMetric(str, Enum):
    ENERGY = "ENERGY"
    INERTIA = "INERTIA"
    MASS = "MASS"
    ENTROPY = "ENTROPY"
    MOMENTUM = "MOMENTUM"
    STRESS = "STRESS"
    DIRECTION = "DIRECTION"
    VIBRATION = "VIBRATION"


class AdviceType(str, Enum):
    EMOTIONAL_RECONNECTION = "EMOTIONAL_RECONNECTION"
    TRUST_BUILDING = "TRUST_BUILDING"
    AUTOMATION_DELEGATION = "AUTOMATION_DELEGATION"
    FOCUS_REDIRECT = "FOCUS_REDIRECT"
    STRESS_RELIEF = "STRESS_RELIEF"
    GOAL_REMINDER = "GOAL_REMINDER"
    VALUE_DEMONSTRATION = "VALUE_DEMONSTRATION"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class RawDataEntry:
    """Raw 데이터 엔트리"""
    id: str
    data_type: RawDataType
    timestamp: datetime
    value: Any
    source: str
    confidence: float = 1.0
    metadata: Dict = field(default_factory=dict)


@dataclass
class PhysicsChange:
    """물리량 변화 기록"""
    metric: PhysicsMetric
    before: float
    after: float
    delta: float
    timestamp: datetime


@dataclass
class DataLineageEntry:
    """데이터 계보 엔트리"""
    id: str
    raw_data_id: str
    raw_data_type: RawDataType
    physics_metric: PhysicsMetric
    contribution: float
    timestamp: datetime
    explanation: str


@dataclass
class TransparencyReport:
    """투명성 리포트"""
    node_id: str
    current_color: str
    main_reason: str
    contributing_data: List[DataLineageEntry]
    advice: str
    confidence: float


@dataclass
class AdvicePack:
    """조언 팩"""
    advice_type: AdviceType
    title: str
    description: str
    actions: List[str]
    trigger_conditions: Dict
    priority: int


# ================================================================
# DATA LINEAGE TABLE
# ================================================================

class DataLineageTable:
    """데이터 계보 테이블"""
    
    INFLUENCE_MAP = {
        RawDataType.AUDIO_TONE: {
            PhysicsMetric.ENERGY: 0.6,
            PhysicsMetric.STRESS: 0.7,
            PhysicsMetric.MOMENTUM: 0.3,
        },
        RawDataType.AUDIO_STT: {
            PhysicsMetric.ENTROPY: 0.5,
            PhysicsMetric.DIRECTION: 0.4,
            PhysicsMetric.STRESS: 0.3,
        },
        RawDataType.SCREEN_OCR: {
            PhysicsMetric.ENTROPY: 0.6,
            PhysicsMetric.MOMENTUM: 0.4,
        },
        RawDataType.SCREEN_APP: {
            PhysicsMetric.ENERGY: 0.5,
            PhysicsMetric.ENTROPY: 0.5,
        },
        RawDataType.VIDEO_GAZE: {
            PhysicsMetric.ENERGY: 0.7,
            PhysicsMetric.STRESS: 0.4,
            PhysicsMetric.MOMENTUM: 0.3,
        },
        RawDataType.VIDEO_EXPRESSION: {
            PhysicsMetric.ENERGY: 0.6,
            PhysicsMetric.STRESS: 0.6,
        },
        RawDataType.BIO_HRV: {
            PhysicsMetric.STRESS: 0.8,
            PhysicsMetric.ENERGY: 0.5,
            PhysicsMetric.VIBRATION: 0.6,
        },
        RawDataType.BIO_KEYSTROKE: {
            PhysicsMetric.STRESS: 0.6,
            PhysicsMetric.MOMENTUM: 0.4,
        },
        RawDataType.LINK_MARKET: {
            PhysicsMetric.INERTIA: 0.5,
            PhysicsMetric.ENTROPY: 0.4,
        },
        RawDataType.INTUITION_FEEDBACK: {
            PhysicsMetric.DIRECTION: 0.7,
            PhysicsMetric.MASS: 0.4,
        },
    }
    
    def __init__(self):
        self.entries: List[DataLineageEntry] = []
        self.raw_data: Dict[str, RawDataEntry] = {}
        self.physics_changes: List[PhysicsChange] = []
    
    def record_raw_data(self, entry: RawDataEntry) -> str:
        self.raw_data[entry.id] = entry
        return entry.id
    
    def record_physics_change(
        self, 
        raw_data_id: str,
        metric: PhysicsMetric,
        before: float,
        after: float,
        explanation: str = ""
    ) -> DataLineageEntry:
        raw_data = self.raw_data.get(raw_data_id)
        if not raw_data:
            raise ValueError(f"Raw data {raw_data_id} not found")
        
        delta = after - before
        influence_map = self.INFLUENCE_MAP.get(raw_data.data_type, {})
        contribution = influence_map.get(metric, 0.3) * delta
        
        if not explanation:
            explanation = self._generate_explanation(raw_data, metric, delta)
        
        lineage_entry = DataLineageEntry(
            id=f"LIN_{datetime.now().timestamp():.0f}_{raw_data_id[:8]}",
            raw_data_id=raw_data_id,
            raw_data_type=raw_data.data_type,
            physics_metric=metric,
            contribution=contribution,
            timestamp=datetime.now(),
            explanation=explanation
        )
        
        self.entries.append(lineage_entry)
        
        self.physics_changes.append(PhysicsChange(
            metric=metric,
            before=before,
            after=after,
            delta=delta,
            timestamp=datetime.now()
        ))
        
        return lineage_entry
    
    def _generate_explanation(
        self, 
        raw_data: RawDataEntry, 
        metric: PhysicsMetric,
        delta: float
    ) -> str:
        direction = "increased" if delta > 0 else "decreased"
        
        templates = {
            (RawDataType.AUDIO_TONE, PhysicsMetric.ENERGY): 
                f"Voice tone analysis {direction} energy level",
            (RawDataType.AUDIO_TONE, PhysicsMetric.STRESS):
                f"Anxiety detected in voice at {raw_data.timestamp.strftime('%I:%M %p')}",
            (RawDataType.VIDEO_GAZE, PhysicsMetric.ENERGY):
                f"Gaze stability {direction} engagement",
            (RawDataType.BIO_HRV, PhysicsMetric.STRESS):
                f"Heart rate variability indicates {direction} stress",
            (RawDataType.SCREEN_APP, PhysicsMetric.ENTROPY):
                f"App usage pattern {direction} entropy",
        }
        
        key = (raw_data.data_type, metric)
        return templates.get(key, f"{raw_data.data_type.value} affected {metric.value}")
    
    def get_lineage_for_metric(self, metric: PhysicsMetric) -> List[DataLineageEntry]:
        return [e for e in self.entries if e.physics_metric == metric]
    
    def get_major_contributors(
        self, 
        metric: PhysicsMetric, 
        top_n: int = 3
    ) -> List[DataLineageEntry]:
        entries = self.get_lineage_for_metric(metric)
        sorted_entries = sorted(entries, key=lambda e: abs(e.contribution), reverse=True)
        return sorted_entries[:top_n]
    
    def export_lineage_graph(self) -> Dict:
        nodes = []
        edges = []
        
        for raw_id, raw in self.raw_data.items():
            nodes.append({
                "id": raw_id,
                "type": "raw_data",
                "label": raw.data_type.value,
                "timestamp": raw.timestamp.isoformat(),
            })
        
        metrics_seen = set()
        for entry in self.entries:
            if entry.physics_metric not in metrics_seen:
                nodes.append({
                    "id": entry.physics_metric.value,
                    "type": "physics_metric",
                    "label": entry.physics_metric.value,
                })
                metrics_seen.add(entry.physics_metric)
        
        for entry in self.entries:
            edges.append({
                "source": entry.raw_data_id,
                "target": entry.physics_metric.value,
                "contribution": entry.contribution,
                "explanation": entry.explanation,
            })
        
        return {"nodes": nodes, "edges": edges}


# ================================================================
# MOTION-BASED ADVICE ENGINE
# ================================================================

class MotionBasedAdviceEngine:
    """노드 상태 기반 조언 엔진"""
    
    ADVICE_PACKS: Dict[AdviceType, AdvicePack] = {
        AdviceType.EMOTIONAL_RECONNECTION: AdvicePack(
            advice_type=AdviceType.EMOTIONAL_RECONNECTION,
            title="감정적 재연결 팩",
            description="높은 스트레스와 낮은 에너지로 인해 정서적 지원이 필요합니다",
            actions=[
                "개인적인 안부 전화 진행",
                "감사 메시지 전송",
                "1:1 면담 예약",
                "소소한 선물 전달",
            ],
            trigger_conditions={"color": "RED", "stress": ">0.6"},
            priority=9
        ),
        AdviceType.TRUST_BUILDING: AdvicePack(
            advice_type=AdviceType.TRUST_BUILDING,
            title="신뢰 구축 리포트",
            description="목표와의 거리가 증가하고 있어 성과 확인이 필요합니다",
            actions=[
                "진도 요약 리포트 생성",
                "Before/After 분석 제공",
                "다음 마일스톤 프리뷰",
                "성과 하이라이트 공유",
            ],
            trigger_conditions={"distance_increasing": True},
            priority=7
        ),
        AdviceType.AUTOMATION_DELEGATION: AdvicePack(
            advice_type=AdviceType.AUTOMATION_DELEGATION,
            title="자동화 위임",
            description="높은 스트레스(진동)가 감지되어 부담 경감이 필요합니다",
            actions=[
                "자동 스케줄링 설정",
                "리마인더 시스템 구축",
                "마찰 포인트 감소",
                "커뮤니케이션 간소화",
            ],
            trigger_conditions={"vibration": ">0.5", "stress": ">0.7"},
            priority=8
        ),
        AdviceType.STRESS_RELIEF: AdvicePack(
            advice_type=AdviceType.STRESS_RELIEF,
            title="스트레스 완화",
            description="높은 스트레스 레벨이 지속되고 있습니다",
            actions=[
                "휴식 권장 알림",
                "부담 축소 방안 협의",
                "유연한 일정 제안",
                "지원 리소스 안내",
            ],
            trigger_conditions={"stress": ">0.8"},
            priority=8
        ),
        AdviceType.GOAL_REMINDER: AdvicePack(
            advice_type=AdviceType.GOAL_REMINDER,
            title="목표 리마인더",
            description="목표와의 연결이 약해지고 있습니다",
            actions=[
                "목표 달성 시 혜택 리마인드",
                "진척 상황 시각화",
                "동기부여 콘텐츠 공유",
                "성공 사례 소개",
            ],
            trigger_conditions={"momentum": "<0.3"},
            priority=5
        ),
        AdviceType.VALUE_DEMONSTRATION: AdvicePack(
            advice_type=AdviceType.VALUE_DEMONSTRATION,
            title="가치 증명",
            description="서비스 가치에 대한 확신이 필요합니다",
            actions=[
                "ROI 분석 리포트",
                "비교 분석 자료",
                "성과 지표 대시보드",
                "고객 후기 공유",
            ],
            trigger_conditions={"engagement": "<0.4"},
            priority=6
        ),
    }
    
    def __init__(self, lineage_table: DataLineageTable):
        self.lineage = lineage_table
        self.advice_history: List[Dict] = []
    
    def analyze_node_state(self, node_state: Dict) -> List[AdvicePack]:
        applicable_advice = []
        
        if node_state.get("color") == "RED":
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.EMOTIONAL_RECONNECTION])
        
        if node_state.get("distance_increasing", False) or node_state.get("distance_from_center", 0) > 4:
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.TRUST_BUILDING])
        
        if node_state.get("vibration", 0) > 0.5 or node_state.get("stress", 0) > 0.7:
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.AUTOMATION_DELEGATION])
        
        if node_state.get("stress", 0) > 0.8:
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.STRESS_RELIEF])
        
        if node_state.get("momentum", 1) < 0.3:
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.GOAL_REMINDER])
        
        if node_state.get("engagement", 1) < 0.4:
            applicable_advice.append(self.ADVICE_PACKS[AdviceType.VALUE_DEMONSTRATION])
        
        seen = set()
        unique_advice = []
        for advice in sorted(applicable_advice, key=lambda a: a.priority, reverse=True):
            if advice.advice_type not in seen:
                seen.add(advice.advice_type)
                unique_advice.append(advice)
        
        return unique_advice
    
    def get_advice(self, node_state: Dict) -> Optional[AdvicePack]:
        advice_list = self.analyze_node_state(node_state)
        return advice_list[0] if advice_list else None


# ================================================================
# TRANSPARENCY ENGINE
# ================================================================

class TransparencyEngine:
    """투명성 엔진"""
    
    def __init__(self, lineage_table: DataLineageTable, advice_engine: MotionBasedAdviceEngine):
        self.lineage = lineage_table
        self.advice_engine = advice_engine
    
    def generate_transparency_report(
        self, 
        node_id: str,
        node_state: Dict
    ) -> TransparencyReport:
        color = node_state.get("color", "GRAY")
        
        if color == "RED":
            main_metric = PhysicsMetric.ENERGY
            main_reason = self._determine_red_reason(node_state)
        elif color == "YELLOW":
            main_metric = PhysicsMetric.MOMENTUM
            main_reason = self._determine_yellow_reason(node_state)
        else:
            main_metric = PhysicsMetric.ENERGY
            main_reason = "Normal operation"
        
        contributors = self.lineage.get_major_contributors(main_metric, top_n=5)
        
        advice = self.advice_engine.get_advice(node_state)
        advice_text = advice.description if advice else "Continue monitoring"
        
        confidence = self._calculate_confidence(contributors)
        
        return TransparencyReport(
            node_id=node_id,
            current_color=color,
            main_reason=main_reason,
            contributing_data=contributors,
            advice=advice_text,
            confidence=confidence
        )
    
    def _determine_red_reason(self, node_state: Dict) -> str:
        reasons = []
        if node_state.get("energy", 1) < 0.3:
            reasons.append("Low energy level")
        if node_state.get("stress", 0) > 0.7:
            reasons.append("High stress detected")
        if node_state.get("vibration", 0) > 0.6:
            reasons.append("Unstable state")
        if node_state.get("attendance_rate", 1) < 0.8:
            reasons.append("Declining attendance")
        return "; ".join(reasons) if reasons else "Multiple factors"
    
    def _determine_yellow_reason(self, node_state: Dict) -> str:
        if node_state.get("momentum", 1) < 0.4:
            return "Declining momentum"
        if node_state.get("engagement", 1) < 0.5:
            return "Reduced engagement"
        return "Moderate risk indicators"
    
    def _calculate_confidence(self, contributors: List[DataLineageEntry]) -> float:
        if not contributors:
            return 0.5
        total_contribution = sum(abs(c.contribution) for c in contributors)
        base_confidence = min(total_contribution / 2, 0.8)
        recency_boost = 0.1 if len(contributors) >= 3 else 0.05
        return min(base_confidence + recency_boost, 0.95)
    
    def format_user_message(self, report: TransparencyReport) -> str:
        if not report.contributing_data:
            return f"This node is {report.current_color}. {report.main_reason}."
        
        top = report.contributing_data[0]
        time_str = top.timestamp.strftime("%I:%M %p")
        
        type_map = {
            RawDataType.AUDIO_TONE: "Audio Log",
            RawDataType.AUDIO_STT: "Voice Transcript",
            RawDataType.VIDEO_GAZE: "Video Analysis",
            RawDataType.BIO_HRV: "Biometric Data",
            RawDataType.SCREEN_APP: "Screen Activity",
        }
        source_name = type_map.get(top.raw_data_type, top.raw_data_type.value)
        
        return (
            f"This node is {report.current_color} because of the "
            f"'{top.explanation}' detected in the {time_str} {source_name}."
        )


# ================================================================
# INTEGRATED MATCHING ENGINE
# ================================================================

class PhysicsToAdviceMatchingEngine:
    """물리량 → 조언 통합 매칭 엔진"""
    
    def __init__(self):
        self.lineage = DataLineageTable()
        self.advice_engine = MotionBasedAdviceEngine(self.lineage)
        self.transparency = TransparencyEngine(self.lineage, self.advice_engine)
    
    def ingest_raw_data(self, entry: RawDataEntry) -> str:
        return self.lineage.record_raw_data(entry)
    
    def record_physics_impact(
        self,
        raw_data_id: str,
        metric: PhysicsMetric,
        before: float,
        after: float,
        explanation: str = ""
    ) -> DataLineageEntry:
        return self.lineage.record_physics_change(
            raw_data_id, metric, before, after, explanation
        )
    
    def get_advice(self, node_state: Dict) -> Dict:
        advice = self.advice_engine.get_advice(node_state)
        
        if not advice:
            return {"advice": None, "message": "No advice needed at this time"}
        
        return {
            "advice": {
                "type": advice.advice_type.value,
                "title": advice.title,
                "description": advice.description,
                "actions": advice.actions,
                "priority": advice.priority,
            },
            "message": advice.description
        }
    
    def get_node_transparency(self, node_id: str, node_state: Dict) -> Dict:
        report = self.transparency.generate_transparency_report(node_id, node_state)
        message = self.transparency.format_user_message(report)
        
        return {
            "node_id": node_id,
            "color": report.current_color,
            "main_reason": report.main_reason,
            "user_message": message,
            "advice": report.advice,
            "confidence": report.confidence,
            "contributing_factors": [
                {
                    "data_type": e.raw_data_type.value,
                    "metric": e.physics_metric.value,
                    "contribution": e.contribution,
                    "explanation": e.explanation,
                    "timestamp": e.timestamp.isoformat(),
                }
                for e in report.contributing_data
            ]
        }
    
    def export_lineage_graph(self) -> Dict:
        return self.lineage.export_lineage_graph()


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Physics-to-Advice Matching Engine Test")
    print("=" * 70)
    
    engine = PhysicsToAdviceMatchingEngine()
    
    raw1 = RawDataEntry(
        id="RAW_001",
        data_type=RawDataType.AUDIO_TONE,
        timestamp=datetime.now().replace(hour=14, minute=0),
        value={"anxiety_score": 0.7, "tone": "stressed"},
        source="voice_sensor"
    )
    engine.ingest_raw_data(raw1)
    
    engine.record_physics_impact("RAW_001", PhysicsMetric.STRESS, 0.3, 0.7)
    engine.record_physics_impact("RAW_001", PhysicsMetric.ENERGY, 0.6, 0.4)
    
    node_state = {
        "color": "RED",
        "energy": 0.25,
        "stress": 0.85,
        "vibration": 0.6,
        "momentum": 0.3,
        "distance_from_center": 4.5,
        "distance_increasing": True,
        "engagement": 0.4,
    }
    
    advice = engine.get_advice(node_state)
    print(f"\n[Advice] {advice['advice']['title']}")
    
    transparency = engine.get_node_transparency("member_001", node_state)
    print(f"[Transparency] {transparency['user_message']}")
    
    print("\n" + "=" * 70)
    print("✅ Physics-to-Advice Matching Test Complete")



