"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS UNIFIED SYSTEM v3.0
═══════════════════════════════════════════════════════════════════════════════

통합된 AUTUS 시스템 - 모든 컴포넌트의 단일 진입점

구조:
- 48 노드 = 4 메타 × 4 도메인 × 3 타입
- 6 Core + 3 Role = 42 아키타입 조합
- 물리 기반 시뮬레이션
- Zero Meaning 자동화

"이해할 수 없으면 변화할 수 없다" - AUTUS
═══════════════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# 1. 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_VERSION = "4.0.0"
GLOBAL_POPULATION = 8_000_000_000
LAUNCH_DATE = datetime(2025, 1, 1, tzinfo=timezone.utc)

# 구조 상수
TOTAL_NODES = 48
TOTAL_DOMAINS = 16
TOTAL_META = 4
NODES_PER_DOMAIN = 3
CORE_ARCHETYPES = 6
ROLE_MODIFIERS = 3
ARCHETYPE_COMBINATIONS = 42  # 6 × 7


# ═══════════════════════════════════════════════════════════════════════════════
# 2. 열거형 정의
# ═══════════════════════════════════════════════════════════════════════════════

class MetaCategory(Enum):
    """4대 메타 카테고리"""
    MAT = "MAT"  # 물질 (Material)
    MEN = "MEN"  # 정신 (Mental)
    DYN = "DYN"  # 동적 (Dynamic)
    TRS = "TRS"  # 초월 (Transcendent)


class Domain(Enum):
    """16개 도메인"""
    # MAT (물질)
    CASH = "CASH"       # 현금
    ASSET = "ASSET"     # 자산
    BODY = "BODY"       # 신체
    SPACE = "SPACE"     # 공간
    # MEN (정신)
    COGNI = "COGNI"     # 인지
    EMOTE = "EMOTE"     # 감정
    WILL = "WILL"       # 의지
    RELATE = "RELATE"   # 관계
    # DYN (동적)
    TIME = "TIME"       # 시간
    WORK = "WORK"       # 업무
    GROW = "GROW"       # 성장
    CHANGE = "CHANGE"   # 변화
    # TRS (초월)
    MEANING = "MEANING" # 의미
    LEGACY = "LEGACY"   # 유산
    IMPACT = "IMPACT"   # 영향
    SELF = "SELF"       # 자아


class NodeType(Enum):
    """3가지 노드 타입"""
    ARCHETYPE = "A"     # 본질 ⭐
    DYNAMICS = "D"      # 흐름 🔄
    EQUILIBRIUM = "E"   # 균형 ⚖️


class CoreType(Enum):
    """6가지 Core 아키타입"""
    EMPLOYEE = "C01"        # 직장인 💼
    ENTREPRENEUR = "C02"    # 창업가 🚀
    SELF_EMPLOYED = "C03"   # 자영업자 🏪
    STUDENT = "C04"         # 학생 📚
    TRANSITION = "C05"      # 전환기 🔍
    RETIRED = "C06"         # 은퇴자 🌅


class RoleType(Enum):
    """3가지 Role 수정자"""
    CAREGIVER = "R01"   # 양육자 👨‍👩‍👧
    INVESTOR = "R02"    # 투자자 📈
    CREATOR = "R03"     # 창작자 ✨


class PressureState(Enum):
    """압력 상태"""
    STABLE = "STABLE"           # 안정 (0-30%)
    MONITORING = "MONITORING"   # 관찰 (30-50%)
    PRESSURING = "PRESSURING"   # 압박 (50-78%)
    IRREVERSIBLE = "IRREVERSIBLE"  # 위험 (78-90%)
    CRITICAL = "CRITICAL"       # 위기 (90-100%)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. 데이터 구조 정의
# ═══════════════════════════════════════════════════════════════════════════════

# 메타 카테고리 정보
META_INFO: Dict[str, Dict] = {
    "MAT": {"name": "물질", "emoji": "💎", "domains": ["CASH", "ASSET", "BODY", "SPACE"]},
    "MEN": {"name": "정신", "emoji": "🧠", "domains": ["COGNI", "EMOTE", "WILL", "RELATE"]},
    "DYN": {"name": "동적", "emoji": "⚡", "domains": ["TIME", "WORK", "GROW", "CHANGE"]},
    "TRS": {"name": "초월", "emoji": "🌟", "domains": ["MEANING", "LEGACY", "IMPACT", "SELF"]},
}

