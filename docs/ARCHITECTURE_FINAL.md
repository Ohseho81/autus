# 🏛️ AUTUS 최종 아키텍처: Core + Optional Modules

> **"Core는 단순하게, 확장은 선택적으로"**  
> Build on the Rock. 🏛️

---

## 📐 구조 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    Optional Modules                                         │
│                    (사용자 선택 활성화)                                      │
│                                                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│   │ 4-Node  │ │   AI    │ │Chemistry│ │Advanced │ │ Parent  │            │
│   │  View   │ │ Assist  │ │ Analysis│ │Analytics│ │   App   │            │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │
│        │           │           │           │           │                   │
│        └───────────┴───────────┴─────┬─────┴───────────┘                   │
│                                      │                                      │
│                                      ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │                                                                     │ │
│   │                         AUTUS Core                                 │ │
│   │                         (항상 작동)                                 │ │
│   │                                                                     │ │
│   │   ┌─────────────────────────────────────────────────────────────┐ │ │
│   │   │                       A = T^σ                               │ │ │
│   │   │                                                             │ │ │
│   │   │     σ 계산  →  위험 감지  →  알림  →  행위 기록           │ │ │
│   │   └─────────────────────────────────────────────────────────────┘ │ │
│   │                                                                     │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Core (필수, 항상 작동)

### 법칙

```
A = T^σ

여기서:
- A: 자산 가치 (Asset Value)
- T: 시간/거래 (Transaction)  
- σ: 만족도 지수 (Sigma Index)
```

### Core 기능 (4개)

| 기능 | 설명 | API 엔드포인트 |
|-----|------|---------------|
| **σ 계산 엔진** | 5개 핵심 행위 기반 σ 계산 | `/api/autus/sigma-proxy`, `/api/autus/behavior` |
| **위험 감지** | 🔴위험(σ<0.8) / 🟡주의(0.8~1.1) / 🟢양호(σ≥1.1) | `/api/risks`, `/api/churn` |
| **알림 시스템** | 임계값, D-day, 급락 감지 알림 | `/api/notify` |
| **행위 기록** | Quick Tag 현장 데이터 입력 | `/api/quick-tag` |

### Core 5개 핵심 행위

| 행위 | 가중치 | 설명 |
|-----|--------|------|
| 출결 | 20% | 수업 참석률 |
| 수납 | 20% | 결제 이행률 |
| 소통 반응 | 20% | 메시지 응답률 |
| 재등록 의사 | 25% | 재등록 표명 |
| 소개 | 15% | 신규 학생 추천 |

### Core 화면 (2개)

1. **대시보드**: 전체 현황, 위험 학생 리스트
2. **학생 상세**: 개별 σ, 행위 기록, 히스토리

---

## 2. Optional Modules (7개)

### Module 1: 4-Node View

> 역할별 대시보드 분리 (오너/관리자/실행자)

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF |
| **최소 플랜** | Pro |
| **포함 기능** | 오너 대시보드, 관리자 대시보드, 실행자 대시보드, 역할별 권한 |
| **활성화 조건** | 사용자 3명 이상, 역할 분리 필요 시 |
| **컴포넌트** | `DeciderView`, `OperatorView`, `ExecutorView`, `ConsumerView` |

### Module 2: AI Assistant

> LLM 기반 자연어 설정, 메시지/리포트 생성

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF (Pro), ON (Enterprise) |
| **최소 플랜** | Pro |
| **포함 기능** | 자연어 설정, 메시지 생성 AI, 리포트 생성 AI, 전략 제안 AI |
| **활성화 조건** | Pro 플랜, LLM 사용량 과금 동의 시 |
| **API** | `/api/brain`, `/api/brain/v-pulse`, `/api/neural/vectorize` |

### Module 3: Chemistry Analysis

> 학생/학부모 성향 분석, 맞춤 소통 가이드

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF |
| **최소 플랜** | Pro |
| **포함 기능** | 학생 성향 분석, 학부모 소통 스타일, 교사-학생 매칭, 맞춤 소통 가이드 |
| **활성화 조건** | 충분한 행위 데이터 축적 후 (3개월 이상) |
| **의존성** | AI Assistant |

