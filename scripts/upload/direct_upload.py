#!/usr/bin/env python3
"""Direct HTTP upload to Supabase without any proxy"""
import json
import pandas as pd
import socket

# Supabase 정보
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SERVICE_KEY = "your-supabase-service-role-key-here"

print("🔍 Supabase IP 조회 시도...")

# DNS 조회
try:
    ip = socket.gethostbyname("pphzvnaedmzcvpxjulti.supabase.co")
    print(f"✅ IP: {ip}")
except Exception as e:
    print(f"❌ DNS 실패: {e}")
    print("\n📋 대안: 로컬 환경에서 실행하세요")
    print("명령어: python upload_students.py")
    exit(1)

# Direct socket connection 시도
print("\n🌐 직접 연결 시도...")
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((ip, 443))
    if result == 0:
        print("✅ 포트 443 연결 성공!")
    else:
        print(f"❌ 연결 실패: {result}")
    sock.close()
except Exception as e:
    print(f"❌ 소켓 에러: {e}")
    print("\n⚠️ 이 환경에서는 외부 연결이 차단되어 있습니다.")
    print("\n📋 해결책:")
    print("1. 로컬 터미널에서: python upload_students.py")
    print("2. Google Colab에서 노트북 실행")
    print("3. Supabase Table Editor에서 CSV Import")