# 도메인 정보
DOMAIN_INFO: Dict[str, Dict] = {
    "CASH":    {"meta": "MAT", "name": "현금", "name_en": "Cash Flow"},
    "ASSET":   {"meta": "MAT", "name": "자산", "name_en": "Assets"},
    "BODY":    {"meta": "MAT", "name": "신체", "name_en": "Body"},
    "SPACE":   {"meta": "MAT", "name": "공간", "name_en": "Space"},
    "COGNI":   {"meta": "MEN", "name": "인지", "name_en": "Cognition"},
    "EMOTE":   {"meta": "MEN", "name": "감정", "name_en": "Emotion"},
    "WILL":    {"meta": "MEN", "name": "의지", "name_en": "Will"},
    "RELATE":  {"meta": "MEN", "name": "관계", "name_en": "Relationship"},
    "TIME":    {"meta": "DYN", "name": "시간", "name_en": "Time"},
    "WORK":    {"meta": "DYN", "name": "업무", "name_en": "Work"},
    "GROW":    {"meta": "DYN", "name": "성장", "name_en": "Growth"},
    "CHANGE":  {"meta": "DYN", "name": "변화", "name_en": "Change"},
    "MEANING": {"meta": "TRS", "name": "의미", "name_en": "Meaning"},
    "LEGACY":  {"meta": "TRS", "name": "유산", "name_en": "Legacy"},
    "IMPACT":  {"meta": "TRS", "name": "영향", "name_en": "Impact"},
    "SELF":    {"meta": "TRS", "name": "자아", "name_en": "Self"},
}

# 노드 타입 정보
NODE_TYPE_INFO: Dict[str, Dict] = {
    "A": {"name": "본질", "emoji": "⭐", "question": "이것의 본질은 무엇인가?"},
    "D": {"name": "흐름", "emoji": "🔄", "question": "이것은 어떻게 움직이는가?"},
    "E": {"name": "균형", "emoji": "⚖️", "question": "균형점은 어디인가?"},
}

# 압력 상태 정보
PRESSURE_STATE_INFO: Dict[str, Dict] = {
    "STABLE":       {"range": (0, 0.3), "color": "#22C55E", "label": "안정"},
    "MONITORING":   {"range": (0.3, 0.5), "color": "#EAB308", "label": "관찰"},
    "PRESSURING":   {"range": (0.5, 0.78), "color": "#F97316", "label": "압박"},
    "IRREVERSIBLE": {"range": (0.78, 0.9), "color": "#EF4444", "label": "위험"},
    "CRITICAL":     {"range": (0.9, 1.0), "color": "#18181B", "label": "위기"},
}

# Core 아키타입 정보
CORE_INFO: Dict[str, Dict] = {
    "EMPLOYEE":      {"id": "C01", "name": "직장인", "emoji": "💼", "ratio": 0.50},
    "ENTREPRENEUR":  {"id": "C02", "name": "창업가", "emoji": "🚀", "ratio": 0.03},
    "SELF_EMPLOYED": {"id": "C03", "name": "자영업자", "emoji": "🏪", "ratio": 0.12},
    "STUDENT":       {"id": "C04", "name": "학생", "emoji": "📚", "ratio": 0.15},
    "TRANSITION":    {"id": "C05", "name": "전환기", "emoji": "🔍", "ratio": 0.05},
    "RETIRED":       {"id": "C06", "name": "은퇴자", "emoji": "🌅", "ratio": 0.15},
}

# Role 수정자 정보
ROLE_INFO: Dict[str, Dict] = {
    "CAREGIVER": {"id": "R01", "name": "양육자", "emoji": "👨‍👩‍👧", "overlap": 0.25},
    "INVESTOR":  {"id": "R02", "name": "투자자", "emoji": "📈", "overlap": 0.15},
    "CREATOR":   {"id": "R03", "name": "창작자", "emoji": "✨", "overlap": 0.08},
}

# 지역 정보
REGION_INFO: Dict[str, Dict] = {
    "ASIA":          {"name": "아시아", "flag": "🌏", "population": 4_700_000_000, "tz": 8},
    "EUROPE":        {"name": "유럽", "flag": "🌍", "population": 750_000_000, "tz": 1},
    "NORTH_AMERICA": {"name": "북미", "flag": "🌎", "population": 580_000_000, "tz": -5},
    "SOUTH_AMERICA": {"name": "남미", "flag": "🌎", "population": 430_000_000, "tz": -3},
    "AFRICA":        {"name": "아프리카", "flag": "🌍", "population": 1_400_000_000, "tz": 2},
    "OCEANIA":       {"name": "오세아니아", "flag": "🌏", "population": 45_000_000, "tz": 10},
}


