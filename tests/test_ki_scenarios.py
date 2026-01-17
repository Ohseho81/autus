"""
K/I 물리 엔진 - 극단 시나리오 테스트
임계점 도달 및 자멸 궤도 시뮬레이션
"""

from autus_ki_physics import (
    KIPhysicsSystem,
    ActionType,
    InteractionType,
    print_dashboard
)


def scenario_saint():
    """성인 시나리오: K → +0.9 (폭발 성장)"""
    print("\n" + "═" * 70)
    print("  📗 시나리오 1: 성인의 길 (K → +0.9)")
    print("═" * 70)
    
    system = KIPhysicsSystem(master_key="genesis")
    
    # 학습률 높임 (테스트용)
    system.karma_engine.alpha = 0.15
    
    # 콜백
    def alert(t, target, phase, val):
        print(f"  ⚡ PHASE CHANGE: {target} → {phase.value} (K={val:.4f})")
    system.on_phase_change(alert)
    
    saint = "Saint_Kim"
    
    actions = [
        (ActionType.SACRIFICE_FOR_OTHER, "익명 기부 10억", 2.0),
        (ActionType.PROMISE_KEPT, "10년 약속 이행", 1.5),
        (ActionType.ADMIT_MISTAKE, "공개 사과", 1.2),
        (ActionType.VOLUNTARY_HELP, "재난 구호 참여", 1.5),
        (ActionType.TRANSPARENT_COMM, "모든 정보 공개", 1.0),
        (ActionType.RESPONSIBILITY_ACCEPT, "실패 책임 수용", 1.3),
        (ActionType.SACRIFICE_FOR_OTHER, "장기 기증", 2.0),
        (ActionType.HONEST_FEEDBACK, "불편한 진실 전달", 1.0),
    ]
    
    for action, context, mag in actions:
        result = system.record_action(saint, action, context, mag)
        print(f"  {action.description}: K={result['k_after']:+.4f} ({result['delta_k']:+.4f})")
    
    print(f"\n  최종 K: {system.get_k(saint):+.4f}")
    print(f"  상태: {system.karma_engine.get_phase(saint).value}")
    
    return system


def scenario_villain():
    """악당 시나리오: K → -0.7 (위험 상태)"""
    print("\n" + "═" * 70)
    print("  📕 시나리오 2: 악당의 몰락 (K → -0.7)")
    print("═" * 70)
    
    system = KIPhysicsSystem(master_key="genesis")
    system.karma_engine.alpha = 0.15
    
    def alert(t, target, phase, val):
        print(f"  💀 PHASE CHANGE: {target} → {phase.value} (K={val:.4f})")
    system.on_phase_change(alert)
    
    villain = "Corp_Evil"
    
    actions = [
        (ActionType.BETRAYAL, "파트너사 배신", 1.5),
        (ActionType.DECEPTION, "분식회계", 2.0),
        (ActionType.MANIPULATION, "직원 착취", 1.5),
        (ActionType.PROMISE_BROKEN, "투자자 약속 파기", 1.3),
        (ActionType.BLAME_OTHERS, "실패 하청사 탓", 1.2),
        (ActionType.RESPONSIBILITY_AVOID, "CEO 도피", 1.5),
        (ActionType.BETRAYAL, "내부 고발자 해고", 1.8),
    ]
    
    for action, context, mag in actions:
        result = system.record_action(villain, action, context, mag)
        print(f"  {action.description}: K={result['k_after']:+.4f} ({result['delta_k']:+.4f})")
    
    print(f"\n  최종 K: {system.get_k(villain):+.4f}")
    print(f"  상태: {system.karma_engine.get_phase(villain).value}")
    
    return system


def scenario_destructive_pair():
    """자멸 관계 시나리오: I → -0.7 (자멸 궤도)"""
    print("\n" + "═" * 70)
    print("  📙 시나리오 3: 자멸하는 관계 (I → -0.7)")
    print("═" * 70)
    
    system = KIPhysicsSystem(master_key="genesis")
    system.interaction_engine.beta = 0.2  # 학습률 높임
    
    def alert(t, target, phase, val):
        print(f"  🔥 PHASE CHANGE: {target} → {phase.value} (I={val:.4f})")
    system.on_phase_change(alert)
    
    a, b = "Team_A", "Team_B"
    
    interactions = [
        (InteractionType.COOPERATION_FAILED, "프로젝트 실패", 1.2),
        (InteractionType.CONFLICT_STUCK, "책임 공방", 1.5),
        (InteractionType.ZERO_SUM, "예산 쟁탈전", 1.3),
        (InteractionType.COMMUNICATION_BREAKDOWN, "소통 거부", 1.4),
        (InteractionType.BETRAYAL, "내부 정보 유출", 1.8),
        (InteractionType.CONFLICT_STUCK, "경영진 개입에도 합의 실패", 1.5),
    ]
    
    for itype, context, mag in interactions:
        result = system.record_interaction(a, b, itype, context, mag)
        print(f"  {itype.description}: I={result['i_after']:+.4f} ({result['delta_i']:+.4f})")
    
    print(f"\n  최종 I: {system.get_i(a, b):+.4f}")
    print(f"  상태: {system.interaction_engine.get_phase(a, b).value}")
    
    return system


