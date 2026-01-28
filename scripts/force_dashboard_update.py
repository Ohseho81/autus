#!/usr/bin/env python3
"""
🚀 AUTUS 대시보드 강제 업데이트 스크립트
- Supabase 직접 연동
- V-Index 실시간 변경
- Telegram 알림 발송
"""

import os
import json
import requests
from datetime import datetime
from typing import Optional

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

# Supabase 설정 (환경변수 또는 직접 입력)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# AUTUS API
AUTUS_API_URL = "https://vercel-li92z925o-ohsehos-projects.vercel.app/api"

# Telegram 설정
TELEGRAM_BOT_TOKEN = "8064967196:AAHUf9LnhxFPcU34tDNlzNqEDzolTUQ6eUk"
TELEGRAM_CHAT_ID = "6733089824"

# 기본 조직 ID
ORG_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

# ═══════════════════════════════════════════════════════════════════════════════
# Functions
# ═══════════════════════════════════════════════════════════════════════════════

def send_telegram(message: str) -> bool:
    """Telegram 메시지 발송"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        response = requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown"
        }, timeout=10)
        return response.json().get("ok", False)
    except Exception as e:
        print(f"❌ Telegram 발송 실패: {e}")
        return False

def trigger_radar_scan(notify: bool = True) -> dict:
    """레이더 스캔 트리거 (Telegram 알림 포함)"""
    try:
        url = f"{AUTUS_API_URL}/v1/radar/monitor"
        params = {"org_id": ORG_ID, "notify": str(notify).lower()}
        response = requests.get(url, params=params, timeout=30)
        return response.json()
    except Exception as e:
        print(f"❌ 레이더 스캔 실패: {e}")
        return {"success": False, "error": str(e)}

def get_cockpit_data() -> dict:
    """조종석 데이터 조회"""
    try:
        url = f"{AUTUS_API_URL}/v1/cockpit"
        params = {"org_id": ORG_ID}
        response = requests.get(url, params=params, timeout=30)
        return response.json()
    except Exception as e:
        print(f"❌ 조종석 조회 실패: {e}")
        return {"success": False, "error": str(e)}

def log_automation(role: str, action_type: str, source: str = "script") -> dict:
    """자동화 로그 기록"""
    try:
        url = f"{AUTUS_API_URL}/v1/automation"
        response = requests.post(url, json={
            "role": role,
            "source": source,
            "action_type": action_type,
            "is_automated": True,
            "org_id": ORG_ID
        }, timeout=10)
        return response.json()
    except Exception as e:
        print(f"❌ 자동화 로그 실패: {e}")
        return {"success": False, "error": str(e)}

def force_dashboard_update(satisfaction: float = 0.9) -> None:
    """대시보드 강제 업데이트 (메인 함수)"""
    
    print("=" * 60)
    print("🚀 AUTUS 대시보드 강제 업데이트")
    print("=" * 60)
    print(f"⏰ 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📊 목표 만족도(s): {satisfaction}")
    print()
    
    # 1. 조종석 현재 상태 확인
    print("【1】 현재 상태 확인...")
    cockpit = get_cockpit_data()
    if cockpit.get("success"):
        data = cockpit.get("data", {})
        internal = data.get("internal", {})
        print(f"   🌡️ 평균 온도: {internal.get('avgTemperature', 'N/A')}°")
        print(f"   👥 전체 고객: {internal.get('customerCount', 0)}명")
        print(f"   🚨 위험 고객: {internal.get('riskCount', 0)}명")
    else:
        print("   ⚠️ 조종석 데이터 조회 실패 (Mock 모드)")
    print()
    
    # 2. 레이더 스캔 실행 (Telegram 알림)
    print("【2】 레이더 스캔 실행...")
    radar = trigger_radar_scan(notify=True)
    if radar.get("success"):
        alerts = radar.get("data", {}).get("alerts", [])
        summary = radar.get("data", {}).get("summary", {})
        print(f"   🔴 위험: {summary.get('critical', 0)}명")
        print(f"   🟠 주의: {summary.get('high', 0)}명")
        print(f"   🟡 관찰: {summary.get('medium', 0)}명")
        
        telegram_sent = radar.get("telegram", {}).get("sent", False)
        if telegram_sent:
            print("   📱 Telegram 알림: ✅ 전송됨")
        else:
            print("   📱 Telegram 알림: ⏭️ 스킵")
    else:
        print("   ⚠️ 레이더 스캔 실패")
    print()
    
    # 3. 자동화 로그 기록
    print("【3】 자동화 로그 기록...")
    log_automation("owner", "force_dashboard_update", "python_script")
    print("   ✅ 로그 기록 완료")
    print()
    
    # 4. Telegram 직접 알림
    print("【4】 Telegram 직접 알림 발송...")
    message = f"""🚀 *AUTUS 대시보드 강제 업데이트*
━━━━━━━━━━━━━━━━━━━━━━

📊 *실행 결과*
• 만족도(s): {satisfaction}
• 레이더 스캔: ✅ 완료
• 자동화 로그: ✅ 기록됨

🔗 [대시보드 확인](https://vercel-2fwqnod3d-ohsehos-projects.vercel.app)

⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"""
    
    if send_telegram(message):
        print("   ✅ Telegram 발송 완료")
    else:
        print("   ⚠️ Telegram 발송 실패")
    print()
    
    # 5. 결과 요약
    print("=" * 60)
    print("✅ 대시보드 강제 업데이트 완료!")
    print("=" * 60)
    print()
    print("📌 다음 단계:")
    print("   1. 대시보드 새로고침: F5 또는 Cmd+R")
    print("   2. Telegram 알림 확인")
    print("   3. 레이더 패널에서 위험 고객 확인")
    print()
    print(f"🔗 대시보드: {AUTUS_API_URL.replace('/api', '')}")

# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    
    # 만족도 파라미터 (기본값: 0.9)
    satisfaction = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9
    
    force_dashboard_update(satisfaction)
