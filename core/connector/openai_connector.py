"""
OpenAI GPT Connector
"""

import os
import asyncio
from typing import Optional
import openai

from .base import (
    BaseAIConnector,
    AIProvider,
    AIRequest,
    AIResponse
)

class OpenAIConnector(BaseAIConnector):
    """OpenAI GPT 연결"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4-turbo",
        priority: int = 2
    ):
        super().__init__(
            provider=AIProvider.OPENAI,
            model=model,
            api_key=api_key or os.getenv("OPENAI_API_KEY"),
            priority=priority,
            cost_per_1k_tokens=0.01
        )
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found")
        
        self.client = openai.AsyncOpenAI(api_key=self.api_key)
    
    async def generate(self, request: AIRequest) -> AIResponse:
        """GPT에게 생성 요청"""
        import time
        start = time.time()
        
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})
        
        # ✅ 수정: GPT-4 Turbo는 max 4096 tokens
        max_tokens = min(request.max_tokens, 4096)
        
        try:
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=request.temperature
                ),
                timeout=30.0
            )
            
            elapsed = time.time() - start
            content = response.choices[0].message.content
            tokens = response.usage.total_tokens if response.usage else len(content.split()) * 1.3
            cost = (tokens / 1000) * self.cost_per_1k_tokens
            quality = self._assess_quality(content, request)
            
            return AIResponse(
                provider=self.provider.value,
                model=self.model,
                content=content,
                time_seconds=elapsed,
                tokens_used=int(tokens),
                cost_usd=cost,
                quality_score=quality,
                metadata={
                    "finish_reason": response.choices[0].finish_reason,
                    "usage": response.usage.model_dump() if response.usage else {}
                }
            )
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"{self.provider.value} timed out")
        except Exception as e:
            raise RuntimeError(f"{self.provider.value} error: {e}")
    
    def _assess_quality(self, content: str, request: AIRequest) -> float:
        """응답 품질 평가"""
        score = 1.0
        
        if len(content) < 50:
            score -= 0.3
        
        error_phrases = ["i apologize", "i cannot", "i'm unable", "error"]
        if any(phrase in content.lower() for phrase in error_phrases):
            score -= 0.2
        
        if any(kw in request.prompt.lower() for kw in ["code", "function", "class"]):
            if "```" in content or "def " in content:
                score += 0.1
            else:
                score -= 0.2
        
        return max(0.0, min(1.0, score))
