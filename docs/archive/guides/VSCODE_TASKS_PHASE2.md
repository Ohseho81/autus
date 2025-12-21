# 🟠 PHASE 2: VS Code 작업 (성능 최적화)

> **상태**: Phase 1 완료 후
> **시간**: 1.5시간
> **목표**: API 응답시간 66% 개선 (150ms → 50ms)

---

## 🎯 작업 목록

### Task 1️⃣: 캐싱 레이어 개선 (`api/cache.py`)
**위치**: Lines 전체  
**목표**: TTL 전략 정의 + 태그 기반 무효화

```python
# 파일 상단에 추가
from enum import Enum
from typing import Optional, Set

class CacheStrategy(Enum):
    NEVER = None           # 캐시 안 함
    SHORT = 300           # 5분
    MEDIUM = 3600         # 1시간
    LONG = 86400          # 24시간
    VERY_LONG = 604800    # 7일

# 기존 캐싱 함수 개선
@cached(ttl=3600, strategy="MEDIUM")
async def get_user_profile(user_id: str):
    pass

# TTL 기반 무효화 추가
async def cache_invalidate_by_prefix(prefix: str):
    """Invalidate all keys with given prefix"""
    pass
```

**체크리스트**:
- [ ] CacheStrategy Enum 정의
- [ ] TTL 상수 정의
- [ ] 태그 기반 무효화 함수 추가
- [ ] 캐시 워밍 메커니즘 추가

---

### Task 2️⃣: 메모리 인덱싱 (`protocols/memory/local_memory.py`)
**목표**: O(n) → O(1) 성능 개선

```python
# 기존 구조 개선
class LocalMemory:
    def __init__(self):
        self.data = {}  # 원본 데이터
        
        # 인덱스 추가
        self.indexes = {
            "id": {},           # id -> item
            "type": {},         # type -> [items]
            "owner": {},        # owner -> [items]
            "timestamp": {}     # timestamp -> item
        }
    
    def query_by_type(self, type_name: str):
        """O(1) type 기반 조회"""
        return self.indexes["type"].get(type_name, [])
    
    def query_by_owner(self, owner: str):
        """O(1) owner 기반 조회"""
        return self.indexes["owner"].get(owner, [])
```

**체크리스트**:
- [ ] indexes 딕셔너리 추가
- [ ] _update_indexes() 메서드 추가
- [ ] query_by_type() 메서드 추가
- [ ] query_by_owner() 메서드 추가
- [ ] 성능 비교 테스트

---

### Task 3️⃣: 이벤트 처리 배압 (`evolved/kafka_consumer_service.py`)
**목표**: 배압 처리로 안정성 향상

```python
# KafkaConsumerService 클래스에 추가
class OptimizedKafkaConsumerService:
    def __init__(self, batch_size=100, timeout=5):
        self.batch = []
        self.batch_size = batch_size
        self.timeout = timeout
    
    async def process_with_backpressure(self, event):
        """배압 처리 포함 이벤트 처리"""
        # 큐가 가득 차면 대기
        while len(self.batch) >= self.batch_size:
            await asyncio.sleep(0.1)
        
        self.batch.append(event)
        if len(self.batch) >= self.batch_size:
            await self.flush()
    
    async def flush(self):
        """배치 처리"""
        if self.batch:
            await self._process_batch(self.batch)
            self.batch = []
```

**체크리스트**:
- [ ] batch_size, timeout 설정
- [ ] process_with_backpressure() 메서드 추가
- [ ] flush() 메서드 구현
- [ ] 배압 테스트

---

### Task 4️⃣: Celery 설정 최적화 (`evolved/celery_app.py`)
**목표**: 타임아웃 + 재시도 정책 설정

```python
# celery_app.py 설정 부분 업데이트
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    
    # 타임아웃 설정
    task_time_limit=30 * 60,  # 30분 하드 타임아웃
    task_soft_time_limit=25 * 60,  # 25분 소프트 타임아웃
    
    # 재시도 정책
    retry_policy={
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.2,
    }
)
```

**체크리스트**:
- [ ] task_time_limit 설정
- [ ] task_soft_time_limit 설정
- [ ] retry_policy 구성
- [ ] 작업 모니터링 개선

---

## 📊 성능 목표

| 메트릭 | 현재 | 목표 | 개선도 |
|--------|------|------|--------|
| API 응답시간 | 150ms | 50ms | 66% ↓ |
| 쿼리 성능 | O(n) | O(1) | 100배 ↑ |
| 캐시 히트율 | 60% | 85% | 42% ↑ |
| 에러율 | 2.5% | 0.5% | 80% ↓ |

---

## 🔄 작업 순서

1. **캐싱 개선** (30분)
   - TTL 전략 정의
   - 태그 기반 무효화

2. **메모리 인덱싱** (35분)
   - 인덱스 구조 추가
   - 쿼리 메서드 최적화

3. **배압 처리** (25분)
   - 배치 처리 구현
   - 안정성 테스트

4. **Celery 최적화** (15분)
   - 타임아웃 설정
   - 재시도 정책

---

## ⏱️ 시간 할당

```
캐싱 개선      30분 ███░░░░░░░░░░░░░░░░░
메모리 인덱싱  35분 ████░░░░░░░░░░░░░░░░
배압 처리      25분 ██░░░░░░░░░░░░░░░░░░
Celery 최적화  15분 █░░░░░░░░░░░░░░░░░░░
─────────────────────────────────────────
총 1.5시간    105분
```

---

## ✅ 검증 체크리스트

완료 후 터미널에서:
```bash
# 성능 벤치마크
sh TERMINAL_COMMANDS_PHASE2.sh

# 캐시 히트율 확인
curl http://localhost:8000/cache/stats

# 작업 큐 상태
curl http://localhost:8000/tasks/queue/stats

# 메트릭 확인
curl http://localhost:8000/metrics
```

---

## 💡 팁

- 각 수정 후 즉시 저장 (Ctrl+S)
- 서버 재시작 필요 (Ctrl+C → `python main.py`)
- 변경 전후 성능 비교로 개선 확인

