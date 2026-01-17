"""
AUTUS Karma Constants System v4.2

개인의 능력과 양심에 따른 상수
집단의 인류 기여도에 따른 상호작용 상수

"같은 씨앗이라도 토양(상수)에 따라 
 꽃이 피기도, 독초가 자라기도 한다"
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import hashlib


# =========================================
# 1. 개인 카르마 상수
# =========================================

@dataclass
class KarmaFactors:
    """카르마 구성 요소 (설계자가 평가)"""
    
    # 양심/도덕 (가장 중요)
    conscience: float = 0.5      # -1(악의) ~ 0(중립) ~ +1(선의)
    
    # 정직성
    honesty: float = 0.5         # 0(기만) ~ 1(정직)
    
    # 이타성
    altruism: float = 0.5        # 0(이기) ~ 1(이타)
    
    # 책임감
    responsibility: float = 0.5  # 0(무책임) ~ 1(책임)
    
    # 영향력 사용 방향
    influence_direction: float = 0.0  # -1(해악) ~ 0(중립) ~ +1(이로움)


@dataclass
class PersonalKarma:
    """
    개인 카르마 상수
    
    이 값에 따라 같은 행동도 다른 결과를 낳는다.
    """
    user_id: str
    
    # 카르마 요소들
    factors: KarmaFactors = field(default_factory=KarmaFactors)
    
    # 최종 카르마 계수 (-1 ~ +1)
    # 음수: 행동이 역효과
    # 0: 행동이 무효과
    # 양수: 행동이 정상/증폭 효과
    @property
    def karma_coefficient(self) -> float:
        """카르마 계수 계산"""
        f = self.factors
        
        # 양심이 가장 중요 (50% 가중치)
        base = f.conscience * 0.5
        
        # 나머지 요소들 (각 12.5%)
        base += f.honesty * 0.125
        base += f.altruism * 0.125
        base += f.responsibility * 0.125
        base += f.influence_direction * 0.125
        
        return max(-1.0, min(1.0, base))
    
    # 능력 계수 (별도)
    ability: float = 0.5  # 0 ~ 1
    
    # 최종 영향력 = 능력 × 카르마
    @property
    def effective_power(self) -> float:
        """실효 영향력"""
        return self.ability * self.karma_coefficient
    
    # 기록
    last_evaluated: Optional[datetime] = None
    evaluation_notes: str = ""


class PersonalKarmaEngine:
    """개인 카르마 적용 엔진"""
    
    def __init__(self):
        self._karmas: Dict[str, PersonalKarma] = {}
        self._genesis_authenticated = False
    
    def _auth(self, key: str) -> bool:
        genesis_hash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        if hashlib.sha256(key.encode()).hexdigest() == genesis_hash:
            self._genesis_authenticated = True
            return True
        return False
    
    # -----------------------------------------
    # 카르마 설정 (설계자 전용)
    # -----------------------------------------
    
    def set_karma(self, user_id: str, 
                  conscience: float = None,
                  honesty: float = None,
                  altruism: float = None,
                  responsibility: float = None,
                  influence_direction: float = None,
                  ability: float = None,
                  notes: str = "") -> bool:
        """개인 카르마 설정"""
        if not self._genesis_authenticated:
            return False
        
        if user_id not in self._karmas:
            self._karmas[user_id] = PersonalKarma(user_id=user_id)
        
        karma = self._karmas[user_id]
        
        if conscience is not None:
            karma.factors.conscience = max(-1, min(1, conscience))
        if honesty is not None:
            karma.factors.honesty = max(0, min(1, honesty))
        if altruism is not None:
            karma.factors.altruism = max(0, min(1, altruism))
        if responsibility is not None:
            karma.factors.responsibility = max(0, min(1, responsibility))
        if influence_direction is not None:
            karma.factors.influence_direction = max(-1, min(1, influence_direction))
        if ability is not None:
            karma.ability = max(0, min(1, ability))
        
        karma.last_evaluated = datetime.now()
        karma.evaluation_notes = notes
        
        return True
    
    # -----------------------------------------
    # 카르마 적용 (물리 엔진에서 호출)
    # -----------------------------------------
    
    def apply_karma(self, user_id: str, 
                    raw_effect: float) -> float:
        """
        카르마 적용
        
        raw_effect: 원래 행동의 효과
        returns: 카르마 적용된 실제 효과
        
        예시:
        - 정직한 사람이 성공: +0.1 × 0.8 = +0.08 (정상)
        - 부정직한 사람이 성공: +0.1 × -0.3 = -0.03 (역효과!)
        """
        karma = self._karmas.get(user_id)
        
        if karma is None:
            # 기본 카르마 (중립)
            return raw_effect * 0.5
        
        coefficient = karma.karma_coefficient
        
        # 카르마 적용
        # 양수 카르마: 효과 증폭
        # 음수 카르마: 효과 반전
        # 0 카르마: 효과 무효화
        
        return raw_effect * coefficient
    
    def get_effective_power(self, user_id: str) -> float:
        """실효 영향력 조회"""
        karma = self._karmas.get(user_id)
        if karma is None:
            return 0.25  # 기본값
        return karma.effective_power


# =========================================
# 2. 집단 상호작용 상수
# =========================================

class GroupAlignment(Enum):
    """집단 성향"""
    BENEFICIAL = "beneficial"      # 인류에 이로움
    NEUTRAL = "neutral"            # 중립
    HARMFUL = "harmful"            # 인류에 해로움
    DESTRUCTIVE = "destructive"    # 적극적 파괴


@dataclass
class GroupKarma:
    """
    집단 카르마 상수
    
    집단 내 상호작용의 효율을 결정
    """
    group_id: str
    members: List[str] = field(default_factory=list)
    
    # 집단 성향 평가
    alignment: GroupAlignment = GroupAlignment.NEUTRAL
    
    # 인류 기여도 (-1 ~ +1)
    humanity_contribution: float = 0.0
    
    # 내부 결속력 기본값 (0 ~ 1)
    base_cohesion: float = 0.5
    
    # 상호작용 상수 (-1 ~ +1)
    # 양수: 협력 시너지 발생
    # 0: 상호작용 무효과
    # 음수: 협력이 갈등으로 전환
    @property
    def interaction_coefficient(self) -> float:
        """상호작용 계수"""
        alignment_multiplier = {
            GroupAlignment.BENEFICIAL: 1.0,
            GroupAlignment.NEUTRAL: 0.5,
            GroupAlignment.HARMFUL: -0.3,
            GroupAlignment.DESTRUCTIVE: -1.0,
        }
        
        base = alignment_multiplier.get(self.alignment, 0.5)
        contribution_factor = self.humanity_contribution * 0.5
        
        return max(-1.0, min(1.0, base + contribution_factor))
    
    # 자멸 진행도 (음수 상수일 때 자동 증가)
    decay_progress: float = 0.0
    
    # 기록
    last_evaluated: Optional[datetime] = None
    evaluation_notes: str = ""


class GroupKarmaEngine:
    """집단 카르마 적용 엔진"""
    
    def __init__(self):
        self._groups: Dict[str, GroupKarma] = {}
        self._pairwise: Dict[str, float] = {}  # 집단 간 상호작용
        self._genesis_authenticated = False
    
    def _auth(self, key: str) -> bool:
        genesis_hash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        if hashlib.sha256(key.encode()).hexdigest() == genesis_hash:
            self._genesis_authenticated = True
            return True
        return False
    
    # -----------------------------------------
    # 집단 카르마 설정 (설계자 전용)
    # -----------------------------------------
    
    def set_group_karma(self, group_id: str,
                        alignment: str = None,
                        humanity_contribution: float = None,
                        base_cohesion: float = None,
                        members: List[str] = None,
                        notes: str = "") -> bool:
        """집단 카르마 설정"""
        if not self._genesis_authenticated:
            return False
        
        if group_id not in self._groups:
            self._groups[group_id] = GroupKarma(group_id=group_id)
        
        group = self._groups[group_id]
        
        if alignment is not None:
            alignment_map = {
                'beneficial': GroupAlignment.BENEFICIAL,
                'neutral': GroupAlignment.NEUTRAL,
                'harmful': GroupAlignment.HARMFUL,
                'destructive': GroupAlignment.DESTRUCTIVE,
            }
            group.alignment = alignment_map.get(alignment.lower(), GroupAlignment.NEUTRAL)
        
        if humanity_contribution is not None:
            group.humanity_contribution = max(-1, min(1, humanity_contribution))
        
        if base_cohesion is not None:
            group.base_cohesion = max(0, min(1, base_cohesion))
        
        if members is not None:
            group.members = members
        
        group.last_evaluated = datetime.now()
        group.evaluation_notes = notes
        
        return True
    
    def set_pairwise_interaction(self, group_a: str, group_b: str,
                                  coefficient: float) -> bool:
        """집단 간 상호작용 계수 설정"""
        if not self._genesis_authenticated:
            return False
        
        key = f"{min(group_a, group_b)}:{max(group_a, group_b)}"
        self._pairwise[key] = max(-1, min(1, coefficient))
        return True
    
    # -----------------------------------------
    # 상호작용 효과 계산
    # -----------------------------------------
    
    def apply_internal_interaction(self, group_id: str,
                                    member_a: str, member_b: str,
                                    raw_effect: float) -> float:
        """
        집단 내부 상호작용 효과
        
        상호작용 계수가 음수면 협력이 갈등으로 전환
        """
        group = self._groups.get(group_id)
        
        if group is None:
            return raw_effect * 0.5  # 기본값
        
        coefficient = group.interaction_coefficient
        
        # 음수 계수: 협력 시도 → 갈등 발생
        # "같이 일하려고 하면 할수록 싸움이 난다"
        return raw_effect * coefficient
    
    def apply_group_synergy(self, group_id: str,
                            individual_effects: List[float]) -> float:
        """
        집단 시너지 효과
        
        양수 계수: 1+1 > 2
        음수 계수: 1+1 < 0 (자멸)
        """
        group = self._groups.get(group_id)
        
        if group is None:
            return sum(individual_effects)
        
        coefficient = group.interaction_coefficient
        total = sum(individual_effects)
        
        if coefficient > 0:
            # 시너지: 합보다 큼
            synergy = total * (1 + coefficient * 0.5)
        elif coefficient < 0:
            # 자멸: 합보다 작음, 심하면 음수
            synergy = total * (1 + coefficient)  # coefficient가 음수이므로 감소
        else:
            synergy = total
        
        return synergy
    
    # -----------------------------------------
    # 자멸 메커니즘
    # -----------------------------------------
    
    def simulate_decay(self, group_id: str, 
                       time_delta_hours: float = 1.0) -> Dict:
        """
        집단 자멸 시뮬레이션
        
        음수 상호작용 계수 → 시간이 지나면 자연 붕괴
        """
        group = self._groups.get(group_id)
        
        if group is None:
            return {'status': 'not_found'}
        
        coefficient = group.interaction_coefficient
        
        if coefficient >= 0:
            # 건강한 집단: 자멸 없음
            return {
                'status': 'healthy',
                'coefficient': coefficient,
                'decay_progress': 0,
                'estimated_collapse': None
            }
        
        # 자멸 진행
        # 계수가 음수일수록 빠르게 붕괴
        decay_rate = abs(coefficient) * 0.01  # 시간당 1% × |계수|
        group.decay_progress += decay_rate * time_delta_hours
        
        # 붕괴 예측
        remaining = max(0, 1.0 - group.decay_progress)
        if decay_rate > 0:
            hours_to_collapse = remaining / decay_rate
        else:
            hours_to_collapse = float('inf')
        
        return {
            'status': 'decaying',
            'coefficient': coefficient,
            'decay_progress': group.decay_progress,
            'decay_rate': decay_rate,
            'remaining_cohesion': remaining,
            'estimated_collapse_hours': hours_to_collapse,
            'symptoms': self._get_decay_symptoms(group.decay_progress)
        }
    
    def _get_decay_symptoms(self, progress: float) -> List[str]:
        """붕괴 진행 단계별 증상"""
        symptoms = []
        
        if progress > 0.1:
            symptoms.append("내부 불신 증가")
        if progress > 0.25:
            symptoms.append("소통 장애 발생")
        if progress > 0.4:
            symptoms.append("파벌 형성")
        if progress > 0.55:
            symptoms.append("핵심 인원 이탈")
        if progress > 0.7:
            symptoms.append("조직 기능 마비")
        if progress > 0.85:
            symptoms.append("완전 와해 임박")
        if progress >= 1.0:
            symptoms.append("조직 소멸")
        
        return symptoms


# =========================================
# 3. 통합 카르마 시스템
# =========================================

class KarmaSystem:
    """
    통합 카르마 시스템
    
    개인 + 집단 카르마를 통합 관리
    물리 엔진에 연결되어 모든 계산에 적용
    """
    
    def __init__(self):
        self.personal = PersonalKarmaEngine()
        self.group = GroupKarmaEngine()
        self._genesis_authenticated = False
    
    def authenticate(self, key: str) -> bool:
        """설계자 인증"""
        genesis_hash = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
        if hashlib.sha256(key.encode()).hexdigest() == genesis_hash:
            self._genesis_authenticated = True
            self.personal._genesis_authenticated = True
            self.group._genesis_authenticated = True
            return True
        return False
    
    # -----------------------------------------
    # 통합 효과 계산
    # -----------------------------------------
    
    def calculate_action_effect(self, user_id: str,
                                 group_id: Optional[str],
                                 raw_effect: float) -> Dict:
        """
        행동 효과 계산
        
        개인 카르마 + 집단 카르마 적용
        """
        # 1. 개인 카르마 적용
        personal_effect = self.personal.apply_karma(user_id, raw_effect)
        
        # 2. 집단 컨텍스트가 있으면 추가 적용
        if group_id:
            # 집단 내에서의 행동은 집단 상수도 적용
            group = self.group._groups.get(group_id)
            if group:
                group_multiplier = group.interaction_coefficient
                final_effect = personal_effect * (0.5 + group_multiplier * 0.5)
            else:
                final_effect = personal_effect
        else:
            final_effect = personal_effect
        
        return {
            'raw_effect': raw_effect,
            'personal_karma_applied': personal_effect,
            'final_effect': final_effect,
            'personal_coefficient': self.personal._karmas.get(user_id, 
                                     PersonalKarma(user_id)).karma_coefficient,
            'group_coefficient': self.group._groups.get(group_id, 
                                  GroupKarma(group_id or "")).interaction_coefficient if group_id else None
        }
    
    # -----------------------------------------
    # 조회 API
    # -----------------------------------------
    
    def get_person_karma_report(self, user_id: str) -> Optional[Dict]:
        """개인 카르마 리포트"""
        if not self._genesis_authenticated:
            return None
        
        karma = self.personal._karmas.get(user_id)
        if not karma:
            return {'status': 'not_evaluated', 'user_id': user_id}
        
        return {
            'user_id': user_id,
            'factors': {
                'conscience': karma.factors.conscience,
                'honesty': karma.factors.honesty,
                'altruism': karma.factors.altruism,
                'responsibility': karma.factors.responsibility,
                'influence_direction': karma.factors.influence_direction,
            },
            'ability': karma.ability,
            'karma_coefficient': karma.karma_coefficient,
            'effective_power': karma.effective_power,
            'last_evaluated': karma.last_evaluated.isoformat() if karma.last_evaluated else None,
            'notes': karma.evaluation_notes,
            'interpretation': self._interpret_karma(karma.karma_coefficient)
        }
    
    def get_group_karma_report(self, group_id: str) -> Optional[Dict]:
        """집단 카르마 리포트"""
        if not self._genesis_authenticated:
            return None
        
        group = self.group._groups.get(group_id)
        if not group:
            return {'status': 'not_evaluated', 'group_id': group_id}
        
        decay = self.group.simulate_decay(group_id, 0)  # 현재 상태만
        
        return {
            'group_id': group_id,
            'members': len(group.members),
            'alignment': group.alignment.value,
            'humanity_contribution': group.humanity_contribution,
            'base_cohesion': group.base_cohesion,
            'interaction_coefficient': group.interaction_coefficient,
            'decay_status': decay,
            'last_evaluated': group.last_evaluated.isoformat() if group.last_evaluated else None,
            'notes': group.evaluation_notes,
            'interpretation': self._interpret_group(group.interaction_coefficient)
        }
    
    def _interpret_karma(self, coefficient: float) -> str:
        """카르마 해석"""
        if coefficient >= 0.7:
            return "높은 양심 - 행동이 주변에 긍정적 파급"
        elif coefficient >= 0.3:
            return "양호 - 정상적 효과"
        elif coefficient >= 0:
            return "중립 - 효과 미미"
        elif coefficient >= -0.3:
            return "주의 - 행동이 역효과 가능"
        elif coefficient >= -0.7:
            return "경고 - 행동이 본인과 주변에 해로움"
        else:
            return "위험 - 모든 행동이 파괴적 결과 초래"
    
    def _interpret_group(self, coefficient: float) -> str:
        """집단 상수 해석"""
        if coefficient >= 0.7:
            return "건강한 시너지 - 협력이 증폭됨"
        elif coefficient >= 0.3:
            return "양호 - 정상적 협력"
        elif coefficient >= 0:
            return "중립 - 협력 효과 미미"
        elif coefficient >= -0.3:
            return "불안정 - 협력 시도가 갈등으로 전환 가능"
        elif coefficient >= -0.7:
            return "자멸 진행 중 - 내부 갈등 심화"
        else:
            return "붕괴 임박 - 자연 해체 진행 중"


# =========================================
# 4. CLI 인터페이스
# =========================================

def karma_cli():
    """카르마 시스템 CLI"""
    import os
    import getpass
    import json
    
    os.system('cls' if os.name == 'nt' else 'clear')
    
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                   K A R M A   S Y S T E M                     ║
    ║                                                               ║
    ║         "같은 씨앗도 토양에 따라 다른 열매를 맺는다"          ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)
    
    key = getpass.getpass("    Genesis Key: ")
    
    karma = KarmaSystem()
    if not karma.authenticate(key):
        print("\n    ❌ Access Denied")
        return
    
    print("\n    ✅ Karma System Activated\n")
    
    while True:
        print("""
    ┌─────────────────────────────────────────────────────────────┐
    │  PERSONAL KARMA                                             │
    ├─────────────────────────────────────────────────────────────┤
    │  p.set <id> <field> <value>     개인 카르마 설정            │
    │  p.view <id>                    개인 카르마 조회            │
    │  p.test <id> <effect>           효과 테스트                 │
    ├─────────────────────────────────────────────────────────────┤
    │  GROUP KARMA                                                │
    ├─────────────────────────────────────────────────────────────┤
    │  g.set <id> <field> <value>     집단 카르마 설정            │
    │  g.view <id>                    집단 카르마 조회            │
    │  g.decay <id>                   자멸 시뮬레이션             │
    │  g.pair <a> <b> <coef>          집단 간 상호작용 설정       │
    ├─────────────────────────────────────────────────────────────┤
    │  exit                           종료                        │
    └─────────────────────────────────────────────────────────────┘

    Fields (Personal): conscience, honesty, altruism, responsibility, 
                       influence_direction, ability
    Fields (Group): alignment, humanity_contribution, base_cohesion
    Alignment: beneficial, neutral, harmful, destructive
        """)
        
        cmd = input("    > ").strip().split()
        
        if not cmd:
            continue
        
        try:
            if cmd[0] == 'exit':
                print("\n    Karma System Closed.\n")
                break
            
            # === Personal Karma ===
            elif cmd[0] == 'p.set':
                if len(cmd) < 4:
                    print("    Usage: p.set <user_id> <field> <value>")
                    continue
                user_id = cmd[1]
                field = cmd[2]
                value = float(cmd[3])
                
                kwargs = {field: value}
                if karma.personal.set_karma(user_id, **kwargs):
                    print(f"\n    ✅ {user_id}: {field} = {value}")
                    report = karma.get_person_karma_report(user_id)
                    print(f"    → 카르마 계수: {report['karma_coefficient']:.3f}")
                    print(f"    → 해석: {report['interpretation']}\n")
                else:
                    print("\n    ❌ 설정 실패\n")
            
            elif cmd[0] == 'p.view':
                if len(cmd) < 2:
                    print("    Usage: p.view <user_id>")
                    continue
                report = karma.get_person_karma_report(cmd[1])
                print(f"\n{json.dumps(report, indent=2, default=str, ensure_ascii=False)}\n")
            
            elif cmd[0] == 'p.test':
                if len(cmd) < 3:
                    print("    Usage: p.test <user_id> <raw_effect>")
                    continue
                result = karma.calculate_action_effect(cmd[1], None, float(cmd[2]))
                print(f"\n    원래 효과: {result['raw_effect']:+.3f}")
                print(f"    카르마 계수: {result['personal_coefficient']:.3f}")
                print(f"    최종 효과: {result['final_effect']:+.3f}")
                
                if result['final_effect'] * result['raw_effect'] < 0:
                    print("    ⚠️ 효과 반전됨! (역효과 발생)")
                elif abs(result['final_effect']) < abs(result['raw_effect']) * 0.3:
                    print("    ⚠️ 효과 대부분 무효화됨")
                print()
            
            # === Group Karma ===
            elif cmd[0] == 'g.set':
                if len(cmd) < 4:
                    print("    Usage: g.set <group_id> <field> <value>")
                    continue
                group_id = cmd[1]
                field = cmd[2]
                
                if field == 'alignment':
                    kwargs = {field: cmd[3]}
                else:
                    kwargs = {field: float(cmd[3])}
                
                if karma.group.set_group_karma(group_id, **kwargs):
                    print(f"\n    ✅ {group_id}: {field} = {cmd[3]}")
                    report = karma.get_group_karma_report(group_id)
                    print(f"    → 상호작용 계수: {report['interaction_coefficient']:.3f}")
                    print(f"    → 해석: {report['interpretation']}\n")
                else:
                    print("\n    ❌ 설정 실패\n")
            
            elif cmd[0] == 'g.view':
                if len(cmd) < 2:
                    print("    Usage: g.view <group_id>")
                    continue
                report = karma.get_group_karma_report(cmd[1])
                print(f"\n{json.dumps(report, indent=2, default=str, ensure_ascii=False)}\n")
            
            elif cmd[0] == 'g.decay':
                if len(cmd) < 2:
                    print("    Usage: g.decay <group_id>")
                    continue
                
                # 24시간 시뮬레이션
                result = karma.group.simulate_decay(cmd[1], 24)
                
                print(f"\n    집단: {cmd[1]}")
                print(f"    상태: {result['status']}")
                
                if result['status'] == 'decaying':
                    print(f"    상호작용 계수: {result['coefficient']:.3f}")
                    print(f"    붕괴 진행도: {result['decay_progress']*100:.1f}%")
                    print(f"    남은 결속력: {result['remaining_cohesion']*100:.1f}%")
                    print(f"    예상 붕괴까지: {result['estimated_collapse_hours']:.0f}시간")
                    print(f"    현재 증상:")
                    for symptom in result['symptoms']:
                        print(f"      - {symptom}")
                print()
            
            elif cmd[0] == 'g.pair':
                if len(cmd) < 4:
                    print("    Usage: g.pair <group_a> <group_b> <coefficient>")
                    continue
                if karma.group.set_pairwise_interaction(cmd[1], cmd[2], float(cmd[3])):
                    print(f"\n    ✅ {cmd[1]} ↔ {cmd[2]}: {cmd[3]}\n")
                else:
                    print("\n    ❌ 설정 실패\n")
            
            else:
                print(f"\n    알 수 없는 명령: {cmd[0]}\n")
        
        except Exception as e:
            print(f"\n    오류: {e}\n")


if __name__ == "__main__":
    karma_cli()
