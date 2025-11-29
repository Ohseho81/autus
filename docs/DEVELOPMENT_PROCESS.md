# AUTUS 개발 프로세스 (8단계)

> "Why → How → What" 순환 구조로 글로벌·초확장·초신뢰·초효율 개발

---

## 1️⃣ 요구사항/아키텍처 정의

**목적**: 핵심 도메인, 계층, 표준, 확장성/보안/글로벌 요구사항 명확화

### AUTUS 핵심 정의
```yaml
Constitution:
  Article I: Zero Identity      # 로그인 없음
  Article II: Privacy by Arch   # PII 없음
  Article III: Meta-Circular    # AUTUS가 AUTUS 개발
  Article IV: Minimal Core      # Core < 1,500 lines
  Article V: Network Effect     # 프로토콜 표준화

Architecture:
  Layer 1 (Core):     12 Kernels    # 불변, 최소
  Layer 2 (Protocol): 12 Protocols  # 표준 규약
  Layer 3 (Pack):     47+ Packs     # 무한 확장

Triple Sphere:
  - Core Sphere:     r=2, 빨강
  - Protocol Sphere: r=5, 시안
  - Pack Sphere:     r=10, 노랑
```

### 명령어
```bash
# Constitution 검증
scripts/verify_constitution.sh

# 아키텍처 리뷰
cat ARCHITECTURE_REVIEW.md
```

---

## 2️⃣ 폴더/파일 구조 자동 생성 (스캐폴딩)

**목적**: CLI/스크립트로 표준 폴더+파일 구조를 한 번에 생성

### AUTUS 표준 구조
```
autus/
├── core/           # < 1,500 lines (Article IV)
│   ├── cli.py
│   ├── engine/per_loop.py
│   ├── llm/llm.py
│   └── pack/loader.py, runner.py
├── protocols/      # 4대 프로토콜
│   ├── identity/   # 3D Identity
│   ├── memory/     # Local Memory OS
│   ├── workflow/   # Workflow Graph
│   └── auth/       # Zero Auth (QR)
├── packs/          # 무한 확장
│   ├── development/
│   ├── security/
│   ├── ai/
│   └── ...
├── server/         # FastAPI
├── tests/          # pytest
├── scripts/        # 자동화
├── docs/           # 문서
└── static/         # 3D HUD
```

### 명령어
```bash
# 새 Pack 스캐폴딩
scripts/scaffold_pack.sh <pack_name> <category>

# 새 Protocol 스캐폴딩
scripts/scaffold_protocol.sh <protocol_name>
```

---

## 3️⃣ 내용 삽입 (코드+테스트+문서 동시)

**목적**: TDD/문서주도 개발(Doc-Driven Dev) 병행

### 개발 순서
```
1. 테스트 먼저 작성 (TDD)
2. 코드 구현
3. Docstring 작성
4. 예제/튜토리얼 추가
```

### 명령어
```bash
# Meta-Circular: AUTUS가 코드 생성
python core/pack/runner.py architect_pack '{"feature": "..."}'
python core/pack/runner.py codegen_pack '{"file": "...", "purpose": "..."}'
python core/pack/runner.py testgen_pack '{"file": "..."}'
```

---

## 4️⃣ 자동 연결/통합

**목적**: 라우터/모듈/3D HUD/테스트가 자동으로 연결

### 자동 등록 시스템
```python
# server/main.py - 동적 Pack 라우터 등록
def load_all_pack_routes(app):
    for pack in discover_packs():
        app.include_router(pack.router)

# 3D HUD - 자동 노드 등록
@router.get("/api/3d/state")
async def get_state():
    return {
        "layer1": get_core_nodes(),
        "layer2": get_protocol_nodes(),
        "layer3": get_pack_nodes()  # 자동 발견
    }
```

### 명령어
```bash
# 연결성 검증
scripts/verify_connections.sh

# 의존성 시각화
scripts/visualize_deps.sh
```

---

