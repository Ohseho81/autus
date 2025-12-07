#!/bin/bash
# 🟠 PHASE 2: 성능 최적화 (내일 - 3시간)
# 캐싱 & 쿼리 성능 개선

echo "📋 PHASE 2: 성능 최적화 시작"
echo "================================"
echo ""

cd /Users/oseho/Desktop/autus

# Step 1: 현재 성능 벤치마크
echo "⏱️  Step 1: 현재 성능 측정 (10분)"
echo "-----------------------------------"

python << 'EOF'
import time
import requests
from datetime import datetime

print("🧪 성능 벤치마크 시작...\n")

# 서버 시작 확인
try:
    response = requests.get("http://localhost:8000/health", timeout=2)
    print(f"✅ 서버 실행 중: {response.status_code}")
except:
    print("❌ 서버 미실행 (별도 터미널에서 'python main.py' 실행)")
    exit(1)

endpoints = [
    ("GET", "/health"),
    ("GET", "/reality/events"),
    ("GET", "/cache/stats"),
]

print("\n📊 응답 시간 측정:")
print("=" * 50)

times = []
for method, endpoint in endpoints:
    try:
        start = time.time()
        if method == "GET":
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
        duration = (time.time() - start) * 1000
        times.append(duration)
        status = "✅" if duration < 100 else "⚠️"
        print(f"{status} {endpoint:30} {duration:6.2f}ms")
    except Exception as e:
        print(f"❌ {endpoint:30} {str(e)[:30]}")

if times:
    avg_time = sum(times) / len(times)
    print("=" * 50)
    print(f"📈 평균 응답시간: {avg_time:.2f}ms")
    print(f"📈 목표 응답시간: 50ms")
    print(f"📊 개선 필요: {'예' if avg_time > 50 else '아니오'}")

EOF

echo ""
echo ""

# Step 2: 캐시 상태 확인
echo "⏱️  Step 2: 캐시 상태 확인 (5분)"
echo "-----------------------------------"

python << 'EOF'
import requests
import json

try:
    response = requests.get("http://localhost:8000/cache/stats", timeout=5)
    if response.status_code == 200:
        stats = response.json()
        print("📊 캐시 통계:")
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    else:
        print(f"⚠️  응답: {response.status_code}")
except Exception as e:
    print(f"❌ 캐시 조회 실패: {e}")
EOF

echo ""
echo ""

# Step 3: 작업 큐 상태
echo "⏱️  Step 3: 작업 큐 상태 확인 (5분)"
echo "-----------------------------------"

python << 'EOF'
import requests
import json

try:
    response = requests.get("http://localhost:8000/tasks/queue/stats", timeout=5)
    if response.status_code == 200:
        stats = response.json()
        print("📊 작업 큐 통계:")
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    else:
        print(f"⚠️  응답: {response.status_code}")
except Exception as e:
    print(f"⚠️  작업 큐 조회 불가: {e}")
EOF

echo ""
echo ""

# Step 4: 메트릭 수집
echo "⏱️  Step 4: Prometheus 메트릭 확인 (5분)"
echo "-----------------------------------"

echo "🔍 Prometheus 메트릭 확인:"
if curl -s http://localhost:8000/metrics > /dev/null 2>&1; then
    echo "✅ /metrics 엔드포인트 실행 중"
    curl -s http://localhost:8000/metrics | head -20
else
    echo "⚠️  /metrics 엔드포인트 미확인"
fi

echo ""
echo ""

echo "================================"
echo "Phase 2 준비 완료!"
echo "================================"
echo ""
echo "📋 VS Code 작업 체크리스트:"
echo "  □ api/cache.py - TTL 전략 정의"
echo "  □ protocols/memory/local_memory.py - 인덱싱 추가"
echo "  □ evolved/kafka_consumer_service.py - 배압 처리"
echo ""
echo "이 스크립트로 성능 개선 전후 비교!"

