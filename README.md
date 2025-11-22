# AUTUS - 개인 AI 자동화 OS

## 소개

"공기같은 독점" - 투명하고 확장 가능한 AI 자동화 시스템

AUTUS는 최소한의 코어로 시작하여 Pack 기반으로 무한히 확장 가능한 개인 AI 자동화 운영체제입니다.

## 특징

- **최소 코어** (300줄) - 핵심만 담은 경량 아키텍처
- **Pack 기반 무한 확장** - YAML로 정의된 Pack으로 기능 추가
- **DSL 기반 Cell 실행** - 간단한 DSL로 복잡한 작업 자동화
- **Galaxy HUD 3D 시각화** - 프로젝트 구조를 3D로 시각화
- **.autus 표준 프로토콜** - 표준화된 설정 파일 형식

## 설치

```bash
cd ~/Desktop/autus
python3 -m venv .venv314
source .venv314/bin/activate
pip install requests pyyaml fastapi uvicorn pydantic
```

## 빠른 시작

### 기본 사용

```bash
# GitHub 사용자 조회
./autus run 'GET https://api.github.com/users/$username'

# 파이프라인 실행
./autus run "echo hello | parse"

# Pack 목록 확인
./autus packs
```

### Galaxy HUD 실행

```bash
cd 05_hud/galaxy
python3 -m http.server 8080
# 브라우저: http://localhost:8080/index.html
```

또는:

```bash
cd 05_hud/galaxy
./run_galaxy.sh
```

## 프로젝트 구조

```
~/Desktop/autus/
├── 00_system/        # 시스템 설정 및 정책
├── 01_core/          # 코어 시스템
│   ├── api/          # FastAPI 엔드포인트
│   ├── engine/        # 실행 엔진
│   ├── pack/          # Pack 시스템
│   └── cell/          # Cell 시스템
├── 02_packs/          # Pack 저장소
│   ├── builtin/       # 내장 Pack
│   ├── autogen/       # 자동 생성 Pack
│   └── base/          # 기본 Pack
├── 03_adapters/       # 어댑터
├── 04_ops/            # 운영 도구
├── 05_hud/            # HUD 시각화
│   └── galaxy/        # Galaxy 3D HUD
├── 06_twin/           # 디지털 트윈
├── 07_memory/         # 메모리/캐시
└── main.py            # FastAPI 엔트리포인트
```

## Pack 만들기

### YAML 형식

`02_packs/my_pack.yaml`:

```yaml
name: my_pack
version: 1.0.0
description: "My custom pack"

cells:
  - name: hello
    command: "echo Hello from my pack"
    description: "Simple hello cell"
```

### Python 형식

`02_packs/builtin/my_pack.py`:

```python
from 02_packs.base.base_pack import BasePack

class MyPack(BasePack):
    def __init__(self):
        super().__init__(
            name="my_pack",
            version="1.0.0",
            description="My custom pack"
        )

    async def execute(self, input_data: dict) -> dict:
        return {
            "status": "success",
            "result": input_data
        }
```

## 아키텍처

### 핵심 개념

1. **Pack**: 기능 단위, YAML 또는 Python으로 정의
2. **Cell**: 실행 단위, Pack 내부의 개별 작업
3. **DSL**: Domain Specific Language, 간단한 명령어로 복잡한 작업 수행
4. **Galaxy**: 프로젝트 구조의 3D 시각화

### 실행 흐름

```
사용자 입력 → CLI → DSL 파서 → Pack 선택 → Cell 실행 → 결과 반환
```

### API 엔드포인트

- `GET /health` - 헬스 체크
- `GET /dev/summary` - 시스템 요약
- `GET /dev/galaxy` - Galaxy 데이터
- `GET /hud/galaxy` - Galaxy HUD 페이지
- `POST /cell/run/{name}` - Cell 실행

## 개발

### 환경 설정

```bash
source .venv314/bin/activate
export PYTHONPATH="$PWD:$PYTHONPATH"
```

### 서버 실행

```bash
uvicorn main:app --host 0.0.0.0 --port 8016 --reload
```

### 테스트

```bash
# 구조 검증
python -m 04_ops.tools.autus_doctor_cli --mode struct

# 전체 검증
python -m 04_ops.tools.autus_doctor_cli --mode all

# 단위 테스트
pytest tests/unit/ -v
```

## 도구

### Pack 생성기

```bash
python tools/cli/autus_pack_generator.py my_pack --type builtin
```

### Galaxy 매퍼

```bash
python 05_hud/3d_view/auto_galaxy_mapper.py
```

## 라이선스

MIT

## 기여

이슈와 PR을 환영합니다!
