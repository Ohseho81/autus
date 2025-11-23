"""
AUTUS Intelligent AI Selector
항상 최고의 AI를 자동으로 선택
"""

import asyncio
import logging
from typing import List
from enum import Enum

from .base import BaseAIConnector, AIRequest, AIResponse
from .anthropic_connector import AnthropicConnector
from .openai_connector import OpenAIConnector

logger = logging.getLogger(__name__)

class SelectionStrategy(Enum):
    """선택 전략"""
    PARALLEL_RACE = "parallel_race"
    PRIORITY_CASCADE = "priority_cascade"
    SMART_SELECT = "smart_select"

class IntelligentSelector:
    """지능적 AI 선택 엔진"""
    
    def __init__(self):
        self.connectors: List[BaseAIConnector] = []
        self._initialize_connectors()
    
    def _initialize_connectors(self):
        """사용 가능한 모든 connector 초기화"""
        
        # Claude (Commented out - credit issue)
        # try:
        #     claude = AnthropicConnector(priority=1)
        #     self.connectors.append(claude)
        #     logger.info("✅ Claude initialized")
        # except Exception as e:
        #     logger.warning(f"⚠️ Claude not available: {e}")
        
        # GPT-4
        try:
            gpt = OpenAIConnector(priority=2)
            self.connectors.append(gpt)
            logger.info("✅ GPT-4 initialized")
        except Exception as e:
            logger.warning(f"⚠️ GPT-4 not available: {e}")
        
        if not self.connectors:
            raise RuntimeError("❌ No AI connectors available!")
        
        logger.info(f"🚀 Initialized {len(self.connectors)} connectors")
    
    async def generate(
        self,
        prompt: str,
        strategy: SelectionStrategy = SelectionStrategy.PARALLEL_RACE,
        **kwargs
    ) -> AIResponse:
        """최적 AI 선택하여 생성"""
        
        request = AIRequest(
            prompt=prompt,
            max_tokens=kwargs.get('max_tokens', 8000),
            temperature=kwargs.get('temperature', 0.3),
            system_prompt=kwargs.get('system_prompt')
        )
        
        if strategy == SelectionStrategy.PARALLEL_RACE:
            return await self._parallel_race(request)
        elif strategy == SelectionStrategy.PRIORITY_CASCADE:
            return await self._priority_cascade(request)
        else:
            return await self._smart_select(request)
    
    async def _parallel_race(self, request: AIRequest) -> AIResponse:
        """🏁 병렬 Race: 모두 동시 실행"""
        
        logger.info("🏁 Starting parallel race...")
        
        # Task로 명시적으로 생성
        tasks = [
            asyncio.create_task(connector.generate_with_tracking(request))
            for connector in self.connectors
        ]
        
        pending = set(tasks)
        results = []
        
        while pending:
            done, pending = await asyncio.wait(
                pending,
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in done:
                try:
                    response = await task
                    
                    if response.quality_score >= 0.7:
                        logger.info(
                            f"✅ Winner: {response.provider} "
                            f"({response.time_seconds:.2f}s, quality={response.quality_score:.2f})"
                        )
                        
                        for p in pending:
                            p.cancel()
                        
                        return response
                    else:
                        logger.warning(f"⚠️ {response.provider} low quality")
                        results.append(response)
                        
                except Exception as e:
                    logger.error(f"❌ Task failed: {e}")
        
        if results:
            best = max(results, key=lambda r: r.quality_score)
            logger.warning(f"⚠️ Using best of failed: {best.provider}")
            return best
        
        raise RuntimeError("All providers failed")
    
    async def _priority_cascade(self, request: AIRequest) -> AIResponse:
        """🎯 Priority Cascade"""
        
        logger.info("🎯 Starting priority cascade...")
        
        sorted_connectors = sorted(
            self.connectors,
            key=lambda c: c.priority
        )
        
        for connector in sorted_connectors:
            try:
                logger.info(f"🔄 Trying {connector.provider.value}...")
                
                response = await connector.generate_with_tracking(request)
                
                if response.quality_score >= 0.7:
                    logger.info(f"✅ Success: {connector.provider.value}")
                    return response
                    
            except Exception as e:
                logger.error(f"❌ {connector.provider.value} failed: {e}")
                continue
        
        raise RuntimeError("All providers failed")
    
    async def _smart_select(self, request: AIRequest) -> AIResponse:
        """🧠 Smart Select"""
        
        logger.info("🧠 Smart selecting...")
        
        prompt_lower = request.prompt.lower()
        
        if any(kw in prompt_lower for kw in ["quick", "fast", "simple"]):
            logger.info("⚡ Speed priority")
            return await self._priority_cascade(request)
        else:
            logger.info("🎯 Quality priority")
            return await self._parallel_race(request)
    
    def get_status(self) -> dict:
        """현재 상태"""
        return {
            'total_connectors': len(self.connectors),
            'connectors': [
                {
                    'provider': c.provider.value,
                    'priority': c.priority,
                    'success_rate': c.get_success_rate(),
                    'health_score': c.get_health_score(),
                    'total_requests': c.total_requests
                }
                for c in self.connectors
            ]
        }
