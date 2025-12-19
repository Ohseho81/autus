def execute_stabilization(state):
    v = state.vector.v

    # 1) 에너지 희생 (단기 손실 허용)
    v[0] = max(0.0, v[0] - 0.15)

    # 2) 압력 완화
    v[10] = max(0.0, v[10] - 0.25)

    # 3) 엔트로피 방출
    v[11] = max(0.0, v[11] - 0.30)

    # 4) 성장 동결 (1 tick)
    state.growth_frozen = 1

    # 5) 일관성 회복 바이어스
    v[8] = min(1.0, v[8] + 0.05)

    state.system_state = "STABILIZED"
    return state

