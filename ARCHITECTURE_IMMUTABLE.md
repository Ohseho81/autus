# AUTUS 아키텍처 불변 규칙

> **중요**: 이 문서는 절대 변경할 수 없는 아키텍처 규칙을 정의합니다.

---

## 🚫 절대 변경 금지 사항

### 1. 폴더 구조 (Immutable)

**현재 구조 (2024-11-22 기준)**:

```
autus/
├── core/                    # 핵심 엔진 (절대 변경 금지)
│   ├── cli.py
│   ├── engine/
│   │   └── per_loop.py
│   ├── llm/
│   │   └── llm.py
│   └── pack/
│       ├── loader.py
│       ├── runner.py
│       └── openai_runner.py
│
├── protocols/               # 프로토콜 표준 (절대 변경 금지)
│   ├── workflow/
│   ├── memory/
│   ├── identity/
│   └── auth/
│
├── packs/                   # Pack 생태계 (절대 변경 금지)
│   ├── development/
│   ├── examples/
│   └── integration/
│
├── server/                  # API 서버 (절대 변경 금지)
│   ├── main.py
│   └── routes/
│
├── config.py                # 경로 통합 (절대 변경 금지)
├── CONSTITUTION.md
└── README.md
```

**규칙**:
- ❌ 새로운 최상위 디렉토리 추가 금지
- ❌ 기존 디렉토리 이름 변경 금지
- ❌ 디렉토리 이동 금지
- ✅ 하위 디렉토리 추가는 허용 (protocols/workflow/subdir 등)
- ✅ 파일 추가는 허용

---

### 2. 데이터 플로우 (Immutable)

**현재 데이터 플로우 (2024-11-22 기준)**:

```
[사용자 입력]
    ↓
[CLI (core/cli.py)]
    ↓
[PER Loop (core/engine/per_loop.py)]
    ├─ Plan: 목표 분석
    ├─ Execute: Pack System 실행
    └─ Review: 결과 검토
    ↓
[Pack System (core/pack/runner.py)]
    ├─ Pack 로드 (YAML)
    ├─ Cell 순차 실행 (LLM 호출)
    └─ Actions 실행 (파일 쓰기 등)
    ↓
[로컬 저장]
    ├─ Memory OS (protocols/memory/store.py)
    ├─ Workflow Graph (protocols/workflow/)
    └─ Identity Core (protocols/identity/)
    ↓
[결과 반환]
```

**핵심 원칙**:
- ❌ 서버로 데이터 전송 금지 (PII 제로)
- ❌ 데이터 플로우 순서 변경 금지
- ❌ 로컬 우선 원칙 위반 금지
- ✅ 로컬 저장소만 사용
- ✅ 모든 데이터는 디바이스에만 저장

---

### 3. 프로토콜 인터페이스 (Immutable)

**Workflow Graph Protocol**:
```python
# protocols/workflow/__init__.py
class WorkflowGraph:
    def validate() -> bool
    def to_json() -> str
    def from_json(json_str: str) -> WorkflowGraph
```

**Memory OS Protocol**:
```python
# protocols/memory/store.py
class MemoryStore:
    def store_preference(key, value, category)
    def get_preference(key)
    def store_pattern(pattern_type, pattern_data)
    def get_patterns(pattern_type)
    def export_to_yaml(output_path)
```

**Identity Core Protocol**:
```python
# protocols/identity/__init__.py
class IdentityCore:
    def __init__(seed: bytes)
    def generate_core() -> Tuple[int, int, int]
```

**규칙**:
- ❌ 공개 API 시그니처 변경 금지
- ❌ 메서드 이름 변경 금지
- ❌ 반환 타입 변경 금지
- ✅ 내부 구현 개선은 허용
- ✅ 새로운 메서드 추가는 허용

---

### 4. Pack 시스템 구조 (Immutable)

**Pack YAML 구조**:
```yaml
name: pack_name
version: 1.0.0
metadata:
  category: development | examples | integration
llm:
  provider: anthropic | openai
  model: ...
cells:
  - name: cell_name
    prompt: "..."
    input: previous_output
    output: output_name
actions:
  - type: write_file | log
    ...
```

**규칙**:
- ❌ Pack YAML 스키마 변경 금지
- ❌ 필수 필드 제거 금지
- ❌ Cell 실행 순서 변경 금지
- ✅ 새로운 action 타입 추가는 허용
- ✅ 선택적 필드 추가는 허용

---

### 5. 경로 시스템 (Immutable)

**config.py 구조**:
```python
PROJECT_ROOT = Path(__file__).resolve().parent
CORE_DIR = PROJECT_ROOT / "core"
PACKS_DIR = PROJECT_ROOT / "packs"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
```

**규칙**:
- ❌ 경로 상수 이름 변경 금지
- ❌ 경로 값 변경 금지
- ❌ config.py 위치 변경 금지
- ✅ 새로운 경로 상수 추가는 허용

---

## ✅ 허용되는 변경

### 1. 내부 구현 개선
- 알고리즘 최적화
- 성능 개선
- 코드 리팩토링 (인터페이스 유지)

### 2. 기능 추가
- 새로운 메서드 추가
- 새로운 Pack 추가
- 새로운 Protocol 구현

### 3. 문서화
- 문서 추가 및 개선
- 주석 추가
- 예시 코드 추가

### 4. 테스트
- 테스트 추가
- 테스트 커버리지 향상

---

## 🚨 변경 금지 체크리스트

개발 시 다음을 확인하세요:

- [ ] 폴더 구조 변경하지 않음
- [ ] 데이터 플로우 순서 변경하지 않음
- [ ] 공개 API 시그니처 변경하지 않음
- [ ] Pack YAML 스키마 변경하지 않음
- [ ] 경로 상수 변경하지 않음
- [ ] 서버로 데이터 전송하지 않음
- [ ] PII 저장하지 않음

**하나라도 체크되면 즉시 중단하고 원래대로 복구!**

---

## 📝 변경이 필요한 경우

만약 정말로 구조 변경이 필요한 경우:

1. **이 문서에 변경 사항 기록**
2. **모든 의존성 확인**
3. **하위 호환성 보장**
4. **전체 테스트 실행**
5. **문서 업데이트**

하지만 **가능한 한 변경하지 않는 것을 원칙**으로 합니다.

---

## 🎯 핵심 원칙

> **"구조는 고정, 구현은 개선"**

- 구조는 한 번 정해지면 절대 변경하지 않음
- 구현은 계속 개선 가능
- 확장은 구조 내에서만

---

*Last Updated: 2024-11-22*  
*Status: Immutable*  
*Version: 1.0.0*

