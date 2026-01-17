"""
═══════════════════════════════════════════════════════════════════════════════
🧮 AUTUS V Router — V 공식 API
═══════════════════════════════════════════════════════════════════════════════

V = (M - T) × (1 + s)^t 계산 및 예측 API

Endpoints:
- POST /v/calculate  - V 계산
- POST /v/predict    - 미래 V 예측
- POST /v/simulate   - 시나리오 시뮬레이션
- POST /v/what-if    - 결정 비교
- POST /v/train      - AI 학습

═══════════════════════════════════════════════════════════════════════════════
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import logging

logger = logging.getLogger("autus.v_router")

router = APIRouter(prefix="/v", tags=["V Formula"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class VCalculateRequest(BaseModel):
    M: float = Field(..., ge=0, description="Mint (생성 가치)")
    T: float = Field(..., ge=0, description="Tax (비용)")
    s: float = Field(..., ge=0, le=1, description="Synergy (협업 계수)")
    t: int = Field(..., ge=0, le=120, description="Time (기간, 월)")
    user_type: str = Field("balanced", description="사용자 타입")
    age: int = Field(30, ge=1, le=100, description="나이")
    location_factor: float = Field(1.0, ge=0.1, le=2.0, description="지역 계수")
    network_12: int = Field(0, ge=0, le=12, description="핵심 관계 수")
    network_144: int = Field(0, ge=0, le=144, description="확장 관계 수")

    class Config:
        json_schema_extra = {
            "example": {
                "M": 100,
                "T": 40,
                "s": 0.3,
                "t": 12,
                "user_type": "ambitious",
                "network_12": 5,
                "network_144": 20
            }
        }


class VPredictRequest(BaseModel):
    M: float = Field(..., ge=0)
    T: float = Field(..., ge=0)
    s: float = Field(..., ge=0, le=1)
    t: int = Field(12, ge=1, le=60, description="예측 기간 (월)")
    uncertainty: float = Field(0.1, ge=0, le=0.5, description="불확실성 계수")


class VSimulateRequest(BaseModel):
    M: float = Field(..., ge=0)
    T: float = Field(..., ge=0)
    s: float = Field(..., ge=0, le=1)
    t: int = Field(12, ge=1)
    s_variations: List[float] = Field([-0.1, 0, 0.1, 0.2], description="Synergy 변화량")
    t_variations: List[int] = Field([6, 12, 24, 36], description="시간 변화량")


class DecisionOption(BaseModel):
    label: str = Field(..., description="결정 라벨")
    M: float = Field(0, description="Mint 변화량")
    T: float = Field(0, description="Tax 변화량")
    s_boost: float = Field(0, ge=-0.5, le=0.5, description="Synergy 부스트")


class WhatIfRequest(BaseModel):
    current_M: float = Field(..., ge=0)
    current_T: float = Field(..., ge=0)
    current_s: float = Field(..., ge=0, le=1)
    t: int = Field(12, ge=1)
    options: List[DecisionOption]


class TrainRequest(BaseModel):
    history: List[Dict[str, float]] = Field(
        ...,
        description="[{M, T, s, V, network_density}, ...]",
        min_length=3
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/calculate")
async def calculate_v(req: VCalculateRequest):
    """
    V 계산
    
    V = (M - T) × (1 + s)^t × type_factor × constant_adj
    
    - type_factor: 사용자 타입 승수 (ambitious=1.2, cautious=0.8 등)
    - constant_adj: 나이/위치 조정
    - adjusted_s: 네트워크 밀도 반영
    """
    try:
        from physics.v_engine import calculate_v as v_calc
        
        result = v_calc(
            M=req.M,
            T=req.T,
            s=req.s,
            t=req.t,
            user_type=req.user_type,
            age=req.age,
            location_factor=req.location_factor,
            network_12=req.network_12,
            network_144=req.network_144
        )
        
        return {
            "success": True,
            "formula": "V = (M - T) × (1 + s)^t × type × const",
            "input": req.model_dump(),
            "result": result
        }
        
    except Exception as e:
        logger.error(f"V 계산 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/predict")
async def predict_v(req: VPredictRequest):
    """
    라플라스 예측 — 미래 V 곡선
    
    중앙 예측값 + 신뢰 구간 (낙관/비관 시나리오)
    """
    try:
        from physics.v_engine import predict_v as v_predict
        
        result = v_predict(
            M=req.M,
            T=req.T,
            s=req.s,
            t=req.t,
            uncertainty=req.uncertainty
        )
        
        return {
            "success": True,
            "prediction_type": "laplace_simulation",
            "input": req.model_dump(),
            "result": result
        }
        
    except Exception as e:
        logger.error(f"V 예측 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/simulate")
async def simulate_scenarios(req: VSimulateRequest):
    """
    시나리오 시뮬레이션
    
    Synergy와 Time 변화에 따른 V 변화 분석
    """
    try:
        from physics.v_engine import (
            get_v_engine, VInput, UserConstants, NetworkState, UserType
        )
        
        engine = get_v_engine()
        
        input_data = VInput(
            M=req.M,
            T=req.T,
            s=req.s,
            t=req.t,
            user_type=UserType.BALANCED,
            constants=UserConstants(),
            network=NetworkState()
        )
        
        result = engine.simulate_scenarios(
            base_input=input_data,
            s_variations=req.s_variations,
            t_variations=req.t_variations
        )
        
        return {
            "success": True,
            "simulation_type": "scenario_analysis",
            "input": req.model_dump(),
            "result": result
        }
        
    except Exception as e:
        logger.error(f"시뮬레이션 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/what-if")
async def what_if_analysis(req: WhatIfRequest):
    """
    결정 비교 분석
    
    여러 결정 옵션의 미래 V 비교 → 최적 결정 추천
    """
    try:
        from physics.v_engine import (
            get_laplace_simulator, VInput, UserConstants, NetworkState, UserType
        )
        
        simulator = get_laplace_simulator()
        
        current_input = VInput(
            M=req.current_M,
            T=req.current_T,
            s=req.current_s,
            t=req.t,
            user_type=UserType.BALANCED,
            constants=UserConstants(),
            network=NetworkState()
        )
        
        options = [opt.model_dump() for opt in req.options]
        
        result = simulator.what_if(current_input, options)
        
        return {
            "success": True,
            "analysis_type": "decision_comparison",
            "input": {
                "current": {"M": req.current_M, "T": req.current_T, "s": req.current_s},
                "options_count": len(req.options)
            },
            "result": result
        }
        
    except Exception as e:
        logger.error(f"What-if 분석 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/train")
async def train_predictor(req: TrainRequest):
    """
    AI 예측기 학습
    
    히스토리 데이터로 LogLinear + LSTM 앙상블 학습
    """
    try:
        from physics.v_predictor import train_predictor
        
        result = train_predictor(req.history)
        
        return {
            "success": True,
            "training_type": "ensemble",
            "data_points": len(req.history),
            "result": result
        }
        
    except Exception as e:
        logger.error(f"학습 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/ai-predict")
async def ai_predict(
    future_months: int = 12,
    recent_data: Optional[List[Dict[str, float]]] = None
):
    """
    AI 기반 미래 V 예측
    
    학습된 앙상블 모델로 예측 (학습 필요)
    """
    try:
        from physics.v_predictor import predict_future_v
        
        result = predict_future_v(future_months, recent_data)
        
        return {
            "success": True,
            "prediction_type": "ai_ensemble",
            "future_months": future_months,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"AI 예측 오류: {e}")
        raise HTTPException(500, str(e))


@router.post("/demon")
async def summon_laplace_demon(
    user_type: str = "balanced",
    age: int = 30,
    location_factor: float = 0.8,
    growth_rate: float = 0.05,
    core_12: int = 5,
    extended_144: int = 20,
    decisions: Optional[List[Dict[str, float]]] = None,
    uncertainty: float = 0.15
):
    """
    😈 라플라스 악마 소환
    
    모든 초기 조건을 기반으로 결정론적 미래 예측
    
    - 사용자 타입 (ambitious, cautious, collaborative, balanced, conservative)
    - 상수 (나이, 위치)
    - 지수 성장 (네트워크 효과)
    - 1-12-144 네트워크 구조
    """
    try:
        from physics.laplace_demon import summon_demon
        
        result = summon_demon(
            user_type=user_type,
            age=age,
            location_factor=location_factor,
            growth_rate=growth_rate,
            core_12=core_12,
            extended_144=extended_144,
            decisions=decisions or [{"M": 100, "T": 40, "t": 12}],
            uncertainty=uncertainty
        )
        
        return {
            "success": True,
            "message": "😈 라플라스 악마가 미래를 예측했습니다",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"라플라스 악마 소환 실패: {e}")
        raise HTTPException(500, str(e))


@router.post("/transformer/train")
async def train_transformer(
    model_type: str = "patchtst",
    training_data: List[Dict[str, Any]] = None,
    epochs: int = 100
):
    """
    🤖 Transformer 모델 학습
    
    model_type: "vanilla" 또는 "patchtst" (SOTA)
    """
    try:
        from physics.transformer_predictor import get_transformer_predictor
        
        predictor = get_transformer_predictor(model_type)
        
        if not training_data:
            return {
                "success": False,
                "error": "training_data 필요 (형식: [{seq: [[M,T,s,nd],...], target: [[M,T,s,nd],...]}])"
            }
        
        X = [d["seq"] for d in training_data]
        y = [d["target"] for d in training_data]
        
        result = predictor.fit(X, y, epochs=epochs)
        
        return {
            "success": True,
            "message": f"🤖 {model_type.upper()} 모델 학습 완료",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Transformer 학습 실패: {e}")
        raise HTTPException(500, str(e))


@router.post("/transformer/predict")
async def transformer_predict(
    model_type: str = "patchtst",
    recent_sequence: List[List[float]] = None
):
    """
    🤖 Transformer 기반 미래 V 예측
    
    recent_sequence: 최근 시퀀스 [[M, T, s, network_density], ...]
    """
    try:
        from physics.transformer_predictor import get_transformer_predictor
        
        predictor = get_transformer_predictor(model_type)
        
        if not predictor.trained:
            return {
                "success": False,
                "error": "모델 학습 필요 (/v/transformer/train 먼저 호출)"
            }
        
        if not recent_sequence:
            return {
                "success": False,
                "error": "recent_sequence 필요 (형식: [[M,T,s,nd], ...])"
            }
        
        result = predictor.predict(recent_sequence)
        
        return {
            "success": True,
            "message": f"🤖 {model_type.upper()} 예측 완료",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Transformer 예측 실패: {e}")
        raise HTTPException(500, str(e))


@router.get("/formula")
async def get_formula():
    """
    V 공식 레퍼런스
    """
    return {
        "formula": "V = (M - T) × (1 + s)^t",
        "variables": {
            "V": "자산 (Value) - 최종 계산 결과",
            "M": "Mint - 생성된 가치",
            "T": "Tax - 소모된 비용",
            "s": "Synergy - 협업 계수 (0~1)",
            "t": "Time - 기간 (월 단위)"
        },
        "adjustments": {
            "type_factor": {
                "ambitious": 1.2,
                "cautious": 0.8,
                "balanced": 1.0,
                "aggressive": 1.4,
                "conservative": 0.6
            },
            "constant_adj": "(1 - age/100) × location_factor",
            "network_boost": "s += growth_rate × network_density"
        },
        "models": {
            "laplace_demon": "결정론적 예측 (모든 초기 조건 반영)",
            "lstm": "시계열 패턴 학습",
            "transformer": "Vanilla Transformer Encoder",
            "patchtst": "Patch Time Series Transformer (SOTA)"
        },
        "examples": [
            {
                "input": {"M": 100, "T": 40, "s": 0.3, "t": 12},
                "calculation": "(100-40) × (1.3)^12 ≈ 1,320",
                "note": "타입/상수 조정 전 값"
            }
        ]
    }


@router.get("/optimal-s")
async def get_optimal_s(
    M: float,
    T: float,
    t: int,
    target_V: float,
    user_type: str = "balanced",
    age: int = 30
):
    """
    목표 V 달성을 위한 최적 Synergy 계산
    """
    try:
        from physics.v_engine import (
            get_v_engine, VInput, UserConstants, NetworkState, UserType
        )
        
        engine = get_v_engine()
        
        user_type_enum = UserType(user_type) if user_type in [t.value for t in UserType] else UserType.BALANCED
        
        input_data = VInput(
            M=M,
            T=T,
            s=0,  # 계산됨
            t=t,
            user_type=user_type_enum,
            constants=UserConstants(age=age),
            network=NetworkState()
        )
        
        optimal_s = engine.predict_optimal_s(input_data, target_V)
        
        if optimal_s is None:
            return {
                "success": False,
                "message": "계산 불가 (M-T가 0 이하이거나 목표가 너무 높음)"
            }
        
        return {
            "success": True,
            "target_V": target_V,
            "required_s": round(optimal_s, 4),
            "interpretation": f"목표 V {target_V} 달성을 위해 Synergy {optimal_s:.2%} 필요"
        }
        
    except Exception as e:
        logger.error(f"최적 S 계산 오류: {e}")
        raise HTTPException(500, str(e))