### Module 4: Advanced Analytics

> 14개 행위 상세 분석, 시뮬레이션, 벤치마크

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF |
| **최소 플랜** | Enterprise |
| **포함 기능** | 14개 행위 분석, 외부 데이터 연동, V 물리 엔진, 시뮬레이션, 벤치마크 |
| **활성화 조건** | Enterprise 플랜, 데이터 연동 완료 시 |
| **API** | `/api/physics`, `/api/organisms`, `/api/time-value`, `/api/audit/physics` |

### Module 5: Goal & Strategy

> 목표 설정, 전략 수립, 환경 분석, Monopoly

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF |
| **최소 플랜** | Pro |
| **포함 기능** | 목표 설정 (6유형), 전략 수립 (6영역), 환경 분석, 3대 독점 모니터링 |
| **활성화 조건** | 오너가 전략적 기능 요청 시 |
| **API** | `/api/goals`, `/api/monopoly` |

### Module 6: Parent App

> 학부모용 성장 그래프, 케미스트리 리포트

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF |
| **최소 플랜** | Pro |
| **포함 기능** | 성장 그래프, 케미스트리 리포트, 니즈 매칭, 선생님 소통, V-포인트 |
| **활성화 조건** | 학부모 직접 접근 요청 시 |
| **API** | `/api/rewards` |

### Module 7: Integration Pack

> SMS, 카카오톡, 결제, 캘린더 자동 연동

| 항목 | 내용 |
|-----|------|
| **기본 상태** | OFF (Pro), ON (Enterprise) |
| **최소 플랜** | Pro |
| **포함 기능** | SMS 출결, 카카오톡, 결제 PG, 캘린더, ERP 동기화 |
| **활성화 조건** | 수동 입력 부담 시, Pro 플랜 이상 |
| **API** | `/api/sync/classting`, `/api/sync/narakhub`, `/api/webhook/n8n` |

---

## 3. 플랜별 기본 설정

| 모듈 | Community | Pro | Enterprise |
|-----|-----------|-----|------------|
| **Core** | ✅ 필수 | ✅ 필수 | ✅ 필수 |
| 4-Node View | ❌ 불가 | ⬜ 선택 | ⬜ 선택 |
| AI Assistant | ❌ 불가 | ⬜ 선택 | ✅ 기본ON |
| Chemistry Analysis | ❌ 불가 | ⬜ 선택 | ⬜ 선택 |
| Advanced Analytics | ❌ 불가 | ❌ 불가 | ⬜ 선택 |
| Goal & Strategy | ❌ 불가 | ⬜ 선택 | ⬜ 선택 |
| Parent App | ❌ 불가 | ⬜ 선택 | ⬜ 선택 |
| Integration Pack | ❌ 불가 | ⬜ 선택 | ✅ 기본ON |

### 가격

| 플랜 | 가격 | 학생 수 |
|-----|------|--------|
| Community | 무료 | 30명 |
| Pro | ₩99,000/월 | 무제한 |
| Enterprise | ₩499,000/월 | 무제한 + 다지점 |

---

## 4. σ 계산 확장성

### 기본 (Core)

```
σ = Σ(wᵢ × behaviorᵢ)

5개 핵심 행위:
├─ 출결 (20%)
├─ 수납 (20%)
├─ 소통 반응 (20%)
├─ 재등록 의사 (25%)
└─ 소개 (15%)
```

### 확장 (Advanced Analytics)

```
14개 행위 (6 Tier):
├─ Tier 1: 재등록, 소개, 추가수강
├─ Tier 2: 유료이벤트, 자발체류
├─ Tier 3: 무료이벤트, 수업참여
├─ Tier 4: 출결, 수납, 소통반응
├─ Tier 5: 긍정피드백, 굿즈소지
└─ Tier 6: 불만, 이탈신호 (음수 가중치)

+ 외부 데이터 (Integration):
├─ 이메일 응답
├─ 캘린더 참여
├─ 메신저 반응
└─ 결제 패턴
```

