"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS Entity Type System
                    
    F = ma 에서 m (질량/관성)에 해당
    
    같은 충격(F)이라도:
    - 스타트업: 질량 작음 → 가속도 큼 (빠르게 변함)
    - 대기업: 질량 큼 → 가속도 작음 (천천히 변함)
    - 국가: 질량 거대 → 거의 안 변함 (관성)
    
    타입 = 운동 방정식의 계수

═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 엔티티 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

class EntityType(Enum):
    """
    엔티티 타입 - 운동 방정식의 질량/관성
    
    관성 = 변화에 대한 저항 (0~1)
        0: 즉시 반응
        1: 거의 안 변함
    """
    
    # (name, 관성, K변화율/일, 임계점, 평균수명(년), 핵심슬롯)
    INDIVIDUAL = ("개인", 0.10, 0.05, -0.5, 80, ["BOND", "MENTOR"])
    STARTUP = ("스타트업", 0.20, 0.10, -0.3, 4, ["SUPPLIER", "CLIENT"])
    SMB = ("중소기업", 0.40, 0.03, -0.4, 15, ["CLIENT", "PEER"])
    ENTERPRISE = ("대기업", 0.80, 0.01, -0.6, 50, ["ALLY", "RIVAL"])
    CITY = ("도시", 0.90, 0.005, -0.7, 100, ["ORIGIN", "ALLY"])
    NATION = ("국가", 0.95, 0.001, -0.8, 200, ["ALLY", "ADVERSARY"])
    IDEOLOGY = ("이념", 0.99, 0.0001, -0.9, 1000, ["DISCIPLE", "ADVERSARY"])
    
    def __init__(self, korean: str, inertia: float, k_rate: float, 
                 threshold: float, lifespan: int, core_slots: List[str]):
        self.korean = korean
        self.inertia = inertia
        self.k_change_rate = k_rate  # 일일 최대 K 변화율
        self.critical_threshold = threshold  # K가 이 이하면 위험
        self.avg_lifespan = lifespan  # 평균 수명 (년)
        self.core_slots = core_slots  # 핵심 관계 슬롯


# ═══════════════════════════════════════════════════════════════════════════════
# 타입별 상호작용 계수
# ═══════════════════════════════════════════════════════════════════════════════

