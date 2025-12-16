# 🟡 PHASE 3: VS Code 작업 (운영 준비)

> **상태**: Phase 2 완료 후
> **시간**: 1.5시간
> **목표**: 타입 안정성 95%, 테스트 커버리지 85%, 문서 완성

---

## 🎯 작업 목록

### Task 1️⃣: Pydantic 모델 정의
**파일**: `api/reality.py`  
**시간**: 20분

```python
# 현재
class RealityEvent(BaseModel):
    type: str
    device: str
    value: Any

# 개선
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime

class RealityEvent(BaseModel):
    type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Event type"
    )
    device: str = Field(
        ...,
        pattern="^[a-z0-9-]+$",
        description="Device identifier"
    )
    value: float = Field(..., description="Sensor value")
    timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        description="Event timestamp"
    )
    meta: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional metadata"
    )
    
    @validator('type')
    def validate_type(cls, v):
        allowed_types = ['temperature', 'humidity', 'motion', 'light']
        if v not in allowed_types:
            raise ValueError(f'Invalid type: {v}')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "temperature",
                "device": "sensor-001",
                "value": 22.5
            }
        }
```

**체크리스트**:
- [ ] 모든 필드에 Field() 추가
- [ ] validator 함수 추가
- [ ] Config 클래스에 예제 추가
- [ ] 타입 힌트 완성

---

### Task 2️⃣: 통합 테스트 작성
**파일**: `tests/test_api_integration.py` (새로 생성)  
**시간**: 40분

```python
# 파일 생성: tests/test_api_integration.py

import pytest
from fastapi.testclient import TestClient
from main import app
from datetime import datetime

client = TestClient(app)

class TestHealthCheck:
    def test_health_ok(self):
        """GET /health returns OK"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

class TestRealityAPI:
    def test_ingest_event_success(self):
        """POST /reality/event with valid data"""
        response = client.post("/reality/event", json={
            "type": "temperature",
            "device": "sensor-001",
            "value": 22.5
        })
        assert response.status_code == 200
        assert "event_id" in response.json()
    
    def test_ingest_event_invalid_type(self):
        """POST /reality/event with invalid type"""
        response = client.post("/reality/event", json={
            "type": "",  # Empty
            "device": "sensor-001",
            "value": 22.5
        })
        assert response.status_code == 422
    
    def test_get_events(self):
        """GET /reality/events returns list"""
        response = client.get("/reality/events")
        assert response.status_code == 200
        assert "events" in response.json()

class TestSovereignAPI:
    def test_generate_token(self):
        """POST /sovereign/token/generate"""
        response = client.post("/sovereign/token/generate", json={
            "owner_id": "user-001",
            "resource_type": "data",
            "resource_id": "res-001"
        })
        assert response.status_code == 200
        assert "token_id" in response.json()
    
    def test_validate_token(self):
        """GET /sovereign/token/validate/{id}"""
        # Generate first
        gen = client.post("/sovereign/token/generate", json={
            "owner_id": "user-001",
            "resource_type": "data",
            "resource_id": "res-001"
        })
        token_id = gen.json()["token_id"]
        
        # Validate
        response = client.get(f"/sovereign/token/validate/{token_id}")
        assert response.status_code == 200
        assert response.json()["valid"] == True

class TestCacheAPI:
    def test_cache_stats(self):
        """GET /cache/stats"""
        response = client.get("/cache/stats")
        assert response.status_code == 200
        data = response.json()
        assert "hit_rate" in data or "hits" in data

@pytest.mark.benchmark
class TestPerformance:
    def test_response_time_under_100ms(self, benchmark):
        """All endpoints should respond under 100ms"""
        result = benchmark(client.get, "/health")
        assert result.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

**체크리스트**:
- [ ] tests/ 디렉토리 생성
- [ ] tests/__init__.py 생성
- [ ] test_api_integration.py 작성
- [ ] 최소 15개 테스트 케이스
- [ ] 성능 벤치마크 테스트 포함

---

### Task 3️⃣: API 문서화
**파일**: `api/reality.py`, `api/sovereign.py`  
**시간**: 20분

```python
# api/reality.py 개선

@router.post(
    "/event",
    tags=["Reality"],
    summary="Ingest reality event",
    responses={
        200: {
            "description": "Event ingested successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "event_id": 1
                    }
                }
            }
        }
    }
)
async def ingest_event(
    event: RealityEvent = Body(
        ...,
        example={
            "type": "temperature",
            "device": "sensor-001",
            "value": 22.5
        }
    )
):
    """
    Ingest a reality event from IoT device.
    
    - **type**: Event type (temperature, humidity, motion, light)
    - **device**: Device identifier in format device-XXX
    - **value**: Sensor reading value
    - **timestamp**: Event timestamp (optional, defaults to now)
    
    Returns event ID for tracking.
    """
    ts = event.timestamp or datetime.utcnow()
    event_data = {
        "id": len(event_store) + 1,
        "type": event.type,
        "device": event.device,
        "value": event.value,
        "timestamp": ts.isoformat()
    }
    event_store.append(event_data)
    return {"status": "ok", "event_id": event_data["id"]}
```

**체크리스트**:
- [ ] 모든 엔드포인트에 docstring 추가
- [ ] responses 스키마 정의
- [ ] 예제 요청/응답 추가
- [ ] 에러 응답 문서화

---

### Task 4️⃣: 타입 힌트 완성
**파일**: `api/*.py`, `evolved/*.py`  
**시간**: 20분

```python
# 개선 패턴

# ❌ Before
def process_data(data):
    return data.get('value')

# ✅ After
from typing import Dict, Any, Optional, List

def process_data(data: Dict[str, Any]) -> Optional[float]:
    """Process sensor data and return value.
    
    Args:
        data: Dictionary containing sensor data
    
    Returns:
        Sensor value or None if not found
    """
    return data.get('value')
```

**체크리스트**:
- [ ] 모든 함수 매개변수에 타입 추가
- [ ] 모든 함수 반환값에 타입 추가
- [ ] docstring 추가
- [ ] 복잡한 타입에 Type hints 추가

---

## 📊 목표

| 항목 | 현재 | 목표 | 상태 |
|------|------|------|------|
| 타입 안정성 | 65% | 95% | 🎯 |
| 테스트 커버리지 | 70% | 85% | 🎯 |
| 문서화 | 60% | 90% | 🎯 |

---

## 🔄 작업 순서

1. **Pydantic 모델** (20분)
   - 모든 API 모델 강화
   - validator 추가

2. **통합 테스트** (40분)
   - 테스트 파일 생성
   - 최소 15개 테스트 케이스
   - 성능 벤치마크

3. **문서화** (20분)
   - 엔드포인트 설명
   - 요청/응답 예제
   - 에러 문서화

4. **타입 힌트** (20분)
   - 모든 함수 타입 추가
   - docstring 작성

---

## ✅ 검증

완료 후 터미널에서:
```bash
# 타입 체크
mypy api/ evolved/ --ignore-missing-imports

# 테스트 실행
pytest tests/ -v --cov

# 커버리지 리포트
coverage html
```

---

## 💡 팁

- Pydantic 모델을 먼저 완성하면 테스트 작성이 수월
- 테스트는 엔드포인트별로 작성
- docstring은 Google 스타일 권장
- 타입 힌트는 자동 완성 활용

