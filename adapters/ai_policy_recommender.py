"""
AUTUS AI 기반 명령/어댑터 추천 및 정책 자동화 예시
- 최근 로그/상황/사용자/이벤트 기반으로 명령/어댑터/정책 추천
- GPT 등 LLM 연동 가능 (여기선 mock 예시)
"""
import json
import random
import os

LOG_PATH = os.path.join(os.path.dirname(__file__), '../.vscode/autus-vs-command-log.json')

RECOMMEND_POOL = [
    {"action": "RUN_TESTS", "reason": "테스트 자동화 필요"},
    {"action": "CLEAN_CACHE", "reason": "캐시 정리 필요"},
    {"action": "INSPECT", "reason": "구조 점검 필요"},
    {"action": "CHECK_SERVER", "reason": "서버 상태 확인"}
]

# 정책 예시: 실패가 2회 이상 연속 발생하면 캐시 정리 추천

def recommend_next():
    try:
        with open(LOG_PATH) as f:
            logs = json.load(f)
    except Exception:
        logs = []
    last2 = logs[-2:] if len(logs) >= 2 else logs
    if all(l.get('status') == '실패' for l in last2):
        return {"action": "CLEAN_CACHE", "reason": "연속 실패 감지, 캐시 정리 자동 추천"}
    # 랜덤 추천 (실제 환경에선 GPT 등 LLM 활용 가능)
    return random.choice(RECOMMEND_POOL)

if __name__ == '__main__':
    rec = recommend_next()
    print(f"[AUTUS AI] 추천 명령: {rec}")
