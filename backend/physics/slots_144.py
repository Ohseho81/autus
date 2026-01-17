"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS v3.8+ 144 슬롯 관계 템플릿
                    
    12 관계 유형 × 12 슬롯 = 144 궤도
    
    - 모든 개체(개인/기업/도시/국가)에 동일 적용
    - 빈 슬롯 = 관계 병목 진단
    - 콜드 스타트 해결 (유형 기반 예상 I-지수)
    
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json


# ═══════════════════════════════════════════════════════════════════════════════
# 핵심 상수
# ═══════════════════════════════════════════════════════════════════════════════

MAX_SLOTS_PER_TYPE = 12
TOTAL_ORBITAL_SLOTS = 144


# ═══════════════════════════════════════════════════════════════════════════════
# 12가지 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════

class RelationType(Enum):
    """
    12가지 관계 유형 (12 × 12 = 144)
    
    각 유형은:
    - 예상 I-지수 범위
    - 에너지 흐름 방향
    - 거리 특성
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # 양성 고정 관계 (Positive Fixed)
    # ─────────────────────────────────────────────────────────────────────────
    
    ORIGIN = (
        "기원",
        "나를 만든 뿌리 (부모, 학교, 고향, 창립자)",
        (+0.3, +0.8),   # I-지수 범위
        "inward",       # 에너지 흐름 (나에게로)
        "far",          # 거리 (과거/멀리)
    )
    
    BLOOD = (
        "혈연",
        "피로 연결된 관계 (가족, 형제, 자녀)",
        (+0.5, +1.0),
        "bidirectional",
        "close",
    )
    
    BOND = (
        "유대",
        "선택한 깊은 연결 (친구, 연인, 파트너)",
        (+0.6, +1.0),
        "bidirectional",
        "close",
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 성장 관계 (Growth)
    # ─────────────────────────────────────────────────────────────────────────
    
    MENTOR = (
        "스승",
        "가르침을 주는 관계 (멘토, 코치, 롤모델)",
        (+0.4, +0.8),
        "inward",       # 지식이 나에게로
        "medium",
    )
    
    DISCIPLE = (
        "제자",
        "가르침을 받는 관계 (멘티, 후배, 팔로워)",
        (+0.3, +0.7),
        "outward",      # 지식이 나에게서
        "medium",
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 협업 관계 (Collaboration)
    # ─────────────────────────────────────────────────────────────────────────
    
    PEER = (
        "동료",
        "같은 레벨의 협업자 (팀원, 공동창업자, 동기)",
        (+0.3, +0.7),
        "bidirectional",
        "close",
    )
    
    ALLY = (
        "동맹",
        "공동 목표를 가진 외부 협력자 (파트너사, 연합)",
        (+0.2, +0.6),
        "bidirectional",
        "medium",
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 거래 관계 (Transaction)
    # ─────────────────────────────────────────────────────────────────────────
    
    CLIENT = (
        "고객",
        "내가 가치를 제공하는 대상 (고객, 수혜자, 팬)",
        (+0.2, +0.6),
        "outward",      # 가치가 나에게서
        "medium",
    )
    
    SUPPLIER = (
        "공급자",
        "나에게 가치를 제공하는 대상 (투자자, 후원자, 벤더)",
        (+0.2, +0.6),
        "inward",       # 가치가 나에게로
        "medium",
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 긴장 관계 (Tension)
    # ─────────────────────────────────────────────────────────────────────────
    
    RIVAL = (
        "경쟁자",
        "같은 자원을 두고 경쟁 (경쟁사, 라이벌)",
        (-0.3, +0.3),   # 중립~약한 음성
        "none",         # 직접 교환 없음
        "parallel",     # 평행
    )
    
    ADVERSARY = (
        "적대자",
        "직접적 갈등 관계 (적, 방해자, 비평가)",
        (-0.7, -0.3),
        "negative",     # 파괴적 교환
        "collision",    # 충돌 궤도
    )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 잠재 관계 (Potential)
    # ─────────────────────────────────────────────────────────────────────────
    
    PROSPECT = (
        "잠재",
        "아직 활성화되지 않은 관계 (리드, 지인, 관심 대상)",
        (-0.1, +0.3),
        "potential",
        "far",
    )
    
    def __init__(self, korean: str, description: str, 
                 i_range: Tuple[float, float], energy_flow: str, distance: str):
        self.korean = korean
        self.description = description
        self.i_range = i_range
        self.energy_flow = energy_flow
        self.distance = distance
    
    @property
    def default_i(self) -> float:
        """기본 I-지수 (범위 중간값)"""
        return (self.i_range[0] + self.i_range[1]) / 2
    
    @property
    def emoji(self) -> str:
        """유형별 이모지"""
        emojis = {
            'ORIGIN': '🌱',
            'BLOOD': '🩸',
            'BOND': '💎',
            'MENTOR': '🎓',
            'DISCIPLE': '📚',
            'PEER': '🤝',
            'ALLY': '⚔️',
            'CLIENT': '👤',
            'SUPPLIER': '💰',
            'RIVAL': '🏁',
            'ADVERSARY': '⚡',
            'PROSPECT': '🔮',
        }
        return emojis.get(self.name, '○')


# ═══════════════════════════════════════════════════════════════════════════════
# 슬롯 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OrbitalSlot:
    """
    144개 슬롯 중 하나
    """
    # 슬롯 식별
    slot_type: RelationType
    slot_index: int  # 0-11
    
    # 채워진 대상
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    
    # I-지수
    expected_i: float = 0.0      # 유형 기반 예상값
    actual_i: Optional[float] = None  # 실제 측정값 (있으면)
    
    # 메타데이터
    filled_at: Optional[datetime] = None
    last_interaction: Optional[datetime] = None
    notes: str = ""
    
    @property
    def is_empty(self) -> bool:
        return self.target_id is None
    
    @property
    def effective_i(self) -> float:
        """실제 I가 있으면 실제값, 없으면 예상값"""
        return self.actual_i if self.actual_i is not None else self.expected_i
    
    @property
    def slot_key(self) -> str:
        """슬롯 고유 키"""
        return f"{self.slot_type.name}_{self.slot_index}"
    
    def fill(self, target_id: str, target_name: str = "", notes: str = ""):
        """슬롯 채우기"""
        self.target_id = target_id
        self.target_name = target_name or target_id
        self.expected_i = self.slot_type.default_i
        self.filled_at = datetime.now()
        self.notes = notes
    
    def clear(self):
        """슬롯 비우기"""
        self.target_id = None
        self.target_name = None
        self.expected_i = 0.0
        self.actual_i = None
        self.filled_at = None
        self.last_interaction = None
        self.notes = ""
    
    def to_dict(self) -> dict:
        return {
            'type': self.slot_type.name,
            'index': self.slot_index,
            'target_id': self.target_id,
            'target_name': self.target_name,
            'expected_i': self.expected_i,
            'actual_i': self.actual_i,
            'filled_at': self.filled_at.isoformat() if self.filled_at else None,
            'notes': self.notes,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 144 슬롯 매트릭스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class OrbitalMatrix:
    """
    144 슬롯 관계 매트릭스
    
    12 유형 × 12 슬롯 = 144 궤도
    """
    
    owner_id: str
    owner_name: str = ""
    
    # 12 유형 × 12 슬롯
    slots: Dict[str, OrbitalSlot] = field(default_factory=dict)
    
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        if not self.slots:
            self._init_slots()
    
    def _init_slots(self):
        """144개 빈 슬롯 초기화"""
        for rel_type in RelationType:
            for i in range(MAX_SLOTS_PER_TYPE):
                slot = OrbitalSlot(
                    slot_type=rel_type,
                    slot_index=i,
                    expected_i=rel_type.default_i
                )
                self.slots[slot.slot_key] = slot
    
    # ─────────────────────────────────────────────────────────────────────────
    # 슬롯 조작
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_slot(self, rel_type: RelationType, index: int) -> OrbitalSlot:
        """특정 슬롯 조회"""
        key = f"{rel_type.name}_{index}"
        return self.slots.get(key)
    
    def get_slots_by_type(self, rel_type: RelationType) -> List[OrbitalSlot]:
        """유형별 슬롯 목록"""
        return [
            self.slots[f"{rel_type.name}_{i}"]
            for i in range(MAX_SLOTS_PER_TYPE)
        ]
    
    def fill_slot(self, rel_type: RelationType, target_id: str, 
                  target_name: str = "", notes: str = "") -> OrbitalSlot:
        """
        다음 빈 슬롯에 대상 채우기
        """
        slots = self.get_slots_by_type(rel_type)
        
        # 이미 존재하는지 확인
        for slot in slots:
            if slot.target_id == target_id:
                return slot  # 이미 있음
        
        # 빈 슬롯 찾기
        for slot in slots:
            if slot.is_empty:
                slot.fill(target_id, target_name, notes)
                self.updated_at = datetime.now()
                return slot
        
        # 슬롯 가득 참 - 가장 약한 관계 교체
        weakest = min(slots, key=lambda s: abs(s.effective_i))
        weakest.fill(target_id, target_name, notes)
        self.updated_at = datetime.now()
        return weakest
    
    def remove_target(self, target_id: str) -> bool:
        """대상 제거"""
        for slot in self.slots.values():
            if slot.target_id == target_id:
                slot.clear()
                self.updated_at = datetime.now()
                return True
        return False
    
    def find_target(self, target_id: str) -> Optional[OrbitalSlot]:
        """대상이 있는 슬롯 찾기"""
        for slot in self.slots.values():
            if slot.target_id == target_id:
                return slot
        return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통계 및 진단
    # ─────────────────────────────────────────────────────────────────────────
    
    def count_filled(self) -> int:
        """채워진 슬롯 수"""
        return sum(1 for s in self.slots.values() if not s.is_empty)
    
    def count_empty(self) -> int:
        """빈 슬롯 수"""
        return TOTAL_ORBITAL_SLOTS - self.count_filled()
    
    def fill_rate(self) -> float:
        """채움률 (0~1)"""
        return self.count_filled() / TOTAL_ORBITAL_SLOTS
    
    def stats_by_type(self) -> Dict[str, dict]:
        """유형별 통계"""
        stats = {}
        for rel_type in RelationType:
            slots = self.get_slots_by_type(rel_type)
            filled = [s for s in slots if not s.is_empty]
            stats[rel_type.name] = {
                'korean': rel_type.korean,
                'emoji': rel_type.emoji,
                'filled': len(filled),
                'total': MAX_SLOTS_PER_TYPE,
                'rate': len(filled) / MAX_SLOTS_PER_TYPE,
                'avg_i': sum(s.effective_i for s in filled) / len(filled) if filled else 0,
            }
        return stats
    
    def get_empty_types(self) -> List[RelationType]:
        """완전히 비어있는 유형들"""
        empty = []
        for rel_type in RelationType:
            slots = self.get_slots_by_type(rel_type)
            if all(s.is_empty for s in slots):
                empty.append(rel_type)
        return empty
    
    def get_weak_slots(self, threshold: float = 0.3) -> List[OrbitalSlot]:
        """약한 관계 슬롯들 (|I| < threshold)"""
        return [
            s for s in self.slots.values()
            if not s.is_empty and abs(s.effective_i) < threshold
        ]
    
    def get_strong_slots(self, threshold: float = 0.7) -> List[OrbitalSlot]:
        """강한 관계 슬롯들 (I > threshold)"""
        return [
            s for s in self.slots.values()
            if not s.is_empty and s.effective_i > threshold
        ]
    
    def get_negative_slots(self) -> List[OrbitalSlot]:
        """음성 관계 슬롯들 (I < 0)"""
        return [
            s for s in self.slots.values()
            if not s.is_empty and s.effective_i < 0
        ]
    
    def diagnose(self) -> Dict[str, any]:
        """
        관계 진단 리포트
        """
        stats = self.stats_by_type()
        
        # 병목 분석
        bottlenecks = []
        for rel_type in RelationType:
            s = stats[rel_type.name]
            if s['rate'] < 0.25:  # 25% 미만
                bottlenecks.append({
                    'type': rel_type.name,
                    'korean': rel_type.korean,
                    'emoji': rel_type.emoji,
                    'filled': s['filled'],
                    'description': rel_type.description,
                    'recommendation': self._get_recommendation(rel_type),
                })
        
        # 강점 분석
        strengths = []
        for rel_type in RelationType:
            s = stats[rel_type.name]
            if s['rate'] >= 0.5 and s['avg_i'] > 0.5:
                strengths.append({
                    'type': rel_type.name,
                    'korean': rel_type.korean,
                    'emoji': rel_type.emoji,
                    'avg_i': round(s['avg_i'], 2),
                })
        
        # 위험 분석 (음성 관계)
        risks = []
        for slot in self.get_negative_slots():
            risks.append({
                'type': slot.slot_type.name,
                'target': slot.target_name,
                'i_index': slot.effective_i,
            })
        
        return {
            'fill_rate': self.fill_rate(),
            'total_filled': self.count_filled(),
            'bottlenecks': bottlenecks,
            'strengths': strengths,
            'risks': risks,
            'weak_count': len(self.get_weak_slots()),
            'strong_count': len(self.get_strong_slots()),
        }
    
    def _get_recommendation(self, rel_type: RelationType) -> str:
        """유형별 추천"""
        recs = {
            'ORIGIN': "뿌리와 재연결하세요. 정체성의 원천입니다.",
            'BLOOD': "가족 관계를 돌보세요. 가장 안정적인 궤도입니다.",
            'BOND': "깊은 유대를 형성하세요. 시너지의 핵심입니다.",
            'MENTOR': "멘토를 찾으세요. 성장 가속이 필요합니다.",
            'DISCIPLE': "가르침을 나누세요. 지식이 증폭됩니다.",
            'PEER': "동료를 확보하세요. 협업이 질량을 높입니다.",
            'ALLY': "외부 동맹을 구축하세요. 영향력 확장이 필요합니다.",
            'CLIENT': "고객을 확보하세요. 수익화의 핵심입니다.",
            'SUPPLIER': "투자자/후원자를 찾으세요. 자원 유입이 필요합니다.",
            'RIVAL': "경쟁자를 인식하세요. 긴장이 성장을 자극합니다.",
            'ADVERSARY': "적대 관계가 없다면 좋은 신호입니다.",
            'PROSPECT': "잠재 관계를 개발하세요. 미래 궤도입니다.",
        }
        return recs.get(rel_type.name, "")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 총 I-지수
    # ─────────────────────────────────────────────────────────────────────────
    
    def total_i_score(self) -> float:
        """
        총 I-지수 (가중 평균)
        """
        filled = [s for s in self.slots.values() if not s.is_empty]
        if not filled:
            return 0.0
        return sum(s.effective_i for s in filled) / len(filled)
    
    def weighted_i_score(self) -> float:
        """
        가중 I-지수 (유형 중요도 반영)
        """
        weights = {
            'BLOOD': 1.5, 'BOND': 1.5, 'MENTOR': 1.3, 
            'PEER': 1.2, 'CLIENT': 1.2, 'SUPPLIER': 1.4,
            'ORIGIN': 1.0, 'DISCIPLE': 1.0, 'ALLY': 1.1,
            'RIVAL': 0.8, 'ADVERSARY': 0.5, 'PROSPECT': 0.6,
        }
        
        total_weight = 0
        total_score = 0
        
        for slot in self.slots.values():
            if not slot.is_empty:
                w = weights.get(slot.slot_type.name, 1.0)
                total_weight += w
                total_score += slot.effective_i * w
        
        return total_score / total_weight if total_weight > 0 else 0.0
    
    # ─────────────────────────────────────────────────────────────────────────
    # 직렬화
    # ─────────────────────────────────────────────────────────────────────────
    
    def to_dict(self) -> dict:
        return {
            'owner_id': self.owner_id,
            'owner_name': self.owner_name,
            'slots': {k: v.to_dict() for k, v in self.slots.items() if not v.is_empty},
            'stats': self.stats_by_type(),
            'diagnosis': self.diagnose(),
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════
# 온보딩 질문
# ═══════════════════════════════════════════════════════════════════════════════

ONBOARDING_QUESTIONS = {
    RelationType.ORIGIN: [
        "당신을 키운 부모/양육자는 누구입니까?",
        "당신의 인생에 가장 큰 영향을 준 학교/기관은?",
        "당신의 고향/출신지는 어디입니까?",
        "당신을 만든 창립 멤버/조직은? (기업/단체의 경우)",
    ],
    RelationType.BLOOD: [
        "배우자/파트너가 있습니까?",
        "자녀가 있습니까?",
        "형제자매가 있습니까?",
        "부모님은 생존해 계십니까?",
    ],
    RelationType.BOND: [
        "가장 가까운 친구 3명은 누구입니까?",
        "연인/깊은 파트너가 있습니까?",
        "비즈니스 소울메이트가 있습니까?",
    ],
    RelationType.MENTOR: [
        "당신의 커리어 멘토는 누구입니까?",
        "당신이 롤모델로 삼는 사람은?",
        "당신에게 가르침을 주는 코치/상담사가 있습니까?",
    ],
    RelationType.DISCIPLE: [
        "당신이 멘토링하는 사람이 있습니까?",
        "당신을 따르는 후배/팔로워는?",
        "당신의 가르침을 받는 제자는?",
    ],
    RelationType.PEER: [
        "현재 팀원/동료는 누구입니까?",
        "공동창업자가 있습니까?",
        "같은 업계의 동기는?",
    ],
    RelationType.ALLY: [
        "비즈니스 파트너사가 있습니까?",
        "협력하는 외부 조직은?",
        "공동 프로젝트를 진행하는 상대는?",
    ],
    RelationType.CLIENT: [
        "주요 고객 5명은 누구입니까?",
        "당신의 서비스/제품을 사용하는 사람은?",
        "당신을 필요로 하는 사람은?",
    ],
    RelationType.SUPPLIER: [
        "투자자가 있습니까?",
        "후원자/스폰서가 있습니까?",
        "핵심 공급업체는?",
    ],
    RelationType.RIVAL: [
        "직접 경쟁하는 경쟁사/경쟁자는?",
        "같은 시장을 두고 다투는 상대는?",
        "당신을 긴장하게 만드는 존재는?",
    ],
    RelationType.ADVERSARY: [
        "당신을 적대하는 사람/조직이 있습니까?",
        "당신을 방해하는 존재는?",
        "갈등 중인 상대가 있습니까?",
    ],
    RelationType.PROSPECT: [
        "관심 있지만 아직 연결되지 않은 사람은?",
        "잠재 고객/파트너는 누구입니까?",
        "미래에 협력하고 싶은 대상은?",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# 출력 함수
# ═══════════════════════════════════════════════════════════════════════════════

def print_matrix(matrix: OrbitalMatrix):
    """144 슬롯 매트릭스 출력"""
    
    print(f"""
