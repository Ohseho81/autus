# 🏛️ AUTUS × 크라톤 개발 현황

> 최종 업데이트: 2026-01-28
> Tesla Grade Business Intelligence

---

## 📊 전체 진행률

```
████████████████████░░░░░░░░░░ 68% 완료
```

| 영역 | 진행률 | 상태 |
|------|--------|------|
| **Backend API** | 90% | ✅ Production |
| **Dashboard UI** | 75% | ✅ Production |
| **크라톤 봇** | 85% | ✅ Production |
| **LLM 연동** | 95% | ✅ Ollama + Fallback |
| **DB 연동** | 60% | 🔄 Supabase 연결 중 |
| **자동화** | 50% | 🔄 n8n 연동 중 |

---

## 🌐 배포된 서비스

### Production URLs

| 서비스 | URL | 상태 |
|--------|-----|------|
| **Dashboard** | https://vercel-2fwqnod3d-ohsehos-projects.vercel.app | ✅ Live |
| **메인 사이트** | https://autus-ai.com | ✅ Live |
| **API (서브도메인)** | https://api.autus-ai.com | 🔄 DNS 전파 중 |
| **Telegram 봇** | https://t.me/autus_kraton_bot | ✅ Live |

---

## 🤖 크라톤 (Kraton) 봇

### 기본 정보

| 항목 | 값 |
|------|-----|
| 이름 | 크라톤 (Kraton) |
| 플랫폼 | Telegram |
| 봇 링크 | @autus_kraton_bot |
| 엔진 | Moltbot (Clawdbot 오픈소스) |
| 버전 | 2026.1.27-beta.1 (최신) |

### LLM 모델 체인

```
1순위: ollama/llama3.2:3b-instruct-q5_K_M  ← 로컬 (무료, 32t/s)
2순위: google/gemini-2.5-flash             ← 클라우드 (무료)
3순위: groq/llama-3.3-70b-versatile        ← 클라우드 (무료)
4순위: anthropic/claude-sonnet-4-5         ← 클라우드 (유료 백업)
```

### 구현된 Skills

| Skill | 파일 | 기능 |
|-------|------|------|
| V-Index 조회 | `v-index.sh` | 전체 현황 조회 |
| 이탈 위험 | `churn-risk.sh` | 위험 고객 목록 |
| 일일 브리핑 | `daily-briefing.sh` | 종합 리포트 |
| **레이더 모니터** | `radar-monitor.sh` | 실시간 위험 감지 + Telegram 알림 |

### 크라톤 명령어 예시

```
AUTUS V-Index 알려줘
이탈 위험 고객 목록
일일 브리핑 해줘
레이더 스캔해줘
김민수 학부모에게 상담 문자 보내줘
```

---

## 📡 API 구현 현황

### 11개 뷰 API (v1)

| 뷰 | 엔드포인트 | 상태 | 설명 |
|----|------------|------|------|
| 조종석 | `/api/v1/cockpit` | ✅ | 전체 현황 대시보드 |
| 지도 | `/api/v1/map` | ✅ | 고객 분포 |
| 날씨 | `/api/v1/weather` | ✅ | 외부 환경 |
| 레이더 | `/api/v1/radar` | ✅ | 이탈 위험 |
| 스코어 | `/api/v1/score` | ✅ | 순위 |
| 조류 | `/api/v1/tide` | ✅ | 흐름 분석 |
| 심전도 | `/api/v1/heartbeat` | ✅ | 실시간 신호 |
| 현미경 | `/api/v1/microscope` | ✅ | 고객 상세 |
| 네트워크 | `/api/v1/network` | ✅ | 관계망 |
| 퍼널 | `/api/v1/funnel` | ✅ | 전환 분석 |
| 수정구 | `/api/v1/crystal` | ✅ | 시뮬레이션 |

### 추가 API

| 엔드포인트 | 상태 | 설명 |
|------------|------|------|
| `/api/v1/radar/monitor` | ✅ NEW | 실시간 위험 감지 + Telegram |
| `/api/v1/automation` | ✅ NEW | 자동화 통계 |
| `/api/moltbot` | ✅ | 크라톤 봇 API |
| `/api/moltbot/webhook` | ✅ | 웹훅 수신 |
| `/api/health` | ✅ | 헬스 체크 |
| `/api/brain` | ✅ | Claude AI |
| `/api/physics` | ✅ | V-Engine |

---

## 🎨 Dashboard UI 기능

### 구현 완료

| 기능 | 설명 | 상태 |
|------|------|------|
| **실시간 레이더** | 위험 고객 알림 (pulse 애니메이션) | ✅ NEW |
| **자동화 게이지** | 역할별 자동화율 Progress Bar | ✅ |
| **V-Index 시뮬레이터** | T×M×s 변수 조절 가능 | ✅ |
| **조종석 카드** | 역할 클릭 → 상세 데이터 | ✅ |
| **Floating Chat** | 크라톤과 실시간 대화 | ✅ |
| **상태바** | 온도, 고객수, 위험 현황 | ✅ |

