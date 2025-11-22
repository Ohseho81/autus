# 폴더 구조 고정 방식의 장단점 분석

> AUTUS 프로젝트에서 폴더 구조를 고정시키는 방법과 그 영향 분석

---

## 현재 상황

### 현재 경로 처리 방식

1. **동적 경로 계산**
   ```python
   ROOT = Path(__file__).resolve().parent.parent
   pack_dir = ROOT / "packs"
   ```

2. **상대 경로 하드코딩**
   ```python
   self.packs_dir = Path("packs/development")
   ```

3. **혼합 방식**
   - CLI: ROOT 기준 절대 경로
   - Runner: 상대 경로
   - Loader: 상대 경로

---

## 폴더 구조 고정 방식 옵션

### 옵션 1: 중앙화된 경로 상수 정의

**구현 방식**:
```python
# core/config.py
from pathlib import Path

# 프로젝트 루트 (고정)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 폴더 구조 상수
CORE_DIR = PROJECT_ROOT / "core"
PACKS_DIR = PROJECT_ROOT / "packs"
PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"
```

**사용 예시**:
```python
from core.config import PACKS_DEVELOPMENT_DIR

pack_path = PACKS_DEVELOPMENT_DIR / f"{pack_name}.yaml"
```

---

### 옵션 2: 설정 파일 기반 경로

**구현 방식**:
```yaml
# autus_config.yaml
paths:
  core: "core"
  packs: "packs"
  packs_development: "packs/development"
  packs_examples: "packs/examples"
  protocols: "protocols"
  server: "server"
```

**사용 예시**:
```python
from core.config import load_config
config = load_config()
pack_dir = Path(config['paths']['packs_development'])
```

---

### 옵션 3: 환경변수 기반 경로

**구현 방식**:
```python
import os
from pathlib import Path

PROJECT_ROOT = Path(os.getenv("AUTUS_ROOT", Path(__file__).parent.parent))
PACKS_DIR = Path(os.getenv("AUTUS_PACKS_DIR", PROJECT_ROOT / "packs"))
```

---

### 옵션 4: 완전 하드코딩 (절대 경로 기준)

**구현 방식**:
```python
# 모든 경로를 상수로 정의
CORE_DIR = "/path/to/autus/core"
PACKS_DIR = "/path/to/autus/packs"
```

---

## 장단점 분석

### 옵션 1: 중앙화된 경로 상수 정의

#### ✅ 장점

1. **일관성 보장**
   - 모든 모듈에서 동일한 경로 상수 사용
   - 경로 불일치 문제 근본 해결
   - 단일 진실의 원천 (Single Source of Truth)

2. **유지보수성**
   - 경로 변경 시 한 곳만 수정
   - 리팩토링 용이
   - 코드 검색으로 모든 사용처 파악 가능

3. **타입 안정성**
   - IDE 자동완성 지원
   - 정적 분석 도구 활용 가능
   - 오타 방지

4. **명확성**
   - 코드만 봐도 구조 파악 가능
   - 문서화 효과
   - 신규 개발자 온보딩 용이

5. **테스트 용이성**
   - Mock 객체로 경로 교체 가능
   - 테스트 환경에서 다른 경로 사용 가능

#### ❌ 단점

1. **초기 설정 필요**
   - `core/config.py` 파일 생성 필요
   - 모든 모듈에서 import 필요

2. **순환 참조 위험**
   - `core/config.py`가 `core/` 내부에 있으면 순환 참조 가능
   - 해결: `autus/config.py` 또는 `config.py`로 분리

3. **경직성**
   - 구조 변경 시 코드 수정 필요
   - 하지만 이는 의도된 동작 (구조 고정)

4. **의존성 증가**
   - 모든 모듈이 `core/config`에 의존
   - 하지만 이는 중앙화의 자연스러운 결과

---

### 옵션 2: 설정 파일 기반

#### ✅ 장점

1. **유연성**
   - 코드 수정 없이 경로 변경 가능
   - 배포 환경별 다른 경로 설정 가능

2. **사용자 커스터마이징**
   - 사용자가 자신의 경로 구조 사용 가능
   - 하지만 AUTUS는 프로토콜이므로 구조 고정이 더 적합

3. **설정 관리**
   - 버전 관리에서 제외 가능
   - 환경별 설정 분리

#### ❌ 단점

1. **복잡성 증가**
   - 설정 파일 로드 로직 필요
   - 에러 처리 복잡
   - 기본값 처리 필요

2. **런타임 오류 가능성**
   - 잘못된 설정 파일로 인한 오류
   - 정적 분석 어려움