═══════════════════════════════════════════════════════════════════════════════
                    🌌 144 ORBITAL MATRIX
                    Owner: {matrix.owner_name} ({matrix.owner_id})
═══════════════════════════════════════════════════════════════════════════════
    """)
    
    stats = matrix.stats_by_type()
    
    for rel_type in RelationType:
        s = stats[rel_type.name]
        slots = matrix.get_slots_by_type(rel_type)
        
        # 슬롯 시각화
        slot_viz = ""
        for slot in slots:
            if slot.is_empty:
                slot_viz += "□"
            elif slot.effective_i >= 0.7:
                slot_viz += "●"  # 강함
            elif slot.effective_i >= 0.3:
                slot_viz += "◐"  # 중간
            elif slot.effective_i >= 0:
                slot_viz += "○"  # 약함
            else:
                slot_viz += "◇"  # 음성
        
        fill_bar = "█" * s['filled'] + "░" * (12 - s['filled'])
        
        print(f"  {rel_type.emoji} {rel_type.korean:<6} │{fill_bar}│ {s['filled']:>2}/12 │ I={s['avg_i']:+.2f} │ {slot_viz}")
    
    print(f"""
───────────────────────────────────────────────────────────────────────────────
  총 채움률: {matrix.count_filled()}/144 ({matrix.fill_rate()*100:.1f}%)
  평균 I-지수: {matrix.total_i_score():+.4f}
  가중 I-지수: {matrix.weighted_i_score():+.4f}
