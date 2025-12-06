# 📋 VS Code에서 해야 할 모든 업무 리스트

> **날짜**: 2025년 12월 7일  
> **상태**: 실행 준비 완료  
> **예상 시간**: 10시간 (4일)

---

## 🎯 VS Code 작업 순서

### 🔴 P0: CRITICAL (3시간) - 오늘 중 완료

#### P0-1: Import 에러 해결 (9개 파일)

**수정할 파일들:**

```
evolved/
├─ kafka_producer.py (Line 6-7)
├─ spark_processor.py (Line 28, 62, 118, 167, 260)
├─ ml_pipeline.py (Line 91, 126-127, 194, 236, 276)
├─ onnx_models.py (Line 48-49, 90, 129, 196, 211)
└─ spark_distributed.py (Line 79, 323, 353)
```

**작업:**

1. **evolved/kafka_producer.py** 열기
   - Line 6-7: `from kafka import ...` 감싸기
   ```python
   try:
       from kafka import KafkaProducer, KafkaConsumer
       KAFKA_AVAILABLE = True
   except ImportError:
       KAFKA_AVAILABLE = False
       logger = logging.getLogger(__name__)
       logger.warning("Kafka not available. Install: pip install kafka-python")
   ```

2. **evolved/spark_processor.py** 열기
   - Line 28, 62, 118, 167, 260의 모든 `from pyspark` 감싸기
   ```python
   PYSPARK_AVAILABLE = False
   try:
       from pyspark.sql import SparkSession, functions as F
       PYSPARK_AVAILABLE = True
   except ImportError:
       pass
   ```

3. **evolved/ml_pipeline.py** 열기
   - Line 91, 126-127, 194, 236, 276의 sklearn import 감싸기
   ```python
   try:
       from sklearn.preprocessing import StandardScaler
       from sklearn.ensemble import RandomForestRegressor
       SKLEARN_AVAILABLE = True
   except ImportError:
       SKLEARN_AVAILABLE = False
   ```

4. **evolved/onnx_models.py** 열기
   - Line 48-49, 90, 129, 196, 211 모두 감싸기
   ```python
   try:
       import skl2onnx
       from skl2onnx.common.data_types import FloatTensorType
       SKL2ONNX_AVAILABLE = True
   except ImportError:
       SKL2ONNX_AVAILABLE = False
   ```

5. **evolved/spark_distributed.py** 열기
   - Line 79, 323, 353 모두 감싸기
   ```python
   try:
       from pyspark import SparkConf, SparkContext
       PYSPARK_AVAILABLE = True
   except ImportError:
       PYSPARK_AVAILABLE = False
   ```

**체크:**
- [ ] 모든 파일 수정 완료
- [ ] 각 파일에 `logger.warning()` 추가됨
- [ ] Python 문법 확인됨

---

#### P0-2: 라우터 등록 (main.py)

**파일:** `main.py`

**작업:**

1. Line 35-40 찾기 (현재 라우터 import 부분)
   ```python
   from api.routes.devices import router as devices_router
   from api.routes.analytics import router as analytics_router
   ```

2. 바로 아래에 추가:
   ```python
   from api.reality import router as reality_router
   from api.sovereign import router as sovereign_router
   from api.websocket import router as websocket_router
   ```

3. Line 70-75 찾기 (라우터 등록 부분)

4. 기존 코드 아래에 추가:
   ```python
   # 주요 API 라우터
   app.include_router(reality_router, prefix="/api/v1", tags=["Reality"])
   app.include_router(sovereign_router, prefix="/api/v1", tags=["Sovereign"])
   app.include_router(websocket_router, tags=["WebSocket"])
   ```

**테스트:**
- [ ] Line에 import 추가됨
- [ ] Line에 include_router 추가됨
- [ ] 문법 오류 없음

---

#### P0-3: 에러 핸들링 표준화

**새 파일:** `api/errors.py` 생성

```python
from fastapi import HTTPException
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ErrorCode(Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

class ErrorResponse(BaseModel):
    error_code: str
    message: str
    timestamp: str
    path: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class AutousException(HTTPException):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": code.value,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
                "details": details or {}
            }
        )
```

**main.py에 추가:**

Line 70 찯기 (CORS 설정 아래)

