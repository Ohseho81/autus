#!/bin/bash
# 🔴 PHASE 1: 기초 안정화 (오늘 - 3시간)
# 의존성 설치 & Import 에러 해결

echo "📋 PHASE 1: 기초 안정화 시작"
echo "================================"
echo ""

# Step 1: 의존성 설치 (5분)
echo "⏱️  Step 1: 의존성 설치 (5분)"
echo "-----------------------------------"
cd /Users/oseho/Desktop/autus

echo "✅ requirements.txt 설치 중..."
pip install -r requirements.txt --no-cache-dir

echo "✅ 설치 완료!"
echo ""

# Step 2: 현재 에러 확인 (5분)
echo "⏱️  Step 2: 현재 Import 에러 확인 (5분)"
echo "-----------------------------------"

echo "🔍 evolved 폴더 에러 검사:"
python -m pylint evolved/ --errors-only 2>&1 | head -50

echo ""
echo "🔍 각 파일별 import 테스트:"
echo ""

echo "1️⃣  kafka_producer.py:"
python -c "from evolved.kafka_producer import KafkaProducerService; print('✅ OK')" 2>&1 || echo "❌ 에러 (수정 필요)"

echo "2️⃣  spark_processor.py:"
python -c "from evolved.spark_processor import SparkProcessor; print('✅ OK')" 2>&1 || echo "❌ 에러 (수정 필요)"

echo "3️⃣  ml_pipeline.py:"
python -c "from evolved.ml_pipeline import MLPipeline; print('✅ OK')" 2>&1 || echo "❌ 에러 (수정 필요)"

echo "4️⃣  onnx_models.py:"
python -c "from evolved.onnx_models import ONNXModelConverter; print('✅ OK')" 2>&1 || echo "❌ 에러 (수정 필요)"

echo "5️⃣  spark_distributed.py:"
python -c "from evolved.spark_distributed import DistributedSparkCluster; print('✅ OK')" 2>&1 || echo "❌ 에러 (수정 필요)"

echo ""
echo "📊 테스트 현황:"
echo "✅ 설치 완료"
echo "⏳ Import 에러 상태 확인됨 (다음 Step으로 진행)"
echo ""
echo "================================"
echo "Phase 1 Step 1-2 완료!"
echo "다음: VS Code에서 파일 수정"
echo "================================"
