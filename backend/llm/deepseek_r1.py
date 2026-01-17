"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS DeepSeek-R1 Integration
Reasoning-First LLM with GRPO + RLVR Optimization
═══════════════════════════════════════════════════════════════════════════════

DeepSeek-R1 주요 최적화 기법 (2025-2026):
1. GRPO (Group Relative Policy Optimization)
2. Multi-Stage Iterative Training Loop
3. Outcome-Only + Format/Consistency Rewards
4. RLVR (Reinforcement Learning with Verifiable Rewards)
5. MoE (37B active / 671B total) Architecture
"""

import os
import json
import httpx
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timezone
import logging
import re

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-reasoner")  # R1 모델

# Fallback 설정
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
GROK_API_KEY = os.environ.get("GROK_API_KEY", "")  # xAI Grok

# 타임아웃 및 재시도
REQUEST_TIMEOUT = 60.0
MAX_RETRIES = 3


class ReasoningMode(str, Enum):
    """추론 모드"""
    FAST = "fast"           # 빠른 응답 (짧은 CoT)
    STANDARD = "standard"   # 표준 추론
    DEEP = "deep"           # 깊은 추론 (긴 CoT)
    VERIFY = "verify"       # 검증 가능한 추론 (RLVR)


# ═══════════════════════════════════════════════════════════════════════════════
# GRPO Configuration (Group Relative Policy Optimization)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GRPOConfig:
    """GRPO 설정"""
    group_size: int = 16           # 그룹 내 샘플 수
    kl_penalty: float = 0.01       # KL 발산 페널티
    clip_range: float = 0.2        # PPO-style clipping
    temperature: float = 0.7       # 샘플링 온도
    top_p: float = 0.95            # Nucleus sampling
    
    # Reward weights
    outcome_weight: float = 1.0    # 정답 정확도
    format_weight: float = 0.1     # 형식 보상
    consistency_weight: float = 0.05  # 언어 일관성


@dataclass
class ReasoningOutput:
    """추론 결과"""
    answer: str
    reasoning_chain: List[str]      # Chain-of-Thought 단계들
    confidence: float               # 신뢰도 (0-1)
    tokens_used: int
    latency_ms: float
    model: str
    
    # RLVR 관련
    is_verifiable: bool = False
    verification_result: Optional[bool] = None
    
    # 메타데이터
    metadata: Dict[str, Any] = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
# DeepSeek-R1 Client
# ═══════════════════════════════════════════════════════════════════════════════

class DeepSeekR1Client:
    """DeepSeek-R1 API 클라이언트"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or DEEPSEEK_API_KEY
        self.base_url = DEEPSEEK_BASE_URL
        self.grpo_config = GRPOConfig()
        
        self._client: Optional[httpx.AsyncClient] = None
        self._stats = {
            "total_calls": 0,
            "successful_calls": 0,
            "fallback_calls": 0,
            "total_tokens": 0,
        }
    
    async def __aenter__(self):
        self._client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        return self
    
    async def __aexit__(self, *args):
        if self._client:
            await self._client.aclose()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Core Reasoning Methods
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def reason(
        self,
        prompt: str,
        mode: ReasoningMode = ReasoningMode.STANDARD,
        system_prompt: Optional[str] = None,
        context: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 4096,
        verify_fn: Optional[callable] = None,  # RLVR 검증 함수
    ) -> ReasoningOutput:
        """
        DeepSeek-R1 추론 실행
        
        Args:
            prompt: 사용자 프롬프트
            mode: 추론 모드
            system_prompt: 시스템 프롬프트
            context: 대화 컨텍스트
            max_tokens: 최대 토큰
            verify_fn: RLVR 검증 함수 (결과 검증용)
        """
        self._stats["total_calls"] += 1
        start_time = datetime.now(timezone.utc)
        
        # 시스템 프롬프트 구성
        system = self._build_system_prompt(mode, system_prompt)
        
        # 메시지 구성
        messages = self._build_messages(system, prompt, context, mode)
        
        # API 호출 시도
        try:
            result = await self._call_deepseek(messages, max_tokens, mode)
            self._stats["successful_calls"] += 1
        except Exception as e:
            logger.warning(f"[DeepSeek-R1] Primary call failed: {e}, trying fallback...")
            result = await self._fallback_call(messages, max_tokens)
            self._stats["fallback_calls"] += 1
        
        # 응답 파싱
        reasoning_chain, answer = self._parse_reasoning(result["content"])
        
        # Latency 계산
        latency = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        
        # RLVR 검증 (제공된 경우)
        is_verifiable = verify_fn is not None
        verification_result = None
        if is_verifiable:
            try:
                verification_result = verify_fn(answer)
            except:
                verification_result = None
        
        output = ReasoningOutput(
            answer=answer,
            reasoning_chain=reasoning_chain,
            confidence=self._estimate_confidence(reasoning_chain, verification_result),
            tokens_used=result.get("tokens", 0),
            latency_ms=latency,
            model=result.get("model", DEEPSEEK_MODEL),
            is_verifiable=is_verifiable,
            verification_result=verification_result,
            metadata={
                "mode": mode.value,
                "grpo_config": {
                    "temperature": self.grpo_config.temperature,
                    "top_p": self.grpo_config.top_p,
                },
            },
        )
        
        self._stats["total_tokens"] += output.tokens_used
        return output
    
    async def reason_with_verification(
        self,
        prompt: str,
        expected_format: Optional[str] = None,
        validation_rules: Optional[List[callable]] = None,
    ) -> ReasoningOutput:
        """
        RLVR 스타일 검증 가능한 추론
        
        Math, Code, STEM 등 정답 검증이 가능한 태스크용
        """
        def verify(answer: str) -> bool:
            if validation_rules:
                return all(rule(answer) for rule in validation_rules)
            return True
        
        return await self.reason(
            prompt=prompt,
            mode=ReasoningMode.VERIFY,
            verify_fn=verify,
        )
    
    async def reason_multi_sample(
        self,
        prompt: str,
        n_samples: int = None,
        select_best: bool = True,
    ) -> List[ReasoningOutput]:
        """
        GRPO 스타일 다중 샘플링
        
        여러 출력 생성 후 best-of-n 선택 (group baseline)
        """
        n = n_samples or self.grpo_config.group_size
        
        # 병렬로 n개 샘플 생성
        tasks = [
            self.reason(prompt, mode=ReasoningMode.STANDARD)
            for _ in range(n)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 유효한 결과만 필터
        valid_results = [r for r in results if isinstance(r, ReasoningOutput)]
        
        if not valid_results:
            raise RuntimeError("All samples failed")
        
        # Best-of-n 선택 (confidence 기준)
        if select_best:
            valid_results.sort(key=lambda x: x.confidence, reverse=True)
        
        return valid_results
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Internal Methods
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _build_system_prompt(self, mode: ReasoningMode, custom: Optional[str]) -> str:
        """시스템 프롬프트 구성"""
        base = custom or "You are a helpful AI assistant with strong reasoning capabilities."
        
        mode_instructions = {
            ReasoningMode.FAST: "\nProvide concise, direct answers with brief reasoning.",
            ReasoningMode.STANDARD: "\nThink step by step. Show your reasoning before the final answer.",
            ReasoningMode.DEEP: "\nAnalyze thoroughly. Consider multiple perspectives. Show detailed reasoning with self-reflection.",
            ReasoningMode.VERIFY: "\nSolve step by step. Verify your answer. If unsure, indicate uncertainty.",
        }
        
        return base + mode_instructions.get(mode, "")
    
    def _build_messages(
        self,
        system: str,
        prompt: str,
        context: Optional[List[Dict]],
        mode: ReasoningMode,
    ) -> List[Dict[str, str]]:
        """메시지 리스트 구성"""
        messages = [{"role": "system", "content": system}]
        
        if context:
            messages.extend(context)
        
        # CoT 유도 프롬프트 추가
        cot_suffix = ""
        if mode in (ReasoningMode.STANDARD, ReasoningMode.DEEP, ReasoningMode.VERIFY):
            cot_suffix = "\n\nLet's think step by step:"
        
        messages.append({"role": "user", "content": prompt + cot_suffix})
        
        return messages
    
    async def _call_deepseek(
        self,
        messages: List[Dict],
        max_tokens: int,
        mode: ReasoningMode,
    ) -> Dict[str, Any]:
        """DeepSeek API 호출"""
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        # 모드별 파라미터 조정
        temperature = self.grpo_config.temperature
        if mode == ReasoningMode.FAST:
            temperature = 0.3
        elif mode == ReasoningMode.DEEP:
            temperature = 0.8
        
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": self.grpo_config.top_p,
        }
        
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            for attempt in range(MAX_RETRIES):
                try:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    return {
                        "content": data["choices"][0]["message"]["content"],
                        "tokens": data.get("usage", {}).get("total_tokens", 0),
                        "model": data.get("model", DEEPSEEK_MODEL),
                    }
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:  # Rate limit
                        await asyncio.sleep(2 ** attempt)
                    else:
                        raise
                except Exception as e:
                    if attempt == MAX_RETRIES - 1:
                        raise
                    await asyncio.sleep(1)
        
        raise RuntimeError("Max retries exceeded")
    
    async def _fallback_call(
        self,
        messages: List[Dict],
        max_tokens: int,
    ) -> Dict[str, Any]:
        """Fallback: OpenAI 또는 Grok"""
        # OpenAI 시도
        if OPENAI_API_KEY:
            try:
                return await self._call_openai(messages, max_tokens)
            except:
                pass
        
        # Grok 시도
        if GROK_API_KEY:
            try:
                return await self._call_grok(messages, max_tokens)
            except:
                pass
        
        raise RuntimeError("All LLM providers failed")
    
    async def _call_openai(self, messages: List[Dict], max_tokens: int) -> Dict:
        """OpenAI API 호출"""
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "gpt-4-turbo-preview",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }
        
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["choices"][0]["message"]["content"],
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "model": "gpt-4-turbo (fallback)",
            }
    
    async def _call_grok(self, messages: List[Dict], max_tokens: int) -> Dict:
        """xAI Grok API 호출"""
        headers = {
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "grok-2",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }
        
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                "https://api.x.ai/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "content": data["choices"][0]["message"]["content"],
                "tokens": data.get("usage", {}).get("total_tokens", 0),
                "model": "grok-2 (fallback)",
            }
    
    def _parse_reasoning(self, content: str) -> Tuple[List[str], str]:
        """추론 체인과 최종 답변 분리"""
        # Step 패턴 탐지
        step_patterns = [
            r"Step \d+[:\.]",
            r"\d+\.",
            r"First,|Second,|Third,|Finally,",
            r"- ",
        ]
        
        lines = content.strip().split("\n")
        reasoning_chain = []
        answer_lines = []
        
        in_answer = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 최종 답변 시작 감지
            if any(marker in line.lower() for marker in ["answer:", "conclusion:", "therefore,", "thus,", "final answer:"]):
                in_answer = True
            
            if in_answer:
                answer_lines.append(line)
            else:
                reasoning_chain.append(line)
        
        # 답변이 명시적으로 분리되지 않은 경우
        if not answer_lines and reasoning_chain:
            answer_lines = [reasoning_chain.pop()]
        
        answer = " ".join(answer_lines).replace("Answer:", "").replace("Final Answer:", "").strip()
        
        return reasoning_chain, answer
    
    def _estimate_confidence(
        self,
        reasoning_chain: List[str],
        verification_result: Optional[bool],
    ) -> float:
        """신뢰도 추정"""
        confidence = 0.5
        
        # 추론 단계 수에 따른 보정
        if len(reasoning_chain) >= 3:
            confidence += 0.1
        if len(reasoning_chain) >= 5:
            confidence += 0.1
        
        # 검증 결과 반영
        if verification_result is True:
            confidence += 0.2
        elif verification_result is False:
            confidence -= 0.2
        
        # Hedging 언어 감지
        hedging_words = ["maybe", "perhaps", "possibly", "uncertain", "not sure", "아마", "아마도"]
        full_text = " ".join(reasoning_chain).lower()
        if any(word in full_text for word in hedging_words):
            confidence -= 0.1
        
        return max(0.0, min(1.0, confidence))
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return self._stats.copy()


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS-Specific Reasoning Functions
# ═══════════════════════════════════════════════════════════════════════════════

