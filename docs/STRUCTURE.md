# AUTUS 폴더 구조
## 완벽한 AUTUS를 위한 표준 구조
```
Version: 1.0.0
Philosophy: Passive First + Active 필연
```

---

# 전체 구조
```
autus/
│
├── 📜 docs/                    # 문서 (Passive)
│   ├── CONSTITUTION.md         # 헌법 v6.1
│   ├── SUCCESSION.md           # 승계 문서
│   └── STRUCTURE.md            # 이 문서
│
├── 📋 spec/                    # 프로토콜 스펙 (Passive)
│   ├── PROTOCOL.md             # 프로토콜 정의
│   ├── PACK_FORMAT.md          # Pack 포맷
│   └── SYNC_FORMAT.md          # 동기화 포맷
│
├── 🔮 oracle/                  # Oracle (Active 필연)
│   ├── collector.py            # 메트릭 수집 (50줄)
│   ├── selector.py             # 자연선택 (30줄)
│   ├── evolution.py            # 집단진화 (50줄)
│   └── compassion.py           # 자비검증 (20줄)
│
├── 📦 reference/               # 레퍼런스 구현 (Active 필연)
│   └── executor.py             # Pack 실행기 (100줄)
│
├── 🧩 packs/                   # Pack 생태계
│   ├── development/            # 개발용 Pack
│   ├── examples/               # 예제 Pack
│   └── community/              # 커뮤니티 Pack
│
├── 🌐 api/                     # API 라우터
├── ⚙️ services/                # 서비스 로직
├── 🔌 protocols/               # 프로토콜 구현
├── 🧬 evolved/                 # 자동 진화 코드
├── 🧪 tests/                   # 테스트
│
├── 🔧 .github/                 # GitHub 설정 (Passive)
│   └── workflows/
│       └── constitution.yml    # 헌법 자동 검증
│
├── main.py                     # 진입점
├── requirements.txt            # 의존성
└── README.md                   # 프로젝트 설명
```

---

# 분류

## Passive (개발 0줄)

| 폴더/파일 | 역할 | 상태 |
|-----------|------|------|
| docs/CONSTITUTION.md | 헌법 | ✅ |
| docs/SUCCESSION.md | 승계 | ✅ |
| spec/PROTOCOL.md | 프로토콜 | ✅ |
| spec/PACK_FORMAT.md | Pack 포맷 | ✅ |
| spec/SYNC_FORMAT.md | 동기화 | ✅ |
| .github/workflows/ | CI/CD | ✅ |

## Active 필연 (250줄)

| 폴더/파일 | 역할 | 줄 | 상태 |
|-----------|------|-----|------|
| oracle/collector.py | 메트릭 수집 | 50 | ⬜ |
| oracle/selector.py | 자연선택 | 30 | ⬜ |
| oracle/evolution.py | 집단진화 | 50 | ⬜ |
| oracle/compassion.py | 자비검증 | 20 | ⬜ |
| reference/executor.py | Pack 실행 | 100 | ⬜ |

## 기존 코드 (활용)

| 폴더 | 역할 | 상태 |
|------|------|------|
| api/ | API 라우터 | ✅ |
| services/ | 비즈니스 로직 | ✅ |
| protocols/ | 프로토콜 구현 | ✅ |
| tests/ | 테스트 | ✅ |

---

# 원칙

## 1. Passive First
```
문서와 설정으로 해결할 수 있으면
코드를 작성하지 않는다.
```

## 2. Active 필연
```
코드를 작성하면
반드시 목적이 달성되는 구조로 만든다.
```

## 3. 최소 코드
```
전체 Active 코드: 250줄 이하
각 파일: 100줄 이하
```

---

# 서명
```
AUTUS 폴더 구조

Passive: 6개 문서
Active: 5개 파일 (250줄)
기존: 활용

"최소한의 코드로 최대한의 가치를"
```
