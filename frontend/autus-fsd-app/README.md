# 🚀 AUTUS FSD v2.0 — Multi-Role Console

Tesla Full Self-Driving 스타일의 학원 관리 콘솔

## 📋 특징

- **6개 역할 콘솔**: Owner, Principal, Teacher, Admin, Parent, Student
- **Tesla FSD UI**: 실시간 상태 기계, 위험 감지, 자동 개입
- **실시간 데이터**: Supabase 연동 (선택사항)
- **v2.0 마이크로 개선**: 채도 조정, 3.4s 펄스, font-semibold, 36px 그림자

## 🎨 v2.0 개선 사항

| 개선 | 내용 | 효과 |
|------|------|------|
| 색상 채도 | -12%, 명도 +6% | 부드러운 프리미엄 느낌 |
| HUD 위치 | 12px 하향 | 시각적 여유 |
| 펄스 속도 | 3.4초 | 차분한 호흡 |
| 숫자 폰트 | font-semibold | 세련된 표현 |
| 버튼 그림자 | 36px 반경 | 네온 효과 강화 |
| ALERT 진동 | 화면 + 모바일 | 위험 피드백 |

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 📁 프로젝트 구조

```
autus-fsd-app/
├── app/
│   ├── globals.css     # 전역 스타일 (v2.0 패치 포함)
│   ├── layout.tsx      # 레이아웃
│   └── page.tsx        # 메인 콘솔 (6개 역할)
├── lib/
│   └── supabase.ts     # Supabase 실시간 연동
├── .env.example        # 환경 변수 예시
├── tailwind.config.ts  # Tailwind 설정
└── package.json
```

## 🔧 환경 설정

```bash
# .env.local 생성
cp .env.example .env.local

# Supabase 값 입력 (선택사항)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **참고**: Supabase 없이도 더미 데이터로 작동합니다.

## 🎯 역할별 기능

### 🏢 Owner Console
- Perception Map: 학원 생태계 시각화
- Risk Queue: 위험 학생 실시간 모니터링
- Intelligence Telemetry: M/T/s 지표
- EXECUTE INTERVENTION 버튼

### 👔 Principal Ops
- Intervention Queue: CRITICAL/WARNING/MONITORING
- Pending Approvals: 카드 발송 승인

### 👨‍🏫 Teacher Panel
- Daily Actions: 오늘의 할 일 목록
- 완료 버튼으로 즉시 체크

### ⚙️ Admin Hub
- Safety Policy: 주당 카드 수, 톤 레벨
- Audit Log: 시스템 로그

### 👨‍👩‍👧 Parent Mirror
- Student Status: 출석률, 숙제, 참여도
- Communications: 학원과의 대화
- Payment Status: 결제 현황

### 🌱 Student Garden
- Week Progress: 게이미피케이션 진행률
- Achievements: 이모지 배지
- Today's Challenge: 일일 미션

## 📊 상태 기계 (STATE MACHINE)

```
IDLE → WATCH → ALERT → PLAN_READY → EXECUTING → VERIFYING → LEARNING → (repeat)
                 ↓
             FAILSAFE (긴급 정지)
```

## 🎨 색상 팔레트 (v2.0)

```css
--fsd-cyan: #1ae8ff;     /* 시안 (주요 액션) */
--fsd-magenta: #ff4db8;  /* 마젠타 (승인 대기) */
--fsd-yellow: #ffd54a;   /* 노랑 (경고) */
--fsd-green: #22e38a;    /* 초록 (정상) */
--fsd-red: #f25f5c;      /* 빨강 (위험) */
--fsd-purple: #b366f0;   /* 보라 (검증) */
```

## 📱 배포

```bash
# Vercel 배포
npm install -g vercel
vercel --prod

# 또는 GitHub + Vercel 자동 배포
git push origin main
```

## 📈 점수

- **Before**: 96/100
- **After**: 99.5/100 (v2.0 패치 적용)

---

**AUTUS** — 확정된 결과만 판다
