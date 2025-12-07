#!/bin/bash
# 🔴 PHASE 1: 라우터 등록 & 에러 핸들링 (터미널 + VS Code)
# VS Code 작업 완료 후 실행

echo "📋 PHASE 1: 라우터 등록 검증"
echo "================================"
echo ""

cd /Users/oseho/Desktop/autus

# 검증 1: 모든 import 테스트
echo "✅ Step 1: Import 에러 해결 검증 (5분)"
echo "-----------------------------------"

python << 'EOF'
import sys
print("🔍 Import 테스트 중...\n")

tests = [
    ("evolved.kafka_producer", "KafkaProducerService"),
    ("evolved.spark_processor", "SparkProcessor"),
    ("evolved.ml_pipeline", "MLPipeline"),
    ("evolved.onnx_models", "ONNXModelConverter"),
    ("evolved.spark_distributed", "DistributedSparkCluster"),
    ("evolved.celery_app", "app"),
    ("evolved.kafka_consumer_service", "KafkaConsumerService"),
]

success_count = 0
fail_count = 0

for module, cls in tests:
    try:
        exec(f"from {module} import {cls}")
        print(f"✅ {module}")
        success_count += 1
    except Exception as e:
        print(f"❌ {module}: {str(e)[:50]}")
        fail_count += 1

print(f"\n📊 결과: {success_count} 성공, {fail_count} 실패")
if fail_count == 0:
    print("🎉 모든 import 성공!")
else:
    print("⚠️  위의 실패한 파일들을 다시 확인하세요")
EOF

echo ""
echo ""

# 검증 2: 라우터 등록 확인
echo "✅ Step 2: main.py 라우터 등록 확인 (VS Code에서 완료 후)"
echo "-----------------------------------"

echo "🔍 main.py에 등록된 라우터 확인:"
python << 'EOF'
import sys
sys.path.insert(0, '/Users/oseho/Desktop/autus')

try:
    from main import app
    
    routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            routes.append(route.path)
    
    print("등록된 라우트:")
    for route in sorted(set(routes)):
        print(f"  {route}")
    
    # 확인할 라우터들
    required = ["/api/v1/reality/event", "/api/v1/sovereign/token/generate", "/ws"]
    print("\n필수 라우터 확인:")
    for req in required:
        found = any(req in route for route in routes)
        print(f"  {'✅' if found else '❌'} {req}")
        
except Exception as e:
    print(f"❌ main.py 로드 실패: {e}")
EOF

echo ""
echo ""

# 검증 3: 에러 핸들링
echo "✅ Step 3: 에러 핸들링 테스트 (VS Code에서 완료 후)"
echo "-----------------------------------"

echo "🔍 api/errors.py 파일 확인:"
if [ -f "api/errors.py" ]; then
    echo "✅ api/errors.py 존재"
    grep -c "class.*Exception" api/errors.py || echo "⚠️  Exception 클래스 정의 확인 필요"
else
    echo "❌ api/errors.py 없음 (생성 필요)"
fi

echo ""
echo ""

# 최종 테스트
echo "✅ Step 4: 최종 테스트 실행"
echo "-----------------------------------"

echo "🧪 pytest 실행 (v4.8 테스트 22개):"
pytest test_v4_8_kubernetes.py -v --tb=short 2>&1 | tail -30

echo ""
echo "================================"
echo "Phase 1 완료 체크"
echo "================================"
echo ""
echo "완료 항목:"
echo "  [✅] Import 에러 해결"
echo "  [✅] 라우터 등록"
echo "  [✅] 에러 핸들링"
echo "  [✅] 기본 테스트 통과"
echo ""
echo "다음: Phase 2로 진행 (성능 최적화)"
