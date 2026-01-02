# 🚀 AUTUS 아키텍처 v4 - 일론 스타일 70%

> "가장 좋은 파트는 존재하지 않는 파트다" - Elon Musk

---

## 📊 Before vs After

### 현재 (Before)
```
autus/
├── backend/           # 40+ 파일
│   ├── api/          # 11 파일
│   ├── models/       # 4 파일
│   ├── services/     # 7 파일
│   └── main*.py      # 4개 중복!
├── frontend/         # 80+ 파일 (분산)
├── ui/               # 또 다른 UI
├── client/           # 또 다른 클라이언트
├── local-agent/      # 로컬 에이전트
├── packs/            # 도메인 팩
├── connectors/       # 커넥터
├── config/           # 설정
├── spec/             # 12 스펙 파일
├── docs/             # 8 문서
├── autus_pipeline/   # 파이프라인 (독립)
├── physis-server/    # 물리 서버
├── nginx/            # nginx
├── scripts/          # 스크립트
├── tests/            # 테스트
├── tools/            # 도구
├── .github/          # CI/CD
├── docker-compose*.yml  # 4개!
├── Dockerfile*          # 3개!
├── railway*.json        # 4개!
├── main.py           # 또?
├── SACRED_SCRIPT*.py # 2개
└── [30+ 설정/문서 파일]
```

**총: ~200 파일, 20+ 폴더, 깊이 4-5**

---

### 제안 (After - 일론 70%)
```
autus/
├── core/                    # 핵심 비즈니스 로직
│   ├── __init__.py
│   ├── config.py           # 모든 설정 통합
│   ├── models.py           # 데이터 모델 통합
│   ├── physics.py          # 물리 엔진 (SQ, Synergy)
│   ├── network.py          # 인맥 네트워크 로직
│   └── pipeline.py         # 데이터 파이프라인 (autus_pipeline 통합)
│
├── api/                     # FastAPI 백엔드
│   ├── __init__.py
│   ├── main.py             # 단일 진입점!
│   ├── routes/             # API 라우트
│   │   ├── auth.py
│   │   ├── nodes.py
│   │   ├── analytics.py
│   │   └── actions.py
│   ├── middleware.py
│   └── websocket.py
│
├── web/                     # 프론트엔드 (통합)
│   ├── index.html
│   ├── app.js              # SPA 진입점
│   ├── components/         # UI 컴포넌트
│   └── styles/
│
├── agent/                   # 로컬 에이전트 (선택)
│   ├── bridge.py           # 브릿지 클라이언트
│   └── collectors/         # 데이터 수집
│
├── data/                    # 데이터 (gitignore)
│   ├── input/
│   └── output/
│
├── tests/                   # 테스트 통합
│   ├── test_core.py
│   ├── test_api.py
│   └── fixtures/
│
├── .github/                 # CI/CD (유지)
│   └── workflows/
│
├── docker-compose.yml      # 단일 Docker 설정
├── Dockerfile              # 단일 Dockerfile
├── requirements.txt        # 단일 의존성
├── .env.sample
├── README.md               # 단일 문서
└── Makefile                # 명령어 통합
```

**총: ~40 파일, 7 폴더, 깊이 2-3**

---

## 🗑️ 삭제 대상 (30%)

### 즉시 삭제 (Dead Code)
```
- main_final.py, main_standalone.py, main_ultimate.py  → main.py로 통합
- SACRED_SCRIPT.py, SACRED_SCRIPT_V2.py               → 삭제
- docker-compose.empire.yml, docker-compose.prod.yml  → 하나로
- Dockerfile.empire, Dockerfile.ultimate              → 하나로
- railway.empire.json, railway.ultimate.toml          → 하나로
```

### 통합 대상
```
- frontend/ + ui/ + client/  → web/
- backend/api/ + backend/services/  → api/ + core/
- spec/ + docs/  → README.md + 코드 주석
- packs/  → core/에 통합 또는 플러그인 구조
```

### 보존 (70% 유지)
```
- autus_pipeline/  → core/pipeline.py로 임포트 (구조 유지)
- .github/workflows/  → 유지
- tests/  → 유지 (위치만 변경)
```

---

## 📁 폴더별 책임

| 폴더 | 책임 | 파일 수 |
|------|------|--------|
| `core/` | 비즈니스 로직, 물리 엔진, 파이프라인 | ~6 |
| `api/` | HTTP/WebSocket 서버 | ~8 |
| `web/` | 사용자 인터페이스 | ~15 |
| `agent/` | 로컬 데이터 수집 | ~3 |
| `data/` | 런타임 데이터 | 0 (gitignore) |
| `tests/` | 테스트 | ~5 |

---

## 🔧 단일화 원칙

### 1. 단일 진입점
```bash
# Before: 어떤 main?
python backend/main.py
python backend/main_final.py
python main.py

# After: 하나만
python -m api.main
# 또는
make run
```

### 2. 단일 설정
```python
# Before: config 분산
from backend.config import ...
from config.settings import ...
from autus_pipeline.src.config import ...

# After: 하나만
from core.config import CFG
```

### 3. 단일 Docker
```bash
# Before: 어떤 compose?
docker-compose -f docker-compose.empire.yml up

# After: 하나만
docker-compose up
```

---

## 📋 마이그레이션 단계

### Phase 1: 삭제 (30분)
- [ ] 중복 main 파일 삭제
- [ ] 죽은 Docker/Railway 파일 삭제
- [ ] SACRED_SCRIPT 삭제
- [ ] 중복 문서 삭제

### Phase 2: 이동 (1시간)
- [ ] backend/ → api/ + core/
- [ ] frontend/ + ui/ + client/ → web/
- [ ] local-agent/ → agent/

### Phase 3: 통합 (2시간)
- [ ] config 통합
- [ ] models 통합
- [ ] 테스트 통합

### Phase 4: 정리 (30분)
- [ ] import 경로 수정
- [ ] Makefile 업데이트
- [ ] README 업데이트

---

## ⚠️ 30% 보존 (급진적 변경 방지)

1. **autus_pipeline/** - 독립 파이프라인 유지
2. **기존 API 구조** - routes 패턴 유지
3. **기존 테스트** - 로직만 이동
4. **CI/CD** - GitHub Actions 유지

---

## 🎯 최종 목표

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| 파일 수 | ~200 | ~40 | -80% |
| 폴더 수 | 20+ | 7 | -65% |
| 폴더 깊이 | 4-5 | 2-3 | -40% |
| 진입점 | 4개 | 1개 | -75% |
| Docker 파일 | 7개 | 2개 | -71% |
| 새 개발자 온보딩 | 1주 | 1일 | -85% |

---

*"복잡성은 기능이 아니다" - 일론 스타일 70%*
