"""
AUTUS Observer-Solar Bridge
Observer delta → Solar Engine state 업데이트
"""

from core.solar.physics import get_engine

def apply_delta_to_solar(delta: dict):
    """
    Observer delta를 Solar Engine에 적용
    
    delta:
        focus_delta: 집중도 변화 → effort 증가
        energy_delta: 에너지 변화 → entropy 감소 (활력)
        entropy_delta: 혼란도 변화 → entropy 증가
    """
    engine = get_engine()
    state = engine.state
    
    focus = delta.get("focus_delta", 0)
    energy = delta.get("energy_delta", 0)
    entropy = delta.get("entropy_delta", 0)
    
    # Focus → Effort (집중하면 노력 축적)
    state.effort += focus * 0.1
    
    # Energy → Entropy 감소 (에너지 있으면 안정)
    state.entropy = max(0, state.entropy - energy * 0.5)
    
    # Entropy → Entropy 증가 (혼란 증가)
    state.entropy += entropy
    
    # Tick 증가
    state.tick += 1
    
    # 파생값 업데이트
    engine._update_derived()
    
    return engine.status()


def get_realtime_state():
    """실시간 상태 반환 (WebSocket용)"""
    engine = get_engine()
    status = engine.status()
    
    # UI용 추가 필드
    status["energy"] = max(0, 1 - status["entropy"])
    status["risk"] = min(1, status["entropy"] / status["boundary"])
    
    return status
