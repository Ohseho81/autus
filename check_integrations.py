#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS 연동 상태 체크
1. 카카오톡 API
2. 결제선생 API
3. Supabase
"""

import os
import sys

# UTF-8 설정
os.environ['LANG'] = 'en_US.UTF-8'
os.environ['LC_ALL'] = 'en_US.UTF-8'
if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

def check_env_vars():
    """환경 변수 확인"""
    print("\n" + "="*60)
    print("🔍 환경 변수 확인")
    print("="*60 + "\n")

    env_vars = {
        "Supabase": [
            ("SUPABASE_URL", "https://dcobyicibvhpwcjqkmgw.supabase.co"),
            ("SUPABASE_SERVICE_KEY", os.getenv('SUPABASE_SERVICE_KEY')),
            ("SUPABASE_DB_PASSWORD", os.getenv('SUPABASE_DB_PASSWORD'))
        ],
        "카카오톡": [
            ("KAKAO_API_KEY", os.getenv('KAKAO_API_KEY')),
            ("KAKAO_REST_API_KEY", os.getenv('KAKAO_REST_API_KEY')),
            ("KAKAO_ADMIN_KEY", os.getenv('KAKAO_ADMIN_KEY'))
        ],
        "결제선생": [
            ("PAYMENT_API_KEY", os.getenv('PAYMENT_API_KEY')),
            ("PAYMENT_SECRET", os.getenv('PAYMENT_SECRET'))
        ],
        "몰트봇": [
            ("TELEGRAM_BOT_TOKEN", os.getenv('TELEGRAM_BOT_TOKEN')),
            ("TELEGRAM_CHAT_ID", os.getenv('TELEGRAM_CHAT_ID'))
        ]
    }

    for service, vars in env_vars.items():
        print(f"📦 {service}")
        for key, value in vars:
            if value and len(value) > 10:
                status = f"✅ 설정됨 ({value[:20]}...)"
            elif value:
                status = f"✅ 설정됨"
            else:
                status = "❌ 미설정"
            print(f"   {key}: {status}")
        print()

def test_supabase():
    """Supabase 연결 테스트"""
    print("="*60)
    print("🔌 Supabase 연결 테스트")
    print("="*60 + "\n")

    try:
        from supabase import create_client, Client

        SUPABASE_URL = "https://dcobyicibvhpwcjqkmgw.supabase.co"
        SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

        if not SUPABASE_KEY:
            print("❌ SUPABASE_SERVICE_KEY 환경 변수가 없습니다.")
            return False

        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # 학생 수 확인
        result = supabase.table('profiles').select('*', count='exact').eq('type', 'student').execute()
        student_count = result.count

        # Universal Profiles 확인
        result = supabase.table('universal_profiles').select('*', count='exact').execute()
        universal_count = result.count

        print(f"✅ Supabase 연결 성공!")
        print(f"   - 학생 수: {student_count}명")
        print(f"   - Universal Profiles: {universal_count}명")
        print(f"   - 프로젝트: dcobyicibvhpwcjqkmgw")
        print()

        return True

    except Exception as e:
        print(f"❌ Supabase 연결 실패: {e}\n")
        return False

def test_kakao():
    """카카오톡 API 테스트"""
    print("="*60)
    print("📱 카카오톡 API 테스트")
    print("="*60 + "\n")

    KAKAO_API_KEY = os.getenv('KAKAO_API_KEY')
    KAKAO_REST_API_KEY = os.getenv('KAKAO_REST_API_KEY')

    if not KAKAO_API_KEY and not KAKAO_REST_API_KEY:
        print("❌ 카카오톡 API 키가 설정되지 않았습니다.\n")
        print("📍 설정 방법:")
        print("1. https://developers.kakao.com 방문")
        print("2. 내 애플리케이션 → 앱 키 확인")
        print("3. 환경 변수 설정:")
        print("   export KAKAO_REST_API_KEY='your-api-key'")
        print()
        return False

    try:
        import requests

        # 간단한 API 테스트 (토큰 정보 확인)
        if KAKAO_REST_API_KEY:
            response = requests.get(
                "https://kapi.kakao.com/v1/user/access_token_info",
                headers={"Authorization": f"Bearer {KAKAO_REST_API_KEY}"}
            )

            if response.status_code == 200:
                print(f"✅ 카카오톡 API 연결 성공!")
                print(f"   - API 키: {KAKAO_REST_API_KEY[:20]}...")
                print()
                return True
            else:
                print(f"⚠️  카카오톡 API 응답: {response.status_code}")
                print(f"   설정은 되어 있으나 테스트 실패")
                print()
                return False

    except Exception as e:
        print(f"⚠️  카카오톡 API 테스트 중 오류: {e}")
        print(f"   API 키는 설정되어 있습니다.")
        print()
        return False

def test_payment():
    """결제선생 API 테스트"""
    print("="*60)
    print("💳 결제선생 API 테스트")
    print("="*60 + "\n")

    PAYMENT_API_KEY = os.getenv('PAYMENT_API_KEY')

    if not PAYMENT_API_KEY:
        print("❌ 결제선생 API 키가 설정되지 않았습니다.\n")
        print("📍 설정 방법:")
        print("1. 결제선생 대시보드 방문")
        print("2. 설정 → API 키 확인")
        print("3. 환경 변수 설정:")
        print("   export PAYMENT_API_KEY='your-api-key'")
        print()
        return False

    try:
        import requests

        # API 엔드포인트 (예시)
        response = requests.get(
            "https://api.paymentteacher.com/v1/status",
            headers={"Authorization": f"Bearer {PAYMENT_API_KEY}"}
        )

        if response.status_code == 200:
            print(f"✅ 결제선생 API 연결 성공!")
            print(f"   - API 키: {PAYMENT_API_KEY[:20]}...")
            print()
            return True
        else:
            print(f"⚠️  결제선생 API 응답: {response.status_code}")
            print(f"   설정은 되어 있으나 테스트 실패")
            print()
            return False

    except Exception as e:
        print(f"⚠️  결제선생 API 테스트 중 오류: {e}")
        print(f"   API 키는 설정되어 있습니다.")
        print()
        return False

def test_moltbot():
    """몰트봇 (Telegram) 테스트"""
    print("="*60)
    print("🤖 몰트봇 (Telegram) 테스트")
    print("="*60 + "\n")

    BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

    if not BOT_TOKEN:
        print("❌ Telegram Bot Token이 설정되지 않았습니다.\n")
        print("📍 설정 방법:")
        print("1. @BotFather에게 /newbot 명령")
        print("2. 받은 토큰 저장")
        print("3. 환경 변수 설정:")
        print("   export TELEGRAM_BOT_TOKEN='your-bot-token'")
        print()
        return False

    try:
        import requests

        # Bot 정보 확인
        response = requests.get(
            f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
        )

        if response.status_code == 200:
            bot_info = response.json()
            print(f"✅ 몰트봇 연결 성공!")
            print(f"   - Bot 이름: {bot_info['result']['username']}")
            print(f"   - Bot ID: {bot_info['result']['id']}")
            if CHAT_ID:
                print(f"   - Chat ID: {CHAT_ID}")
            print()
            return True
        else:
            print(f"❌ 몰트봇 연결 실패: {response.status_code}")
            print()
            return False

    except Exception as e:
        print(f"❌ 몰트봇 테스트 중 오류: {e}\n")
        return False

def main():
    print("\n" + "="*60)
    print("🔍 AUTUS 연동 상태 체크")
    print("="*60 + "\n")

    # 환경 변수 확인
    check_env_vars()

    # 각 서비스 테스트
    results = {
        "Supabase": test_supabase(),
        "카카오톡": test_kakao(),
        "결제선생": test_payment(),
        "몰트봇": test_moltbot()
    }

    # 결과 요약
    print("\n" + "="*60)
    print("📊 연동 상태 요약")
    print("="*60 + "\n")

    for service, status in results.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {service}: {'연결됨' if status else '미연결'}")

    print("\n" + "="*60)

    # 다음 단계 안내
    connected = sum(results.values())
    total = len(results)

    print(f"\n✅ 연결된 서비스: {connected}/{total}")

    if connected < total:
        print("\n💡 다음 단계:")
        if not results["Supabase"]:
            print("1. Supabase 환경 변수 설정")
        if not results["카카오톡"]:
            print("2. 카카오톡 개발자 센터에서 API 키 발급")
        if not results["결제선생"]:
            print("3. 결제선생 대시보드에서 API 키 발급")
        if not results["몰트봇"]:
            print("4. Telegram @BotFather에서 봇 생성")

    print()

if __name__ == '__main__':
    main()
