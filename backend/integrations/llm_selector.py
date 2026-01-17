"""
AUTUS LLM 선택기
================

DeepSeek-R1 + Llama 3.3 조합 최적화

역할 분담:
- DeepSeek-R1: 복잡 Reasoning (Safety Guard, ΔṠ 예측, Breaking Change 분석)
- Llama 3.3: 안정적 Instruction (Analyzer, Reporter, Updater)

특징:
- 태스크 유형별 자동 선택
- Fallback 지원 (OpenAI, Anthropic)
- Cost/Performance 균형
"""

import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, Literal
from enum import Enum

logger = logging.getLogger(__name__)


class TaskType(Enum):
    """태스크 유형"""
    REASONING = "reasoning"         # 복잡한 추론 (DeepSeek-R1)
    INSTRUCTION = "instruction"     # 지시 따르기 (Llama 3.3)
    CODING = "coding"               # 코드 생성 (DeepSeek-R1)
    ANALYSIS = "analysis"           # 분석 (DeepSeek-R1)
    SUMMARIZATION = "summarization" # 요약 (Llama 3.3)
    TRANSLATION = "translation"     # 번역 (Llama 3.3)
    GENERAL = "general"             # 일반 (기본)


class ModelProvider(Enum):
    """모델 제공자"""
    DEEPSEEK = "deepseek"
    LLAMA = "llama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"


@dataclass
class LLMConfig:
    """LLM 설정"""
    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-reasoner"  # R1-0528
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    
    # Llama (Together AI / Fireworks)
    llama_api_key: str = ""
    llama_model: str = "meta-llama/Llama-3.3-70B-Instruct"
    llama_base_url: str = "https://api.together.xyz/v1"
    
    # OpenAI (Fallback)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # Anthropic (Fallback)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    
    # 로컬 (Ollama)
    local_base_url: str = "http://localhost:11434/v1"
    local_model: str = "deepseek-r1:7b"
    
    # 기본 설정
    default_provider: ModelProvider = ModelProvider.LLAMA
    temperature: float = 0.7
    max_tokens: int = 4096
    
    def __post_init__(self):
        self.deepseek_api_key = self.deepseek_api_key or os.getenv("DEEPSEEK_API_KEY", "")
        self.llama_api_key = self.llama_api_key or os.getenv("TOGETHER_API_KEY", "")
        self.openai_api_key = self.openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self.anthropic_api_key = self.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")


# 태스크 → 모델 매핑
TASK_MODEL_MAPPING = {
    TaskType.REASONING: ModelProvider.DEEPSEEK,
    TaskType.INSTRUCTION: ModelProvider.LLAMA,
    TaskType.CODING: ModelProvider.DEEPSEEK,
    TaskType.ANALYSIS: ModelProvider.DEEPSEEK,
    TaskType.SUMMARIZATION: ModelProvider.LLAMA,
    TaskType.TRANSLATION: ModelProvider.LLAMA,
    TaskType.GENERAL: ModelProvider.LLAMA,
}


@dataclass
class LLMResponse:
    """LLM 응답"""
    content: str
    model: str
    provider: ModelProvider
    usage: dict = field(default_factory=dict)
    latency_ms: float = 0.0
    cost_estimate: float = 0.0


