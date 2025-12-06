# 🎯 AUTUS 라스트 터치 - 실행 계획

> **목표**: v4.8 기능들을 최대한 효율적이고 좋은 상태로 발현
> 
> **기간**: 3-4일 | **팀**: 1명 | **우선순위**: P0 → P1 → P2

---

## 🎬 빠른 시작 가이드

### 1단계: 환경 설정 (5분)
```bash
# 의존성 설치
pip install -r requirements.txt --no-cache-dir

# 환경 변수 설정
export PYTHONPATH=/Users/oseho/Desktop/autus:$PYTHONPATH
export REDIS_URL=redis://localhost:6379
export CELERY_BROKER=amqp://guest:guest@localhost:5672//
```

### 2단계: 에러 검증 (5분)
```bash
# 현재 에러 확인
python -m pylint api/ evolved/ --errors-only

# Import 테스트
python -c "from evolved.spark_distributed import DistributedSparkCluster; print('OK')"
```

### 3단계: 테스트 실행 (10분)
```bash
# 기존 테스트 실행
pytest test_v4_8_kubernetes.py -v --tb=short

# 새로운 테스트
pytest tests/test_api_integration.py -v --cov
```

---

## 📊 작업 타임라인

```
┌─ Day 1: 기초 안정화 (3시간)
│  ├─ 09:00-09:30: 의존성 설치 & 에러 해결
│  ├─ 09:30-11:00: API 라우터 등록 & 에러 핸들링
│  └─ 11:00-12:00: 테스트 실행 & 검증
│
├─ Day 2: 성능 최적화 (3시간)
│  ├─ 09:00-10:00: 캐싱 레이어 개선
│  ├─ 10:00-11:00: DB 쿼리 최적화
│  └─ 11:00-12:00: 이벤트 처리 개선
│
├─ Day 3: 운영 준비 (3시간)
│  ├─ 09:00-10:00: 로깅 & 모니터링 통합
│  ├─ 10:00-11:00: 보안 취약점 해결
│  └─ 11:00-12:00: 문서화 & 테스트 작성
│
└─ Day 4: 최종 검증 (1-2시간)
   ├─ 09:00-10:00: 통합 테스트
   ├─ 10:00-11:00: 성능 벤치마크
   └─ 11:00-12:00: 배포 준비
```

---

## 🔥 고우선순위 작업 (오늘 완료)

### P0-1: 의존성 에러 해결 ✅

**상태**: 🔴 미완료  
**영향도**: 🔴 매우 높음  
**예상시간**: 30분

#### 해야 할 일
```python
# ❌ 현재: 선택적 의존성이 필수로 취급됨
from kafka import KafkaProducer  # ImportError 발생

# ✅ 개선: Graceful degradation
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    logger.warning("Kafka not available, using mock mode")
```

#### 영향받는 파일 (4개)
1. `evolved/kafka_consumer_service.py` - ✅ 이미 구현됨
2. `evolved/spark_processor.py` - ❌ 수정 필요
3. `evolved/ml_pipeline.py` - ❌ 수정 필요
4. `evolved/onnx_models.py` - ❌ 수정 필요

#### 실행 명령어
```bash
# 각 파일에서 import 에러 확인
python -c "from evolved.spark_processor import SparkProcessor"
python -c "from evolved.ml_pipeline import MLPipeline"
python -c "from evolved.onnx_models import ONNXModelConverter"

# 에러 없을 때까지 각 파일 수정
```

---

### P0-2: API 라우터 등록

**상태**: 🔴 미완료  
**영향도**: 🔴 매우 높음  
**예상시간**: 45분

#### 현재 상태
```python
# main.py (Line 35-40)
from api.routes.devices import router as devices_router
from api.routes.analytics import router as analytics_router

# ❌ 등록 안 됨:
# - api.reality
# - api.sovereign
# - api.websocket
# - evolved.endpoints
```

#### 추가할 코드
```python
# main.py에 추가 (Line 45 다음)
from api.reality import router as reality_router
from api.sovereign import router as sovereign_router
from api.websocket import router as websocket_router

# 라우터 등록 (Line 75 다음)
app.include_router(devices_router)
app.include_router(analytics_router)
app.include_router(reality_router, prefix="/api/v1")
app.include_router(sovereign_router, prefix="/api/v1")
app.include_router(websocket_router)

# 라우터 확인
@app.get("/api/status")
async def api_status():
    return {
        "status": "ok",
        "version": __version__,
        "routers": list(app.routes)
    }
```

#### 테스트 명령어
```bash
# 서버 시작
python main.py

# 다른 터미널에서 테스트
curl http://localhost:8000/health
curl http://localhost:8000/reality/events
curl http://localhost:8000/sovereign/status
curl http://localhost:8000/api/status
```

---

### P1-3: 에러 핸들링 표준화

**상태**: 🔴 미완료  
**영향도**: 🟠 높음  
**예상시간**: 45분

#### 새 파일 생성: `api/errors.py`
```python
from fastapi import HTTPException
from datetime import datetime
from typing import Any, Dict, Optional
from enum import Enum

class ErrorCode(Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

class AutousException(HTTPException):
    """표준 AUTUS 예외 클래스"""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = code.value
        self.error_message = message
        
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": code.value,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
                "details": details or {}
            }
        )

# 사용 예시
if not data:
    raise AutousException(
        code=ErrorCode.NOT_FOUND,
        message="Data not found",
        status_code=404
    )
```

