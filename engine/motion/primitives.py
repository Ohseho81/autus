"""
AUTUS Motion Primitive Engine v1.0
GlobeHUD 재생 엔진 - 파라미터 → 렌더
"""
import math
from dataclasses import dataclass
from typing import Dict, List, Any

# ============================================================
# Motion Primitive 타입
# ============================================================
class PrimitiveType:
    SPIN = "SPIN"
    TERMINATOR_SHIFT = "TERMINATOR_SHIFT"
    SWEEP = "SWEEP"
    PULSE = "PULSE"
    FLICKER = "FLICKER"
    ORBIT = "ORBIT"
    WAVE = "WAVE"

# ============================================================
# 기본 수식 함수
# ============================================================
def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = max(0, min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)

def calc_spin(t: float, omega: float, phase0: float = 0) -> float:
    """회전 각도 (라디안)"""
    return phase0 + omega * t

def calc_terminator(u: float, v: float, t: float, params: Dict) -> float:
    """
    Terminator Shift 마스크
    returns: 0~1 (night~day)
    """
    omega = params.get("omega_spin", 0.35)
    phase0 = params.get("phase0", 0)
    k_soft = params.get("k_soft", 0.08)
    a_tilt = params.get("a_tilt", 0.12)
    
    # 극좌표 변환
    cx, cy = 0.5, 0.5
    theta = math.atan2(v - cy, u - cx)
    
    # 현재 위상
    phi = phase0 + omega * t
    
    # 경계 함수
    s = math.cos(theta - phi) + a_tilt * math.sin(theta - phi)
    
    # 부드러운 마스크
    return smoothstep(-k_soft, k_soft, s)

def calc_sweep(t: float, params: Dict) -> Dict:
    """
    레이더 스윕
    returns: {angle, intensity}
    """
    omega = params.get("omega", 1.8)
    width = params.get("width", 0.06)
    gain = params.get("gain", 0.7)
    
    angle = (omega * t) % (2 * math.pi)
    return {"angle": angle, "width": width, "intensity": gain}

def calc_pulse(t: float, params: Dict) -> float:
    """
    펄스 (밝기 변조)
    returns: 0~1
    """
    freq = params.get("freq", 0.8)
    amp = params.get("amp", 0.15)
    bias = params.get("bias", 0.85)
    
    return bias + amp * math.sin(2 * math.pi * freq * t)

def calc_flicker(t: float, params: Dict) -> float:
    """
    플리커 (노이즈)
    returns: multiplier ~1.0
    """
    rate = params.get("rate", 6.0)
    sigma = params.get("sigma", 0.05)
    
    # 의사 난수 (결정적)
    noise = math.sin(t * rate * 17.31) * math.cos(t * rate * 23.17)
    return 1.0 + sigma * noise

# ============================================================
# Primitive 처리기
# ============================================================
@dataclass
class PrimitiveState:
    """Primitive 상태"""
    id: str
    type: str
    target: str
    value: Any
    t: float

def process_primitive(primitive: Dict, t: float) -> PrimitiveState:
    """단일 Primitive 처리"""
    ptype = primitive["type"]
    params = primitive.get("params", {})
    
    if ptype == PrimitiveType.SPIN:
        value = calc_spin(t, params.get("omega", 0.35), params.get("phase0", 0))
    elif ptype == PrimitiveType.TERMINATOR_SHIFT:
        # 중심점 기준 마스크 샘플
        value = {"mask_fn": lambda u, v: calc_terminator(u, v, t, params)}
    elif ptype == PrimitiveType.SWEEP:
        value = calc_sweep(t, params)
    elif ptype == PrimitiveType.PULSE:
        value = calc_pulse(t, params)
    elif ptype == PrimitiveType.FLICKER:
        value = calc_flicker(t, params)
    else:
        value = None
    
    return PrimitiveState(
        id=primitive["id"],
        type=ptype,
        target=primitive.get("target", ""),
        value=value,
        t=t
    )