### 대시보드 스크린샷 (구성)

```
┌─────────────────────────────────────────────────────┐
│  🏛️ AUTUS - Tesla Grade Business Intelligence      │
│  V = (T × M × s)^t | Build on the Rock             │
├─────────────────────────────────────────────────────┤
│  [상태: 위험] [온도: 68.1°] [고객: 165명] [위험: 3명] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🚨 실시간 레이더 (NEW!)                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔴 김민수: 28° (이탈 85%) - 즉시 상담 필요      │ │
│  │ 🟠 이서연: 42° (이탈 62%)                       │ │
│  │ 🟡 박지훈: 48° (이탈 51%)                       │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ⚡ 자동화 현황          📊 V-Index 시뮬레이터      │
│  ┌──────────────┐       ┌──────────────────────┐   │
│  │ Owner  85%   │       │     V = 68.1         │   │
│  │ ████████░░   │       │  T [====80%====]     │   │
│  │              │       │  M [===70%===]       │   │
│  │ Manager 72%  │       │  s [=0.1=]           │   │
│  │ ███████░░░   │       │  t [==12개월==]      │   │
│  └──────────────┘       └──────────────────────┘   │
│                                                      │
│  🎛️ 조종석 (역할 카드)                              │
│  [👑 Owner] [📊 Manager] [👨‍🏫 Teacher] [👪 Parent]  │
│                                                      │
└─────────────────────────────────────────────────────┘
                                              [🤖 Chat]
```

---

## 💻 로컬 개발 환경

### 실행 중인 서비스

| 서비스 | 포트 | 상태 |
|--------|------|------|
| Ollama | 11434 | ✅ 실행 중 |
| Moltbot Gateway | 18789 | ✅ 실행 중 |
| Frontend Dev | 5173, 5174, 5175 | ✅ 실행 중 |

### 프로젝트 구조

```
/Users/oseho/Desktop/autus/
├── frontend/           # React 프론트엔드
├── backend/            # FastAPI 백엔드
├── vercel-api/         # Vercel Edge API (메인)
│   ├── app/api/v1/     # 11개 뷰 API
│   ├── lib/            # 헬퍼 라이브러리
│   └── app/page.tsx    # 대시보드 UI
├── clawdbot/           # Moltbot 오픈소스 (1.1GB)
├── n8n/                # n8n 워크플로우 (20개)
└── docs/               # 문서
```

### 설정 파일

| 파일 | 위치 |
|------|------|
| Moltbot 설정 | `~/.moltbot/moltbot.json` |
| AUTUS Skill | `~/.moltbot/skills/autus/` |
| 환경변수 | `~/.env`, `.env.example` |

---

## 💰 비용 현황

| 서비스 | 월 비용 |
|--------|---------|
| Vercel (Hobby) | ₩0 |
| Supabase (Free) | ₩0 |
| Ollama (로컬) | ₩0 |
| Gemini/Groq (Free) | ₩0 |
| Claude (백업) | 사용량 |
| **합계** | **₩0 ~ ₩5,000** |

---

## 📋 남은 작업

### 우선순위 높음

- [ ] Supabase 실제 데이터 연동 (현재 Mock)
- [ ] n8n 워크플로우 활성화
- [ ] 학원 파일럿 (KRATON 영어학원)
- [ ] 카카오톡 알림 연동

### 우선순위 중간

- [ ] 학부모 앱 UI
- [ ] 학생 앱 UI
- [ ] Voice 감지 자동화
- [ ] 일일 리포트 자동 생성

### 우선순위 낮음

- [ ] 멀티 조직 지원
- [ ] 권한 관리 (RLS)
- [ ] 모바일 앱 (React Native)

---

## 🔗 주요 링크

| 링크 | URL |
|------|-----|
| Dashboard | https://vercel-2fwqnod3d-ohsehos-projects.vercel.app |
| Telegram Bot | https://t.me/autus_kraton_bot |
| API Health | https://vercel-2fwqnod3d-ohsehos-projects.vercel.app/api/health |
| 문서 | `/Users/oseho/Desktop/autus/docs/` |

---

## 📈 개발 타임라인

| 날짜 | 작업 |
|------|------|
| 2026-01-28 | 실시간 레이더 + Telegram 알림 구현 |
| 2026-01-28 | V-Index 시뮬레이터, 자동화 게이지 추가 |
| 2026-01-28 | Ollama × Moltbot 연동 완료 |
| 2026-01-28 | AUTUS 2.0 11개 뷰 API 구현 |
| 2026-01-28 | 크라톤 봇 Telegram 연동 |

---

*"측정할 수 없으면 관리할 수 없다" - 피터 드러커*
*"단순함이 궁극의 정교함이다" - 스티브 잡스*
