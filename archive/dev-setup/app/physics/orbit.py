# app/physics/orbit.py
"""
AUTUS Orbit Physics (LOCK)

9 Planets 궤도 계산
UI는 결과만 렌더링, 물리 계산 불가

LOCK 규칙:
- 행성 9개 고정
- 궤도 3개 고정 (PAST/NOW/FORECAST)
- 모든 값 0..1 정규화
- 확률 아님, 물리 연장
"""

import math
from typing import Dict, List


# 9 Planets (LOCK: 변경 불가)
PLANETS = [
    "OUTPUT",      # 생산량
    "QUALITY",     # 품질
    "TIME",        # 시간 효율
    "FRICTION",    # 마찰/저항
    "STABILITY",   # 안정성
    "COHESION",    # 응집력
    "RECOVERY",    # 회복력
    "TRANSFER",    # 전달 효율
    "SHOCK",       # 충격/위험
]

# Shadow32f → Planet 매핑 (LOCK)
PLANET_RANGES = {
    "OUTPUT": (0, 4),
    "QUALITY": (4, 8),
    "TIME": (8, 12),
    "FRICTION": (12, 16),
    "STABILITY": (16, 20),
    "COHESION": (20, 24),
    "RECOVERY": (24, 28),
    "TRANSFER": (28, 31),
    "SHOCK": (31, 32),
}


def clamp(value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """값을 범위 내로 제한"""
    return max(min_val, min(max_val, value))


def shadow_to_planets(shadow32f: List[float]) -> Dict[str, float]:
    """
    Shadow32f → 9 Planets 변환
    
    Args:
        shadow32f: 32차원 벡터
        
    Returns:
        9개 행성 값 딕셔너리 (0..1)
    """
    if not shadow32f or len(shadow32f) < 32:
        return {p: 0.5 for p in PLANETS}
    
    result = {}
    for planet, (start, end) in PLANET_RANGES.items():
        segment = shadow32f[start:end]
        if segment:
            result[planet] = clamp(sum(segment) / len(segment))
        else:
            result[planet] = 0.5
    
    return result


def planets_to_orbit(
    planets: Dict[str, float], 
    t: float = 1.0,
    base_radius: float = 1.2,
    radius_scale: float = 0.9,
    rotation_speed: float = 0.1,
) -> List[Dict]:
    """
    9 Planets → 궤도 위치 계산
    
    Args:
        planets: 행성 값 딕셔너리
        t: 시간 파라미터 (0=past, 1=now, 2=forecast)
        base_radius: 기본 궤도 반경
        radius_scale: 값에 따른 반경 스케일
        rotation_speed: 회전 속도
        
    Returns:
        각 행성의 3D 위치
    """
    positions = []
    
    for i, planet in enumerate(PLANETS):
        value = float(planets.get(planet, 0.5))
        
        # 반경: 기본 + 값에 따른 확장
        radius = base_radius + value * radius_scale
        
        # 각도: 균등 배치 + 시간 회전
        base_angle = (i / len(PLANETS)) * 2 * math.pi
        angle = base_angle + t * rotation_speed
        
        # 3D 좌표
        positions.append({
            "key": planet,
            "value": round(value, 4),
            "x": round(math.cos(angle) * radius, 4),
            "y": round(math.sin(angle) * radius, 4),
            "z": 0.0,
        })
    
    return positions


def apply_forces(
    planets: Dict[str, float], 
    forces: Dict[str, float],
    gain: float = 0.2,
) -> Dict[str, float]:
    """
    Force Injection (SimPreview용)
    
    LOCK: 현실 데이터 변경 없음, 가상 계산만
    
    Forces:
        E: OUTPUT 증가
        R: FRICTION 감소
        T: TIME 감소
        Q: QUALITY 증가
        MU: COHESION 증가
        
    Args:
        planets: 현재 9행성 값
        forces: Force 딕셔너리
        gain: 적용 계수
        
    Returns:
        Force 적용 후 9행성 값
    """
    result = dict(planets)
    
    # E → OUTPUT 증가
    if forces.get("E"):
        result["OUTPUT"] = clamp(result.get("OUTPUT", 0.5) + float(forces["E"]) * gain)
    
    # R → FRICTION 감소
    if forces.get("R"):
        result["FRICTION"] = clamp(result.get("FRICTION", 0.5) - float(forces["R"]) * gain)
    
    # T → TIME 감소 (효율 증가)
    if forces.get("T"):
        result["TIME"] = clamp(result.get("TIME", 0.5) - float(forces["T"]) * gain)
    
    # Q → QUALITY 증가
    if forces.get("Q"):
        result["QUALITY"] = clamp(result.get("QUALITY", 0.5) + float(forces["Q"]) * gain)
    
    # MU → COHESION 증가
    if forces.get("MU"):
        result["COHESION"] = clamp(result.get("COHESION", 0.5) + float(forces["MU"]) * gain)
    
    return result


def calculate_risk(planets: Dict[str, float]) -> float:
    """
    위험도 계산
    
    Args:
        planets: 9행성 값
        
    Returns:
        위험도 (0..1)
    """
    shock = planets.get("SHOCK", 0.0)
    friction = planets.get("FRICTION", 0.0)
    stability = planets.get("STABILITY", 1.0)
    recovery = planets.get("RECOVERY", 1.0)
    
    risk = (shock * 1.5 + friction * 0.5 - stability * 0.3 - recovery * 0.2)
    return clamp(risk)


def calculate_status(planets: Dict[str, float]) -> str:
    """
    상태 판정
    
    Args:
        planets: 9행성 값
        
    Returns:
        "GREEN" | "YELLOW" | "RED"
    """
    risk = calculate_risk(planets)
    
    if risk > 0.7:
        return "RED"
    elif risk > 0.4:
        return "YELLOW"
    else:
        return "GREEN"