## 5️⃣ 정적 분석/코드 품질 자동화

**목적**: lint, 타입체크, 코드포매팅, 보안스캔 자동 실행

### 도구

| 도구 | 용도 |
|------|------|
| ruff | lint + format |
| mypy | 타입 체크 |
| bandit | 보안 스캔 |
| pre-commit | 커밋 전 자동 실행 |

### 명령어
```bash
# 전체 품질 검사
scripts/quality_check.sh

# 또는 개별 실행
.venv/bin/ruff check .
.venv/bin/mypy core/
.venv/bin/bandit -r core/
```

---

## 6️⃣ 성능/부하/실시간 테스트

**목적**: 단위/통합/부하/3D 렌더링 등 성능 테스트 자동화

### 테스트 레벨
```
Level 1: 단위 테스트 (pytest)
Level 2: 통합 테스트 (pytest + fixtures)
Level 3: 부하 테스트 (locust)
Level 4: 3D 렌더링 테스트 (Playwright)
Level 5: 실시간 WebSocket 테스트
```

### 명령어
```bash
# 전체 테스트
scripts/autus_doctor.sh

# 레이어별 테스트
PYTHONPATH=. pytest tests/protocols/identity -q  # 100%
PYTHONPATH=. pytest tests/protocols/workflow -q
PYTHONPATH=. pytest tests/protocols/memory -q
PYTHONPATH=. pytest tests/protocols/auth -q

# 부하 테스트
locust -f tests/load/locustfile.py
```

---

## 7️⃣ 글로벌화/문서/마켓 연동

**목적**: i18n, 공식 문서/SDK, 마켓플레이스 연동

### 글로벌화 전략
```yaml
i18n:
  - ko (Korean)
  - en (English)
  - ja (Japanese)
  - zh (Chinese)

Documentation:
  - docs.autus.ai
  - SDK: Python, JavaScript
  - API Reference

Marketplace:
  - Pack Store
  - Protocol Registry
```

### 명령어
```bash
# 문서 빌드
scripts/build_docs.sh

# i18n 추출
scripts/extract_i18n.sh
```

---

## 8️⃣ CI/CD 파이프라인 통합

**목적**: 커밋/PR마다 자동 검증·배포

### 파이프라인 단계
```yaml
# .github/workflows/ci.yml
name: AUTUS CI

on: [push, pull_request]

jobs:
  test:
    steps:
      - 1️⃣ Constitution 검증
      - 2️⃣ 구조 검증
      - 3️⃣ 정적 분석 (ruff, mypy)
      - 4️⃣ 테스트 (pytest)
      - 5️⃣ 보안 스캔 (bandit)
      - 6️⃣ 커버리지 리포트
      
  deploy:
    needs: test
    steps:
      - 7️⃣ 문서 빌드
      - 8️⃣ 배포
```

### 명령어
```bash
# 로컬에서 CI 시뮬레이션
scripts/ci_local.sh
```

---

## 📋 Quick Reference

| 단계 | 핵심 명령 |
|------|----------|
| 1. 정의 | `cat CONSTITUTION.md` |
| 2. 스캐폴딩 | `scripts/scaffold_pack.sh` |
| 3. 개발 | `runner.py codegen_pack` |
| 4. 연결 | `scripts/verify_connections.sh` |
| 5. 품질 | `scripts/quality_check.sh` |
| 6. 테스트 | `scripts/autus_doctor.sh` |
| 7. 글로벌 | `scripts/build_docs.sh` |
| 8. CI/CD | `scripts/ci_local.sh` |

---

## 🔄 개발 루프
```
┌─────────────────────────────────────────┐
│                                         │
│  1.정의 → 2.구조 → 3.코드 → 4.연결      │
│     ↑                          ↓        │
│     └── 8.CI ← 7.글로벌 ← 6.테스트 ← 5.품질
│                                         │
└─────────────────────────────────────────┘
```

**"Why → How → What"의 완전 자동화 순환 구조**
