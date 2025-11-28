"""
AUTUS 추천 API 모듈
- 로그/테스트 결과 기반 명령/어댑터 추천
- (향후) GPT 연동 자동 생성, 정책 추천 등 확장
"""
import json
import os
from fastapi import APIRouter
from typing import List, Dict

router = APIRouter()

AUDIT_LOG_PATH = os.path.join(os.path.dirname(__file__), '../../.vscode/autus-audit-log.json')
ADAPTER_TEST_PATH = os.path.join(os.path.dirname(__file__), '../../adapters/adapter_test_results.json')

def load_audit_logs() -> List[Dict]:
    try:
        with open(AUDIT_LOG_PATH, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def load_adapter_tests() -> List[Dict]:
    try:
        with open(ADAPTER_TEST_PATH, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

@router.get('/api/recommend')
def recommend_commands(user: str = None, topk: int = 5):
    logs = load_audit_logs()
    stats = {}
    for entry in logs:
        key = (entry.get('user'), entry.get('action'))
        stats[key] = stats.get(key, 0) + 1
    # 사용자별 최근 사용/성공률 기반 추천
    user_stats = {k: v for k, v in stats.items() if (not user or k[0] == user)}
    sorted_cmds = sorted(user_stats.items(), key=lambda x: -x[1])[:topk]
    result = [
        {'user': k[0], 'action': k[1], 'count': v}
        for (k, v) in sorted_cmds
    ]
    return {'recommendations': result}
