"""
llm_router.py
- 다양한 LLM(GPT, Claude, Gemini 등) 어댑터를 등록/관리
- 요청마다 목적, 토큰, 비용, 신뢰도, 특화도 등 기준으로 최적 LLM을 동적으로 선택
- 각 LLM 어댑터는 동일한 인터페이스(call, health 등) 제공
- 프로젝트 성격에 따라 LLM 우선순위 반영
"""
import random
from typing import Any, Dict, List, Optional

from packs.ai.llm_project_policy import get_project_type, get_llm_priority

class LLMAdapterBase:
    def call(self, prompt: str, **kwargs) -> str:
        raise NotImplementedError
    def health(self) -> Dict[str, Any]:
        return {"status": "ok"}

class GPTAdapter(LLMAdapterBase):
    def call(self, prompt: str, **kwargs) -> str:
        import os
        import requests
        api_key = os.getenv("OPENAI_API_KEY")
        endpoint = os.getenv("OPENAI_API_ENDPOINT", "https://api.openai.com/v1/chat/completions")
        if not api_key:
            return "[GPT: API KEY 미설정]"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        data = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 512
        }
        try:
            resp = requests.post(endpoint, headers=headers, json=data, timeout=20)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[GPT 오류] {e}"
    def health(self):
        return {"status": "ok", "cost": 1, "latency": 1, "specialty": "general"}

class ClaudeAdapter(LLMAdapterBase):
    def call(self, prompt: str, **kwargs) -> str:
        import os
        import requests
        api_key = os.getenv("CLAUDE_API_KEY")
        endpoint = os.getenv("CLAUDE_API_ENDPOINT", "https://api.anthropic.com/v1/messages")
        if not api_key:
            return "[Claude: API KEY 미설정]"
        headers = {"x-api-key": api_key, "Content-Type": "application/json", "anthropic-version": "2023-06-01"}
        data = {
            "model": "claude-2",
            "max_tokens": 512,
            "messages": [{"role": "user", "content": prompt}]
        }
        try:
            resp = requests.post(endpoint, headers=headers, json=data, timeout=20)
            resp.raise_for_status()
            return resp.json().get("content", "[Claude 응답 없음]")
        except Exception as e:
            return f"[Claude 오류] {e}"
    def health(self):
        return {"status": "ok", "cost": 0.8, "latency": 1.2, "specialty": "reasoning"}

class GeminiAdapter(LLMAdapterBase):
    def call(self, prompt: str, **kwargs) -> str:
        import os
        import requests
        api_key = os.getenv("GEMINI_API_KEY")
        endpoint = os.getenv("GEMINI_API_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + (api_key or ""))
        if not api_key:
            return "[Gemini: API KEY 미설정]"
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        try:
            resp = requests.post(endpoint, headers=headers, json=data, timeout=20)
            resp.raise_for_status()
            return resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "[Gemini 응답 없음]")
        except Exception as e:
            return f"[Gemini 오류] {e}"
    def health(self):
        return {"status": "ok", "cost": 0.7, "latency": 1.1, "specialty": "search"}

class LLMRouter:
    def __init__(self):
        self.adapters = {
            "gpt": GPTAdapter(),
            "claude": ClaudeAdapter(),
            "gemini": GeminiAdapter(),
        }
    def route(self, prompt: str, purpose: Optional[str] = None, **kwargs) -> str:
        # 프로젝트 성격에 따라 LLM 우선순위 반영
        project_type = get_project_type()
        llm_priority = get_llm_priority(project_type)
        # 목적/정책 기반 후보 우선순위
        for llm_name in llm_priority:
            adapter = self.adapters.get(llm_name)
            if adapter:
                return adapter.call(prompt, **kwargs)
        # fallback: 아무거나
        return random.choice(list(self.adapters.values())).call(prompt, **kwargs)
    def all_health(self):
        return {k: v.health() for k, v in self.adapters.items()}
