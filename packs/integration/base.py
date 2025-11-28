"""
AUTUS Multi-AI Connector Base
모든 AI 제공자의 기본 인터페이스
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum
import time

class AIProvider(Enum):
    """AI 제공자"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    LOCAL = "local"

@dataclass
class AIResponse:
    """AI 응답 표준 포맷"""
    provider: str
    model: str
    content: str
    time_seconds: float
    tokens_used: int
    cost_usd: float
    quality_score: float
    metadata: Dict[str, Any]

@dataclass
class AIRequest:
    """AI 요청 표준 포맷"""
    prompt: str
    max_tokens: int = 8000
    temperature: float = 0.3
    system_prompt: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class BaseAIConnector(ABC):
    """모든 AI Connector의 기본 클래스"""
    
    def __init__(
        self,
        provider: AIProvider,
        model: str,
        api_key: Optional[str] = None,
        priority: int = 1,
        cost_per_1k_tokens: float = 0.0
    ):
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.priority = priority
        self.cost_per_1k_tokens = cost_per_1k_tokens
        
        self.total_requests = 0
        self.total_successes = 0
        self.total_failures = 0
        self.avg_response_time = 0.0
        self.avg_quality_score = 0.0
    
    @abstractmethod
    async def generate(self, request: AIRequest) -> AIResponse:
        """AI 생성 요청 (각 제공자가 구현)"""
        pass
    
    async def generate_with_tracking(self, request: AIRequest) -> AIResponse:
        """트래킹과 함께 생성"""
        try:
            response = await self.generate(request)
            
            self.total_requests += 1
            self.total_successes += 1
            
            self.avg_response_time = (
                (self.avg_response_time * (self.total_successes - 1) + response.time_seconds)
                / self.total_successes
            )
            
            self.avg_quality_score = (
                (self.avg_quality_score * (self.total_successes - 1) + response.quality_score)
                / self.total_successes
            )
            
            return response
            
        except Exception as e:
            self.total_requests += 1
            self.total_failures += 1
            raise
    
    def get_success_rate(self) -> float:
        """성공률"""
        if self.total_requests == 0:
            return 1.0
        return self.total_successes / self.total_requests
    
    def get_health_score(self) -> float:
        """종합 건강 점수 (0-1)"""
        success_rate = self.get_success_rate()
        time_score = max(0, 1 - (self.avg_response_time / 5.0))
        quality_score = self.avg_quality_score
        
        health = (
            success_rate * 0.5 +
            time_score * 0.3 +
            quality_score * 0.2
        )
        
        return health
    
    def __repr__(self):
        return (
            f"{self.provider.value}({self.model}) "
            f"[Priority: {self.priority}, "
            f"Success: {self.get_success_rate():.1%}, "
            f"Health: {self.get_health_score():.2f}]"
        )
