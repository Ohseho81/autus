"""
Anthropic Claude Connector
"""

import os
import asyncio
from typing import Optional
import anthropic

from .base import (
    BaseAIConnector,
    AIProvider,
    AIRequest,
    AIResponse
)

class AnthropicConnector(BaseAIConnector):
    """Anthropic Claude 연결"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514",
        priority: int = 1
    ):
        super().__init__(
            provider=AIProvider.ANTHROPIC,
            model=model,
            api_key=api_key or os.getenv("ANTHROPIC_API_KEY"),
            priority=priority,
            cost_per_1k_tokens=0.003
        )
        
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found")
        
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
    
    async def generate(self, request: AIRequest) -> AIResponse:
        """Claude에게 생성 요청"""
        import time
        start = time.time()
        
        messages = [{"role": "user", "content": request.prompt}]
        
        kwargs = {
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "messages": messages
        }
        
        if request.system_prompt:
            kwargs["system"] = request.system_prompt
        
        try:
            response = await asyncio.wait_for(
                self.client.messages.create(**kwargs),
                timeout=30.0
            )
            
            elapsed = time.time() - start
            content = response.content[0].text
            tokens = len(content.split()) * 1.3
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
                    "stop_reason": response.stop_reason,
                    "usage": response.usage.model_dump() if hasattr(response, 'usage') else {}
                }
            )
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"{self.provider.value} timed out")
        except Exception as e:
            raise RuntimeError(f"{self.provider.value} error: {e}")
    
    def _assess_quality(self, content: str, request: AIRequest) -> float:
        """응답 품질 평가 (0-1)"""
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