```python
from api.errors import AutousException, ErrorCode, ErrorResponse
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
            "error_code": ErrorCode.INTERNAL_ERROR.value,
            "message": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

**체크:**
- [ ] api/errors.py 파일 생성됨
- [ ] main.py에 import 추가됨
- [ ] main.py에 exception handler 추가됨

---

### 🟠 P1: HIGH PRIORITY (2시간) - 내일 중 완료

#### P1-1: 캐싱 레이어 개선

**파일:** `api/cache.py`

**작업:**

1. TTL 전략 정의 (Line 30 이후)
   ```python
   class CacheStrategy(Enum):
       NEVER = None
       SHORT = 300          # 5분
       MEDIUM = 3600        # 1시간
       LONG = 86400         # 24시간
       VERY_LONG = 604800   # 7일
   ```

2. 데코레이터 개선 (Line 50 이후)
   ```python
   def cached_with_ttl(strategy: CacheStrategy = CacheStrategy.MEDIUM):
       def decorator(func):
           async def wrapper(*args, **kwargs):
               cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
               cached = cache.redis.get(cache_key)
               if cached:
                   return pickle.loads(cached)
               
               result = await func(*args, **kwargs)
               cache.redis.set(
                   cache_key,
                   pickle.dumps(result),
                   ex=strategy.value
               )
               return result
           return wrapper
       return decorator
   ```

**체크:**
- [ ] CacheStrategy enum 추가됨
- [ ] 캐싱 데코레이터 개선됨
- [ ] TTL 설정 명확화됨

---

#### P1-2: Celery 설정 최적화

**파일:** `evolved/celery_app.py`

**작업:**

Line 10-20 찾기 (앱 설정 부분)

```python
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,        # 30분 하드 타임아웃
    task_soft_time_limit=25 * 60,   # 25분 소프트 타임아웃
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    retry_policy={
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.2,
    }
)
```

**체크:**
- [ ] task_time_limit 설정됨
- [ ] task_soft_time_limit 설정됨
- [ ] retry_policy 정의됨

---

### 🟡 P2: MEDIUM (3시간) - 모레 중 완료

#### P2-1: API 모델 강화

**파일 1:** `api/reality.py`

수정:
```python
from pydantic import BaseModel, Field

class RealityEvent(BaseModel):
    type: str = Field(..., min_length=1, max_length=50)
    device: str = Field(..., pattern="^[a-z0-9-]+$")
    value: float = Field(...)
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "temperature",
                "device": "sensor-001",
                "value": 22.5
            }
        }
```

**파일 2:** `api/sovereign.py`

Line 20-50에서 모든 모델을 Pydantic으로 강화

```python
class TokenRequest(BaseModel):
    owner_id: str = Field(..., min_length=1)
    resource_type: str = Field(...)
    resource_id: str = Field(...)
    metadata: Optional[Dict[str, Any]] = None
```

**체크:**
- [ ] 모든 API 요청/응답 모델화됨
- [ ] Type hints 추가됨
- [ ] Validator 추가됨

---

#### P2-2: 통합 테스트 작성

**새 파일:** `tests/test_api_integration.py` 생성

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestRealityAPI:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_ingest_event(self):
        response = client.post("/reality/event", json={
            "type": "temperature",
            "device": "sensor-001",
            "value": 22.5
        })
        assert response.status_code == 200
        assert "event_id" in response.json()
    
    def test_get_events(self):
        response = client.get("/reality/events")
        assert response.status_code == 200
```

**체크:**
- [ ] tests/ 디렉토리 생성됨
- [ ] test_api_integration.py 작성됨
- [ ] 최소 5개 테스트 작성됨

---

### 🟢 P3: LOW (2시간) - 금요일 중 완료

#### P3-1: 문서화 완성

**수정할 파일:**

1. `api/reality.py` - docstring 추가
2. `api/sovereign.py` - docstring 추가
3. `evolved/k8s_architecture.py` - docstring 확인
4. 각 엔드포인트에 설명 추가

예시:
```python
@router.post("/reality/event")
async def ingest_event(event: RealityEvent):
    """
    Ingest a reality event from IoT devices.
    
    - **type**: Event type (temperature, humidity, motion, etc.)
    - **device**: Device identifier
    - **value**: Sensor value
    
    Returns event_id if successful
    """
```

**체크:**
- [ ] 모든 엔드포인트에 docstring 있음
- [ ] 예제 응답 문서화됨
- [ ] 에러 응답 문서화됨

---

