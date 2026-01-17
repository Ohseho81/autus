#!/usr/bin/env python3
"""
AUTUS 리플레이 시뮬레이션
========================

"일정관리 1개 업무" 시나리오:
요청 발생 → 재촉 증가 → 비가역 창 접근 → DECIDER → 결정 완료 → 안정화

실행: python scripts/replay_simulation.py
"""

import json
import time
import urllib.request
from dataclasses import dataclass


API_URL = "http://127.0.0.1:8000/role/update"


@dataclass
class SimEvent:
    """시뮬레이션 이벤트"""
    now_ts: int
    dc: float
    ir: float
    scope: int
    slack_min: int
    authority_needed: bool
    interrupt: bool
    decision_completed: bool = False
    description: str = ""


def post(payload: dict) -> dict:
    """API 호출"""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    print("=" * 60)
    print("🏛️ AUTUS Role FSM 시뮬레이션")
    print("=" * 60)
    print("\n📋 시나리오: 일정 조율 업무")
    print("   요청 발생 → 재촉 → 비가역 창 → 결정 → 완료\n")
    
    # 초기 상태: EXECUTOR
    state = {
        "current_role": "executor",
        "role_entered_at_ts": 1736830000,
        "last_role_change_at_ts": 1736830000,
        "last_reason": "INIT",
    }

    # 시나리오 타임라인
    timeline = [
        SimEvent(
            now_ts=1736832000,
            dc=0.30, ir=0.20, scope=0, slack_min=900,
            authority_needed=False, interrupt=False,
            description="월 10:12 - 요청 발생 (아직 여유)",
        ),
        SimEvent(
            now_ts=1736857200,
            dc=0.62, ir=0.30, scope=1, slack_min=240,
            authority_needed=False, interrupt=False,
            description="월 18:00 - 재촉 1회 (팀 조율 필요)",
        ),
        SimEvent(
            now_ts=1736904600,
            dc=0.70, ir=0.45, scope=1, slack_min=180,
            authority_needed=False, interrupt=False,
            description="화 09:30 - 재촉 2회, 장소 미정",
        ),
        SimEvent(
            now_ts=1736912400,
            dc=0.78, ir=0.78, scope=1, slack_min=60,
            authority_needed=True, interrupt=False,
            description="화 11:00 - 비가역 창 + 승인 필요",
        ),
        SimEvent(
            now_ts=1736912700,
            dc=0.40, ir=0.55, scope=1, slack_min=55,
            authority_needed=False, interrupt=False,
            decision_completed=True,
            description="화 11:05 - 결정 완료 (승인)",
        ),
        SimEvent(
            now_ts=1736916000,
            dc=0.20, ir=0.20, scope=0, slack_min=600,
            authority_needed=False, interrupt=False,
            description="화 12:00 - 안정화",
        ),
        SimEvent(
            now_ts=1736916300,
            dc=0.10, ir=0.20, scope=0, slack_min=30,
            authority_needed=True, interrupt=True,
            description="화 12:05 - 인터럽트! (결제/서명)",
        ),
    ]

    for i, ev in enumerate(timeline, start=1):
        payload = {
            "now_ts": ev.now_ts,
            "signals": {
                "dc": ev.dc,
                "ir": ev.ir,
                "scope": ev.scope,
                "slack_min": ev.slack_min,
                "authority_needed": ev.authority_needed,
                "interrupt": ev.interrupt,
                "confidence": 0.9,
            },
            "state": state,
            "decision_completed": ev.decision_completed,
        }
        
        try:
            out = post(payload)
            state = out["state"]

            # 역할별 이모지
            role_emoji = {
                "executor": "🔧",
                "operator": "🔄",
                "decider": "⚡",
            }
            
            print(f"\n[{i}] {ev.description}")
            print(f"    {role_emoji.get(out['role'], '❓')} 역할: {out['role'].upper()} ({out['reason']})")
            print(f"    📋 카드: {out['card']['title']}")
            print(f"    ⏰ 시간: {out['card']['time']}")
            print(f"    ⚠️ 리스크: {out['card']['risk']}")
            print(f"    🎯 액션: {', '.join(out['card']['actions'])}")
            
        except Exception as e:
            print(f"\n[{i}] ❌ 오류: {e}")
            print("    서버가 실행 중인지 확인하세요: uvicorn app.main:app --port 8000")
            break
            
        time.sleep(0.3)

    print("\n" + "=" * 60)
    print("✅ 시뮬레이션 완료")
    print("=" * 60)


if __name__ == "__main__":
    main()
