"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS LLM API Router
DeepSeek-R1 + GRPO Endpoints
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from .deepseek_r1 import (
    DeepSeekR1Client,
    ReasoningMode,
    reason_for_decision,
    analyze_breaking_changes,
    quick_reason,
)
from .grpo import (
    get_self_evolution,
    GRPOSample,
    GRPOBatch,
)

router = APIRouter(prefix="/api/llm", tags=["LLM"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class ReasonRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
    mode: str = Field(default="standard", description="fast | standard | deep | verify")
    system_prompt: Optional[str] = None
    max_tokens: int = Field(default=4096, le=16384)


class ReasonResponse(BaseModel):
    answer: str
    reasoning_chain: List[str]
    confidence: float
    tokens_used: int
    latency_ms: float
    model: str


class DecisionReasonRequest(BaseModel):
    event_type: str
    k_level: int
    omega: float
    actor: str
    question: str


class BreakingChangeRequest(BaseModel):
    release_notes: str
    current_version: str


class EvolutionFeedbackRequest(BaseModel):
    decisions: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════════════════════════
# Reasoning Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/reason", response_model=ReasonResponse)
async def reason_endpoint(request: ReasonRequest):
    """
    DeepSeek-R1 추론 실행
    
    Modes:
    - fast: 빠른 응답 (짧은 CoT)
    - standard: 표준 추론
    - deep: 깊은 추론 (긴 CoT)
    - verify: 검증 가능한 추론 (RLVR)
    """
    try:
        mode = ReasoningMode(request.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {request.mode}")
    
    async with DeepSeekR1Client() as client:
        result = await client.reason(
            prompt=request.prompt,
            mode=mode,
            system_prompt=request.system_prompt,
            max_tokens=request.max_tokens,
        )
        
        return ReasonResponse(
            answer=result.answer,
            reasoning_chain=result.reasoning_chain,
            confidence=result.confidence,
            tokens_used=result.tokens_used,
            latency_ms=result.latency_ms,
            model=result.model,
        )


@router.post("/reason/quick")
async def quick_reason_endpoint(prompt: str, mode: str = "standard"):
    """빠른 추론 (간단한 응답)"""
    answer = await quick_reason(prompt, mode)
    return {"success": True, "answer": answer}


@router.post("/reason/decision")
async def reason_for_decision_endpoint(request: DecisionReasonRequest):
    """AUTUS 의사결정 추론"""
    result = await reason_for_decision(
        decision_context={
            "event_type": request.event_type,
            "k_level": request.k_level,
            "omega": request.omega,
            "actor": request.actor,
        },
        question=request.question,
    )
    
    return {
        "success": True,
        "answer": result.answer,
        "reasoning": result.reasoning_chain,
        "confidence": result.confidence,
    }


@router.post("/reason/breaking-changes")
async def analyze_breaking_changes_endpoint(request: BreakingChangeRequest):
    """기술 업데이트 Breaking Change 분석"""
    result = await analyze_breaking_changes(
        release_notes=request.release_notes,
        current_version=request.current_version,
    )
    
    return {
        "success": True,
        "analysis": result.answer,
        "reasoning": result.reasoning_chain,
        "confidence": result.confidence,
    }


@router.post("/reason/multi-sample")
async def multi_sample_reasoning(
    prompt: str,
    n_samples: int = 4,
):
    """GRPO 스타일 다중 샘플링 (Best-of-N)"""
    async with DeepSeekR1Client() as client:
        results = await client.reason_multi_sample(
            prompt=prompt,
            n_samples=n_samples,
            select_best=True,
        )
        
        return {
            "success": True,
            "best_answer": results[0].answer,
            "best_confidence": results[0].confidence,
            "all_samples": [
                {
                    "answer": r.answer,
                    "confidence": r.confidence,
                }
                for r in results
            ],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# GRPO / Self-Evolution Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/evolution/feedback")
async def submit_evolution_feedback(request: EvolutionFeedbackRequest):
    """
    의사결정 피드백 제출 (M19 Self-Evolution)
    
    피드백 배치를 GRPO로 처리하여 계수 조정 제안
    """
    evolution = get_self_evolution()
    result = evolution.evolution_step(request.decisions)
    
    return {
        "success": True,
        "evolution_result": result,
    }


@router.get("/evolution/summary")
async def get_evolution_summary():
    """Self-Evolution 요약"""
    evolution = get_self_evolution()
    return {
        "success": True,
        "summary": evolution.get_evolution_summary(),
    }


@router.get("/evolution/stats")
async def get_grpo_stats():
    """GRPO 통계"""
    evolution = get_self_evolution()
    return {
        "success": True,
        "grpo_stats": evolution.optimizer.get_stats(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Health & Info
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def llm_health():
    """LLM 연결 상태"""
    import os
    
    return {
        "success": True,
        "deepseek_configured": bool(os.environ.get("DEEPSEEK_API_KEY")),
        "openai_configured": bool(os.environ.get("OPENAI_API_KEY")),
        "grok_configured": bool(os.environ.get("GROK_API_KEY")),
    }


@router.get("/info")
async def llm_info():
    """LLM 정보"""
    return {
        "success": True,
        "primary_model": "DeepSeek-R1 (deepseek-reasoner)",
        "fallbacks": ["GPT-4 Turbo", "Grok-2"],
        "features": [
            "GRPO (Group Relative Policy Optimization)",
            "RLVR (Reinforcement Learning with Verifiable Rewards)",
            "Multi-Stage Iterative Training",
            "Outcome-Only Rewards",
        ],
        "optimization_techniques": {
            "grpo": "PPO variant without critic model, uses group baseline",
            "rlvr": "Verifiable rewards for math/code/STEM tasks",
            "multi_sample": "Best-of-N selection for improved quality",
        },
    }