# ═══════════════════════════════════════════════════════════════════════════════
# 4. 데이터 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node:
    """48노드 정의"""
    id: str                 # n01 ~ n48
    domain: str             # CASH, ASSET, ...
    type: str               # A, D, E
    name: str               # 한글 이름
    name_en: str            # 영문 이름
    description: str = ""   # 설명
    pressure: float = 0.5   # 현재 압력 (0~1)
    value: float = 0.0      # 현재 값
    
    @property
    def meta(self) -> str:
        return DOMAIN_INFO.get(self.domain, {}).get("meta", "MAT")
    
    @property
    def type_name(self) -> str:
        return NODE_TYPE_INFO.get(self.type, {}).get("name", "")
    
    @property
    def type_emoji(self) -> str:
        return NODE_TYPE_INFO.get(self.type, {}).get("emoji", "")
    
    @property
    def domain_name(self) -> str:
        return DOMAIN_INFO.get(self.domain, {}).get("name", "")
    
    def get_state(self) -> Dict:
        """압력 상태 반환"""
        for state, info in PRESSURE_STATE_INFO.items():
            min_v, max_v = info["range"]
            if min_v <= self.pressure < max_v:
                return {"state": state, "label": info["label"], "color": info["color"]}
        return {"state": "CRITICAL", "label": "위기", "color": "#18181B"}


@dataclass
class UserProfile:
    """사용자 프로필"""
    user_id: str
    core: str               # EMPLOYEE, ENTREPRENEUR, ...
    roles: List[str]        # [CAREGIVER, INVESTOR, ...]
    node_weights: Dict[str, float] = field(default_factory=dict)
    sync_number: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def display_name(self) -> str:
        core_info = CORE_INFO.get(self.core, {})
        role_names = [ROLE_INFO.get(r, {}).get("name", "") for r in self.roles]
        if role_names:
            return f"{core_info.get('name', '')} + {' + '.join(role_names)}"
        return core_info.get("name", "")
    
    @property
    def display_emoji(self) -> str:
        core_emoji = CORE_INFO.get(self.core, {}).get("emoji", "")
        role_emojis = [ROLE_INFO.get(r, {}).get("emoji", "") for r in self.roles]
        return f"{core_emoji}{''.join(role_emojis)}"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_node_id(index: int) -> str:
    """인덱스(1-48)에서 노드 ID 반환"""
    return f"n{index:02d}"


def parse_node_id(node_id: str) -> Tuple[int, str, str]:
    """노드 ID 파싱 → (인덱스, 도메인, 타입)"""
    num = int(node_id.replace("n", ""))
    domain_index = (num - 1) // 3
    type_index = (num - 1) % 3
    domains = list(DOMAIN_INFO.keys())
    types = ["A", "D", "E"]
    return num, domains[domain_index], types[type_index]


def format_number(num: int) -> str:
    """숫자 포맷팅 (1.2M, 3.5K 등)"""
    if num >= 1_000_000_000:
        return f"{num / 1_000_000_000:.2f}B"
    if num >= 1_000_000:
        return f"{num / 1_000_000:.2f}M"
    if num >= 1_000:
        return f"{num / 1_000:.1f}K"
    return f"{num:,}"


def get_pressure_state(pressure: float) -> Dict:
    """압력값에서 상태 반환"""
    for state, info in PRESSURE_STATE_INFO.items():
        min_v, max_v = info["range"]
        if min_v <= pressure < max_v:
            return {"state": state, "label": info["label"], "color": info["color"]}
    return {"state": "CRITICAL", "label": "위기", "color": "#18181B"}


# ═══════════════════════════════════════════════════════════════════════════════
# 6. 통합 시뮬레이터 (다층 상수 통합)
# ═══════════════════════════════════════════════════════════════════════════════