def scenario_synergy():
    """시너지 관계 시나리오: I → +0.7 (시너지 폭발)"""
    print("\n" + "═" * 70)
    print("  📘 시나리오 4: 시너지 폭발 (I → +0.7)")
    print("═" * 70)
    
    system = KIPhysicsSystem(master_key="genesis")
    system.karma_engine.alpha = 0.15
    system.interaction_engine.beta = 0.2
    
    def alert(t, target, phase, val):
        print(f"  ✨ PHASE CHANGE: {target} → {phase.value}")
    system.on_phase_change(alert)
    
    a, b = "Partner_A", "Partner_B"
    
    # 먼저 K를 높임 (K가 높아야 I 효과 증가)
    for _ in range(3):
        system.record_action(a, ActionType.PROMISE_KEPT, "", 1.0)
        system.record_action(b, ActionType.PROMISE_KEPT, "", 1.0)
    
    print(f"  초기 K: A={system.get_k(a):+.4f}, B={system.get_k(b):+.4f}")
    
    interactions = [
        (InteractionType.COOPERATION_SUCCESS, "첫 프로젝트 성공", 1.3),
        (InteractionType.WIN_WIN, "상호 이익 계약", 1.5),
        (InteractionType.TRUST_BUILT, "위기 극복", 1.4),
        (InteractionType.MUTUAL_SUPPORT, "어려울 때 지원", 1.5),
        (InteractionType.CONFLICT_RESOLVED, "갈등 해결", 1.3),
        (InteractionType.WIN_WIN, "합작 대박", 2.0),
    ]
    
    for itype, context, mag in interactions:
        result = system.record_interaction(a, b, itype, context, mag)
        print(f"  {itype.description}: I={result['i_after']:+.4f} ({result['delta_i']:+.4f})")
    
    print(f"\n  최종 I: {system.get_i(a, b):+.4f}")
    print(f"  상태: {system.interaction_engine.get_phase(a, b).value}")
    
    return system


def scenario_network_propagation():
    """네트워크 전파 시나리오"""
    print("\n" + "═" * 70)
    print("  📓 시나리오 5: 네트워크 전파 효과")
    print("═" * 70)
    
    system = KIPhysicsSystem(master_key="genesis")
    system.interaction_engine.beta = 0.15
    system.interaction_engine.gamma = 0.2  # 전파율 높임
    
    # A-B 좋은 관계
    print("\n  [1] A-B 좋은 관계 형성")
    system.record_interaction("A", "B", InteractionType.TRUST_BUILT, "", 2.0)
    print(f"      I(A,B) = {system.get_i('A', 'B'):+.4f}")
    
    # B-C 좋은 관계
    print("\n  [2] B-C 좋은 관계 형성")
    system.record_interaction("B", "C", InteractionType.TRUST_BUILT, "", 2.0)
    print(f"      I(B,C) = {system.get_i('B', 'C'):+.4f}")
    
    # 전파 효과 확인: A-C는 직접 상호작용 없지만...
    print("\n  [3] 전파 효과 확인")
    print(f"      I(A,C) = {system.get_i('A', 'C'):+.4f}  ← A-B, B-C 좋으면 A-C도 상승!")
    
    # A-B 상호작용 추가 → A-C에도 영향
    print("\n  [4] A-B 추가 상호작용")
    system.record_interaction("A", "B", InteractionType.WIN_WIN, "", 1.5)
    print(f"      I(A,B) = {system.get_i('A', 'B'):+.4f}")
    print(f"      I(A,C) = {system.get_i('A', 'C'):+.4f}  ← 전파로 추가 상승!")
    
    return system


def run_all():
    """모든 시나리오 실행"""
    scenario_saint()
    scenario_villain()
    scenario_destructive_pair()
    scenario_synergy()
    scenario_network_propagation()
    
    print("\n" + "═" * 70)
    print("  ✅ 모든 시나리오 완료")
    print("═" * 70)
    
    print("""
    
  ┌─────────────────────────────────────────────────────────────────────┐
  │                        물리법칙 요약                                │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  K-지수 (Karma):                                                    │
  │    ΔK = α × (행동점수 × 가중치) × (1 - |K|)                         │
  │    - 극단값일수록 변화 저항                                         │
  │    - 시간 감쇠로 중립 회귀                                          │
  │                                                                     │
  │  I-지수 (Interaction):                                              │
  │    ΔI = β × (상호작용점수) × (K_a + K_b)/2 × (1 - |I|)              │
  │    - K가 높을수록 상호작용 효과 증가                                │
  │    - 네트워크 전파: I(a,c) += γ × I(a,b) × I(b,c)                   │
  │                                                                     │
  │  임계점:                                                            │
  │    K > +0.9  →  폭발 성장 (리더십 자연 발생)                        │
  │    K < -0.7  →  위험 상태 (격리 대상)                               │
  │    I > +0.7  →  시너지 폭발 (1+1 > 2)                               │
  │    I < -0.7  →  자멸 궤도 (협력 불가)                               │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    run_all()