### 가중치 커스터마이징

- **기본**: 고정 가중치
- **AI Assistant 활성화 시**: 자연어로 조정 가능

```
예: "우리 학원은 소개가 더 중요해요"
→ 소개 가중치 15% → 25%
```

---

## 5. 파일 구조

```
frontend/src/
├── core/
│   └── modules/
│       ├── module-config.ts    # 모듈 설정 정의
│       └── index.ts
├── components/
│   ├── shell/
│   │   └── views/
│   │       ├── DeciderView.tsx    # 4-Node: 결정자
│   │       ├── OperatorView.tsx   # 4-Node: 운영자
│   │       ├── ExecutorView.tsx   # 4-Node: 실행자
│   │       └── ConsumerView.tsx   # Parent App: 소비자
│   └── panels/
│       ├── QuickTagPanel.tsx      # Core: 행위 기록
│       ├── RiskQueuePanel.tsx     # Core: 위험 감지
│       ├── ChurnAlertPanel.tsx    # Core: 이탈 알림
│       ├── MonopolyPanel.tsx      # Goal & Strategy
│       └── RewardsPanel.tsx       # Parent App
└── pages/
    ├── RoleDashboard.tsx          # Core: 대시보드
    ├── GoalsPage.tsx              # Goal & Strategy
    └── settings/
        ├── ModulesPage.tsx        # 모듈 설정 UI
        └── IntegrationsPage.tsx   # Integration Pack

vercel-api/app/api/
├── autus/
│   ├── sigma-proxy/     # Core: σ 계산
│   └── behavior/        # Core: 행위 기록
├── risks/               # Core: 위험 감지
├── churn/               # Core: 이탈 예측
├── notify/              # Core: 알림
├── quick-tag/           # Core: Quick Tag
├── brain/               # AI Assistant
├── physics/             # Advanced Analytics
├── organisms/           # Advanced Analytics
├── goals/               # Goal & Strategy
├── monopoly/            # Goal & Strategy
├── rewards/             # Parent App
├── sync/                # Integration Pack
│   ├── classting/
│   ├── narakhub/
│   └── all/
└── webhook/             # Integration Pack
```

---

## 6. 원칙

### 1. Core는 단순하게

- σ 하나로 이탈 예측
- 모든 학원이 바로 사용 가능
- 5개 핵심 행위만으로 충분

### 2. 확장은 선택적으로

- 필요한 학원만 활성화
- 피드백에 따라 점진적 확장
- 플랜별 차등 제공

### 3. 기존 개념 보존

- 4-Node, 22개 카테고리 등 버리지 않음
- 옵션으로 제공하여 검증
- 데이터 기반 승격/폐기 결정

### 4. 데이터 기반 진화

- 사용 패턴에 따라 기본값 조정
- 인기 모듈은 Core로 승격 가능
- 미사용 모듈은 Archive로 이동

---

## 7. 현재 개발 상태

| 카테고리 | 완성도 | 비고 |
|---------|--------|------|
| **Core** | 100% | σ, 위험, 알림, Quick Tag 모두 완성 |
| 4-Node View | 100% | 4개 역할 뷰 완성 |
| AI Assistant | 90% | Claude 연동 완성, UI 일부 미완 |
| Chemistry Analysis | 30% | 로직 있음, UI 미완 |
| Advanced Analytics | 100% | Physics, Organisms 완성 |
| Goal & Strategy | 100% | Goals, Monopoly 완성 |
| Parent App | 70% | ConsumerView, Rewards 완성 |
| Integration Pack | 100% | Classting, Narakhub, n8n 완성 |

---

## 한 문장

> **"Core로 시작하고, 필요에 따라 확장한다"**

---

*Build on the Rock. 🏛️*  
*Last Updated: 2026-01-25*