#### P3-2: Git 커밋

**작업:**

1. 변경사항 확인
   ```bash
   git status
   ```

2. 단계별 커밋
   ```bash
   git add evolved/
   git commit -m "fix: Add try-except guards to optional dependencies"
   
   git add main.py
   git commit -m "feat: Register all API routers (reality, sovereign, websocket)"
   
   git add api/errors.py
   git commit -m "feat: Standardize error handling with AutousException"
   
   git add api/cache.py
   git commit -m "feat: Improve caching with TTL strategies"
   ```

**체크:**
- [ ] 모든 변경사항 커밋됨
- [ ] 커밋 메시지 명확함
- [ ] Git 히스토리 깔끔함

---

## 📊 우선순위별 파일 리스트

### 🔴 P0 (오늘)
```
필수 수정:
├─ evolved/kafka_producer.py          (import 에러 fix)
├─ evolved/spark_processor.py         (import 에러 fix)
├─ evolved/ml_pipeline.py             (import 에러 fix)
├─ evolved/onnx_models.py             (import 에러 fix)
├─ evolved/spark_distributed.py       (import 에러 fix)
├─ main.py                            (라우터 등록 + 에러 핸들링)
└─ api/errors.py                      (새 파일 - 에러 표준화)

테스트:
└─ test_v4_8_kubernetes.py            (실행 확인)
```

### 🟠 P1 (내일)
```
성능 개선:
├─ api/cache.py                       (TTL 전략 추가)
├─ evolved/celery_app.py              (타임아웃 설정)
└─ api/prometheus_metrics.py           (메트릭 추가)

선택사항:
└─ test_caching.py                    (성능 테스트)
```

### 🟡 P2 (모레)
```
코드 품질:
├─ api/reality.py                     (모델 강화)
├─ api/sovereign.py                   (모델 강화)
├─ tests/test_api_integration.py      (새 파일 - 통합 테스트)
└─ evolved/core.py                    (타입 힌트 추가)

선택사항:
└─ api/oidc_auth.py                   (구현 검증)
```

### 🟢 P3 (금요일)
```
문서화:
├─ README.md                          (업데이트)
├─ docs/API_REFERENCE.md              (생성/업데이트)
└─ 모든 파일 docstring               (추가)

정리:
└─ .gitignore                         (필요시 업데이트)
```

---

## 🎬 VS Code 단축키

### 빠른 작업
```
Ctrl+P             파일 열기 (예: "main.py")
Ctrl+F             파일 내 검색
Ctrl+H             파일 내 찾기/바꾸기
Ctrl+/             줄 주석
Alt+Shift+F        코드 포맷팅
Ctrl+Shift+P       명령어 팔레트

Git 작업:
Ctrl+Shift+G       Git 뷰 열기
Ctrl+K Ctrl+C      커밋
```

### 추천 확장
```
Python
  - Pylance (타입 체크)
  - Black (포맷팅)
  
Git
  - GitLens (git 통합)

REST
  - Thunder Client (API 테스트)
```

---

## ✅ 일일 체크리스트

### 오늘 (Day 1 - P0)
```
☐ 09:00: 터미널에서 의존성 설치 실행
☐ 09:30: evolved/ 파일 5개 import 에러 수정
☐ 11:00: main.py 라우터 등록
☐ 11:30: api/errors.py 생성
☐ 12:00: 테스트 실행 확인
☐ 12:30: 변경사항 커밋
```

### 내일 (Day 2 - P1)
```
☐ 09:00: api/cache.py TTL 전략 추가
☐ 10:00: evolved/celery_app.py 설정 최적화
☐ 11:00: 캐싱 테스트 실행
☐ 12:00: 성능 벤치마크
```

### 모레 (Day 3 - P2)
```
☐ 09:00: API 모델 강화 (reality.py, sovereign.py)
☐ 10:00: tests/test_api_integration.py 작성
☐ 11:00: 통합 테스트 실행
☐ 12:00: 커버리지 확인
```

### 금요일 (Day 4 - P3)
```
☐ 09:00: 문서화 완성
☐ 10:00: 최종 테스트 실행
☐ 11:00: 모든 변경사항 커밋
☐ 12:00: 배포 준비 완료
```

---

**시작:** 지금 바로!  
**목표:** 4일 후 모든 개선사항 완료  
**보상:** v4.9로 신속 진행 가능 🚀
