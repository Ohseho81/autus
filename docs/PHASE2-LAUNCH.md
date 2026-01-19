# 🚀 AUTUS Phase 2 Launch Checklist

## 📋 Phase 1 완료 상태

```
✅ Vercel Edge API (6개 엔드포인트)
✅ Supabase DB (13개 테이블)
✅ Physics Engine (V = (M-T)×(1+s)^t)
✅ GitHub Actions (CI/CD)
✅ MCP 서버 (6개 연동)
✅ n8n 워크플로우 (3개)
```

---

## 🎯 Phase 2 목표

| 지표 | 목표 | 기간 |
|------|------|------|
| 파운더 온보딩 | 20명 | 7일 |
| 일일 활성 사용 | 10명 | 14일 |
| 피드백 수집 | 50건 | 7일 |
| 버그 리포트 | 0 critical | 지속 |

---

## ⚡ 점화 순서 (30분)

### Step 1: API 검증 (5분)

```bash
cd /Users/oseho/Desktop/autus
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

**예상 결과**: 3/4 통과 (Claude 제외)

### Step 2: 데이터 확인 (5분)

```bash
# 유기체 조회
curl -s "https://vercel-api-two-rust.vercel.app/api/organisms?userId=550e8400-e29b-41d4-a716-446655440001" | jq .

# Physics 상태
curl -s "https://vercel-api-two-rust.vercel.app/api/physics?userId=550e8400-e29b-41d4-a716-446655440001" | jq .
```

### Step 3: 추가 유기체 생성 (10분)

```bash
# 선생님 추가
curl -X POST https://vercel-api-two-rust.vercel.app/api/organisms \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "김선생",
    "type": "teacher",
    "emoji": "👩‍🏫",
    "mint": 3000000,
    "tax": 500000,
    "synergy": 0.25
  }'

# 학생 추가
curl -X POST https://vercel-api-two-rust.vercel.app/api/organisms \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "이학생",
    "type": "student",
    "emoji": "👦",
    "mint": 500000,
    "tax": 450000,
    "synergy": 0.1
  }'
```

### Step 4: 파운더 초대 (10분)

1. `docs/FOUNDER-INVITATION.md` 열기
2. X DM 버전 A 복사
3. 타겟 5명에게 발송

---

## 🔗 Live URLs

| 서비스 | URL |
|--------|-----|
| **API** | https://vercel-api-two-rust.vercel.app |
| **Supabase** | https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti |
| **GitHub** | https://github.com/Ohseho81/autus |

---

## 📊 API 엔드포인트

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/api/organisms` | GET/POST | 유기체 CRUD |
| `/api/physics` | GET/POST | V 계산, Impulse |
| `/api/brain` | POST | Claude AI 분석 |
| `/api/consensus` | POST | 자동 합의 |
| `/api/rewards` | GET/POST | 보상 카드 |
| `/api/leaderboard` | GET | 리더보드 |

---

## ✅ 점화 완료 기준

- [ ] API 테스트 3/4 이상 통과
- [ ] 유기체 3개 이상 생성
- [ ] 파운더 5명 초대 발송
- [ ] Supabase 데이터 확인

**위 4개 체크 → Phase 2 공식 시작! 🎉**

---

**"V = (M - T) × (1 + s)^t"**

*유기체의 첫 심장 박동을 시작합니다.*
