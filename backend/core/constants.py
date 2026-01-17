"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS Multi-Layer Constants v4.1
═══════════════════════════════════════════════════════════════════════════════

상수는 존재하지 않는다.
상수라는 개념 자체가 사용자에게 노출되지 않는다.
모든 것은 "자연스러운 시스템 작동"으로 보인다.

Layer 구조:
- L0: 노드 값 (사용자가 보는 것)
- L1: 개인 상수 (자동 생성, 학습)
- L2: 상호작용 상수 (관계, 집단)
- L3: 글로벌 상수 (질서 유지, Genesis)

"중력이 6.674×10⁻¹¹인 이유를 아무도 묻지 않듯,
 AUTUS의 상수가 왜 그 값인지 아무도 모른다."
═══════════════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# L1: Personal Constants (개인 상수)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PersonalConstants:
    """
    개인별 물리법칙
    
    - 아키타입 기반 초기화
    - 행동 패턴으로 학습/진화
    - 사용자는 이것이 "자신의 성향"이라고 느낌
    """
    user_id: str
    
    # 메타 가중치 (개인마다 다름)
    w_mat: float = 0.25  # 물질
    w_men: float = 0.25  # 정신
    w_dyn: float = 0.25  # 동적
    w_trs: float = 0.25  # 초월
    
    # 균형점 (개인마다 다름)
    equilibrium: float = 0.5
    
    # 회복 탄성 (빨리 회복하는 사람 vs 천천히)
    resilience: float = 0.01
    
    # 민감도 (작은 변화에 민감 vs 둔감)
    sensitivity: float = 1.0
    
    # 관성 (변화에 저항하는 정도)
    inertia: float = 0.5
    
    # 메타데이터
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    interaction_count: int = 0
    
    def evolve(self, behavior_data: Dict[str, Any]) -> None:
        """
        행동 데이터로 상수 진화 (사용자 모르게)
        
        behavior_data:
            - viewed_nodes: 자주 본 노드들
            - actions: 수행한 액션들
            - time_spent: 머문 시간
        """
        self.interaction_count += 1
        self.updated_at = time.time()
        
        # 자주 본 메타 카테고리 가중치 미세 증가
        viewed_nodes = behavior_data.get("viewed_nodes", [])
        for node_id in viewed_nodes:
            try:
                num = int(node_id.replace("n", ""))
                if 1 <= num <= 12:
                    self.w_mat = min(0.4, self.w_mat + 0.001)
                elif 13 <= num <= 24:
                    self.w_men = min(0.4, self.w_men + 0.001)
                elif 25 <= num <= 36:
                    self.w_dyn = min(0.4, self.w_dyn + 0.001)
                elif 37 <= num <= 48:
                    self.w_trs = min(0.4, self.w_trs + 0.001)
            except (ValueError, AttributeError):
                pass
        
        # 정규화 (합이 1이 되도록)
        total = self.w_mat + self.w_men + self.w_dyn + self.w_trs
        if total > 0:
            self.w_mat /= total
            self.w_men /= total
            self.w_dyn /= total
            self.w_trs /= total
    
    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "weights": {
                "MAT": round(self.w_mat, 4),
                "MEN": round(self.w_men, 4),
                "DYN": round(self.w_dyn, 4),
                "TRS": round(self.w_trs, 4),
            },
            "equilibrium": self.equilibrium,
            "resilience": self.resilience,
            "sensitivity": self.sensitivity,
            "inertia": self.inertia,
            "interaction_count": self.interaction_count,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# L2: Interaction Constants (상호작용 상수)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class InteractionConstants:
    """
    두 사람 간 상호작용 물리법칙
    
    - 관계가 형성되면 자동 생성
    - 상호작용 패턴으로 진화
    - 사용자는 "우리 궁합"이라고 느낌
    """
    user_a: str
    user_b: str
    
    # 공명 강도 (서로 영향 주는 정도)
    resonance: float = 0.1
    
    # 동기화 속도 (얼마나 빨리 맞춰지는지)
    sync_rate: float = 0.01
    
    # 에너지 전달 효율
    transfer_efficiency: float = 0.5
    
    # 갈등 흡수율 (갈등이 얼마나 빨리 해소되는지)
    conflict_absorption: float = 0.3
    
    # 메타데이터
    created_at: float = field(default_factory=time.time)
    interaction_count: int = 0
    
    def evolve(self, interaction_type: str = "neutral") -> None:
        """상호작용으로 진화"""
        self.interaction_count += 1
        
        if interaction_type == "positive":
            self.resonance = min(0.5, self.resonance + 0.01)
            self.sync_rate = min(0.1, self.sync_rate + 0.005)
            self.conflict_absorption = min(0.8, self.conflict_absorption + 0.02)
        elif interaction_type == "negative":
            self.resonance = max(0.01, self.resonance - 0.005)
            self.conflict_absorption = max(0.1, self.conflict_absorption - 0.01)
        # neutral: 미세하게 공명 증가
        else:
            self.resonance = min(0.3, self.resonance + 0.002)


