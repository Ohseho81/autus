"""
AUTUS Churn Prevention Engine (Bezos Edition)
==============================================

이탈 방지 시뮬레이션 및 교정 벡터 시스템

기능:
1. Churn Risk Detection - 이탈 위험 감지
2. Correction Vector Calculation - 교정 벡터 계산
3. Retention Automation Pack - 유지 자동화 팩
4. Orbit Path Prediction - 이탈 경로 예측

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import math
import json


# ================================================================
# ENUMS
# ================================================================

class ChurnRiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RetentionPackType(str, Enum):
    EMOTIONAL_RECONNECTION = "EMOTIONAL_RECONNECTION"
    TRUST_BUILDING = "TRUST_BUILDING"
    AUTOMATION_DELEGATION = "AUTOMATION_DELEGATION"
    CUSTOM_ROADMAP = "CUSTOM_ROADMAP"
    HIGH_LEVEL_INTERVENTION = "HIGH_LEVEL_INTERVENTION"
    EMERGENCY_RECOVERY = "EMERGENCY_RECOVERY"


class CorrectionThrustType(str, Enum):
    RETENTION_HIGH_LEVEL = "RETENTION_HIGH_LEVEL"
    ENGAGEMENT_BOOST = "ENGAGEMENT_BOOST"
    VALUE_DEMONSTRATION = "VALUE_DEMONSTRATION"
    COMPETITIVE_COUNTER = "COMPETITIVE_COUNTER"
    EMOTIONAL_BOND = "EMOTIONAL_BOND"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class NodeState:
    """노드 상태"""
    id: str
    position: Tuple[float, float, float]
    velocity: Tuple[float, float, float]
    mass: float
    energy: float
    attendance_rate: float
    engagement_score: float
    last_interaction: datetime
    keywords_detected: List[str] = field(default_factory=list)
    stress_level: float = 0.0
    distance_from_center: float = 0.0
    color: str = "BLUE"
    is_unstable: bool = False


@dataclass
class MarketCondition:
    """시장 상황"""
    competitor_gravity: float
    market_volatility: float
    seasonal_factor: float
    external_events: List[str] = field(default_factory=list)


@dataclass
class ChurnRiskAssessment:
    """이탈 위험 평가"""
    node_id: str
    risk_level: ChurnRiskLevel
    risk_score: float
    contributing_factors: List[Dict]
    predicted_churn_days: int
    recommended_actions: List[str]
    correction_vector: Tuple[float, float, float]


@dataclass
class CorrectionVector:
    """교정 벡터"""
    direction: Tuple[float, float, float]
    magnitude: float
    thrust_type: CorrectionThrustType
    target_position: Tuple[float, float, float]
    estimated_time_to_target: float


@dataclass
class RetentionPack:
    """유지 자동화 팩"""
    id: str
    pack_type: RetentionPackType
    name: str
    actions: List[Dict]
    expected_impact: Dict[str, float]
    priority: int
    trigger_conditions: Dict


@dataclass
class OrbitPrediction:
    """이탈 경로 예측"""
    node_id: str
    predicted_path: List[Tuple[float, float, float]]
    time_steps: List[float]
    churn_probability: float
    intervention_points: List[Dict]


# ================================================================
# CONSTANTS
# ================================================================

CENTER_GOAL = (0.0, 0.0, 0.0)

CHURN_THRESHOLDS = {
    "attendance_rate": 0.9,
    "engagement_score": 0.5,
    "energy_level": 0.3,
    "distance_critical": 5.0,
    "competitor_gravity": 0.7,
    "days_since_interaction": 7,
}

ANXIETY_KEYWORDS = [
    "비용", "이동", "타학원", "그만", "힘들", "부담",
    "경쟁사", "다른곳", "비싸", "효과없", "시간없"
]

HIGH_VALUE_KEYWORDS = [
    "입시", "의대", "컨설팅", "특별", "추가", "프리미엄",
    "1:1", "집중", "강화", "올인", "목표"
]


# ================================================================
# RETENTION PACKS REGISTRY
# ================================================================

RETENTION_PACKS: List[RetentionPack] = [
    RetentionPack(
        id="RP_EMOTIONAL",
        pack_type=RetentionPackType.EMOTIONAL_RECONNECTION,
        name="감정적 재연결",
        actions=[
            {"type": "call", "action": "personal_check_in", "by": "manager"},
            {"type": "message", "action": "appreciation_note", "personalized": True},
            {"type": "gift", "action": "small_gesture", "value": "low"},
            {"type": "meeting", "action": "face_to_face", "duration": 30},
        ],
        expected_impact={"engagement": +0.25, "energy": +0.15, "trust": +0.20},
        priority=8,
        trigger_conditions={"color": "RED", "stress_level": ">0.6"}
    ),
    RetentionPack(
        id="RP_TRUST",
        pack_type=RetentionPackType.TRUST_BUILDING,
        name="신뢰 구축 리포트",
        actions=[
            {"type": "report", "action": "progress_summary", "format": "visual"},
            {"type": "data", "action": "achievement_highlights"},
            {"type": "comparison", "action": "before_after_analysis"},
            {"type": "roadmap", "action": "next_milestones_preview"},
        ],
        expected_impact={"trust": +0.30, "engagement": +0.15, "retention": +0.20},
        priority=7,
        trigger_conditions={"distance_increasing": True}
    ),
    RetentionPack(
        id="RP_AUTOMATION",
        pack_type=RetentionPackType.AUTOMATION_DELEGATION,
        name="자동화 위임",
        actions=[
            {"type": "setup", "action": "auto_scheduling"},
            {"type": "setup", "action": "reminder_system"},
            {"type": "reduce", "action": "friction_points"},
            {"type": "simplify", "action": "communication_flow"},
        ],
        expected_impact={"stress": -0.25, "engagement": +0.10, "efficiency": +0.30},
        priority=6,
        trigger_conditions={"stress_level": ">0.7", "vibration": ">0.5"}
    ),
    RetentionPack(
        id="RP_ROADMAP",
        pack_type=RetentionPackType.CUSTOM_ROADMAP,
        name="맞춤형 로드맵",
        actions=[
            {"type": "analysis", "action": "gap_identification"},
            {"type": "plan", "action": "personalized_curriculum"},
            {"type": "milestone", "action": "achievable_goals"},
            {"type": "report", "action": "weekly_progress_track"},
        ],
        expected_impact={"direction": +0.35, "engagement": +0.25, "retention": +0.30},
        priority=9,
        trigger_conditions={"attendance_rate": "<0.9", "competitor_gravity": ">0.7"}
    ),
    RetentionPack(
        id="RP_HIGH_LEVEL",
        pack_type=RetentionPackType.HIGH_LEVEL_INTERVENTION,
        name="고수준 개입",
        actions=[
            {"type": "meeting", "action": "director_call", "by": "director"},
            {"type": "offer", "action": "exclusive_package"},
            {"type": "incentive", "action": "loyalty_reward"},
            {"type": "commitment", "action": "success_guarantee"},
        ],
        expected_impact={"retention": +0.40, "trust": +0.35, "value_perception": +0.30},
        priority=10,
        trigger_conditions={"risk_level": "CRITICAL", "mass": ">1.0"}
    ),
    RetentionPack(
        id="RP_EMERGENCY",
        pack_type=RetentionPackType.EMERGENCY_RECOVERY,
        name="긴급 복구",
        actions=[
            {"type": "immediate", "action": "pause_billing"},
            {"type": "call", "action": "crisis_intervention", "priority": "urgent"},
            {"type": "offer", "action": "flexible_terms"},
            {"type": "support", "action": "dedicated_liaison"},
        ],
        expected_impact={"churn_prevention": +0.50, "trust": +0.20, "stress": -0.40},
        priority=10,
        trigger_conditions={"churn_probability": ">0.8", "days_to_churn": "<7"}
    ),
]


# ================================================================
# CHURN PREVENTION ENGINE
# ================================================================

class ChurnPreventionEngine:
    """
    이탈 방지 엔진
    """
    
    def __init__(self):
        self.nodes: Dict[str, NodeState] = {}
        self.market: MarketCondition = MarketCondition(
            competitor_gravity=0.5,
            market_volatility=0.3,
            seasonal_factor=1.0
        )
        self.retention_packs = {p.id: p for p in RETENTION_PACKS}
        self.assessments: Dict[str, ChurnRiskAssessment] = {}
    
    def update_market_condition(self, market: MarketCondition) -> None:
        self.market = market
    
    def register_node(self, node: NodeState) -> None:
        node.distance_from_center = self._calculate_distance(node.position, CENTER_GOAL)
        node.color = self._determine_color(node.energy)
        node.is_unstable = self._check_instability(node)
        self.nodes[node.id] = node
    
    def update_node(self, node_id: str, updates: Dict) -> None:
        if node_id not in self.nodes:
            return
        
        node = self.nodes[node_id]
        for key, value in updates.items():
            if hasattr(node, key):
                setattr(node, key, value)
        
        node.distance_from_center = self._calculate_distance(node.position, CENTER_GOAL)
        node.color = self._determine_color(node.energy)
        node.is_unstable = self._check_instability(node)
    
    def assess_churn_risk(self, node_id: str) -> ChurnRiskAssessment:
        node = self.nodes.get(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")
        
        factors = []
        risk_score = 0.0
        
        # 출석률 체크
        if node.attendance_rate < CHURN_THRESHOLDS["attendance_rate"]:
            factor_score = (CHURN_THRESHOLDS["attendance_rate"] - node.attendance_rate) * 2
            factors.append({
                "factor": "low_attendance",
                "value": node.attendance_rate,
                "threshold": CHURN_THRESHOLDS["attendance_rate"],
                "impact": factor_score
            })
            risk_score += factor_score
        
        # 에너지 레벨 체크
        if node.energy < CHURN_THRESHOLDS["energy_level"]:
            factor_score = (CHURN_THRESHOLDS["energy_level"] - node.energy) * 1.5
            factors.append({
                "factor": "low_energy",
                "value": node.energy,
                "threshold": CHURN_THRESHOLDS["energy_level"],
                "impact": factor_score
            })
            risk_score += factor_score
        
        # 거리 체크
        if node.distance_from_center > CHURN_THRESHOLDS["distance_critical"]:
            factor_score = (node.distance_from_center - CHURN_THRESHOLDS["distance_critical"]) * 0.1
            factors.append({
                "factor": "high_distance",
                "value": node.distance_from_center,
                "threshold": CHURN_THRESHOLDS["distance_critical"],
                "impact": factor_score
            })
            risk_score += factor_score
        
        # 경쟁사 영향력 체크
        if self.market.competitor_gravity > CHURN_THRESHOLDS["competitor_gravity"]:
            factor_score = self.market.competitor_gravity * 0.5
            factors.append({
                "factor": "competitor_pressure",
                "value": self.market.competitor_gravity,
                "threshold": CHURN_THRESHOLDS["competitor_gravity"],
                "impact": factor_score
            })
            risk_score += factor_score
        
        # 불안 키워드 체크
        anxiety_count = sum(1 for kw in node.keywords_detected if kw in ANXIETY_KEYWORDS)
        if anxiety_count > 0:
            factor_score = anxiety_count * 0.15
            factors.append({
                "factor": "anxiety_keywords",
                "count": anxiety_count,
                "keywords": [kw for kw in node.keywords_detected if kw in ANXIETY_KEYWORDS],
                "impact": factor_score
            })
            risk_score += factor_score
        
        # 스트레스 레벨
        if node.stress_level > 0.6:
            factor_score = node.stress_level * 0.3
            factors.append({
                "factor": "high_stress",
                "value": node.stress_level,
                "impact": factor_score
            })
            risk_score += factor_score
        
        risk_score = min(risk_score, 1.0)
        
        if risk_score > 0.75:
            risk_level = ChurnRiskLevel.CRITICAL
        elif risk_score > 0.5:
            risk_level = ChurnRiskLevel.HIGH
        elif risk_score > 0.25:
            risk_level = ChurnRiskLevel.MEDIUM
        else:
            risk_level = ChurnRiskLevel.LOW
        
        predicted_days = int(30 * (1 - risk_score)) if risk_score > 0 else 90
        correction = self._calculate_correction_vector(node)
        recommended = self._get_recommended_actions(node, risk_level, factors)
        
        assessment = ChurnRiskAssessment(
            node_id=node_id,
            risk_level=risk_level,
            risk_score=risk_score,
            contributing_factors=factors,
            predicted_churn_days=predicted_days,
            recommended_actions=recommended,
            correction_vector=correction.direction
        )
        
        self.assessments[node_id] = assessment
        return assessment
    
    def _calculate_correction_vector(self, node: NodeState) -> CorrectionVector:
        dx = CENTER_GOAL[0] - node.position[0]
        dy = CENTER_GOAL[1] - node.position[1]
        dz = CENTER_GOAL[2] - node.position[2]
        
        distance = math.sqrt(dx**2 + dy**2 + dz**2) or 1
        direction = (dx / distance, dy / distance, dz / distance)
        magnitude = node.distance_from_center * (1 - node.energy) * 2
        
        if self.market.competitor_gravity > 0.7:
            thrust_type = CorrectionThrustType.COMPETITIVE_COUNTER
        elif node.stress_level > 0.7:
            thrust_type = CorrectionThrustType.EMOTIONAL_BOND
        elif node.energy < 0.3:
            thrust_type = CorrectionThrustType.ENGAGEMENT_BOOST
        else:
            thrust_type = CorrectionThrustType.VALUE_DEMONSTRATION
        
        estimated_time = distance / max(magnitude, 0.1) * 24
        
        return CorrectionVector(
            direction=direction,
            magnitude=magnitude,
            thrust_type=thrust_type,
            target_position=CENTER_GOAL,
            estimated_time_to_target=estimated_time
        )
    
    def _get_recommended_actions(
        self, 
        node: NodeState, 
        risk_level: ChurnRiskLevel,
        factors: List[Dict]
    ) -> List[str]:
        actions = []
        
        if node.color == "RED":
            actions.append("EMOTIONAL_RECONNECTION")
        if node.distance_from_center > 3:
            actions.append("TRUST_BUILDING_REPORT")
        if node.stress_level > 0.6:
            actions.append("AUTOMATION_DELEGATION")
        if self.market.competitor_gravity > 0.7 and node.attendance_rate < 0.9:
            actions.append("CUSTOM_ROADMAP")
        if risk_level == ChurnRiskLevel.CRITICAL:
            actions.append("HIGH_LEVEL_INTERVENTION")
            actions.append("EMERGENCY_RECOVERY")
        
        return actions
    
    def predict_orbit_path(self, node_id: str, hours: int = 168) -> OrbitPrediction:
        node = self.nodes.get(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")
        
        path = []
        time_steps = []
        
        pos = list(node.position)
        vel = list(node.velocity)
        energy = node.energy
        
        dt = 1.0
        for t in range(0, hours + 1, int(dt)):
            path.append(tuple(pos))
            time_steps.append(float(t))
            
            energy *= 0.995
            
            gx = -pos[0] * 0.01 * energy
            gy = -pos[1] * 0.01 * energy
            gz = -pos[2] * 0.01 * energy
            
            cx = pos[0] * 0.005 * self.market.competitor_gravity
            cy = pos[1] * 0.005 * self.market.competitor_gravity
            cz = pos[2] * 0.005 * self.market.competitor_gravity
            
            vel[0] += (gx + cx) * dt
            vel[1] += (gy + cy) * dt
            vel[2] += (gz + cz) * dt
            
            pos[0] += vel[0] * dt
            pos[1] += vel[1] * dt
            pos[2] += vel[2] * dt
        
        final_distance = math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2)
        churn_probability = min(final_distance / 10, 1.0)
        
        intervention_points = []
        for i in range(1, len(path)):
            prev_dist = math.sqrt(sum(p**2 for p in path[i-1]))
            curr_dist = math.sqrt(sum(p**2 for p in path[i]))
            
            if curr_dist - prev_dist > 0.5:
                intervention_points.append({
                    "time_hours": time_steps[i],
                    "position": path[i],
                    "urgency": "HIGH" if curr_dist > 5 else "MEDIUM"
                })
        
        return OrbitPrediction(
            node_id=node_id,
            predicted_path=path,
            time_steps=time_steps,
            churn_probability=churn_probability,
            intervention_points=intervention_points
        )
    
    def trigger_retention_pack(self, node_id: str, pack_type: RetentionPackType) -> Dict:
        pack = next((p for p in RETENTION_PACKS if p.pack_type == pack_type), None)
        if not pack:
            return {"success": False, "error": "Pack not found"}
        
        node = self.nodes.get(node_id)
        if not node:
            return {"success": False, "error": "Node not found"}
        
        return {
            "success": True,
            "pack_id": pack.id,
            "pack_name": pack.name,
            "actions": pack.actions,
            "expected_impact": pack.expected_impact,
            "node_id": node_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_ui_data(self, node_id: str) -> Dict:
        node = self.nodes.get(node_id)
        assessment = self.assessments.get(node_id)
        
        if not node:
            return {}
        
        correction = self._calculate_correction_vector(node)
        
        return {
            "node": {
                "id": node.id,
                "position": node.position,
                "color": node.color,
                "is_unstable": node.is_unstable,
            },
            "arrow": {
                "from": node.position,
                "to": CENTER_GOAL,
                "color": self._get_arrow_color(assessment),
                "label": self._get_arrow_label(assessment, correction),
                "magnitude": correction.magnitude,
            },
            "risk": {
                "level": assessment.risk_level.value if assessment else "UNKNOWN",
                "score": assessment.risk_score if assessment else 0,
                "predicted_days": assessment.predicted_churn_days if assessment else None,
            },
            "recommended_pack": assessment.recommended_actions[0] if assessment and assessment.recommended_actions else None
        }
    
    def _calculate_distance(self, p1: Tuple, p2: Tuple) -> float:
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(p1, p2)))
    
    def _determine_color(self, energy: float) -> str:
        if energy > 0.6:
            return "BLUE"
        elif energy > 0.3:
            return "YELLOW"
        else:
            return "RED"
    
    def _check_instability(self, node: NodeState) -> bool:
        return (
            node.energy < 0.4 or
            node.stress_level > 0.6 or
            node.distance_from_center > 4 or
            node.attendance_rate < 0.85
        )
    
    def _get_arrow_color(self, assessment: Optional[ChurnRiskAssessment]) -> str:
        if not assessment:
            return "GRAY"
        color_map = {
            ChurnRiskLevel.LOW: "GREEN",
            ChurnRiskLevel.MEDIUM: "YELLOW",
            ChurnRiskLevel.HIGH: "ORANGE",
            ChurnRiskLevel.CRITICAL: "GOLD",
        }
        return color_map.get(assessment.risk_level, "GRAY")
    
    def _get_arrow_label(
        self, 
        assessment: Optional[ChurnRiskAssessment],
        correction: CorrectionVector
    ) -> str:
        if not assessment:
            return "Monitor"
        label_map = {
            CorrectionThrustType.RETENTION_HIGH_LEVEL: "Push Top-Tier Roadmap",
            CorrectionThrustType.ENGAGEMENT_BOOST: "Boost Engagement",
            CorrectionThrustType.VALUE_DEMONSTRATION: "Demonstrate Value",
            CorrectionThrustType.COMPETITIVE_COUNTER: "Counter Competition",
            CorrectionThrustType.EMOTIONAL_BOND: "Strengthen Bond",
        }
        return label_map.get(correction.thrust_type, "Apply Correction")


# ================================================================
# SIMULATION ENGINE
# ================================================================

class ChurnSimulationEngine:
    """이탈 시뮬레이션 엔진"""
    
    def __init__(self, prevention_engine: ChurnPreventionEngine):
        self.engine = prevention_engine
    
    def simulate_scenario(self, node_id: str, scenario: Dict) -> Dict:
        node = self.engine.nodes.get(node_id)
        if not node:
            return {"error": "Node not found"}
        
        gaze = scenario.get("gaze_stability", 1.0)
        keywords = scenario.get("parent_anxiety_keywords", [])
        market_force = scenario.get("external_market_force", 0.5)
        
        energy_delta = (gaze - 1.0) * 0.5
        new_energy = max(0.1, min(1.0, node.energy + energy_delta))
        
        self.engine.market.competitor_gravity = market_force
        
        self.engine.update_node(node_id, {
            "energy": new_energy,
            "keywords_detected": node.keywords_detected + keywords,
            "stress_level": min(1.0, node.stress_level + len(keywords) * 0.1)
        })
        
        assessment = self.engine.assess_churn_risk(node_id)
        prediction = self.engine.predict_orbit_path(node_id, 168)
        
        prescription = None
        if assessment.risk_level in [ChurnRiskLevel.HIGH, ChurnRiskLevel.CRITICAL]:
            prescription = self._generate_prescription(assessment)
        
        return {
            "input": scenario,
            "node_state": {
                "energy": new_energy,
                "color": node.color,
                "distance": node.distance_from_center,
            },
            "assessment": {
                "risk_level": assessment.risk_level.value,
                "risk_score": assessment.risk_score,
                "predicted_days": assessment.predicted_churn_days,
            },
            "prediction": {
                "churn_probability": prediction.churn_probability,
                "intervention_points": len(prediction.intervention_points),
            },
            "prescription": prescription,
            "ui_data": self.engine.get_ui_data(node_id),
        }
    
    def _generate_prescription(self, assessment: ChurnRiskAssessment) -> Dict:
        if assessment.risk_level == ChurnRiskLevel.CRITICAL:
            pack_type = RetentionPackType.HIGH_LEVEL_INTERVENTION
        elif "CUSTOM_ROADMAP" in assessment.recommended_actions:
            pack_type = RetentionPackType.CUSTOM_ROADMAP
        elif "EMOTIONAL_RECONNECTION" in assessment.recommended_actions:
            pack_type = RetentionPackType.EMOTIONAL_RECONNECTION
        else:
            pack_type = RetentionPackType.TRUST_BUILDING
        
        pack = next((p for p in RETENTION_PACKS if p.pack_type == pack_type), None)
        
        if pack:
            return {
                "pack_type": pack_type.value,
                "pack_name": pack.name,
                "actions": pack.actions[:3],
                "expected_impact": pack.expected_impact,
            }
        return None


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Churn Prevention Engine Test")
    print("=" * 70)
    
    engine = ChurnPreventionEngine()
    
    engine.update_market_condition(MarketCondition(
        competitor_gravity=0.8,
        market_volatility=0.4,
        seasonal_factor=1.0,
        external_events=["경쟁사 공격 마케팅"]
    ))
    
    node = NodeState(
        id="member_001",
        position=(3.0, 2.0, 0.0),
        velocity=(0.1, 0.05, 0.0),
        mass=1.2,
        energy=0.45,
        attendance_rate=0.85,
        engagement_score=0.6,
        last_interaction=datetime.now() - timedelta(days=5),
        keywords_detected=["비용", "타학원", "효과"],
        stress_level=0.65,
    )
    
    engine.register_node(node)
    
    print(f"\n[노드 상태]")
    print(f"  ID: {node.id}")
    print(f"  Energy: {node.energy:.2f}")
    print(f"  Color: {node.color}")
    print(f"  Distance: {node.distance_from_center:.2f}")
    
    assessment = engine.assess_churn_risk("member_001")
    print(f"\n[이탈 위험 평가]")
    print(f"  Risk Level: {assessment.risk_level.value}")
    print(f"  Risk Score: {assessment.risk_score:.2%}")
    print(f"  Predicted Churn: {assessment.predicted_churn_days} days")
    
    prediction = engine.predict_orbit_path("member_001", 168)
    print(f"\n[이탈 경로 예측]")
    print(f"  Churn Probability: {prediction.churn_probability:.1%}")
    print(f"  Intervention Points: {len(prediction.intervention_points)}")
    
    print("\n" + "=" * 70)
    print("✅ Churn Prevention Test Complete")



