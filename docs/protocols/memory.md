# AUTUS Local Memory OS Protocol

> **Article II: Privacy by Architecture**
> 모든 개인 데이터는 로컬 디바이스에만 저장됩니다. 서버 동기화 없음. GDPR 자동 준수.

---

## 개요

AUTUS Local Memory OS Protocol은 **로컬 우선(Local-First)** 메모리 저장소입니다. 사용자의 선호도, 행동 패턴, 컨텍스트를 완전히 로컬 디바이스에 저장하며, **PII(Personally Identifiable Information) 저장을 구조적으로 차단**합니다.

### 핵심 원칙

1. **로컬 우선**: 모든 데이터는 로컬 디바이스에만 저장
2. **PII 제로**: 이메일, 이름, ID 등 개인 식별 정보 저장 불가
3. **프라이버시 by 설계**: 정책이 아닌 아키텍처로 보장
4. **표준 형식**: YAML로 내보내기 가능한 표준 형식

---

## 아키텍처

```
┌─────────────────────────────────────┐
│   MemoryStore (DuckDB Backend)     │
├─────────────────────────────────────┤
│  Preferences  │  Patterns  │ Context│
│  (timezone)   │  (behavior) │ (temp) │
│  (language)   │  (style)    │        │
│  (work_hours) │             │        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   .autus/memory/memory.db           │
│   (로컬 DuckDB 데이터베이스)          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│   .autus/memory.yaml                │
│   (표준 YAML 형식으로 내보내기)       │
└─────────────────────────────────────┘
```

---

## API Reference

### MemoryStore 클래스

#### 초기화

```python
from protocols.memory.store import MemoryStore

store = MemoryStore(db_path=".autus/memory/memory.db")
```

**매개변수:**
- `db_path` (str, optional): DuckDB 데이터베이스 파일 경로. 기본값: `.autus/memory/memory.db`

**특징:**
- 데이터베이스 파일이 없으면 자동 생성
- 스키마가 없으면 자동 초기화
- 디렉토리가 없으면 자동 생성

---

### Preferences (선호도)

#### `store_preference(key: str, value: Any, category: str) -> None`

사용자 선호도를 저장합니다.

**매개변수:**
- `key` (str): 선호도 키 (예: "timezone", "language")
- `value` (Any): 선호도 값 (문자열, 숫자, 딕셔너리, 리스트 등)
- `category` (str): 카테고리 (예: "system", "ui", "behavior")

**예외:**
- `ValueError`: PII 키워드가 포함된 경우 (email, name, user_id 등)

**예제:**
```python
# 기본 선호도
store.store_preference("timezone", "Asia/Seoul", "system")
store.store_preference("language", "ko", "system")

# 복잡한 값
ui_settings = {
    "theme": "dark",
    "font_size": 14,
    "notifications": True
}
store.store_preference("ui_settings", ui_settings, "ui")
```

#### `get_preference(key: str) -> Optional[Any]`

선호도를 조회합니다.

**매개변수:**
- `key` (str): 조회할 선호도 키

**반환값:**
- `Optional[Any]`: 선호도 값. 없으면 `None`

**예제:**
```python
timezone = store.get_preference("timezone")
# "Asia/Seoul"

nonexistent = store.get_preference("nonexistent")
# None
```

---

### Patterns (행동 패턴)

#### `store_pattern(pattern_type: str, data: Dict[str, Any]) -> None`

행동 패턴을 저장합니다.

**매개변수:**
- `pattern_type` (str): 패턴 타입 (예: "interaction_style", "work_hours")
- `data` (Dict[str, Any]): 패턴 데이터

**예제:**
```python
# 상호작용 스타일
store.store_pattern("interaction_style", {
    "response_time": "fast",
    "verbosity": "medium"
})

# 작업 시간
store.store_pattern("work_hours", {
    "start": "09:00",
    "end": "18:00"
})
```

#### `get_patterns(pattern_type: Optional[str] = None) -> List[Dict[str, Any]]`

행동 패턴을 조회합니다.

**매개변수:**
- `pattern_type` (str, optional): 특정 타입만 조회. `None`이면 모든 패턴 조회