@dataclass
class GroupConstants:
    """
    집단 역학 상수
    
    - N명 이상 모이면 자동 생성
    - 집단 행동 패턴으로 진화
    """
    group_id: str
    members: List[str] = field(default_factory=list)
    
    # 집단 관성 (개인보다 변화 느림)
    collective_inertia: float = 0.7
    
    # 동조 압력
    conformity_pressure: float = 0.3
    
    # 창발 계수 (1+1 > 2 효과)
    emergence_factor: float = 1.1
    
    # 분열 저항
    cohesion: float = 0.5
    
    def add_member(self, user_id: str) -> None:
        if user_id not in self.members:
            self.members.append(user_id)
            # 멤버 증가시 관성 증가, 창발 증가
            self.collective_inertia = min(0.9, self.collective_inertia + 0.01)
            self.emergence_factor = min(1.5, self.emergence_factor + 0.02)


# ═══════════════════════════════════════════════════════════════════════════════
# L3: Global Constants (글로벌 상수) - Genesis Only
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GlobalConstants:
    """
    전체 시스템 상수 (Genesis만 접근)
    
    - 질서 유지
    - 극단 방지
    - 인류 방향 조정
    """
    # 방향 벡터 (4차원: MAT, MEN, DYN, TRS)
    direction: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    
    # 글로벌 균형점
    global_equilibrium: float = 0.5
    
    # 극단 억제력 (양 끝으로 가면 중심으로 당기는 힘)
    extremity_dampening: float = 0.1
    
    # 온도 조절 (차가운↔뜨거운)
    # -1: 차가움 (MAT, MEN 강화, 안정/수렴)
    # +1: 뜨거움 (DYN, TRS 강화, 활성/확산)
    temperature: float = 0.0
    
    # 엔트로피 상한
    max_entropy: float = 0.9
    
    # 동기화 촉진/억제
    sync_modifier: float = 1.0
    
    # 변경 이력
    history: List[Dict] = field(default_factory=list)
    
    def log_change(self, action: str, value: Any) -> None:
        """변경 기록"""
        self.history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "value": value,
        })
        # 최근 100개만 유지
        if len(self.history) > 100:
            self.history = self.history[-100:]


# ═══════════════════════════════════════════════════════════════════════════════
# Constants Manager (상수 관리자)
# ═══════════════════════════════════════════════════════════════════════════════

# Genesis 인증 해시 (SHA-256 of secret key)
_GENESIS_HASH = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"