# 타입 간 상호작용 효율 (I-지수 변화 계수)
# 큰 엔티티 → 작은 엔티티: 효과 큼
# 작은 엔티티 → 큰 엔티티: 효과 작음
INTERACTION_COEFFICIENTS: Dict[Tuple[EntityType, EntityType], float] = {
    # INDIVIDUAL 상호작용
    (EntityType.INDIVIDUAL, EntityType.INDIVIDUAL): 1.0,
    (EntityType.INDIVIDUAL, EntityType.STARTUP): 0.8,
    (EntityType.INDIVIDUAL, EntityType.SMB): 0.5,
    (EntityType.INDIVIDUAL, EntityType.ENTERPRISE): 0.2,
    (EntityType.INDIVIDUAL, EntityType.CITY): 0.05,
    (EntityType.INDIVIDUAL, EntityType.NATION): 0.01,
    (EntityType.INDIVIDUAL, EntityType.IDEOLOGY): 0.001,
    
    # STARTUP 상호작용
    (EntityType.STARTUP, EntityType.INDIVIDUAL): 1.2,
    (EntityType.STARTUP, EntityType.STARTUP): 1.0,
    (EntityType.STARTUP, EntityType.SMB): 0.7,
    (EntityType.STARTUP, EntityType.ENTERPRISE): 0.3,
    (EntityType.STARTUP, EntityType.CITY): 0.1,
    (EntityType.STARTUP, EntityType.NATION): 0.02,
    (EntityType.STARTUP, EntityType.IDEOLOGY): 0.002,
    
    # SMB 상호작용
    (EntityType.SMB, EntityType.INDIVIDUAL): 1.5,
    (EntityType.SMB, EntityType.STARTUP): 1.2,
    (EntityType.SMB, EntityType.SMB): 1.0,
    (EntityType.SMB, EntityType.ENTERPRISE): 0.5,
    (EntityType.SMB, EntityType.CITY): 0.2,
    (EntityType.SMB, EntityType.NATION): 0.05,
    (EntityType.SMB, EntityType.IDEOLOGY): 0.005,
    
    # ENTERPRISE 상호작용
    (EntityType.ENTERPRISE, EntityType.INDIVIDUAL): 2.0,
    (EntityType.ENTERPRISE, EntityType.STARTUP): 1.8,
    (EntityType.ENTERPRISE, EntityType.SMB): 1.5,
    (EntityType.ENTERPRISE, EntityType.ENTERPRISE): 1.0,
    (EntityType.ENTERPRISE, EntityType.CITY): 0.5,
    (EntityType.ENTERPRISE, EntityType.NATION): 0.2,
    (EntityType.ENTERPRISE, EntityType.IDEOLOGY): 0.02,
    
    # CITY 상호작용
    (EntityType.CITY, EntityType.INDIVIDUAL): 3.0,
    (EntityType.CITY, EntityType.STARTUP): 2.5,
    (EntityType.CITY, EntityType.SMB): 2.0,
    (EntityType.CITY, EntityType.ENTERPRISE): 1.5,
    (EntityType.CITY, EntityType.CITY): 1.0,
    (EntityType.CITY, EntityType.NATION): 0.5,
    (EntityType.CITY, EntityType.IDEOLOGY): 0.1,
    
    # NATION 상호작용
    (EntityType.NATION, EntityType.INDIVIDUAL): 5.0,
    (EntityType.NATION, EntityType.STARTUP): 4.0,
    (EntityType.NATION, EntityType.SMB): 3.0,
    (EntityType.NATION, EntityType.ENTERPRISE): 2.0,
    (EntityType.NATION, EntityType.CITY): 1.5,
    (EntityType.NATION, EntityType.NATION): 1.0,
    (EntityType.NATION, EntityType.IDEOLOGY): 0.3,
    
    # IDEOLOGY 상호작용
    (EntityType.IDEOLOGY, EntityType.INDIVIDUAL): 10.0,
    (EntityType.IDEOLOGY, EntityType.STARTUP): 5.0,
    (EntityType.IDEOLOGY, EntityType.SMB): 3.0,
    (EntityType.IDEOLOGY, EntityType.ENTERPRISE): 2.0,
    (EntityType.IDEOLOGY, EntityType.CITY): 1.5,
    (EntityType.IDEOLOGY, EntityType.NATION): 1.2,
    (EntityType.IDEOLOGY, EntityType.IDEOLOGY): 1.0,
}


def get_interaction_coefficient(type_a: EntityType, type_b: EntityType) -> float:
    """타입 간 상호작용 계수 조회"""
    return INTERACTION_COEFFICIENTS.get((type_a, type_b), 1.0)


# ═══════════════════════════════════════════════════════════════════════════════
# 수명 곡선 (Life Curve)
# ═══════════════════════════════════════════════════════════════════════════════

class LifeStage(Enum):
    """생애 단계"""
    BIRTH = ("탄생", 0.0, 0.1)       # 0~10%
    GROWTH = ("성장", 0.1, 0.3)      # 10~30%
    PEAK = ("전성기", 0.3, 0.6)      # 30~60%
    DECLINE = ("쇠퇴", 0.6, 0.85)    # 60~85%
    LEGACY = ("유산", 0.85, 1.0)     # 85~100%
    
    def __init__(self, korean: str, start: float, end: float):
        self.korean = korean
        self.start_ratio = start
        self.end_ratio = end


def get_life_stage(age_years: float, entity_type: EntityType) -> LifeStage:
    """현재 생애 단계 계산"""
    lifespan = entity_type.avg_lifespan
    age_ratio = min(1.0, age_years / lifespan)
    
    for stage in LifeStage:
        if stage.start_ratio <= age_ratio < stage.end_ratio:
            return stage
    
    return LifeStage.LEGACY


