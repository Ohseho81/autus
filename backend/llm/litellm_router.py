"""
LiteLLM Router - 멀티 LLM 비용 최적화
======================================
복잡도에 따라 적절한 LLM 자동 선택

- Simple: DeepSeek R1 ($0.14/M tokens)
- Medium: Claude Haiku ($0.25/M tokens)  
- Complex: Claude Sonnet ($3/M tokens)
"""

import os
import logging
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# ============================================
# Configuration
# ============================================

class Complexity(str, Enum):
    SIMPLE = "simple"      # 단순 변환, 포맷팅
    MEDIUM = "medium"      # 요약, 분류, 추출
    COMPLEX = "complex"    # 추론, 분석, 생성

@dataclass
class LLMConfig:
    model: str
    cost_per_million: float
    max_tokens: int
    temperature: float = 0.7

# 모델 설정
LLM_CONFIGS: Dict[Complexity, LLMConfig] = {
    Complexity.SIMPLE: LLMConfig(
        model="deepseek/deepseek-r1",
        cost_per_million=0.14,
        max_tokens=4096,
        temperature=0.3
    ),
    Complexity.MEDIUM: LLMConfig(
        model="anthropic/claude-3-haiku-20240307",
        cost_per_million=0.25,
        max_tokens=4096,
        temperature=0.5
    ),
    Complexity.COMPLEX: LLMConfig(
        model="anthropic/claude-3-5-sonnet-20241022",
        cost_per_million=3.0,
        max_tokens=8192,
        temperature=0.7
    ),
}

# ============================================
# LiteLLM Router
# ============================================

class SmartLLMRouter:
    """
    스마트 LLM 라우터
    
    복잡도 자동 감지 + 비용 최적화
    """
    
    def __init__(self):
        self.api_keys = {
            "deepseek": os.getenv("DEEPSEEK_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "openai": os.getenv("OPENAI_API_KEY"),
            "google": os.getenv("GOOGLE_API_KEY"),
        }
        self._stats = {"simple": 0, "medium": 0, "complex": 0, "total_cost": 0.0}
    
    def detect_complexity(self, prompt: str, task_type: Optional[str] = None) -> Complexity:
        """
        프롬프트/태스크 유형으로 복잡도 자동 감지
        """
        prompt_lower = prompt.lower()
        
        # 태스크 유형 기반
        if task_type:
            simple_tasks = ["format", "convert", "translate", "extract"]
            medium_tasks = ["summarize", "classify", "categorize", "filter"]
            complex_tasks = ["analyze", "reason", "generate", "create", "plan"]
            
            if any(t in task_type.lower() for t in simple_tasks):
                return Complexity.SIMPLE
            if any(t in task_type.lower() for t in medium_tasks):
                return Complexity.MEDIUM
            if any(t in task_type.lower() for t in complex_tasks):
                return Complexity.COMPLEX
        
        # 프롬프트 길이 기반
        if len(prompt) < 200:
            return Complexity.SIMPLE
        elif len(prompt) < 1000:
            return Complexity.MEDIUM
        
        # 키워드 기반
        complex_keywords = ["분석", "추론", "왜", "어떻게", "전략", "계획", "비교"]
        if any(kw in prompt_lower for kw in complex_keywords):
            return Complexity.COMPLEX
        
        return Complexity.MEDIUM
    
    async def complete(
        self,
        prompt: str,
        complexity: Optional[Complexity] = None,
        task_type: Optional[str] = None,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        LLM 호출 (자동 라우팅)
        
        Args:
            prompt: 사용자 프롬프트
            complexity: 명시적 복잡도 (없으면 자동 감지)
            task_type: 태스크 유형 힌트
            system_prompt: 시스템 프롬프트
        
        Returns:
            {
                "content": str,
                "model": str,
                "complexity": str,
                "estimated_cost": float
            }
        """
        # 1. 복잡도 결정
        if complexity is None:
            complexity = self.detect_complexity(prompt, task_type)
        
        config = LLM_CONFIGS[complexity]
        
        # 2. LiteLLM 호출
        try:
            from litellm import acompletion
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await acompletion(
                model=config.model,
                messages=messages,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                **kwargs
            )
            
            content = response.choices[0].message.content
            
            # 비용 추정 (입력 + 출력 토큰)
            input_tokens = len(prompt) // 4
            output_tokens = len(content) // 4
            estimated_cost = (input_tokens + output_tokens) * config.cost_per_million / 1_000_000
            
            # 통계 업데이트
            self._stats[complexity.value] += 1
            self._stats["total_cost"] += estimated_cost
            
            return {
                "content": content,
                "model": config.model,
                "complexity": complexity.value,
                "estimated_cost": round(estimated_cost, 6),
                "tokens": {"input": input_tokens, "output": output_tokens}
            }
            
        except ImportError:
            logger.warning("litellm not installed, using fallback")
            return await self._fallback_complete(prompt, complexity, system_prompt)
        except Exception as e:
            logger.error(f"LLM error: {e}")
            # 폴백: 더 저렴한 모델로 재시도
            if complexity == Complexity.COMPLEX:
                return await self.complete(prompt, Complexity.MEDIUM, task_type, system_prompt)
            raise
    
    async def _fallback_complete(
        self,
        prompt: str,
        complexity: Complexity,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """LiteLLM 없을 때 폴백 (Google Gemini)"""
        import aiohttp
        
        api_key = self.api_keys.get("google") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("No API key available")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json={
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096}
            }) as resp:
                data = await resp.json()
                content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                return {
                    "content": content,
                    "model": "gemini-2.0-flash",
                    "complexity": complexity.value,
                    "estimated_cost": 0.0,
                    "tokens": {"input": 0, "output": 0}
                }
    
    def get_stats(self) -> Dict[str, Any]:
        """사용 통계"""
        return {
            **self._stats,
            "cost_saved": self._estimate_savings()
        }
    
    def _estimate_savings(self) -> float:
        """비용 절감 추정 (모두 Complex로 호출했다면)"""
        complex_cost = LLM_CONFIGS[Complexity.COMPLEX].cost_per_million
        
        simple_calls = self._stats["simple"]
        medium_calls = self._stats["medium"]
        
        # Simple/Medium 호출을 Complex로 했다면의 비용
        would_cost = (simple_calls + medium_calls) * 1000 * complex_cost / 1_000_000
        actual_cost = self._stats["total_cost"]
        
        return round(would_cost - actual_cost, 4)


# ============================================
# Singleton
# ============================================

_router: Optional[SmartLLMRouter] = None

def get_llm_router() -> SmartLLMRouter:
    """LLM 라우터 싱글톤"""
    global _router
    if _router is None:
        _router = SmartLLMRouter()
    return _router


# ============================================
# Convenience Functions
# ============================================

async def smart_complete(
    prompt: str,
    complexity: Optional[str] = None,
    task_type: Optional[str] = None,
    system_prompt: Optional[str] = None
) -> str:
    """간편 호출 함수"""
    router = get_llm_router()
    
    comp = None
    if complexity:
        comp = Complexity(complexity)
    
    result = await router.complete(prompt, comp, task_type, system_prompt)
    return result["content"]