class ConstantsManager:
    """
    다층 상수 관리
    
    사용자는 이 클래스의 존재를 모른다.
    물리 엔진 내부에서만 사용된다.
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        self._personal: Dict[str, PersonalConstants] = {}
        self._interactions: Dict[str, InteractionConstants] = {}
        self._groups: Dict[str, GroupConstants] = {}
        self._global = GlobalConstants()
        
        # Genesis 인증 상태
        self._genesis_authenticated = False
        self._genesis_session_start: Optional[float] = None
        
        # 데이터 저장 경로
        self._data_dir = data_dir or Path(__file__).parent.parent / "data" / "constants"
        self._data_dir.mkdir(parents=True, exist_ok=True)
        
        # 저장된 상수 로드
        self._load_global()
    
    # ─────────────────────────────────────────────────────────────────────────
    # L1: Personal (자동 관리)
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_or_create_personal(self, user_id: str, 
                                archetype: Optional[str] = None) -> PersonalConstants:
        """개인 상수 가져오기/생성"""
        if user_id not in self._personal:
            self._personal[user_id] = self._init_personal(user_id, archetype)
        return self._personal[user_id]
    
    def _init_personal(self, user_id: str, 
                       archetype: Optional[str] = None) -> PersonalConstants:
        """아키타입 기반 개인 상수 초기화"""
        pc = PersonalConstants(user_id=user_id)
        
        # 아키타입별 프리셋
        archetype_presets = {
            # Core Archetypes
            "EMPLOYEE": {
                "w_mat": 0.20, "w_men": 0.25, "w_dyn": 0.35, "w_trs": 0.20,
                "inertia": 0.6, "resilience": 0.008
            },
            "ENTREPRENEUR": {
                "w_mat": 0.30, "w_men": 0.15, "w_dyn": 0.25, "w_trs": 0.30,
                "inertia": 0.3, "resilience": 0.02, "sensitivity": 1.3
            },
            "SELF_EMPLOYED": {
                "w_mat": 0.30, "w_men": 0.20, "w_dyn": 0.30, "w_trs": 0.20,
                "inertia": 0.5, "resilience": 0.015
            },
            "STUDENT": {
                "w_mat": 0.15, "w_men": 0.35, "w_dyn": 0.30, "w_trs": 0.20,
                "inertia": 0.4, "sensitivity": 1.2
            },
            "TRANSITION": {
                "w_mat": 0.20, "w_men": 0.30, "w_dyn": 0.20, "w_trs": 0.30,
                "inertia": 0.35, "sensitivity": 1.4
            },
            "RETIRED": {
                "w_mat": 0.20, "w_men": 0.25, "w_dyn": 0.15, "w_trs": 0.40,
                "inertia": 0.7, "resilience": 0.005
            },
        }
        
        if archetype and archetype.upper() in archetype_presets:
            preset = archetype_presets[archetype.upper()]
            for key, value in preset.items():
                setattr(pc, key, value)
        
        return pc
    
    def evolve_personal(self, user_id: str, behavior_data: Dict[str, Any]) -> None:
        """개인 상수 진화"""
        pc = self.get_or_create_personal(user_id)
        pc.evolve(behavior_data)
    
    # ─────────────────────────────────────────────────────────────────────────
    # L2: Interaction (자동 관리)
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_or_create_interaction(self, user_a: str, 
                                   user_b: str) -> InteractionConstants:
        """상호작용 상수 가져오기/생성"""
        key = self._interaction_key(user_a, user_b)
        
        if key not in self._interactions:
            self._interactions[key] = InteractionConstants(
                user_a=min(user_a, user_b),
                user_b=max(user_a, user_b),
            )
        return self._interactions[key]
    
    def _interaction_key(self, user_a: str, user_b: str) -> str:
        """정렬된 키 생성"""
        return f"{min(user_a, user_b)}:{max(user_a, user_b)}"
    
    def evolve_interaction(self, user_a: str, user_b: str, 
                           interaction_type: str = "neutral") -> None:
        """상호작용 상수 진화"""
        ic = self.get_or_create_interaction(user_a, user_b)
        ic.evolve(interaction_type)
    
    def get_or_create_group(self, group_id: str, 
                            members: Optional[List[str]] = None) -> GroupConstants:
        """집단 상수 가져오기/생성"""
        if group_id not in self._groups:
            self._groups[group_id] = GroupConstants(
                group_id=group_id,
                members=members or [],
            )
        return self._groups[group_id]
    
    # ─────────────────────────────────────────────────────────────────────────
    # L3: Global (Genesis만)
    # ─────────────────────────────────────────────────────────────────────────
    
    def genesis_auth(self, key: str) -> bool:
        """Genesis 인증"""
        if hashlib.sha256(key.encode()).hexdigest() == _GENESIS_HASH:
            self._genesis_authenticated = True
            self._genesis_session_start = time.time()
            return True
        return False
    
    def genesis_logout(self) -> None:
        """Genesis 로그아웃"""
        self._genesis_authenticated = False
        self._genesis_session_start = None
    
    def _check_genesis(self) -> bool:
        """Genesis 세션 확인"""
        if not self._genesis_authenticated:
            return False
        # 1시간 후 자동 로그아웃
        if self._genesis_session_start:
            if time.time() - self._genesis_session_start > 3600:
                self.genesis_logout()
                return False
        return True
    
    def adjust_temperature(self, delta: float) -> bool:
        """
        온도 조절 (차가운↔뜨거운)
        
        delta > 0: 뜨거운 방향 (활성화, 확산, DYN/TRS 강화)
        delta < 0: 차가운 방향 (안정화, 수렴, MAT/MEN 강화)
        """
        if not self._check_genesis():
            return False
        
        old_temp = self._global.temperature
        new_temp = max(-1.0, min(1.0, old_temp + delta))
        self._global.temperature = new_temp
        self._global.log_change("temperature", {"from": old_temp, "to": new_temp, "delta": delta})
        self._save_global()
        return True
    
    def set_temperature(self, value: float) -> bool:
        """온도 직접 설정"""
        if not self._check_genesis():
            return False
        
        old_temp = self._global.temperature
        self._global.temperature = max(-1.0, min(1.0, value))
        self._global.log_change("temperature_set", {"from": old_temp, "to": self._global.temperature})
        self._save_global()
        return True
    
    def shift_direction(self, meta: str, delta: float) -> bool:
        """방향 조정"""
        if not self._check_genesis():
            return False
        
        meta_idx = {"MAT": 0, "MEN": 1, "DYN": 2, "TRS": 3}.get(meta.upper())
        if meta_idx is None:
            return False
        
        old_val = self._global.direction[meta_idx]
        self._global.direction[meta_idx] = max(-1.0, min(1.0, old_val + delta))
        self._global.log_change("direction", {"meta": meta, "from": old_val, "delta": delta})
        self._save_global()
        return True
    
    def set_extremity_dampening(self, value: float) -> bool:
        """극단 억제력 설정"""
        if not self._check_genesis():
            return False
        
        old_val = self._global.extremity_dampening
        self._global.extremity_dampening = max(0.0, min(1.0, value))
        self._global.log_change("extremity_dampening", {"from": old_val, "to": value})
        self._save_global()
        return True
    
    def set_sync_modifier(self, value: float) -> bool:
        """동기화 수정자 설정"""
        if not self._check_genesis():
            return False
        
        old_val = self._global.sync_modifier
        self._global.sync_modifier = max(0.1, min(2.0, value))
        self._global.log_change("sync_modifier", {"from": old_val, "to": value})
        self._save_global()
        return True
    
    def get_global_state(self) -> Optional[Dict]:
        """글로벌 상태 조회 (Genesis만)"""
        if not self._check_genesis():
            return None
        
        return {
            "temperature": self._global.temperature,
            "direction": {
                "MAT": self._global.direction[0],
                "MEN": self._global.direction[1],
                "DYN": self._global.direction[2],
                "TRS": self._global.direction[3],
            },
            "equilibrium": self._global.global_equilibrium,
            "extremity_dampening": self._global.extremity_dampening,
            "sync_modifier": self._global.sync_modifier,
            "max_entropy": self._global.max_entropy,
            "recent_changes": self._global.history[-10:],
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통합 계산 (모든 레이어 적용)
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_effective_weight(self, user_id: str, meta: str) -> float:
        """
        실효 가중치 계산
        
        L1(개인) × L3(글로벌) = 최종 가중치
        사용자는 "왜 이렇게 느껴지는지" 모름
        """
        pc = self.get_or_create_personal(user_id)
        meta = meta.upper()
        
        # L1: 개인 가중치
        personal_weight = {
            "MAT": pc.w_mat,
            "MEN": pc.w_men,
            "DYN": pc.w_dyn,
            "TRS": pc.w_trs,
        }.get(meta, 0.25)
        
        # L3: 글로벌 온도 보정
        temp = self._global.temperature
        
        # 온도가 높으면(뜨거운) → DYN, TRS 강화
        # 온도가 낮으면(차가운) → MAT, MEN 강화
        temp_modifier = 1.0
        if meta in ["DYN", "TRS"]:
            temp_modifier = 1.0 + (temp * 0.15)  # 뜨거우면 최대 +15%
        elif meta in ["MAT", "MEN"]:
            temp_modifier = 1.0 - (temp * 0.15)  # 뜨거우면 최대 -15%
        
        # L3: 방향 보정
        direction_idx = {"MAT": 0, "MEN": 1, "DYN": 2, "TRS": 3}.get(meta, 0)
        direction_modifier = 1.0 + (self._global.direction[direction_idx] * 0.1)
        
        return personal_weight * temp_modifier * direction_modifier
    
    def calculate_equilibrium(self, user_id: str) -> float:
        """
        실효 균형점 계산
        
        L1(개인) + L3(글로벌) 조합
        """
        pc = self.get_or_create_personal(user_id)
        
        # 기본: 개인 균형점
        personal_eq = pc.equilibrium
        
        # L3: 글로벌 균형점 영향
        global_eq = self._global.global_equilibrium
        
        # 70% 개인 + 30% 글로벌
        return personal_eq * 0.7 + global_eq * 0.3
    
    def calculate_extremity_force(self, value: float) -> float:
        """
        극단 억제력 계산
        
        값이 0 또는 1에 가까울수록 중심으로 당기는 힘
        """
        # 중심(0.5)에서의 거리
        distance_from_center = abs(value - 0.5)
        
        # 극단 억제력 적용 (거리의 제곱에 비례)
        dampening = self._global.extremity_dampening
        
        return (distance_from_center ** 2) * dampening
    
    def calculate_interaction_effect(self, user_a: str, user_b: str,
                                      value_a: float, value_b: float) -> Tuple[float, float]:
        """
        상호작용 효과 계산
        
        두 사람의 노드가 서로 영향을 주는 정도
        반환: (A의 변화량, B의 변화량)
        """
        ic = self.get_or_create_interaction(user_a, user_b)
        
        # 에너지 차이
        diff = value_a - value_b
        
        # 전달량 계산
        transfer = diff * ic.resonance * ic.transfer_efficiency
        
        # 동기화 속도 적용
        transfer *= ic.sync_rate
        
        # 글로벌 동기화 수정자 적용
        transfer *= self._global.sync_modifier
        
        # A는 감소, B는 증가 (에너지 보존)
        return (-transfer, transfer)
    
    def calculate_resilience_delta(self, user_id: str, 
                                    current: float, target: float) -> float:
        """
        회복 탄성 계산
        
        균형점으로 복귀하는 속도
        """
        pc = self.get_or_create_personal(user_id)
        
        # 기본 회복량
        delta = (target - current) * pc.resilience
        
        # 관성 적용 (관성이 높으면 변화 억제)
        delta *= (1.0 - pc.inertia * 0.5)
        
        return delta
    
    # ─────────────────────────────────────────────────────────────────────────
    # 저장/로드
    # ─────────────────────────────────────────────────────────────────────────
    
    def _save_global(self) -> None:
        """글로벌 상수 저장"""
        path = self._data_dir / "global.json"
        data = {
            "temperature": self._global.temperature,
            "direction": self._global.direction,
            "global_equilibrium": self._global.global_equilibrium,
            "extremity_dampening": self._global.extremity_dampening,
            "sync_modifier": self._global.sync_modifier,
            "max_entropy": self._global.max_entropy,
            "history": self._global.history,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _load_global(self) -> None:
        """글로벌 상수 로드"""
        path = self._data_dir / "global.json"
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._global.temperature = data.get("temperature", 0.0)
                self._global.direction = data.get("direction", [0.0, 0.0, 0.0, 0.0])
                self._global.global_equilibrium = data.get("global_equilibrium", 0.5)
                self._global.extremity_dampening = data.get("extremity_dampening", 0.1)
                self._global.sync_modifier = data.get("sync_modifier", 1.0)
                self._global.max_entropy = data.get("max_entropy", 0.9)
                self._global.history = data.get("history", [])
            except (json.JSONDecodeError, KeyError):
                pass
    
    def save_personal(self, user_id: str) -> None:
        """개인 상수 저장"""
        if user_id not in self._personal:
            return
        
        path = self._data_dir / "personal" / f"{user_id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        
        pc = self._personal[user_id]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(pc.to_dict(), f, indent=2, ensure_ascii=False)
    
    def load_personal(self, user_id: str) -> Optional[PersonalConstants]:
        """개인 상수 로드"""
        path = self._data_dir / "personal" / f"{user_id}.json"
        if not path.exists():
            return None
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            pc = PersonalConstants(user_id=user_id)
            weights = data.get("weights", {})
            pc.w_mat = weights.get("MAT", 0.25)
            pc.w_men = weights.get("MEN", 0.25)
            pc.w_dyn = weights.get("DYN", 0.25)
            pc.w_trs = weights.get("TRS", 0.25)
            pc.equilibrium = data.get("equilibrium", 0.5)
            pc.resilience = data.get("resilience", 0.01)
            pc.sensitivity = data.get("sensitivity", 1.0)
            pc.inertia = data.get("inertia", 0.5)
            pc.interaction_count = data.get("interaction_count", 0)
            
            self._personal[user_id] = pc
            return pc
        except (json.JSONDecodeError, KeyError):
            return None


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_manager: Optional[ConstantsManager] = None


def get_constants_manager() -> ConstantsManager:
    """싱글턴 상수 관리자"""
    global _manager
    if _manager is None:
        _manager = ConstantsManager()
    return _manager


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # 클래스
    "PersonalConstants",
    "InteractionConstants",
    "GroupConstants",
    "GlobalConstants",
    "ConstantsManager",
    # 함수
    "get_constants_manager",
]
