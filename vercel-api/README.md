# 🌊 AUTUS Vercel API

**Edge-First + Hybrid Intelligence** 아키텍처의 핵심 API 서버입니다.

```
V = (M - T) × (1 + s)^t
```

## 📁 구조

```
vercel-api/
├── app/
│   ├── api/
│   │   ├── brain/         # 🧠 Claude AI Integration
│   │   ├── physics/       # ⚛️ V Engine & Impulse
│   │   ├── consensus/     # 🤝 활용 기반 자동 합의
│   │   ├── organisms/     # 🧬 유기체 CRUD
│   │   ├── leaderboard/   # 🏆 V 순위 / 솔루션 랭킹
│   │   └── rewards/       # 🎁 보상 카드 관리
│   └── page.tsx           # API 랜딩
├── lib/
│   ├── supabase.ts        # Supabase Client
│   ├── claude.ts          # Claude AI Functions
│   └── physics.ts         # Physics Engine v2.2
└── vercel.json            # Vercel Config (Seoul Edge)
```

## 🚀 배포

### 1. Vercel 연결

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
cd vercel-api
vercel
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `CLAUDE_API_KEY` | Anthropic Claude API Key |

### 3. 배포

```bash
vercel --prod
```

## 📡 API Endpoints

### 🧠 Brain (Claude AI)

```bash
# 보상 카드 생성
POST /api/brain
{
  "action": "generate_reward_card",
  "userId": "xxx",
  "payload": {
    "role": "owner",
    "pain_point": "cashflow",
    "orbit_distance": 0.5,
    "context_data": {}
  }
}

# 3지 선택 생성
POST /api/brain
{
  "action": "generate_options",
  "payload": { "task_description": "매주 보고서 작성 자동화" }
}

# 데이터 분석
POST /api/brain
{
  "action": "analyze",
  "payload": { "type": "churn_risk", "data": {...} }
}
```

### ⚛️ Physics (V Engine)

```bash
# 유기체 물리 상태 조회
GET /api/physics?userId=xxx

# V 계산
POST /api/physics
{
  "action": "calculate_v",
  "mint": 1000000,
  "tax": 300000,
  "synergy": 0.15,
  "time": 1
}

# Impulse 적용
POST /api/physics
{
  "action": "apply_impulse",
  "organismId": "xxx",
  "impulseType": "RECOVER",
  "intensity": 1.0
}
```

### 🤝 Consensus (자동 합의)

```bash
# 솔루션 랭킹 조회
GET /api/consensus?taskId=weekly_report

# 활용 기록
POST /api/consensus
{
  "action": "log_usage",
  "payload": {
    "task_id": "weekly_report",
    "solution_id": "xxx",
    "user_id": "xxx",
    "before": { "m": 1000000, "t": 500000, "s": 0.1 },
    "after": { "m": 1200000, "t": 450000, "s": 0.15 },
    "duration_minutes": 30
  }
}

# 표준 자격 확인
POST /api/consensus
{
  "action": "check_standard",
  "payload": { "solution_id": "xxx" }
}
```

### 🧬 Organisms

```bash
# 목록 조회
GET /api/organisms?userId=xxx

# 단일 조회
GET /api/organisms?id=xxx

# 생성
POST /api/organisms
{
  "userId": "xxx",
  "name": "김민준",
  "type": "student",
  "emoji": "👦",
  "mint": 500000,
  "tax": 100000,
  "synergy": 0.2
}

# 업데이트
PUT /api/organisms
{
  "id": "xxx",
  "mint": 600000,
  "synergy": 0.25
}
```

### 🏆 Leaderboard

```bash
# V 리더보드
GET /api/leaderboard?type=v&limit=10

# 솔루션 랭킹
GET /api/leaderboard?type=solution&limit=10
```

### 🎁 Rewards

```bash
# 미읽은 보상 카드 조회
GET /api/rewards?userId=xxx

# AI 보상 카드 생성
POST /api/rewards
{
  "action": "generate",
  "userId": "xxx",
  "payload": { "context": {} }
}

# 읽음 처리
POST /api/rewards
{
  "action": "mark_read",
  "payload": { "cardId": "xxx" }
}
```

## 🔧 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# http://localhost:3000
```

## 📊 Physics Engine v2.2

### Impulse 프로필

| Type | dMint | dTax | dSynergy | dEntropy | 설명 |
|------|-------|------|----------|----------|------|
| RECOVER | +15% | -5% | +0.02 | -0.1 | 긴급 회복 |
| DEFRICTION | +5% | -15% | +0.05 | -0.05 | 마찰 제거 |
| SHOCK_DAMP | 0% | +5% | -0.02 | -0.2 | 충격 흡수 |

### 상태 판정

- **urgent**: 엔트로피 > 0.7 또는 V < 0
- **warning**: 엔트로피 > 0.5 또는 velocity < 0
- **opportunity**: velocity > 0.1 && synergy > 0.3
- **stable**: 나머지

## 🌐 연결된 서비스

- **Supabase**: PostgreSQL + Real-time + Auth
- **Claude AI**: 보상 카드 생성, 분석, 3지 선택
- **n8n Cloud**: 워크플로우 자동화 (다음 단계)

---

*"측정할 수 없으면 관리할 수 없다" - 피터 드러커*
