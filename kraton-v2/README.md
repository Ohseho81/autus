# 🏛️ KRATON v2.0 - Tesla Grade Business Intelligence

> V = (T × M × s)^t

## 🚀 Quick Start

```bash
cd kraton-v2
npm install
npm run dev
```

## 📐 6-Layer Architecture

```
Layer 1: 외부 데이터 입구 (클래스팅, 토스, 카카오)
    ↓
Layer 2: 데이터 저장소 (Supabase + Realtime)
    ↓
Layer 3: AI 엔진 (Vercel Edge + Claude)
    ↓
Layer 4: 콘솔 UI (5개 역할별 콘솔)
    ↓
Layer 5: 실행 & 피드백 (복리 루프)
    ↓
Layer 6: Planetary (글로벌 확장)
```

## 📊 콘솔 구성

| 역할 | 콘솔 | 패널 |
|------|------|------|
| 👑 Owner | CEO Console | Perception / Planning / Telemetry / **Live Dashboard** |
| 🎛️ Principal | Ops Console | Risk Queue / Actuation / Safety |
| 👔 Teacher | Staff Console | Action Queue / Students / Feedback |
| 👩‍🎓 Student | Mobile | 홈 / 시간표 / 학습 / 뱃지 |
| 👨‍👩‍👧 Parent | Mobile | 홈 / 리포트 / 결제 / Growth |

## 🔌 외부 연동

### 지원 서비스
- ✅ 클래스팅 API (출결/성적)
- ✅ 토스페이먼츠 (결제 Webhook)
- ✅ 카카오 알림톡 (SOLAPI)
- ✅ Google Workspace (Sheets/Calendar)
- ⏳ 네이버 예약

### n8n 워크플로우
```
n8n-workflows/
├── 01-classting-sync.json      # 클래스팅 동기화
├── 02-toss-webhook.json        # 결제 실패 자동 대응
└── 03-card-feedback-loop.json  # 카드 발송 + 피드백
```

## 📁 파일 구조

```
kraton-v2/
├── src/
│   ├── App.jsx                 # 메인 앱 (1500+ lines)
│   ├── components/
│   │   ├── LiveDashboard.jsx   # FSD 스타일 실시간 대시보드
│   │   └── FeedbackPage.jsx    # 1클릭 피드백 페이지
│   ├── main.jsx
│   └── index.css
├── n8n-workflows/              # n8n 워크플로우 JSON
├── .env.example                # 환경 변수 템플릿
└── README.md
```

## 🎯 V 효과 (100명 학원 기준)

| 연결 | T 효과 | M 효과 | s 효과 | 예상 가치 |
|------|--------|--------|--------|----------|
| 클래스팅 | -40% | +20% | +0.2 | 연 3,000만원 |
| 토스페이먼츠 | -30% | - | - | 연 5,000만원 |
| 카카오 알림톡 | -80% | +15% | +0.3 | 연 4,000만원 |
| **Total** | **-60%** | **+35%** | **+0.5** | **연 1.4억원+** |

## 🔧 환경 설정

```bash
cp .env.example .env
# .env 파일 수정
```

## 📈 Supabase 테이블

```sql
-- 핵심 테이블
students, payments, attendances, risks, v_scores,
actions, feedbacks, standards, rewards, audit_logs
```

---

**Build on the Rock. 🏛️**