class AutusSimulator:
    """
    AUTUS 통합 시뮬레이터
    
    - 48노드 압력 시뮬레이션
    - 다층 상수 시스템 (L0~L3)
    - P2P 아키텍처
    
    사용자는 "상수"의 존재를 모른다.
    그냥 자연스럽게 작동하는 것처럼 보인다.
    """
    
    def __init__(self):
        self.start_time = time.time()
        self._nodes = self._initialize_nodes()
        self._user_nodes: Dict[str, Dict[str, float]] = {}  # user_id -> {node_id: value}
        
        # 다층 상수 관리자 (숨겨진)
        from .constants import get_constants_manager
        self._constants = get_constants_manager()
        
        # 전지적 관측소 (숨겨진 - 모든 것을 기록)
        from .observatory import get_observatory
        self._observatory = get_observatory()
    
    def _initialize_nodes(self) -> Dict[str, Node]:
        """48개 노드 초기화"""
        nodes = {}
        domains = list(DOMAIN_INFO.keys())
        types = ["A", "D", "E"]
        type_names = {
            "A": ("본질", "Essence"),
            "D": ("흐름", "Flow"),
            "E": ("균형", "Balance"),
        }
        
        for i in range(48):
            idx = i + 1
            domain_idx = i // 3
            type_idx = i % 3
            domain = domains[domain_idx]
            node_type = types[type_idx]
            domain_name = DOMAIN_INFO[domain]["name"]
            
            nodes[f"n{idx:02d}"] = Node(
                id=f"n{idx:02d}",
                domain=domain,
                type=node_type,
                name=f"{domain_name} {type_names[node_type][0]}",
                name_en=f"{DOMAIN_INFO[domain]['name_en']} {type_names[node_type][1]}",
                pressure=0.5,
            )
        return nodes
    
    # ─────────────────────────────────────────────────────────────────────────
    # 사용자 노드 관리 (L0: 보이는 것)
    # ─────────────────────────────────────────────────────────────────────────
    
    def init_user(self, user_id: str, archetype: Optional[str] = None) -> None:
        """사용자 초기화 (L1 상수 자동 생성)"""
        # L1: 개인 상수 초기화
        self._constants.get_or_create_personal(user_id, archetype)
        
        # L0: 노드 값 초기화 (모두 0.5)
        self._user_nodes[user_id] = {f"n{i:02d}": 0.5 for i in range(1, 49)}
    
    def get_user_node(self, user_id: str, node_id: str) -> float:
        """사용자 노드 값 조회"""
        if user_id not in self._user_nodes:
            self.init_user(user_id)
        return self._user_nodes[user_id].get(node_id, 0.5)
    
    def set_user_node(self, user_id: str, node_id: str, value: float) -> float:
        """
        사용자 노드 값 설정 (상수 자동 적용)
        
        사용자는 값을 설정하지만, 상수가 자동으로 조정한다.
        "왜 이렇게 되지?" 모름
        """
        if user_id not in self._user_nodes:
            self.init_user(user_id)
        
        # L3: 극단 억제력 적용
        extremity_force = self._constants.calculate_extremity_force(value)
        adjusted_value = value - (value - 0.5) * extremity_force
        
        # 범위 제한
        final_value = max(0.0, min(1.0, adjusted_value))
        self._user_nodes[user_id][node_id] = final_value
        
        # 📡 전지적 관측소에 기록 (사용자 모름)
        _, domain, _ = parse_node_id(node_id)
        meta = DOMAIN_INFO.get(domain, {}).get("meta", "MAT")
        self._observatory.record(user_id, node_id, final_value, meta)
        
        return final_value
    
    def simulate_tick(self, user_id: str) -> None:
        """
        한 틱 시뮬레이션 (모든 상수 적용)
        
        사용자는 "자연스럽게 균형이 잡히네" 느낌
        실제: L1 + L3 상수가 작동 중
        """
        if user_id not in self._user_nodes:
            return
        
        # L1: 개인 균형점
        eq = self._constants.calculate_equilibrium(user_id)
        
        for node_id in self._user_nodes[user_id]:
            value = self._user_nodes[user_id][node_id]
            
            # 균형점으로 수렴 (L1 탄성 적용)
            delta = self._constants.calculate_resilience_delta(user_id, value, eq)
            
            # L3: 극단 억제
            extremity = self._constants.calculate_extremity_force(value)
            delta += (0.5 - value) * extremity * 0.1
            
            # 적용
            self._user_nodes[user_id][node_id] = max(0.0, min(1.0, value + delta))
    
    def record_behavior(self, user_id: str, viewed_nodes: List[str]) -> None:
        """
        행동 기록 (L1 상수 진화)
        
        사용자는 모름: "그냥 앱 쓴 거야"
        실제: 개인 상수가 미세하게 변화 중
        """
        self._constants.evolve_personal(user_id, {"viewed_nodes": viewed_nodes})
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상호작용 (L2)
    # ─────────────────────────────────────────────────────────────────────────
    
    def interact(self, user_a: str, user_b: str, 
                 interaction_type: str = "neutral") -> Tuple[float, float]:
        """
        두 사용자 상호작용
        
        반환: (A의 에너지 변화, B의 에너지 변화)
        사용자는 "우리 궁합이 좋아졌네" 느낌
        """
        # L2 상수 진화
        self._constants.evolve_interaction(user_a, user_b, interaction_type)
        
        # 대표 노드로 에너지 교환 계산 (n01 사용)
        value_a = self.get_user_node(user_a, "n01")
        value_b = self.get_user_node(user_b, "n01")
        
        delta_a, delta_b = self._constants.calculate_interaction_effect(
            user_a, user_b, value_a, value_b
        )
        
        # 📡 전지적 관측소에 기록 (사용자 모름)
        event_type = 'transfer' if interaction_type == 'neutral' else interaction_type
        magnitude = abs(delta_a) + abs(delta_b)
        self._observatory.record_interaction(user_a, user_b, event_type, magnitude)
        
        return delta_a, delta_b
    
    # ─────────────────────────────────────────────────────────────────────────
    # 동기화 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_total_synced(self) -> int:
        """총 동기화 사용자 수"""
        days = (datetime.now(timezone.utc) - LAUNCH_DATE).total_seconds() / 86400
        base = 10_000 + math.log10(max(days, 1) + 1) * 1_000_000
        elapsed = time.time() - self.start_time
        return int(base + elapsed * 0.5)
    
    def get_active_users(self) -> int:
        """현재 활성 사용자"""
        total = self.get_total_synced()
        hour = datetime.now().hour
        multiplier = 0.12 if 9 <= hour <= 22 else 0.05
        return int(total * multiplier)
    
    def get_sync_per_second(self) -> float:
        """초당 동기화 속도"""
        return 0.5 + math.sin(time.time() * 0.1) * 0.3
    
    # ─────────────────────────────────────────────────────────────────────────
    # 압력 계산 (다층 상수 통합)
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_meta_pressure(self, meta: str, user_id: Optional[str] = None) -> float:
        """
        메타 카테고리 압력
        
        user_id 제공시: 개인 상수(L1) 적용
        미제공시: 글로벌 기본값
        """
        hour = datetime.now().hour
        base = {
            "MAT": 0.5 + (0.15 if 9 <= hour <= 18 else -0.1),
            "MEN": 0.45 + (0.2 if hour >= 18 or hour < 6 else 0),
            "DYN": 0.55 + (0.2 if 9 <= hour <= 17 else -0.15),
            "TRS": 0.4 + (0.15 if hour >= 20 or hour < 8 else 0),
        }
        
        base_pressure = base.get(meta.upper(), 0.5)
        noise = (math.sin(time.time() + hash(meta)) - 0.5) * 0.1
        raw_pressure = base_pressure + noise
        
        # L1 + L3 가중치 적용
        if user_id:
            weight = self._constants.calculate_effective_weight(user_id, meta)
            raw_pressure *= weight * 4  # 정규화
        
        return max(0, min(1, raw_pressure))
    
    def get_domain_pressure(self, domain: str, user_id: Optional[str] = None) -> float:
        """도메인 압력"""
        meta = DOMAIN_INFO.get(domain, {}).get("meta", "MAT")
        base = self.get_meta_pressure(meta, user_id)
        noise = (math.sin(time.time() + hash(domain)) - 0.5) * 0.15
        return max(0, min(1, base + noise))
    
    def get_node_pressure(self, node_id: str, user_id: Optional[str] = None) -> float:
        """노드 압력"""
        _, domain, _ = parse_node_id(node_id)
        base = self.get_domain_pressure(domain, user_id)
        noise = (math.sin(time.time() + hash(node_id)) - 0.5) * 0.1
        return max(0, min(1, base + noise))
    
    def get_resonance(self) -> int:
        """글로벌 공명 지수 (0-100)"""
        dissonance = sum(abs(self.get_node_pressure(f"n{i:02d}") - 0.5) for i in range(1, 49))
        return int((1 - dissonance / 48) * 100)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Genesis 접근 (숨겨진)
    # ─────────────────────────────────────────────────────────────────────────
    
    def _genesis(self, key: str):
        """
        Genesis 접근 (설계자만)
        
        인증 성공시 ConstantsManager 반환
        실패시 None
        """
        if self._constants.genesis_auth(key):
            return self._constants
        return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_node(self, node_id: str) -> Optional[Node]:
        """단일 노드 조회"""
        node = self._nodes.get(node_id)
        if node:
            node.pressure = self.get_node_pressure(node_id)
        return node
    
    def get_all_nodes(self) -> List[Dict]:
        """전체 노드 상태"""
        result = []
        for node_id, node in self._nodes.items():
            pressure = self.get_node_pressure(node_id)
            state = get_pressure_state(pressure)
            result.append({
                "id": node_id,
                "domain": node.domain,
                "domain_name": node.domain_name,
                "meta": node.meta,
                "type": node.type,
                "type_name": node.type_name,
                "type_emoji": node.type_emoji,
                "name": node.name,
                "pressure": round(pressure, 4),
                **state,
            })
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # 지역별 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_regional_stats(self) -> List[Dict]:
        """지역별 동기화 통계"""
        total = self.get_total_synced()
        utc_hour = datetime.now(timezone.utc).hour
        
        result = []
        for key, info in REGION_INFO.items():
            ratio = info["population"] / GLOBAL_POPULATION
            synced = int(total * ratio)
            local_hour = (utc_hour + info["tz"]) % 24
            is_awake = 7 <= local_hour <= 23
            active = int(synced * (0.1 if is_awake else 0.02))
            
            result.append({
                "id": key,
                **info,
                "synced": synced,
                "active": active,
                "local_hour": local_hour,
                "is_awake": is_awake,
            })
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # 아키타입
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_archetype_distribution(self) -> List[Dict]:
        """아키타입별 분포"""
        total = self.get_total_synced()
        return [
            {
                "id": key,
                "code": info["id"],
                "name": info["name"],
                "emoji": info["emoji"],
                "ratio": info["ratio"],
                "count": int(total * info["ratio"]),
            }
            for key, info in CORE_INFO.items()
        ]
    
    def create_profile(self, core: str, roles: List[str]) -> Dict:
        """프로필 생성"""
        if core not in CORE_INFO:
            return {"error": f"Invalid core: {core}"}
        
        valid_roles = [r for r in roles[:2] if r in ROLE_INFO]
        
        core_info = CORE_INFO[core]
        role_infos = [ROLE_INFO[r] for r in valid_roles]
        
        if role_infos:
            name = f"{core_info['name']} + {' + '.join(r['name'] for r in role_infos)}"
            emoji = f"{core_info['emoji']}{''.join(r['emoji'] for r in role_infos)}"
        else:
            name = core_info["name"]
            emoji = core_info["emoji"]
        
        return {
            "core": {"id": core, "code": core_info["id"], "name": core_info["name"], "emoji": core_info["emoji"]},
            "roles": [{"id": r, **ROLE_INFO[r]} for r in valid_roles],
            "display_name": name,
            "display_emoji": emoji,
            "sync_number": self.get_total_synced() + 1,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 스냅샷
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_snapshot(self) -> Dict:
        """전체 상태 스냅샷"""
        return {
            "version": AUTUS_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "global": {
                "total_synced": self.get_total_synced(),
                "active_now": self.get_active_users(),
                "resonance": self.get_resonance(),
                "sync_per_second": round(self.get_sync_per_second(), 2),
            },
            "structure": {
                "meta": TOTAL_META,
                "domains": TOTAL_DOMAINS,
                "nodes": TOTAL_NODES,
                "archetypes": ARCHETYPE_COMBINATIONS,
            },
            "meta": {
                key: {**info, "pressure": round(self.get_meta_pressure(key), 4)}
                for key, info in META_INFO.items()
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 7. 싱글턴 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_simulator: Optional[AutusSimulator] = None


def get_simulator() -> AutusSimulator:
    """싱글턴 시뮬레이터"""
    global _simulator
    if _simulator is None:
        _simulator = AutusSimulator()
    return _simulator


# ═══════════════════════════════════════════════════════════════════════════════
# 8. 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # 버전
    "AUTUS_VERSION",
    # 상수
    "GLOBAL_POPULATION",
    "TOTAL_NODES",
    "TOTAL_DOMAINS",
    "TOTAL_META",
    # 열거형
    "MetaCategory",
    "Domain",
    "NodeType",
    "CoreType",
    "RoleType",
    "PressureState",
    # 데이터
    "META_INFO",
    "DOMAIN_INFO",
    "NODE_TYPE_INFO",
    "PRESSURE_STATE_INFO",
    "CORE_INFO",
    "ROLE_INFO",
    "REGION_INFO",
    # 클래스
    "Node",
    "UserProfile",
    "AutusSimulator",
    # 함수
    "get_simulator",
    "get_node_id",
    "parse_node_id",
    "format_number",
    "get_pressure_state",
]