3. **프로토콜 철학과 충돌**
   - AUTUS는 표준 구조를 가져야 함
   - 사용자 커스터마이징은 오히려 해로울 수 있음

4. **성능**
   - 파일 I/O 오버헤드
   - 캐싱 필요

---

### 옵션 3: 환경변수 기반

#### ✅ 장점

1. **배포 환경 대응**
   - 개발/프로덕션 환경별 경로 설정
   - Docker 등 컨테이너 환경에서 유용

2. **유연성**
   - 실행 시점에 경로 결정

#### ❌ 단점

1. **복잡성**
   - 환경변수 관리 필요
   - 기본값 처리 복잡

2. **디버깅 어려움**
   - 환경변수 누락 시 찾기 어려움
   - 로컬 개발 환경 설정 필요

3. **프로토콜 일관성 저해**
   - 환경마다 다른 구조는 표준화 저해

---

### 옵션 4: 완전 하드코딩

#### ✅ 장점

1. **단순함**
   - 추가 로직 없음
   - 즉시 사용 가능

#### ❌ 단점

1. **이식성 없음**
   - 다른 환경에서 작동 불가
   - 절대 경로는 사용 불가

---

## 권장 사항: 옵션 1 (중앙화된 경로 상수)

### 이유

1. **AUTUS의 철학과 일치**
   - "Minimal Core, Infinite Extension"
   - 표준 구조 유지 필요
   - 프로토콜로서 일관성 중요

2. **실용성**
   - 가장 간단하고 명확
   - 유지보수 용이
   - 타입 안정성

3. **확장성**
   - 나중에 설정 파일로 확장 가능
   - 현재는 상수로, 필요시 설정 파일로

### 구현 예시

```python
# autus/config.py (프로젝트 루트)
"""
AUTUS 프로젝트 경로 설정
모든 경로는 여기서 중앙 관리
"""
from pathlib import Path

# 프로젝트 루트 (현재 파일 기준)
PROJECT_ROOT = Path(__file__).resolve().parent

# 핵심 디렉토리
CORE_DIR = PROJECT_ROOT / "core"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"

# Pack 디렉토리
PACKS_DIR = PROJECT_ROOT / "packs"
PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"

# 설정 파일
AUTUS_CONFIG_FILE = PROJECT_ROOT / ".autus"

# 로그 디렉토리
LOGS_DIR = PROJECT_ROOT / "logs"
CELL_LOGS_DIR = LOGS_DIR / "cells"
```

**사용 예시**:
```python
# core/pack/runner.py
from autus.config import PACKS_DEVELOPMENT_DIR

class DevPackRunner:
    def __init__(self, ...):
        self.packs_dir = PACKS_DEVELOPMENT_DIR
```

---

## 비교표

| 방식 | 일관성 | 유지보수 | 유연성 | 복잡성 | AUTUS 적합성 |
|------|--------|----------|--------|--------|--------------|
| 옵션 1 (상수) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 옵션 2 (설정) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 옵션 3 (환경변수) | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 옵션 4 (하드코딩) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐ | ⭐ |

---

## 결론

### 폴더 구조 고정의 장점 (옵션 1 기준)

1. ✅ **일관성**: 모든 모듈에서 동일한 경로 사용
2. ✅ **유지보수성**: 한 곳만 수정하면 전체 반영
3. ✅ **명확성**: 코드만 봐도 구조 파악
4. ✅ **타입 안정성**: IDE 지원 및 오타 방지
5. ✅ **프로토콜 일관성**: 표준 구조 유지

### 폴더 구조 고정의 단점

1. ❌ **초기 설정**: config 파일 생성 필요
2. ❌ **경직성**: 구조 변경 시 코드 수정 필요 (하지만 의도된 동작)
3. ❌ **의존성**: 모든 모듈이 config에 의존

### 최종 권장사항

**옵션 1 (중앙화된 경로 상수)을 채택하되, `autus/config.py`에 배치**

이유:
- AUTUS는 프로토콜이므로 구조 고정이 적합
- 단순하고 명확하며 유지보수 용이
- 나중에 필요시 설정 파일로 확장 가능
- 순환 참조 문제 없음 (루트에 위치)

---

## 구현 체크리스트

- [ ] `autus/config.py` 생성
- [ ] 모든 경로 상수 정의
- [ ] 각 모듈에서 `from autus.config import ...` 사용
- [ ] 기존 하드코딩된 경로 제거
- [ ] 테스트 코드 업데이트
- [ ] 문서 업데이트