def get_vitality_modifier(age_years: float, entity_type: EntityType) -> float:
    """
    생명력 보정계수 (0.5 ~ 1.5)
    
    - 탄생: 1.0 (불안정)
    - 성장: 1.3 (활발)
    - 전성기: 1.5 (최고)
    - 쇠퇴: 0.8 (감소)
    - 유산: 0.5 (미미)
    """
    stage = get_life_stage(age_years, entity_type)
    
    vitality_map = {
        LifeStage.BIRTH: 1.0,
        LifeStage.GROWTH: 1.3,
        LifeStage.PEAK: 1.5,
        LifeStage.DECLINE: 0.8,
        LifeStage.LEGACY: 0.5,
    }
    
    return vitality_map.get(stage, 1.0)


# ═══════════════════════════════════════════════════════════════════════════════
# 타입 적용 운동 방정식
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TypedEntity:
    """타입이 적용된 엔티티"""
    id: str
    name: str
    entity_type: EntityType
    
    # K-지수 상태
    k_index: float = 0.0
    k_velocity: float = 0.0  # dK/dt
    
    # 메타데이터
    birth_date: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    
    # 히스토리
    k_history: List[Tuple[datetime, float]] = field(default_factory=list)
    
    @property
    def age_years(self) -> float:
        """나이 (년)"""
        delta = datetime.now() - self.birth_date
        return delta.days / 365.25
    
    @property
    def inertia(self) -> float:
        """관성 (타입 기본값 × 생애단계 보정)"""
        base = self.entity_type.inertia
        stage = get_life_stage(self.age_years, self.entity_type)
        
        # 성장기: 관성 감소, 쇠퇴기: 관성 증가
        stage_modifier = {
            LifeStage.BIRTH: 0.8,
            LifeStage.GROWTH: 0.7,
            LifeStage.PEAK: 1.0,
            LifeStage.DECLINE: 1.2,
            LifeStage.LEGACY: 1.5,
        }
        
        return min(0.99, base * stage_modifier.get(stage, 1.0))
    
    @property
    def max_k_change(self) -> float:
        """일일 최대 K 변화량"""
        base = self.entity_type.k_change_rate
        vitality = get_vitality_modifier(self.age_years, self.entity_type)
        return base * vitality
    
    @property
    def life_stage(self) -> LifeStage:
        """현재 생애 단계"""
        return get_life_stage(self.age_years, self.entity_type)
    
    @property
    def is_critical(self) -> bool:
        """위험 상태 여부"""
        return self.k_index < self.entity_type.critical_threshold
    
    @property
    def remaining_lifespan(self) -> float:
        """예상 남은 수명 (년)"""
        expected = self.entity_type.avg_lifespan
        remaining = expected - self.age_years
        
        # K가 낮으면 수명 감소
        if self.k_index < 0:
            k_penalty = 1.0 + self.k_index  # K=-1이면 0, K=0이면 1
            remaining *= k_penalty
        
        return max(0, remaining)