#### main.py에 exception handler 추가
```python
from api.errors import AutousException
from fastapi.responses import JSONResponse

@app.exception_handler(AutousException)
async def autous_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

---

## 🚀 오늘의 체크리스트

### 아침 (09:00-10:00)
```
[ ] 의존성 설치 완료
    pip install -r requirements.txt --no-cache-dir
[ ] Import 에러 확인
    python -m pylint evolved/ --errors-only
[ ] 모든 선택적 의존성에 try-except 추가
    - evolved/spark_processor.py
    - evolved/ml_pipeline.py
    - evolved/onnx_models.py
[ ] 테스트 실행
    pytest -xvs
```

### 오전중반 (10:00-11:30)
```
[ ] api/errors.py 생성
[ ] main.py에 라우터 등록 (reality, sovereign, websocket)
[ ] Exception handler 추가
[ ] 에러 응답 포맷 표준화
[ ] 라우터 엔드포인트 테스트
    curl http://localhost:8000/health
    curl http://localhost:8000/reality/events
    curl http://localhost:8000/sovereign/status
```

### 정오 (11:30-12:30)
```
[ ] 기본 통합 테스트 작성 (tests/test_api_integration.py)
[ ] 모든 에러 케이스 테스트
[ ] 성능 테스트
[ ] 문서 업데이트
```

---

## 📈 성능 개선 목표

| 메트릭 | 현재 | 목표 | 우선순위 |
|--------|------|------|----------|
| API 응답시간 | 150ms | 50ms | 🔴 P1 |
| 캐시 히트율 | 60% | 85% | 🟠 P2 |
| 에러율 | 2.5% | 0.5% | 🔴 P1 |
| 테스트 커버리지 | 70% | 85% | 🟡 P3 |

---

## 🧪 테스트 전략

### 1단계: 단위 테스트
```bash
# 각 모듈별 테스트
pytest evolved/tests/ -v

# 특정 파일
pytest tests/test_api_integration.py -v
```

### 2단계: 통합 테스트
```bash
# 전체 API 엔드포인트
pytest tests/ -v --tb=short

# 커버리지 리포트
pytest tests/ --cov=api --cov=evolved --cov-report=html
```

### 3단계: 성능 테스트
```bash
# 로드 테스트
locust -f tests/load_test.py --host=http://localhost:8000
```

---

## 🔗 참고 자료

### 문서
- ✅ [COMPREHENSIVE_REVIEW_CHECKLIST.md](./COMPREHENSIVE_REVIEW_CHECKLIST.md) - 전체 체크리스트
- ✅ [README.md](./README.md) - 프로젝트 개요
- ✅ [V4_8_COMPLETION_SUMMARY.md](./V4_8_COMPLETION_SUMMARY.md) - v4.8 완료 보고서

### 테스트 파일
- ✅ [test_v4_8_kubernetes.py](./test_v4_8_kubernetes.py) - 22 tests (100% passing)
- ✅ [test_v4_7_pipeline.py](./test_v4_7_pipeline.py) - Data pipeline tests
- ⏳ [tests/test_api_integration.py](./tests/test_api_integration.py) - 작성 예정

### 주요 모듈
- ✅ [evolved/k8s_architecture.py](./evolved/k8s_architecture.py) - K8s 오케스트레이션
- ✅ [evolved/kafka_consumer_service.py](./evolved/kafka_consumer_service.py) - 이벤트 처리
- ✅ [evolved/onnx_models.py](./evolved/onnx_models.py) - ML 모델 변환
- ✅ [evolved/spark_distributed.py](./evolved/spark_distributed.py) - 분산 처리

---

## 💡 팁 & 트릭

### 빠른 디버깅
```bash
# 특정 라우터만 테스트
python -c "from api.reality import router; print(router.routes)"

# 메모리 사용량 확인
python -m memory_profiler main.py

# 성능 프로파일링
python -m cProfile -s cumulative main.py
```

### 환경 변수 설정
```bash
# .env 파일 생성
cat > .env << EOF
REDIS_URL=redis://localhost:6379
CELERY_BROKER=amqp://guest:guest@localhost:5672//
DEBUG=true
LOG_LEVEL=DEBUG
EOF

# 환경 변수 로드
source .env
```

---

## 🎯 Success Criteria

완료 기준:
- ✅ 모든 의존성 에러 해결
- ✅ 모든 라우터 등록 및 테스트 완료
- ✅ 표준 에러 핸들링 구현
- ✅ 통합 테스트 작성 및 통과
- ✅ 성능 개선 검증
- ✅ 문서화 완료

예상 결과:
- 📊 테스트 커버리지: 70% → 85%
- ⚡ API 응답시간: 150ms → 50ms
- 🛡️ 에러율: 2.5% → 0.5%
- 📈 캐시 히트율: 60% → 85%

---

**시작 날짜**: 2025년 12월 7일  
**완료 목표**: 2025년 12월 10일  
**상태**: 🟡 준비 중