# ============================================================
# Pack 렌더러
# ============================================================
class MotionPackRenderer:
    """Motion Pack 렌더러"""
    
    def __init__(self, pack: Dict):
        self.pack_id = pack.get("pack_id", "unknown")
        self.primitives = pack.get("primitives", [])
        self.source = pack.get("source", {})
        self.fps = self.source.get("fps", 30)
        self.duration = self.source.get("duration_s", 10)
    
    def render_frame(self, t: float) -> Dict[str, PrimitiveState]:
        """특정 시간의 모든 Primitive 상태 계산"""
        states = {}
        for p in self.primitives:
            state = process_primitive(p, t)
            states[state.id] = state
        return states
    
    def render_sequence(self, start: float = 0, end: float = None, step: float = None) -> List[Dict]:
        """시퀀스 렌더링"""
        if end is None:
            end = self.duration
        if step is None:
            step = 1.0 / self.fps
        
        frames = []
        t = start
        while t <= end:
            frame = {
                "t": round(t, 4),
                "states": {k: {"type": v.type, "value": v.value if not callable(getattr(v.value, '__call__', None)) else "fn"} 
                          for k, v in self.render_frame(t).items() if not isinstance(v.value, dict) or "mask_fn" not in v.value}
            }
            frames.append(frame)
            t += step
        return frames
    
    def get_state_at(self, t: float) -> Dict:
        """JSON 직렬화 가능한 상태"""
        states = self.render_frame(t)
        result = {"t": t, "primitives": {}}
        
        for k, v in states.items():
            if v.type == PrimitiveType.SPIN:
                result["primitives"][k] = {"angle_rad": v.value, "angle_deg": math.degrees(v.value) % 360}
            elif v.type == PrimitiveType.SWEEP:
                result["primitives"][k] = v.value
            elif v.type in [PrimitiveType.PULSE, PrimitiveType.FLICKER]:
                result["primitives"][k] = {"intensity": v.value}
            elif v.type == PrimitiveType.TERMINATOR_SHIFT:
                # 샘플 포인트
                result["primitives"][k] = {
                    "sample_center": calc_terminator(0.5, 0.5, t, self.primitives[1]["params"]) if len(self.primitives) > 1 else 0.5
                }
        
        return result

# ============================================================
# GlobeHUD Pack v1 기본 정의
# ============================================================
GLOBE_HUD_PACK_V1 = {
    "pack_id": "GlobeHUDPack_v1",
    "source": {
        "provider": "DepositPhotos",
        "asset_type": "video",
        "asset_id": "366967452",
        "fps": 30,
        "duration_s": 28,
        "resolution": [3840, 2160]
    },
    "primitives": [
        {"id": "globe_spin", "type": "SPIN", "target": "globe_layer", "params": {"omega": 0.35, "phase0": 0.0}},
        {"id": "terminator_shift", "type": "TERMINATOR_SHIFT", "target": "globe_layer", "params": {"omega_spin": 0.35, "phase0": 0.0, "k_soft": 0.08, "a_tilt": 0.12, "gain_day": 1.0, "gain_night": 0.35}},
        {"id": "radar_sweep", "type": "SWEEP", "target": "overlay_layer", "params": {"omega": 1.8, "width": 0.06, "gain": 0.7}},
        {"id": "pulse", "type": "PULSE", "target": "overlay_layer", "params": {"freq": 0.8, "amp": 0.15, "bias": 0.85}},
        {"id": "flicker", "type": "FLICKER", "target": "overlay_layer", "params": {"rate": 6.0, "sigma": 0.05}}
    ]
}

# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    renderer = MotionPackRenderer(GLOBE_HUD_PACK_V1)
    
    print("=== GlobeHUD Pack v1 ===")
    print(f"Pack ID: {renderer.pack_id}")
    print(f"FPS: {renderer.fps}, Duration: {renderer.duration}s")
    print()
    
    for t in [0, 1, 2, 5, 10]:
        state = renderer.get_state_at(t)
        print(f"t={t}s: {state['primitives']}")