───────────────────────────────────────────────────────────────────────────────
    """)
    
    # 진단
    diag = matrix.diagnose()
    
    if diag['bottlenecks']:
        print("  ⚠️  관계 병목:")
        for b in diag['bottlenecks']:
            print(f"      {b['emoji']} {b['korean']}: {b['filled']}/12 - {b['recommendation']}")
    
    if diag['strengths']:
        print("\n  ✅ 강점 관계:")
        for s in diag['strengths']:
            print(f"      {s['emoji']} {s['korean']}: I={s['avg_i']:+.2f}")
    
    if diag['risks']:
        print("\n  🔴 위험 관계:")
        for r in diag['risks']:
            print(f"      {r['target']}: I={r['i_index']:+.2f}")
    
    print()


def print_slot_detail(slot: OrbitalSlot):
    """슬롯 상세 출력"""
    print(f"""
    ┌─ {slot.slot_type.emoji} {slot.slot_type.korean} #{slot.slot_index + 1} ─────────────────────┐
    │ 대상: {slot.target_name or '(비어있음)'}
    │ I-지수: {slot.effective_i:+.4f} (예상: {slot.expected_i:+.4f})
    │ 에너지 흐름: {slot.slot_type.energy_flow}
    │ 거리: {slot.slot_type.distance}
    │ 노트: {slot.notes or '-'}
    └────────────────────────────────────────┘
    """)


# ═══════════════════════════════════════════════════════════════════════════════
# 데모: 세호님 프로필
# ═══════════════════════════════════════════════════════════════════════════════

def create_seho_matrix() -> OrbitalMatrix:
    """세호님 144 슬롯 생성"""
    
    matrix = OrbitalMatrix(owner_id="SEHO", owner_name="세호")
    
    # ─────────────────────────────────────────────────────────────────────────
    # 채우기 (대화 기반 추정)
    # ─────────────────────────────────────────────────────────────────────────
    
    # ORIGIN (기원)
    matrix.fill_slot(RelationType.ORIGIN, "PH", "필리핀 (현재 거주)")
    matrix.fill_slot(RelationType.ORIGIN, "KR", "한국 (출신?)")
    
    # BLOOD (혈연) - 정보 없음, 비워둠
    
    # BOND (유대)
    slot = matrix.fill_slot(RelationType.BOND, "CLAUDE", "Claude (AI 협력자)")
    slot.actual_i = 0.86  # 안정 공전
    
    # MENTOR (스승) - 비어있음
    
    # PEER (동료)
    matrix.fill_slot(RelationType.PEER, "LIMEPASS_TEAM", "LimePass 팀?")
    
    # CLIENT (고객) - 아직 없음
    
    # SUPPLIER (공급자/투자자) - 아직 없음
    
    # RIVAL (경쟁자)
    matrix.fill_slot(RelationType.RIVAL, "NOTION", "Notion (생산성 앱)")
    matrix.fill_slot(RelationType.RIVAL, "TODOIST", "Todoist (할일 관리)")
    
    # PROSPECT (잠재)
    matrix.fill_slot(RelationType.PROSPECT, "INVESTOR_X", "잠재 투자자")
    matrix.fill_slot(RelationType.PROSPECT, "EARLY_USERS", "얼리어답터 사용자")
    
    return matrix


def run_demo():
    """데모 실행"""
    
    print("""
