"""
AUTUS v1.0 Afterimage 재생 규약 (Replay Protocol)

목적:
- 결정론 보증
- 감사/재생 전용
- 우회 불가 증거

규칙:
- 동일 input + versions → 동일 결과
- 시간 재현은 슬롯 단위 (피크/비피크)
- 개인 위치 재현 ❌ (시설/도시 단위만)
- 재생은 시각적 패턴만 (설명 0)
"""

import hashlib
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Optional

# ============================================
# Gate 결과 Enum
# ============================================

class GateResult(Enum):
    PASS = "PASS"
    RING = "RING"
    BOUNCE = "BOUNCE"
    LOCK = "LOCK"


# ============================================
# 입력 데이터 구조
# ============================================

@dataclass(frozen=True)
class InputConstants:
    """물리 상수 입력 (불변)"""
    M: float      # Mass
    Psi: float    # Irreversibility
    R: float      # Responsibility Radius
    F0: float     # Failure Floor


@dataclass(frozen=True)
class InputEnv:
    """환경 입력 (불변)"""
    time_density: float     # 시간 밀도 (피크/비피크)
    spatial_density: float  # 공간 밀도 (도시/시설)
    context_risk: float     # 맥락 리스크


@dataclass(frozen=True)
class ReplayInput:
    """재생용 전체 입력 (불변)"""
    constants: InputConstants
    env: InputEnv
    weights_version: str     # 예: "phys-w1.0"
    thresholds_version: str  # 예: "phys-t1.0"


# ============================================
# Afterimage 레코드 (불변)
# ============================================

@dataclass(frozen=True)
class AfterimageRecord:
    """Afterimage 레코드 (불변)"""
    hash: str
    ts: str                    # ISO8601
    actor_scope: str           # K2/K10/Audit
    input: ReplayInput
    score_S: float
    gate_result: GateResult
    cooldown_applied: float
    ui_effects: str            # 체감 메타 (텍스트 없음)
    schema_v: str = "1.0"


# ============================================
# 물리 엔진 버전별 가중치
# ============================================

WEIGHT_VERSIONS = {
    "phys-w1.0": {
        "M": 0.30,
        "Psi": 0.35,
        "R": 0.20,
        "F0": 0.15,
    }
}

# ============================================
# 물리 엔진 버전별 임계값
# ============================================

THRESHOLD_VERSIONS = {
    "phys-t1.0": {
        "PASS": 3.0,    # S < 3.0 → PASS
        "RING": 5.0,    # 3.0 ≤ S < 5.0 → RING
        "BOUNCE": 7.0,  # 5.0 ≤ S < 7.0 → BOUNCE
        # S ≥ 7.0 → LOCK
    }
}


# ============================================
# 결정론적 점수 계산
# ============================================

def calculate_score_S(
    constants: InputConstants,
    env: InputEnv,
    weights_version: str
) -> float:
    """
    물리 점수 S 계산 (결정론)
    
    Replay(input, versions) ⇒ score_S ⇒ gate_result (exact)
    """
    weights = WEIGHT_VERSIONS.get(weights_version)
    if not weights:
        raise ValueError(f"Unknown weights version: {weights_version}")
    
    # 기본 점수 계산
    base_score = (
        weights["M"] * constants.M +
        weights["Psi"] * constants.Psi * 10 +  # Psi는 0-1이므로 스케일링
        weights["R"] * constants.R +
        weights["F0"] * constants.F0
    )
    
    # 환경 보정
    env_modifier = (
        env.time_density * 0.1 +
        env.spatial_density * 0.1 +
        env.context_risk * 0.2
    )
    
    score_S = base_score + env_modifier
    return round(score_S, 6)


def determine_gate_result(
    score_S: float,
    thresholds_version: str
) -> GateResult:
    """
    Gate 결과 결정 (결정론)
    """
    thresholds = THRESHOLD_VERSIONS.get(thresholds_version)
    if not thresholds:
        raise ValueError(f"Unknown thresholds version: {thresholds_version}")
    
    if score_S < thresholds["PASS"]:
        return GateResult.PASS
    elif score_S < thresholds["RING"]:
        return GateResult.RING
    elif score_S < thresholds["BOUNCE"]:
        return GateResult.BOUNCE
    else:
        return GateResult.LOCK


# ============================================
# 해시 생성 (결정론)
# ============================================