class LLMSelector:
    """LLM 선택기"""
    
    # 비용 추정 ($/1M tokens)
    COST_ESTIMATES = {
        ModelProvider.DEEPSEEK: {"input": 0.5, "output": 2.0},
        ModelProvider.LLAMA: {"input": 0.2, "output": 0.8},
        ModelProvider.OPENAI: {"input": 0.15, "output": 0.6},  # gpt-4o-mini
        ModelProvider.ANTHROPIC: {"input": 3.0, "output": 15.0},  # sonnet
        ModelProvider.LOCAL: {"input": 0.0, "output": 0.0},
    }
    
    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig()
        self._clients: dict[ModelProvider, Any] = {}
        self._available: set[ModelProvider] = set()
        
        self._init_clients()
    
    def _init_clients(self):
        """클라이언트 초기화"""
        # DeepSeek
        if self.config.deepseek_api_key:
            try:
                from openai import OpenAI
                self._clients[ModelProvider.DEEPSEEK] = OpenAI(
                    api_key=self.config.deepseek_api_key,
                    base_url=self.config.deepseek_base_url,
                )
                self._available.add(ModelProvider.DEEPSEEK)
                logger.info("DeepSeek-R1 클라이언트 초기화 완료")
            except Exception as e:
                logger.warning(f"DeepSeek 초기화 실패: {e}")
        
        # Llama (Together AI)
        if self.config.llama_api_key:
            try:
                from openai import OpenAI
                self._clients[ModelProvider.LLAMA] = OpenAI(
                    api_key=self.config.llama_api_key,
                    base_url=self.config.llama_base_url,
                )
                self._available.add(ModelProvider.LLAMA)
                logger.info("Llama 3.3 클라이언트 초기화 완료")
            except Exception as e:
                logger.warning(f"Llama 초기화 실패: {e}")
        
        # OpenAI (Fallback)
        if self.config.openai_api_key:
            try:
                from openai import OpenAI
                self._clients[ModelProvider.OPENAI] = OpenAI(
                    api_key=self.config.openai_api_key,
                )
                self._available.add(ModelProvider.OPENAI)
                logger.info("OpenAI 클라이언트 초기화 완료")
            except Exception as e:
                logger.warning(f"OpenAI 초기화 실패: {e}")
        
        # Anthropic (Fallback)
        if self.config.anthropic_api_key:
            try:
                import anthropic
                self._clients[ModelProvider.ANTHROPIC] = anthropic.Anthropic(
                    api_key=self.config.anthropic_api_key,
                )
                self._available.add(ModelProvider.ANTHROPIC)
                logger.info("Anthropic 클라이언트 초기화 완료")
            except Exception as e:
                logger.warning(f"Anthropic 초기화 실패: {e}")
        
        # Local (Ollama)
        try:
            from openai import OpenAI
            self._clients[ModelProvider.LOCAL] = OpenAI(
                api_key="ollama",  # 더미
                base_url=self.config.local_base_url,
            )
            # 연결 테스트는 생략 (항상 사용 가능으로 표시)
            logger.info("로컬 Ollama 클라이언트 초기화 완료")
        except Exception as e:
            logger.warning(f"로컬 초기화 실패: {e}")
        
        if not self._available:
            logger.warning("사용 가능한 LLM 제공자가 없습니다. Mock 모드로 동작합니다.")
    
    def select_model(self, task_type: TaskType) -> tuple[ModelProvider, str]:
        """태스크에 맞는 모델 선택"""
        preferred = TASK_MODEL_MAPPING.get(task_type, ModelProvider.LLAMA)
        
        # 선호 모델이 사용 가능하면 반환
        if preferred in self._available:
            model = self._get_model_name(preferred)
            return preferred, model
        
        # Fallback 순서: LLAMA → OPENAI → DEEPSEEK → ANTHROPIC → LOCAL
        fallback_order = [
            ModelProvider.LLAMA,
            ModelProvider.OPENAI,
            ModelProvider.DEEPSEEK,
            ModelProvider.ANTHROPIC,
            ModelProvider.LOCAL,
        ]
        
        for provider in fallback_order:
            if provider in self._available:
                model = self._get_model_name(provider)
                logger.info(f"Fallback 선택: {preferred.value} → {provider.value}")
                return provider, model
        
        # 아무것도 없으면 Mock
        return ModelProvider.LOCAL, "mock"
    
    def _get_model_name(self, provider: ModelProvider) -> str:
        """모델 이름 반환"""
        return {
            ModelProvider.DEEPSEEK: self.config.deepseek_model,
            ModelProvider.LLAMA: self.config.llama_model,
            ModelProvider.OPENAI: self.config.openai_model,
            ModelProvider.ANTHROPIC: self.config.anthropic_model,
            ModelProvider.LOCAL: self.config.local_model,
        }.get(provider, "unknown")
    
    def generate(
        self,
        prompt: str,
        task_type: TaskType = TaskType.GENERAL,
        system_prompt: str = "You are a helpful AI assistant.",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        provider_override: Optional[ModelProvider] = None,
    ) -> LLMResponse:
        """텍스트 생성"""
        start_time = datetime.now()
        
        # 모델 선택
        if provider_override and provider_override in self._available:
            provider = provider_override
            model = self._get_model_name(provider)
        else:
            provider, model = self.select_model(task_type)
        
        logger.info(f"LLM 생성: {provider.value}/{model} (태스크: {task_type.value})")
        
        # Mock 모드
        if provider not in self._clients or model == "mock":
            return self._mock_generate(prompt, task_type)
        
        # 실제 생성
        try:
            if provider == ModelProvider.ANTHROPIC:
                response = self._generate_anthropic(prompt, system_prompt, temperature, max_tokens)
            else:
                response = self._generate_openai_compatible(
                    provider, model, prompt, system_prompt, temperature, max_tokens
                )
            
            # 비용 추정
            latency = (datetime.now() - start_time).total_seconds() * 1000
            cost = self._estimate_cost(provider, response.usage)
            
            return LLMResponse(
                content=response.content,
                model=model,
                provider=provider,
                usage=response.usage,
                latency_ms=latency,
                cost_estimate=cost,
            )
            
        except Exception as e:
            logger.error(f"LLM 생성 실패: {e}")
            return self._mock_generate(prompt, task_type)
    
    def _generate_openai_compatible(
        self,
        provider: ModelProvider,
        model: str,
        prompt: str,
        system_prompt: str,
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> LLMResponse:
        """OpenAI 호환 API 생성"""
        client = self._clients[provider]
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature or self.config.temperature,
            max_tokens=max_tokens or self.config.max_tokens,
        )
        
        return LLMResponse(
            content=response.choices[0].message.content,
            model=model,
            provider=provider,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
        )
    
    def _generate_anthropic(
        self,
        prompt: str,
        system_prompt: str,
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> LLMResponse:
        """Anthropic API 생성"""
        client = self._clients[ModelProvider.ANTHROPIC]
        
        response = client.messages.create(
            model=self.config.anthropic_model,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature or self.config.temperature,
            max_tokens=max_tokens or self.config.max_tokens,
        )
        
        return LLMResponse(
            content=response.content[0].text,
            model=self.config.anthropic_model,
            provider=ModelProvider.ANTHROPIC,
            usage={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
            },
        )
    
    def _mock_generate(self, prompt: str, task_type: TaskType) -> LLMResponse:
        """Mock 생성"""
        mock_responses = {
            TaskType.REASONING: f"[Mock Reasoning] 분석 결과: {prompt[:50]}... → 결론: 안전합니다.",
            TaskType.INSTRUCTION: f"[Mock Instruction] 명령 실행 완료: {prompt[:30]}...",
            TaskType.CODING: f"[Mock Code]\n```python\n# {prompt[:30]}...\npass\n```",
            TaskType.ANALYSIS: f"[Mock Analysis] 분석 완료. 위험도: LOW",
            TaskType.SUMMARIZATION: f"[Mock Summary] 요약: {prompt[:50]}...",
            TaskType.TRANSLATION: f"[Mock Translation] 번역됨",
            TaskType.GENERAL: f"[Mock Response] {prompt[:50]}...",
        }
        
        return LLMResponse(
            content=mock_responses.get(task_type, "[Mock] 응답"),
            model="mock",
            provider=ModelProvider.LOCAL,
            usage={"prompt_tokens": len(prompt) // 4, "completion_tokens": 50, "total_tokens": len(prompt) // 4 + 50},
            latency_ms=100.0,
            cost_estimate=0.0,
        )
    
    def _estimate_cost(self, provider: ModelProvider, usage: dict) -> float:
        """비용 추정 (USD)"""
        costs = self.COST_ESTIMATES.get(provider, {"input": 0, "output": 0})
        
        input_cost = (usage.get("prompt_tokens", 0) / 1_000_000) * costs["input"]
        output_cost = (usage.get("completion_tokens", 0) / 1_000_000) * costs["output"]
        
        return input_cost + output_cost
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTUS 특화 메서드
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_breaking_changes(self, release_notes: str) -> LLMResponse:
        """Breaking Change 분석 (DeepSeek-R1 사용)"""
        system_prompt = """You are an expert software engineer analyzing release notes.
        Identify breaking changes, deprecations, and migration requirements.
        Output JSON with: {breaking_changes: [], deprecations: [], risk_level: "LOW|MEDIUM|HIGH|CRITICAL"}"""
        
        return self.generate(
            prompt=f"Analyze these release notes for breaking changes:\n\n{release_notes}",
            task_type=TaskType.REASONING,
            system_prompt=system_prompt,
            temperature=0.3,
        )
    
    def predict_delta_s_dot(self, metrics_history: list[dict]) -> LLMResponse:
        """ΔṠ 예측 (DeepSeek-R1 사용)"""
        system_prompt = """You are an AI physics engine predicting entropy change rate (ΔṠ).
        Given historical metrics, predict the next 7-day ΔṠ trajectory.
        Output JSON with: {predictions: [{day: 1, delta_s_dot: 0.xx}, ...], confidence: 0.xx}"""
        
        return self.generate(
            prompt=f"Predict ΔṠ based on this history:\n\n{metrics_history}",
            task_type=TaskType.REASONING,
            system_prompt=system_prompt,
            temperature=0.2,
        )
    
    def summarize_update_report(self, update_details: dict) -> LLMResponse:
        """업데이트 리포트 요약 (Llama 3.3 사용)"""
        system_prompt = """You are a technical writer summarizing software updates.
        Create a clear, concise report in Korean for non-technical stakeholders.
        Include: 요약, 변경 사항, 영향도, 권장 조치"""
        
        return self.generate(
            prompt=f"Summarize this update:\n\n{update_details}",
            task_type=TaskType.SUMMARIZATION,
            system_prompt=system_prompt,
            temperature=0.5,
        )
    
    def get_available_providers(self) -> list[str]:
        """사용 가능한 제공자 목록"""
        return [p.value for p in self._available]
