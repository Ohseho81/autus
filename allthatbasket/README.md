# 🏀 올댓바스켓 (AllThatBasket)

> **농구 아카데미 관리 시스템 - QR 출석, 역할별 대시보드, 스킬 트래킹**
>
> *AUTUS 플랫폼 기반 농구 아카데미 특화 솔루션*

---

## 🎯 Overview

올댓바스켓은 **AUTUS 관계 유지력 OS**를 농구 아카데미에 특화시킨 관리 시스템입니다.

```
┌─────────────────────────────────────────────────┐
│  올댓바스켓 Academy                              │
│  ─────────────────────────────────────────────  │
│  역할 대시보드:    4개 (오너, 원장, 관리자, 강사) │
│  KRATON 컴포넌트: ✓                              │
│  Supabase 스키마: 4 Migrations                   │
│  QR 기반 출석:    ✓                              │
│  게이미피케이션:  ✓                              │
└─────────────────────────────────────────────────┘
```

---

## 👥 역할 계층 시스템

| 역할 | 컬러 | 권한 | 핵심 기능 |
|------|------|------|----------|
| 🟠 오너 (Owner) | `#FF6B00` | 목표 설정 | 전체 매출, 지점별 현황, 성장률 |
| 🟢 원장 (Director) | `#00D4AA` | 전략 수립 | 지점 운영, 코치 관리, 수업 일정 |
| 🟣 관리자 (Admin) | `#7C5CFF` | 미션 실행 | 할 일 관리, 미납자 처리, 문의 응대 |
| 🔴 강사 (Coach) | `#FF4757` | 실행 | QR 출퇴근, 수업 일정, 급여 확인 |

---

## 🏀 농구 특화 기능

### 스킬 트래킹 시스템
- **8가지 스킬 카테고리**: 드리블, 슈팅, 패스, 수비, 리바운드, 팀워크, 체력, 스피드
- **성장 분석**: 월별 스킬 트렌드 시각화
- **코치 피드백**: 수업 후 즉시 평가 입력

### 게이미피케이션
- **포인트 시스템**: 출석당 10pt + 연속 보너스
- **배지 시스템**: 출석왕, 슈팅 마스터 등 11개 배지
- **리더보드**: 주간/월간 랭킹
- **챌린지**: 기간 한정 미션

### 레벨 시스템
| 레벨 | 컬러 | 대상 |
|------|------|------|
| 🟢 Beginner | `#00D4AA` | 입문자 |
| 🟣 Intermediate | `#7C5CFF` | 중급자 |
| 🟠 Advanced | `#FF6B00` | 상급자 |
| 🟡 Pro | `#FFD700` | 프로 지망생 |

---

## 📁 프로젝트 구조

```
allthatbasket/
├── src/
│   ├── components/
│   │   └── dashboard/
│   │       └── AllThatBasketDashboard.tsx  # 역할별 대시보드
│   ├── screens/                            # 모바일 스크린
│   └── utils/
│       └── theme.ts                        # 농구 아카데미 테마
│
├── supabase/
│   └── migrations/
│       ├── 001_qr_attendance_schema.sql    # QR 출석 + 수납
│       ├── 002_coach_work_schema.sql       # 코치 근태/급여
│       ├── 003_organization_roles_schema.sql # 조직/역할 관리
│       └── 004_basketball_analytics_schema.sql # 스킬/게이미피케이션
│
├── preview/
│   └── all-roles-dashboard-preview.html    # 역할별 대시보드 프리뷰
│
└── package.json
```

---

## 🚀 Quick Start

```bash
# 프로젝트 디렉토리로 이동
cd autus/allthatbasket

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### Supabase 설정

```bash
# Supabase CLI로 마이그레이션 실행
supabase db push

# 타입 생성
npm run supabase:types
```

---

## 🎨 KRATON 디자인 시스템

AUTUS의 **KRATON 12 Cycles**를 농구 테마로 커스터마이징:

- **농구 코트 패턴 배경**: 미세한 라인 그리드
- **역할별 글로우 효과**: 각 역할 컬러로 하이라이트
- **글라스모피즘 카드**: 프리미엄 카드 UI
- **3D 게이지**: 스킬 점수 시각화

---

## 📊 데이터베이스 스키마

### 핵심 테이블

| 테이블 | 설명 |
|--------|------|
| `organizations` | 아카데미 조직 |
| `branches` | 지점 |
| `courts` | 코트 |
| `users` | 사용자 (역할 통합) |
| `programs` | 프로그램/반 |
| `students` | 학생 |
| `student_payments` | 수납 |
| `attendance_records` | 출석 |
| `skill_assessments` | 스킬 평가 |
| `student_points` | 포인트 |
| `student_badges` | 획득 배지 |
| `challenges` | 챌린지 |

### Row Level Security

역할 기반 데이터 접근 제어:
- **오너**: 전체 조직 데이터
- **원장**: 자신의 조직 내 모든 지점
- **관리자**: 자신의 지점 데이터
- **강사**: 자신의 수업 관련 데이터

---

## 🔗 AUTUS 연동

올댓바스켓은 AUTUS 플랫폼과 다음과 같이 연동됩니다:

```
AUTUS Core
├── frontend/          # 웹 대시보드
├── backend/           # API 서버
├── mobile-app/        # 범용 모바일 앱
├── kraton-v2/         # 디자인 시스템
└── allthatbasket/     # 🏀 농구 아카데미 특화
    ├── 공유: Supabase, KRATON, 인증
    └── 특화: 스킬 트래킹, 게이미피케이션
```

---

## 📱 프리뷰

대시보드 프리뷰 파일을 열어 4가지 역할의 UI를 확인하세요:

```
preview/all-roles-dashboard-preview.html
```

---

## 📄 License

MIT License - AUTUS 2.0 Project

---

> **올댓바스켓 — 농구의 모든 것, 하나의 플랫폼에서** 🏀