def generate_deterministic_hash(replay_input: ReplayInput, score_S: float) -> str:
    """
    결정론적 해시 생성
    동일 입력 → 동일 해시 (보장)
    """
    data = {
        "constants": asdict(replay_input.constants),
        "env": asdict(replay_input.env),
        "weights_version": replay_input.weights_version,
        "thresholds_version": replay_input.thresholds_version,
        "score_S": score_S,
    }
    
    # JSON 정렬로 결정론 보장
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode()).hexdigest()


# ============================================
# 재생 함수 (핵심)
# ============================================

def replay(replay_input: ReplayInput) -> tuple[float, GateResult, str]:
    """
    Afterimage 재생 (결정론 보증)
    
    규칙:
    - 동일 input + versions → 동일 결과
    - 화학 계수 영향 0
    - 시각적 패턴만 반환 (설명 0)
    
    Returns:
        (score_S, gate_result, hash)
    """
    # 점수 계산
    score_S = calculate_score_S(
        replay_input.constants,
        replay_input.env,
        replay_input.weights_version
    )
    
    # Gate 결정
    gate_result = determine_gate_result(
        score_S,
        replay_input.thresholds_version
    )
    
    # 해시 생성
    hash_value = generate_deterministic_hash(replay_input, score_S)
    
    return score_S, gate_result, hash_value


def verify_replay(record: AfterimageRecord) -> bool:
    """
    Afterimage 재생 검증
    
    규칙:
    - 동일 입력 → 동일 Gate
    - 해시 불변성 검증
    """
    score_S, gate_result, hash_value = replay(record.input)
    
    return (
        abs(score_S - record.score_S) < 0.000001 and
        gate_result == record.gate_result and
        hash_value == record.hash
    )


# ============================================
# UI 효과 생성 (체감 메타)
# ============================================

def generate_ui_effects(gate_result: GateResult) -> str:
    """
    Gate 결과에 따른 UI 효과 메타데이터
    
    규칙:
    - 텍스트 없음
    - 체감만 존재
    """
    effects = {
        GateResult.PASS: "blur:0,delay:0ms",
        GateResult.RING: "blur:0.2,delay:100ms",
        GateResult.BOUNCE: "blur:0.4,delay:300ms,resistance:0.5",
        GateResult.LOCK: "blur:0.8,delay:500ms,resistance:1.0,disabled:true",
    }
    return effects.get(gate_result, "")


# ============================================
# Afterimage 생성 (전체 플로우)
# ============================================

def create_afterimage(
    constants: InputConstants,
    env: InputEnv,
    actor_scope: str,
    weights_version: str = "phys-w1.0",
    thresholds_version: str = "phys-t1.0"
) -> AfterimageRecord:
    """
    Afterimage 레코드 생성
    
    규칙:
    - Append-only
    - 수정/삭제 불가
    - UI 접근: K10/Audit만 READ
    """
    replay_input = ReplayInput(
        constants=constants,
        env=env,
        weights_version=weights_version,
        thresholds_version=thresholds_version
    )
    
    score_S, gate_result, hash_value = replay(replay_input)
    ui_effects = generate_ui_effects(gate_result)
    
    # 쿨다운 계산 (LOCK만)
    cooldown = 0.0
    if gate_result == GateResult.LOCK:
        cooldown = 30.0  # 30초 쿨다운
    elif gate_result == GateResult.BOUNCE:
        cooldown = 10.0  # 10초 쿨다운
    
    return AfterimageRecord(
        hash=hash_value,
        ts=datetime.utcnow().isoformat() + "Z",
        actor_scope=actor_scope,
        input=replay_input,
        score_S=score_S,
        gate_result=gate_result,
        cooldown_applied=cooldown,
        ui_effects=ui_effects,
        schema_v="1.0"
    )


# ============================================
# 감사 가드
# ============================================

def audit_check():
    """
    감사 가드 체크
    
    규칙:
    - 화학 계수 영향 0
    - 가중치/임계값 변경 시 신규 버전으로만
    - 과거 Afterimage 불변 유지
    """
    return {
        "chemistry_influence": 0,
        "weight_versions": list(WEIGHT_VERSIONS.keys()),
        "threshold_versions": list(THRESHOLD_VERSIONS.keys()),
        "immutability": "enforced"
    }