**반환값:**
- `List[Dict[str, Any]]`: 패턴 리스트. 각 패턴은 `{"type": str, "data": dict, "frequency": int}` 형식

**예제:**
```python
# 모든 패턴 조회
all_patterns = store.get_patterns()
# [{"type": "interaction_style", "data": {...}, "frequency": 1}, ...]

# 특정 타입만 조회
work_patterns = store.get_patterns("work_hours")
# [{"type": "work_hours", "data": {"start": "09:00", ...}, "frequency": 1}]
```

---

### Context (컨텍스트)

#### `store_context(context_type: str, value: Any, expires_at: Optional[str] = None) -> None`

임시 컨텍스트를 저장합니다.

**매개변수:**
- `context_type` (str): 컨텍스트 타입 (예: "current_task", "session_id")
- `value` (Any): 컨텍스트 값
- `expires_at` (str, optional): 만료 시간 (ISO 형식). `None`이면 만료 없음

**예제:**
```python
# 기본 컨텍스트
store.store_context("current_task", "implementing_memory")

# 만료 시간이 있는 컨텍스트
from datetime import datetime, timedelta
expires = (datetime.now() + timedelta(hours=1)).isoformat()
store.store_context("temp_key", "temp_value", expires)
```

#### `get_context(context_type: str) -> Optional[Any]`

컨텍스트를 조회합니다.

**매개변수:**
- `context_type` (str): 조회할 컨텍스트 타입

**반환값:**
- `Optional[Any]`: 컨텍스트 값. 없거나 만료되었으면 `None`

**예제:**
```python
current_task = store.get_context("current_task")
# "implementing_memory"
```

---

### Export (내보내기)

#### `export_to_yaml(output_path: str) -> None`

메모리를 표준 YAML 형식으로 내보냅니다.

**매개변수:**
- `output_path` (str): 출력 파일 경로

**예제:**
```python
store.export_to_yaml(".autus/memory.yaml")
```

**출력 형식:**
```yaml
preferences:
  timezone: "Asia/Seoul"
  language: "ko"
  ui_settings:
    theme: "dark"
    font_size: 14

patterns:
  interaction_style:
    response_time: "fast"
    verbosity: "medium"
  work_hours:
    start: "09:00"
    end: "18:00"

context:
  current_task: "implementing_memory"
```

---

### Connection Management

#### `close() -> None`

데이터베이스 연결을 닫습니다.

**예제:**
```python
store = MemoryStore()
# ... 작업 수행 ...
store.close()
```

---

## PII 차단 메커니즘

MemoryStore는 **구조적으로 PII 저장을 차단**합니다. 다음 키워드가 포함된 키는 저장할 수 없습니다:

- `email`
- `name`
- `user_id`
- `phone`
- `address`
- `ssn` (Social Security Number)
- `credit_card`
- `password`

**예제:**
```python
# ❌ 차단됨
store.store_preference("email", "user@example.com", "contact")
# ValueError: PII storage prohibited

# ❌ 차단됨
store.store_preference("user_name", "John Doe", "profile")
# ValueError: PII storage prohibited

# ✅ 허용됨
store.store_preference("timezone", "Asia/Seoul", "system")
store.store_preference("work_hours", "09:00-18:00", "behavior")
```

---

## 사용 예제

### 기본 사용법

```python
from protocols.memory.store import MemoryStore

# 초기화
store = MemoryStore()

# 선호도 저장
store.store_preference("timezone", "Asia/Seoul", "system")
store.store_preference("language", "ko", "system")

# 선호도 조회
timezone = store.get_preference("timezone")
print(f"Timezone: {timezone}")  # "Asia/Seoul"

# 패턴 저장
store.store_pattern("interaction_style", {
    "response_time": "fast",
    "verbosity": "medium"
})

# 패턴 조회
patterns = store.get_patterns("interaction_style")
print(patterns)

# 컨텍스트 저장
store.store_context("current_task", "implementing_memory")

# 컨텍스트 조회
task = store.get_context("current_task")
print(f"Current task: {task}")  # "implementing_memory"

# YAML로 내보내기
store.export_to_yaml(".autus/memory.yaml")

# 연결 닫기
store.close()
```