class TypedPhysicsEngine:
    """
    타입 적용 물리 엔진
    
    K(t+1) = K + (ΔK / (1 + 관성)) × 생명력
    
    관성이 크면:
    - 변화 저항
    - 안정적
    - 반응 느림
    
    관성이 작으면:
    - 빠른 변화
    - 불안정
    - 반응 빠름
    """
    
    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha  # 기본 학습률
        self.entities: Dict[str, TypedEntity] = {}
        self.event_log: List[Dict] = []
    
    def create_entity(
        self, 
        entity_id: str, 
        entity_type: EntityType,
        name: str = "",
        initial_k: float = 0.0,
        birth_date: datetime = None
    ) -> TypedEntity:
        """타입 엔티티 생성"""
        entity = TypedEntity(
            id=entity_id,
            name=name or entity_id,
            entity_type=entity_type,
            k_index=initial_k,
            birth_date=birth_date or datetime.now()
        )
        self.entities[entity_id] = entity
        
        self._log("entity_created", {
            "id": entity_id,
            "type": entity_type.korean,
            "inertia": entity.inertia,
            "max_k_change": entity.max_k_change
        })
        
        return entity
    
    def apply_force(
        self, 
        entity_id: str, 
        force: float,
        context: str = ""
    ) -> Dict:
        """
        힘(F) 적용 → K 변화
        
        가속도 = F / (1 + 관성)
        ΔK = 가속도 × α × 생명력 × (1 - |K|)
        """
        entity = self.entities.get(entity_id)
        if not entity:
            return {"error": "Entity not found"}
        
        k_old = entity.k_index
        
        # 가속도 = F / (1 + 관성)
        acceleration = force / (1 + entity.inertia)
        
        # 생명력 보정
        vitality = get_vitality_modifier(entity.age_years, entity.entity_type)
        
        # 극단값 저항
        resistance = 1.0 - abs(k_old)
        
        # ΔK 계산
        delta_k = self.alpha * acceleration * vitality * resistance
        
        # 최대 변화량 제한
        max_change = entity.max_k_change
        delta_k = max(-max_change, min(max_change, delta_k))
        
        # 새 K (범위 제한)
        k_new = max(-1.0, min(1.0, k_old + delta_k))
        
        # 상태 업데이트
        entity.k_index = k_new
        entity.k_velocity = delta_k
        entity.k_history.append((datetime.now(), k_new))
        entity.last_updated = datetime.now()
        
        # 히스토리 제한
        if len(entity.k_history) > 1000:
            entity.k_history = entity.k_history[-1000:]
        
        result = {
            "entity_id": entity_id,
            "type": entity.entity_type.korean,
            "force": round(force, 4),
            "inertia": round(entity.inertia, 4),
            "acceleration": round(acceleration, 4),
            "vitality": round(vitality, 4),
            "k_before": round(k_old, 4),
            "k_after": round(k_new, 4),
            "delta_k": round(delta_k, 6),
            "life_stage": entity.life_stage.korean,
            "is_critical": entity.is_critical,
            "context": context
        }
        
        self._log("force_applied", result)
        
        return result
    
    def calculate_interaction(
        self,
        entity_a_id: str,
        entity_b_id: str,
        raw_effect: float
    ) -> Dict:
        """
        타입 적용 상호작용 계산
        
        큰 엔티티 → 작은 엔티티: 효과 증폭
        작은 엔티티 → 큰 엔티티: 효과 감소
        """
        entity_a = self.entities.get(entity_a_id)
        entity_b = self.entities.get(entity_b_id)
        
        if not entity_a or not entity_b:
            return {"error": "Entity not found"}
        
        # 상호작용 계수
        coef = get_interaction_coefficient(
            entity_a.entity_type, 
            entity_b.entity_type
        )
        
        # 양측 생명력 평균
        vitality_a = get_vitality_modifier(entity_a.age_years, entity_a.entity_type)
        vitality_b = get_vitality_modifier(entity_b.age_years, entity_b.entity_type)
        avg_vitality = (vitality_a + vitality_b) / 2
        
        # 최종 효과
        final_effect = raw_effect * coef * avg_vitality
        
        return {
            "entity_a": {
                "id": entity_a_id,
                "type": entity_a.entity_type.korean,
                "vitality": round(vitality_a, 4)
            },
            "entity_b": {
                "id": entity_b_id,
                "type": entity_b.entity_type.korean,
                "vitality": round(vitality_b, 4)
            },
            "raw_effect": round(raw_effect, 4),
            "interaction_coefficient": round(coef, 4),
            "final_effect": round(final_effect, 4)
        }
    
    def predict_trajectory(
        self, 
        entity_id: str, 
        days: int = 30
    ) -> Dict:
        """
        타입 적용 궤적 예측
        
        K(t+n) = K + (dK/dt × n) / (1 + 관성)
        """
        entity = self.entities.get(entity_id)
        if not entity:
            return {"error": "Entity not found"}
        
        k = entity.k_index
        velocity = entity.k_velocity
        inertia = entity.inertia
        threshold = entity.entity_type.critical_threshold
        
        predictions = []
        k_pred = k
        
        for day in range(1, days + 1):
            # 관성 적용 감쇠
            decay = 0.99 ** day  # 일별 1% 감쇠
            
            # 관성 적용 변화
            change = (velocity * decay) / (1 + inertia)
            k_pred = max(-1.0, min(1.0, k_pred + change))
            
            predictions.append({
                "day": day,
                "k_predicted": round(k_pred, 4),
                "is_critical": k_pred < threshold
            })
        
        # 임계점 도달 예측
        eta_critical = None
        for p in predictions:
            if p["is_critical"] and eta_critical is None:
                eta_critical = p["day"]
        
        return {
            "entity_id": entity_id,
            "type": entity.entity_type.korean,
            "current_k": round(k, 4),
            "velocity": round(velocity, 6),
            "inertia": round(inertia, 4),
            "critical_threshold": threshold,
            "eta_critical": eta_critical,
            "predictions": predictions[:7]  # 1주일만
        }
    
    def get_entity_status(self, entity_id: str) -> Dict:
        """엔티티 전체 상태"""
        entity = self.entities.get(entity_id)
        if not entity:
            return {"error": "Entity not found"}
        
        return {
            "id": entity.id,
            "name": entity.name,
            "type": entity.entity_type.korean,
            "type_code": entity.entity_type.name,
            "k_index": round(entity.k_index, 4),
            "k_velocity": round(entity.k_velocity, 6),
            "inertia": round(entity.inertia, 4),
            "max_k_change": round(entity.max_k_change, 6),
            "life_stage": entity.life_stage.korean,
            "age_years": round(entity.age_years, 2),
            "remaining_lifespan": round(entity.remaining_lifespan, 2),
            "is_critical": entity.is_critical,
            "critical_threshold": entity.entity_type.critical_threshold,
            "core_slots": entity.entity_type.core_slots,
            "vitality": round(get_vitality_modifier(entity.age_years, entity.entity_type), 4)
        }
    
    def find_critical_entities(self) -> List[Dict]:
        """위험 상태 엔티티 탐지"""
        critical = []
        for entity_id, entity in self.entities.items():
            if entity.is_critical:
                critical.append({
                    "id": entity_id,
                    "type": entity.entity_type.korean,
                    "k_index": round(entity.k_index, 4),
                    "threshold": entity.entity_type.critical_threshold,
                    "gap": round(entity.k_index - entity.entity_type.critical_threshold, 4)
                })
        
        return sorted(critical, key=lambda x: x["gap"])
    
    def _log(self, event_type: str, data: Dict):
        self.event_log.append({
            "type": event_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
        if len(self.event_log) > 1000:
            self.event_log = self.event_log[-1000:]


# ═══════════════════════════════════════════════════════════════════════════════
# 대시보드
# ═══════════════════════════════════════════════════════════════════════════════

def print_type_dashboard(engine: TypedPhysicsEngine):
    """타입 대시보드 출력"""
    print("\n" + "═" * 75)
    print("                    ⚛️  TYPED PHYSICS DASHBOARD")
    print("═" * 75)
    
    # 엔티티 테이블
    print("\n┌─ ENTITIES (with Type & Inertia) ───────────────────────────────────────┐")
    print(f"│ {'ID':<12} │ {'Type':<10} │ {'K':>8} │ {'Inertia':>8} │ {'Stage':<8} │ {'Status':<8} │")
    print("├──────────────┼────────────┼──────────┼──────────┼──────────┼──────────┤")
    
    for entity_id, entity in engine.entities.items():
        k = entity.k_index
        k_icon = "🟢" if k > 0.3 else "🔴" if k < entity.entity_type.critical_threshold else "🟡"
        status = "⚠️ CRITICAL" if entity.is_critical else "OK"
        
        print(f"│ {entity_id:<12} │ {entity.entity_type.korean:<10} │ {k_icon}{k:>+6.3f} │ "
              f"{entity.inertia:>8.3f} │ {entity.life_stage.korean:<8} │ {status:<8} │")
    
    print("└──────────────┴────────────┴──────────┴──────────┴──────────┴──────────┘")
    
    # 타입 참조표
    print("\n┌─ TYPE REFERENCE ────────────────────────────────────────────────────────┐")
    print(f"│ {'Type':<12} │ {'Inertia':>8} │ {'K Rate/day':>12} │ {'Threshold':>10} │ {'Lifespan':>10} │")
    print("├──────────────┼──────────┼──────────────┼────────────┼────────────┤")
    
    for etype in EntityType:
        print(f"│ {etype.korean:<12} │ {etype.inertia:>8.2f} │ {etype.k_change_rate:>+12.4f} │ "
              f"{etype.critical_threshold:>10.2f} │ {etype.avg_lifespan:>8}년 │")
    
    print("└──────────────┴──────────┴──────────────┴────────────┴────────────┘")
    
    # 위험 엔티티
    critical = engine.find_critical_entities()
    if critical:
        print("\n┌─ ⚠️  CRITICAL ENTITIES ──────────────────────────────────────────────────┐")
        for c in critical:
            print(f"│ {c['id']}: K={c['k_index']:+.4f} (threshold: {c['threshold']}) gap: {c['gap']:+.4f}")
        print("└──────────────────────────────────────────────────────────────────────────┘")
    
    print()


# ═══════════════════════════════════════════════════════════════════════════════
# 데모
# ═══════════════════════════════════════════════════════════════════════════════

def run_demo():
    """타입 시스템 데모"""
    print("\n⚛️  Entity Type System Demo\n")
    
    engine = TypedPhysicsEngine(alpha=0.1)
    
    # 다양한 타입 엔티티 생성
    print("1️⃣  엔티티 생성")
    
    engine.create_entity("Kim", EntityType.INDIVIDUAL, "김철수")
    engine.create_entity("TechStartup", EntityType.STARTUP, "테크스타트업")
    engine.create_entity("LocalBakery", EntityType.SMB, "동네빵집")
    engine.create_entity("Samsung", EntityType.ENTERPRISE, "삼성전자")
    engine.create_entity("Seoul", EntityType.CITY, "서울특별시")
    engine.create_entity("Korea", EntityType.NATION, "대한민국")
    
    # 각 엔티티 상태 출력
    for eid in engine.entities:
        status = engine.get_entity_status(eid)
        print(f"   {status['name']}: {status['type']}, 관성={status['inertia']:.2f}, "
              f"K변화율/일={status['max_k_change']:.4f}")
    
    # 같은 힘 적용 → 다른 결과
    print("\n2️⃣  같은 힘(F=1.0) 적용 → 관성에 따른 차이")
    
    force = 1.0
    for eid in engine.entities:
        result = engine.apply_force(eid, force, "동일 충격")
        print(f"   {eid}: 관성={result['inertia']:.2f}, 가속도={result['acceleration']:+.4f}, "
              f"ΔK={result['delta_k']:+.6f}")
    
    # 큰 엔티티 → 작은 엔티티 상호작용
    print("\n3️⃣  타입 간 상호작용 계수")
    
    interactions = [
        ("Kim", "TechStartup"),
        ("Samsung", "LocalBakery"),
        ("Korea", "Kim"),
        ("Korea", "Samsung"),
    ]
    
    for a, b in interactions:
        result = engine.calculate_interaction(a, b, 1.0)
        print(f"   {a} → {b}: 계수={result['interaction_coefficient']:.2f}, "
              f"최종효과={result['final_effect']:.2f}")
    
    # 대시보드
    print_type_dashboard(engine)
    
    # 물리법칙 요약
    print("""
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                     ⚛️ 타입 적용 운동 방정식                            │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │  기본 방정식:                                                           │
  │  ────────────────────────────────────────────────────────────────────── │
  │  가속도 = F / (1 + 관성)                                                │
  │  ΔK = α × 가속도 × 생명력 × (1 - |K|)                                   │
  │                                                                         │
  │  타입별 특성:                                                           │
  │  ────────────────────────────────────────────────────────────────────── │
  │  - 관성: 변화 저항 (0~1)                                                │
  │  - K변화율: 일일 최대 변화량                                            │
  │  - 임계점: 위험 K값                                                     │
  │  - 수명: 평균 생존 기간                                                 │
  │                                                                         │
  │  생애 단계 영향:                                                        │
  │  ────────────────────────────────────────────────────────────────────── │
  │  탄생 → 성장 → 전성기 → 쇠퇴 → 유산                                     │
  │  관성: 감소 → 감소 → 기준 → 증가 → 최대                                 │
  │  생명력: 1.0 → 1.3 → 1.5 → 0.8 → 0.5                                    │
  │                                                                         │
  │  상호작용 계수:                                                         │
  │  ────────────────────────────────────────────────────────────────────── │
  │  큰 타입 → 작은 타입: 효과 증폭 (최대 10x)                              │
  │  작은 타입 → 큰 타입: 효과 감소 (최소 0.001x)                           │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    run_demo()