async def reason_for_decision(
    decision_context: Dict[str, Any],
    question: str,
) -> ReasoningOutput:
    """AUTUS 의사결정 추론"""
    async with DeepSeekR1Client() as client:
        system = """You are an AI assistant helping with business decisions in AUTUS system.
Consider the K-level (1-10), event type, and potential impacts.
Provide clear reasoning and a recommendation."""
        
        prompt = f"""Decision Context:
- Event Type: {decision_context.get('event_type', 'TASK')}
- K Level: {decision_context.get('k_level', 1)}
- Omega (Ω): {decision_context.get('omega', 0)}
- Actor: {decision_context.get('actor', 'Unknown')}

Question: {question}"""
        
        return await client.reason(
            prompt=prompt,
            system_prompt=system,
            mode=ReasoningMode.STANDARD,
        )


async def analyze_breaking_changes(
    release_notes: str,
    current_version: str,
) -> ReasoningOutput:
    """기술 업데이트 Breaking Change 분석 (M13용)"""
    async with DeepSeekR1Client() as client:
        system = """You are a technical analyst specializing in software dependencies.
Analyze release notes for breaking changes and migration requirements.
Provide structured analysis with impact assessment."""
        
        prompt = f"""Current Version: {current_version}

Release Notes:
{release_notes}

Analyze:
1. Breaking changes (API, schema, behavior)
2. Migration requirements
3. Impact on AUTUS system (K coefficient impact)
4. Recommended action (SAFE_UPDATE, CAREFUL_UPDATE, SKIP, HUMAN_REVIEW)"""
        
        return await client.reason(
            prompt=prompt,
            system_prompt=system,
            mode=ReasoningMode.VERIFY,
        )