### 복잡한 데이터 저장

```python
# 딕셔너리 저장
ui_settings = {
    "theme": "dark",
    "font_size": 14,
    "notifications": True,
    "sidebar": {
        "position": "left",
        "width": 250
    }
}
store.store_preference("ui_settings", ui_settings, "ui")

# 리스트 저장
favorite_tools = ["cursor", "vscode", "vim"]
store.store_preference("favorite_tools", favorite_tools, "tools")

# 조회
settings = store.get_preference("ui_settings")
print(settings["theme"])  # "dark"
```

---

## 프라이버시 보장

### 구조적 보장

1. **로컬 저장**: 모든 데이터는 로컬 디바이스에만 저장
2. **PII 차단**: 키워드 기반 자동 차단
3. **서버 동기화 없음**: 네트워크 전송 없음
4. **표준 형식**: YAML로 내보내기 가능 (사용자 제어)

### GDPR 준수

- **데이터 소유권**: 사용자가 모든 데이터 소유
- **데이터 이동**: YAML로 언제든지 내보내기 가능
- **데이터 삭제**: 데이터베이스 파일 삭제로 완전 삭제
- **투명성**: 오픈 소스 코드로 모든 동작 확인 가능

---

## 데이터베이스 스키마

### Preferences 테이블

```sql
CREATE TABLE preferences (
    key TEXT PRIMARY KEY,
    value TEXT,  -- JSON 직렬화
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Patterns 테이블

```sql
CREATE TABLE patterns (
    pattern_type TEXT PRIMARY KEY,
    data TEXT,  -- JSON 직렬화
    frequency INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Context 테이블

```sql
CREATE TABLE context (
    context_type TEXT PRIMARY KEY,
    value TEXT,  -- JSON 직렬화
    expires_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 표준 형식 (YAML)

AUTUS Local Memory OS는 표준 YAML 형식으로 데이터를 내보낼 수 있습니다:

```yaml
preferences:
  timezone: "Asia/Seoul"
  language: "ko"
  ui_settings:
    theme: "dark"
    font_size: 14

patterns:
  interaction_style:
    response_time: "fast"
    verbosity: "medium"
  work_hours:
    start: "09:00"
    end: "18:00"

context:
  current_task: "implementing_memory"
```

이 형식은 다른 AUTUS 구현체와 호환됩니다.

---

## 구현 세부사항

### DuckDB 백엔드

- **로컬 파일**: SQLite와 유사한 단일 파일 데이터베이스
- **성능**: 빠른 읽기/쓰기 성능
- **표준 SQL**: SQLite 호환 SQL 문법
- **경량**: 작은 메모리 사용량

### JSON 직렬화

복잡한 데이터 타입(딕셔너리, 리스트)은 JSON으로 직렬화되어 저장됩니다:

```python
# 저장 시
value = {"theme": "dark", "font_size": 14}
json_value = json.dumps(value)
# DB에 저장: '{"theme": "dark", "font_size": 14}'

# 조회 시
json_value = store.conn.execute("SELECT value FROM preferences WHERE key = ?", ("ui_settings",)).fetchone()[0]
value = json.loads(json_value)
# {"theme": "dark", "font_size": 14}
```

---

## 제한사항

1. **PII 저장 불가**: 이메일, 이름 등 개인 식별 정보는 저장할 수 없음
2. **로컬만**: 서버 동기화 기능 없음 (의도적 설계)
3. **단일 디바이스**: 기본적으로 단일 디바이스에서만 작동

---

## 참고 자료

- [AUTUS Constitution](../CONSTITUTION.md) - Article II: Privacy by Architecture
- [Workflow Graph Protocol](./workflow.md) - 워크플로우 표준
- [Zero Identity Protocol](../protocols/identity/core.py) - 아이덴티티 시스템

---

## 라이선스

AUTUS Protocol은 오픈 소스 프로토콜입니다. 자유롭게 사용하고 개선할 수 있습니다.

---

**Last Updated**: 2024-11-22
**Version**: 0.5.0
**Status**: ✅ Core Complete (50%)
