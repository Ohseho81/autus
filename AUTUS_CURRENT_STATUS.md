# AUTUS 현재 상태

> 최종 업데이트: 2026-01-29
> 버전: 2.0 (KRATON)

---

## 🎯 핵심 공식

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              A = R^σ (유지력 = 관계^환경)                        │
│                                                                 │
│     R  = TSEL 기반 관계지수                                     │
│          T: Trust (신뢰) 0.25                                   │
│          S: Satisfaction (만족) 0.30                            │
│          E: Engagement (참여) 0.25                              │
│          L: Loyalty (충성) 0.20                                 │
│                                                                 │
│     σ  = 환경지수 (Internal + Voice + External)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 프로젝트 현황

### 코드베이스

| 항목 | 수량 | 상태 |
|------|------|------|
| Frontend 컴포넌트 | 44개 폴더 | ✅ 정리됨 |
| KRATON Cycles | 12개 | ✅ 완성 |
| API 엔드포인트 | 50+ | ✅ Live |
| 문서 | 28개 | ✅ 업데이트 |
| 린트 에러 | 0개 | ✅ Clean |

### Git 상태

```
main branch: Clean (1bfd74b)
최근 커밋:
- fix: resolve all lint errors (117 → 0)
- refactor: reorganize project folder structure
- feat: add KRATON 12 Cycles premium UI
- docs: add project documentation
```

---

## 🖥️ 8개 Core Views

| # | View | Hash | 설명 |
|---|------|------|------|
| 1 | Cockpit | `#cockpit` | 메인 대시보드 |
| 2 | Pulse | `#pulse` | 실시간 상태 모니터 |
| 3 | Microscope | `#microscope` | 개별 학생 분석 |
| 4 | Forecast | `#forecast` | 미래 예측 |
| 5 | Timeline | `#timeline` | 시간 흐름 |
| 6 | Actions | `#actions` | 액션 관리 |
| 7 | Map | `#map` | 지역 분포 |
| 8 | Crystal | `#crystal` | 결정화 뷰 |

---

## 🎨 KRATON 12 Cycles

| Cycle | 컴포넌트 | 파일 |
|-------|----------|------|
| 1 | 3D Neon Gauge | `NeonGauge3D.tsx` |
| 2 | Real-time Binding | (built-in) |
| 3 | ECG Animation | `ECGLine.tsx` |
| 4 | Danger Alert | `AlertCard.tsx` |
| 5 | Glassmorphism | `GlassCard.tsx` |
| 6 | Time Gradients | `ForecastCard.tsx` |
| 7 | Profile Cards | `StudentCard.tsx` |
| 8 | Infinite Timeline | `TimelineItem.tsx` |
| 9 | Drag & Drop | `ActionCard.tsx` |
| 10 | Heatmap | `MiniHeatmap.tsx` |
| 11 | Page Transitions | `KratonApp.tsx` |
| 12 | Responsive | (all) |

---

## 👥 역할 시스템

| Role | 권한 | First View | 주요 기능 |
|------|------|------------|----------|
| Owner | 전체 | Cockpit | 전체 현황, 승인 |
| Manager | 운영 | Pulse | 실시간 모니터링 |
| Teacher | 교육 | Microscope | 학생 관리 |
| Parent | 자녀 | Timeline | 자녀 정보 확인 |
| Student | 개인 | Actions | 미션, 랭킹 |

---

## 📁 폴더 구조 (정리 후)

```
autus/
├── frontend/src/components/
│   ├── views/v2/              # 메인 뷰 시스템
│   │   ├── kraton/            # KRATON 12 Cycles ⭐
│   │   │   ├── views/         # 7개 Full Views
│   │   │   └── *.tsx          # 14개 컴포넌트
│   │   ├── design-system/     # 색상, Mock 데이터
│   │   └── MoltBot/           # AI 어시스턴트
│   │
│   ├── shell/                 # Role-based Shell
│   ├── Onboarding/            # 온보딩 (7단계)
│   ├── Common/                # 공통 컴포넌트
│   ├── role-specific/         # 역할별 페이지
│   └── _legacy/               # 레거시 (19개 폴더)
│
├── backend/
│   ├── database/              # SQL 스키마 (11개)
│   └── workflows/             # JSON 워크플로우 (6개)
│
├── vercel-api/
│   ├── app/api/               # 50+ 엔드포인트
│   └── lib/                   # 유틸리티
│
├── docs/                      # 문서 (28개)
├── n8n/                       # N8N 워크플로우 (20개)
└── scripts/                   # 자동화 스크립트 (17개)
```

---

## 📡 API 현황

### Vercel API (주력)

| Endpoint | 기능 | 상태 |
|----------|------|------|
| `/api/v1/cockpit` | Cockpit 데이터 | ✅ |
| `/api/v1/radar` | Radar 데이터 | ✅ |
| `/api/v1/microscope` | 개별 분석 | ✅ |
| `/api/v1/funnel` | 퍼널 데이터 | ✅ |
| `/api/v1/heartbeat` | 헬스체크 | ✅ |
| `/api/brain` | Claude AI | ✅ |
| `/api/physics` | V-Engine | ✅ |
| `/api/autus/*` | AUTUS Core (13개) | ✅ |

### Backend (FastAPI)

| Endpoint | 기능 | 상태 |
|----------|------|------|
| `/api/organisms` | 유기체 CRUD | ✅ |
| `/api/consensus` | 합의 엔진 | ✅ |
| `/api/risks` | 위험 관리 | ✅ |
| `/api/goals` | 목표 관리 | ✅ |

---

## 🔧 개발 환경

### 실행 방법

```bash
# Frontend
cd frontend && npm run dev
# → http://localhost:3000

# Vercel API (로컬)
cd vercel-api && npm run dev
# → http://localhost:3001

# Backend
uvicorn backend.main:app --reload
# → http://localhost:8000
```

### 린트

```bash
cd frontend && npm run lint
# 결과: 0 errors, 392 warnings
```

---

## 📊 최근 작업 (2026-01-29)

### 완료

- [x] KRATON 12 Cycles UI 완성
- [x] 온보딩 팝업 크기/버튼 통일
- [x] 폴더 구조 재정리 (63 → 44)
- [x] 린트 에러 해결 (117 → 0)
- [x] Git 정리 및 푸시
- [x] README 업데이트

### 다음 작업

- [ ] 레거시 폴더 점진적 정리
- [ ] 경고 392개 해결
- [ ] 테스트 코드 추가
- [ ] 성능 최적화

---

## 🔗 Links

| 리소스 | URL |
|--------|-----|
| GitHub | `github.com/Ohseho81/autus` |
| Frontend | `localhost:3000` |
| API Docs | `localhost:8000/docs` |
| Vercel | `vercel.app` |

---

*AUTUS 2.0 - 관계 유지력의 물리학*