async def generate_event_classification_reasoning(
    text: str,
    action: str,
    component: str,
) -> ReasoningOutput:
    """Event Type 분류 추론"""
    async with DeepSeekR1Client() as client:
        prompt = f"""Classify this business event into one of: TASK, PAYMENT, CONTRACT, REGULATORY, CONSTITUTION

Context:
- Text/Description: {text}
- Action: {action}
- Component: {component}

Event Type Definitions:
- TASK: General work items, checklists, routine operations
- PAYMENT: Financial transactions, invoices, settlements
- CONTRACT: Legal agreements, signatures, binding documents
- REGULATORY: Tax, compliance, government filings
- CONSTITUTION: Core principles, charter changes, fundamental rules

Classify and explain your reasoning."""
        
        return await client.reason(
            prompt=prompt,
            mode=ReasoningMode.FAST,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance & Helper
# ═══════════════════════════════════════════════════════════════════════════════

_default_client: Optional[DeepSeekR1Client] = None


def get_deepseek_client() -> DeepSeekR1Client:
    """기본 클라이언트 싱글톤"""
    global _default_client
    if _default_client is None:
        _default_client = DeepSeekR1Client()
    return _default_client


async def quick_reason(prompt: str, mode: str = "standard") -> str:
    """빠른 추론 헬퍼"""
    mode_enum = ReasoningMode(mode)
    async with DeepSeekR1Client() as client:
        result = await client.reason(prompt, mode=mode_enum)
        return result.answer
