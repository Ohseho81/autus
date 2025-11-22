# AUTUS 전체 구조 점검 보고서

> 작성일: 2024
> 목적: AUTUS 프로젝트의 전체 구조, 워크플로우, 팩/모듈 개념 점검

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [핵심 모듈 상세](#핵심-모듈-상세)
4. [팩(Pack) 시스템](#팩pack-시스템)
5. [워크플로우](#워크플로우)
6. [프로토콜](#프로토콜)
7. [현재 상태 및 이슈](#현재-상태-및-이슈)

---

## 프로젝트 개요

### AUTUS란?

**AUTUS는 프로토콜이다.** 애플리케이션이 아닌, 개인 AI 자동화를 위한 표준 프로토콜을 목표로 한다.

### 핵심 철학 (Constitution)

1. **Article I: Zero Identity** - 로그인/계정 시스템 없음, 3D Living Form Identity
2. **Article II: Privacy by Architecture** - 구조적으로 프라이버시 보장
3. **Article III: Meta-Circular Development** - AUTUS가 AUTUS를 개발
4. **Article IV: Minimal Core, Infinite Extension** - 최소 코어, 무한 확장
5. **Article V: Network Effect as Moat** - 네트워크 효과를 통한 표준화

---

## 전체 아키텍처

```
autus/
├── core/                    # 최소 핵심 엔진 (< 500 lines 목표)
│   ├── cli.py              # CLI 인터페이스
│   ├── engine/
│   │   └── per_loop.py     # PER Loop (Plan-Execute-Review)
│   ├── llm/
│   │   └── llm.py          # LLM 통합 (Claude API)
│   └── pack/
│       ├── loader.py       # Pack 로더
│       ├── runner.py       # Pack 실행기 (Anthropic)
│       └── openai_runner.py # Pack 실행기 (OpenAI)
│
├── protocols/              # AUTUS 프로토콜 표준
│   ├── workflow/           # 워크플로우 그래프 표준
│   ├── memory/             # 로컬 메모리 OS
│   ├── identity/           # Zero Identity (3D Core)
│   │   └── core.py        # IdentityCore 구현
│   └── auth/               # Zero Auth 프로토콜
│
├── packs/                  # Pack 생태계
│   ├── development/        # 메타-순환 개발 팩
│   │   ├── architect_pack.yaml
│   │   ├── codegen_pack.yaml
│   │   ├── testgen_pack.yaml
│   │   └── pipeline_pack.yaml
│   ├── examples/           # 예제 팩
│   │   ├── weather_pack.yaml
│   │   ├── github_pack.yaml
│   │   └── ...
│   └── integration/        # SaaS 연결 팩
│
├── server/                 # API 서버
│   ├── main.py            # FastAPI 메인
│   └── routes/            # API 라우트
│
├── autus                   # CLI 실행 스크립트
├── CONSTITUTION.md         # 5가지 불변 원칙
├── README.md              # 프로젝트 문서
└── pyproject.toml         # 프로젝트 설정
```

---

## 핵심 모듈 상세

### 1. CLI (`core/cli.py`)

**역할**: 사용자 인터페이스 제공

**주요 기능**:
- `autus init [project]` - 프로젝트 초기화
- `autus run <command>` - Cell 실행 (DSL)
- `autus create <description>` - LLM으로 Cell 생성
- `autus list` - Cell 목록
- `autus packs` - Pack 목록

**현재 상태**:
- ✅ 기본 CLI 구조 완성
- ⚠️ 경로 문제: `01_core`, `02_packs` 참조하지만 실제는 `core`, `packs`
- ⚠️ 동적 모듈 로드 방식 사용 (autusfile, dsl 모듈)

### 2. PER Loop (`core/engine/per_loop.py`)

**역할**: Plan → Execute → Review 사이클 실행

**클래스**: `PERLoop`

**주요 메서드**:
- `plan(goal: str)` - 목표를 단계별 계획으로 분해
- `execute(plan: Dict)` - 계획 실행
- `review(result: Dict)` - 결과 분석 및 개선점 도출
- `run(goal: str)` - 완전한 PER 사이클 실행

**동작 방식**:
1. 목표를 키워드 분석하여 기본 단계 생성
2. HTTP 요청, 파이프라인 등 패턴 감지
3. DSL을 통해 실행
4. 성공률 계산 및 개선점 제안

**현재 상태**:
- ✅ 기본 PER Loop 구현 완료
- ⚠️ DSL 모듈 동적 로드 (경로 문제 가능성)
- ⚠️ 계획 생성이 휴리스틱 기반 (LLM 미사용)

### 3. LLM 통합 (`core/llm/llm.py`)

**역할**: Claude API를 통한 LLM 기능 제공

**주요 함수**:
- `generate_cell(description: str)` - Cell DSL 생성
- `execute(intention: str, context)` - 의도 실행

**현재 상태**:
- ✅ Claude API 통합 완료
- ✅ Anthropic SDK 사용
- ⚠️ OpenAI 지원 없음 (별도 runner에만 존재)

### 4. Pack 시스템

#### 4.1 Pack Loader (`core/pack/loader.py`)

**역할**: Pack YAML 파일 로드

**주요 함수**:
- `load_pack(pack_name: str)` - Pack 로드
- `list_packs()` - 사용 가능한 Pack 목록
- `get_cell_from_pack(pack_name, cell_name)` - 특정 Cell 가져오기

**현재 상태**:
- ✅ 기본 로더 구현
- ⚠️ 경로: `02_packs/` 하드코딩 (실제는 `packs/`)

#### 4.2 Pack Runner (`core/pack/runner.py`)

**역할**: Development Pack 실행 (Anthropic Claude)

**클래스**: `DevPackRunner`

**주요 메서드**:
- `load_pack(pack_name)` - Pack YAML 로드
- `execute_cell(pack, cell_name, inputs)` - Cell 실행 (Claude API)
- `execute_pack(pack_name, inputs)` - Pack 전체 실행
- `execute_actions(pack, results, inputs)` - 액션 실행 (파일 쓰기 등)

**동작 방식**:
1. Pack YAML 로드
2. Cells 순차 실행 (이전 출력을 다음 입력으로)
3. 각 Cell은 Claude API 호출
4. Actions 실행 (write_file, log 등)

**현재 상태**:
- ✅ Anthropic Claude 통합
- ⚠️ 경로: `02_packs/dev/` 하드코딩

#### 4.3 OpenAI Runner (`core/pack/openai_runner.py`)

**역할**: Development Pack 실행 (OpenAI GPT-4)

**현재 상태**:
- ✅ OpenAI 통합
- ✅ 경로: `packs/development/` (올바름)
- ⚠️ Anthropic 버전과 중복 기능

---

## 팩(Pack) 시스템

### Pack 개념

**Pack은 AUTUS의 확장 단위**이다. 모든 기능은 Pack으로 구현되며, 코어는 최소한으로 유지된다.

### Pack 구조 (YAML)

```yaml
name: pack_name
version: 1.0.0
description: Pack 설명

metadata:
  category: development | integration | example
  requires_llm: true | false

llm:
  provider: anthropic | openai
  model: claude-sonnet-4-20250514 | gpt-4
  temperature: 0.3
  max_tokens: 8000

cells:
  - name: cell_name
    prompt: "프롬프트 템플릿 {변수}"
    input: 이전_cell_output  # 선택적
    output: output_name

actions:
  - type: write_file
    path: "경로/{변수}"
    content: "{템플릿}"
    create_dirs: true
  - type: log
    message: "{메시지}"
```

### Pack 종류

#### 1. Development Packs (메타-순환 개발)

**위치**: `packs/development/`

##### `architect_pack.yaml`
- **목적**: 기능 분석 및 개발 계획 생성
- **Cells**:
  - `analyze_feature`: 기능 분석
  - `create_file_plan`: 파일 계획 생성
  - `create_implementation_order`: 구현 순서 생성

##### `codegen_pack.yaml`
- **목적**: Python 코드 생성
- **Cells**:
  - `generate_code`: 코드 생성
  - `validate_syntax`: 문법 검증
  - `add_docstrings`: 문서화

##### `testgen_pack.yaml`
- **목적**: pytest 테스트 생성
- **Cells**:
  - `analyze_code`: 코드 분석
  - `generate_test_cases`: 테스트 케이스 설계
  - `generate_test_code`: pytest 코드 생성

##### `pipeline_pack.yaml`
- **목적**: 전체 개발 파이프라인 오케스트레이션
- **워크플로우**:
  1. architect_pack으로 계획
  2. codegen_pack으로 코드 생성
  3. testgen_pack으로 테스트 생성
  4. 테스트 실행
  5. 실패시 자동 수정

#### 2. Example Packs

**위치**: `packs/examples/`

##### `weather_pack.yaml`
```yaml
cells:
  current_weather:
    command: "GET https://api.openweathermap.org/data/2.5/weather?q=$city&appid=$api_key"
```

##### `github_pack.yaml`
```yaml
cells:
  user_info:
    command: "GET https://api.github.com/users/$user"
```

**특징**:
- 간단한 HTTP API 래퍼
- DSL 기반 명령어
- 변수 치환 지원

#### 3. Integration Packs

**위치**: `packs/integration/`

**목적**: SaaS 서비스 연결 (현재 비어있음)

---

## 워크플로우

### 1. 일반 Cell 실행 워크플로우

```
사용자 입력
    ↓
CLI (core/cli.py)
    ↓
DSL 파싱
    ↓
PER Loop
    ├─ Plan: 목표 분석
    ├─ Execute: DSL 실행
    └─ Review: 결과 검토
    ↓
결과 반환
```

### 2. Development Pack 실행 워크플로우

```
사용자: "기능 추가 요청"
    ↓
openai_runner.py 또는 runner.py
    ↓
Pack YAML 로드
    ↓
Cell 순차 실행
    ├─ Cell 1: LLM 호출 → 결과1
    ├─ Cell 2: LLM 호출 (결과1 입력) → 결과2
    └─ Cell N: LLM 호출 → 결과N
    ↓
Actions 실행
    ├─ write_file: 파일 생성
    └─ log: 로그 출력
    ↓
최종 결과 반환
```

### 3. Meta-Circular Development 워크플로우

```
사용자: "3D Identity System 추가"
    ↓
pipeline_pack 실행
    ↓
1. architect_pack
   └─ 기능 분석 → 계획 생성
    ↓
2. codegen_pack (각 파일마다)
   └─ 코드 생성 → 파일 작성
    ↓
3. testgen_pack (각 파일마다)
   └─ 테스트 생성 → 테스트 파일 작성
    ↓
4. 테스트 실행
    ↓
5. 실패시 자동 수정 (최대 3회)
    ↓
완료: AUTUS가 AUTUS를 개발함
```

### 4. Identity 워크플로우 (프로토콜)

```
시드 생성 (32 bytes, 로컬)
    ↓
IdentityCore.generate_core()
    ↓
SHA256 해시
    ↓
3D 좌표 (X, Y, Z) 생성
    ↓
로컬 저장 (서버 전송 없음)
```

---

## 프로토콜

### 1. Identity Protocol

**위치**: `protocols/identity/core.py`

**구현**: `IdentityCore` 클래스

**특징**:
- 32바이트 시드로부터 3D 좌표 생성
- SHA256 해시 사용
- 로컬 전용 (서버 전송 없음)

**현재 상태**:
- ✅ 기본 구현 완료
- ⚠️ 3D 시각화 미구현
- ⚠️ Surface (진화하는 특성) 미구현

### 2. Workflow Protocol

**위치**: `protocols/workflow/`

**목적**: `.autus.graph.json` 표준 정의

**현재 상태**:
- ⚠️ 구현 없음 (디렉토리만 존재)

### 3. Memory Protocol

**위치**: `protocols/memory/`

**목적**: `.autus.memory.yaml` 표준 정의

**현재 상태**:
- ⚠️ 구현 없음 (디렉토리만 존재)

### 4. Auth Protocol

**위치**: `protocols/auth/`

**목적**: Zero Auth 프로토콜 (QR 기반 동기화)

**현재 상태**:
- ⚠️ 구현 없음 (디렉토리만 존재)

---

## 서버

### FastAPI 서버 (`server/main.py`)

**역할**: REST API 제공

**엔드포인트**:
- `GET /` - 루트
- `GET /health` - 헬스 체크
- `GET /api/cells` - Cell 목록
- `GET /api/packs` - Pack 목록

**현재 상태**:
- ✅ 기본 서버 구조 완성
- ⚠️ 경로 문제: `02_packs/builtin` 참조 (실제는 `packs/development`)
- ⚠️ routes 디렉토리 비어있음

---

## 현재 상태 및 이슈

### ✅ 완료된 부분

1. **핵심 구조**
   - CLI 기본 구조
   - PER Loop 구현
   - Pack 시스템 기본 구조
   - LLM 통합 (Claude, OpenAI)

2. **Development Packs**
   - architect_pack
   - codegen_pack
   - testgen_pack
   - pipeline_pack

3. **Example Packs**
   - weather_pack
   - github_pack
   - 기타 예제 팩들

4. **Identity Protocol**
   - IdentityCore 기본 구현

### ⚠️ 발견된 이슈

1. **경로 불일치**
   - CLI에서 `01_core`, `02_packs` 참조하지만 실제는 `core`, `packs`
   - Pack loader에서 `02_packs/` 하드코딩
   - Server에서 `02_packs/builtin` 참조

2. **모듈 구조**
   - `autusfile.py`, `dsl.py` 모듈이 CLI에서 참조되지만 실제 파일 없음
   - 동적 로드 방식으로 우회 시도 중

3. **프로토콜 미구현**
   - Workflow Protocol
   - Memory Protocol
   - Auth Protocol

4. **중복 코드**
   - `runner.py` (Anthropic)와 `openai_runner.py` (OpenAI) 중복
   - 통합 필요

5. **의존성**
   - `requirements.txt`에 `openai` 패키지 없음 (openai_runner.py 사용시 필요)

### 🔄 개선 제안

1. **경로 통일**
   - 모든 경로를 `core/`, `packs/`로 통일
   - 또는 `01_core/`, `02_packs/`로 통일

2. **모듈 구조 정리**
   - `autusfile.py`, `dsl.py` 구현 또는 제거
   - 정적 import로 변경

3. **Pack Runner 통합**
   - 단일 Runner 클래스로 통합
   - Provider 선택 가능하도록

4. **프로토콜 구현**
   - Workflow Graph Standard
   - Local Memory OS
   - Zero Auth Protocol

5. **테스트**
   - 각 모듈별 단위 테스트 추가
   - 통합 테스트 추가

---

## 요약

### 강점

- ✅ 명확한 철학과 구조 (Constitution)
- ✅ 메타-순환 개발 개념 구현
- ✅ Pack 시스템의 유연한 확장성
- ✅ Zero Identity 프로토콜 시작

### 개선 필요

- ⚠️ 경로 불일치 해결
- ⚠️ 프로토콜 구현 완성
- ⚠️ 코드 중복 제거
- ⚠️ 테스트 추가

### 다음 단계

1. 경로 통일 작업
2. 프로토콜 구현 (Workflow, Memory, Auth)
3. Pack Runner 통합
4. 테스트 추가
5. 문서화 보완

---

**결론**: AUTUS는 명확한 비전과 구조를 가지고 있으며, 핵심 개념들이 잘 구현되어 있다. 다만 경로 불일치와 일부 프로토콜 미구현 부분을 해결하면 더욱 견고한 시스템이 될 것이다.


