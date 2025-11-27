"""
llm_project_policy.py
- 프로젝트 성격/목적에 따라 LLM 적합도/우선순위 정책 제공
- AUTUS_PROJECT.yaml 등에서 project_type, axis, module 등 정보 활용
"""
import yaml
import os

PROJECT_YAML = os.path.join(os.path.dirname(__file__), '../../AUTUS_PROJECT.yaml')

# LLM 특화도/적합도 정책 테이블
LLM_POLICY = [
    {"type": "code", "llms": ["gpt", "claude"]},
    {"type": "summary", "llms": ["gemini", "claude"]},
    {"type": "chatbot", "llms": ["gpt", "claude"]},
    {"type": "data", "llms": ["gemini", "gpt"]},
    {"type": "creative", "llms": ["claude", "gpt"]},
    {"type": "realtime", "llms": ["gemini", "claude"]},
    {"type": "local", "llms": ["llama"]},
]

def get_project_type() -> str:
    try:
        with open(PROJECT_YAML, encoding='utf-8') as f:
            yml = yaml.safe_load(f)
        # 예시: axis, modules, description 등에서 추론
        desc = yml.get('core', {}).get('description', '').lower()
        if 'code' in desc:
            return 'code'
        if 'sovereign' in desc or '로컬' in desc:
            return 'local'
        if 'self-learning' in desc:
            return 'data'
        # ...추가 규칙...
        return 'general'
    except Exception:
        return 'general'

def get_llm_priority(project_type: str) -> list:
    for row in LLM_POLICY:
        if row['type'] == project_type:
            return row['llms']
    return ["gpt", "claude", "gemini"]