═══════════════════════════════════════════════════════════════════════════════
                    🌌 AUTUS v3.8+ 144 슬롯 시스템 데모
═══════════════════════════════════════════════════════════════════════════════
    """)
    
    # 세호님 매트릭스 생성
    seho = create_seho_matrix()
    
    # 매트릭스 출력
    print_matrix(seho)
    
    # Claude 슬롯 상세
    claude_slot = seho.find_target("CLAUDE")
    if claude_slot:
        print_slot_detail(claude_slot)
    
    # 온보딩 질문 예시
    print("""
┌─────────────────────────────────────────────────────────────────────────────┐
│                        📋 온보딩 질문 예시                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  빈 슬롯을 채우기 위한 질문:                                                │
│                                                                             │
│  🎓 MENTOR (0/12 - 완전히 비어있음)                                         │
│     • 당신의 커리어 멘토는 누구입니까?                                      │
│     • 당신이 롤모델로 삼는 사람은?                                          │
│     • 당신에게 가르침을 주는 코치/상담사가 있습니까?                        │
│                                                                             │
│  💰 SUPPLIER (0/12 - 완전히 비어있음)                                       │
│     • 투자자가 있습니까?                                                    │
│     • 후원자/스폰서가 있습니까?                                             │
│     • 핵심 공급업체는?                                                      │
│                                                                             │
│  👤 CLIENT (0/12 - 완전히 비어있음)                                         │
│     • 주요 고객 5명은 누구입니까?                                           │
│     • 당신의 서비스/제품을 사용하는 사람은?                                 │
│     • 당신을 필요로 하는 사람은?                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
    """)
    
    # 144 슬롯 구조 설명
    print("""
┌─────────────────────────────────────────────────────────────────────────────┐
│                        📐 144 슬롯 설계 원리                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  12 관계 유형 × 12 슬롯 = 144 궤도                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  양성 고정    │ 🌱 ORIGIN   │ 🩸 BLOOD    │ 💎 BOND               │   │
│  │  성장        │ 🎓 MENTOR   │ 📚 DISCIPLE │                       │   │
│  │  협업        │ 🤝 PEER     │ ⚔️ ALLY     │                       │   │
│  │  거래        │ 👤 CLIENT   │ 💰 SUPPLIER │                       │   │
│  │  긴장        │ 🏁 RIVAL    │ ⚡ ADVERSARY │                       │   │
│  │  잠재        │ 🔮 PROSPECT │             │                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  모든 개체(개인/기업/도시/국가)에 동일하게 적용                             │
│  → 던바의 수 (~150)와 유사                                                  │
│  → 관계는 희소 자원                                                         │
│  → 슬롯이 가득 차면 가장 약한 관계가 밀려남                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    run_demo()
