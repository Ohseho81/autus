"""
AUTUS Oracle - LLM Client
제7법칙: 진화 - 실제 AI와 연결되어 진화한다

Lines: ~70 (필연적 성공 구조)
"""
import os
from typing import Dict, Any, Optional
from pathlib import Path

# .env 파일 자동 로드
def _load_env():
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ.setdefault(key, value)

_load_env()

# Anthropic import
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class LLMClient:
    """
    LLM 클라이언트 (Claude API)
    
    필연적 성공:
    - API 키 있으면 → 실제 AI 호출
    - API 키 없으면 → 시뮬레이션 (개발용)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = None
        self.enabled = False
        
        if self.api_key and ANTHROPIC_AVAILABLE:
            try:
                self.client = Anthropic(api_key=self.api_key)
                self.enabled = True
            except Exception as e:
                print(f"⚠️ LLM 초기화 실패: {e}")
    
    def generate(
        self,
        prompt: str,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """프롬프트로 텍스트 생성"""
        
        if not self.enabled:
            return {
                "success": True,
                "content": f"[시뮬레이션] {prompt[:100]}...",
                "model": "simulation",
                "usage": {"input_tokens": 0, "output_tokens": 0}
            }
        
        try:
            response = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                "success": True,
                "content": response.content[0].text,
                "model": model,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "content": None,
                "error": str(e),
                "model": model
            }
    
    def is_enabled(self) -> bool:
        """실제 API 연결 여부"""
        return self.enabled


# 싱글톤
_client = None

def get_client() -> LLMClient:
    """전역 클라이언트 가져오기"""
    global _client
    if _client is None:
        _client = LLMClient()
    return _client

def generate(prompt: str, **kwargs) -> Dict[str, Any]:
    """전역 생성 함수"""
    return get_client().generate(prompt, **kwargs)

def is_enabled() -> bool:
    """API 활성화 여부"""
    return get_client().is_enabled()
