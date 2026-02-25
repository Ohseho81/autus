# 🔄 AUTUS 글로벌 표준 9단계 워크플로우 상세 설계

> **Version**: 1.0.0
> **Date**: 2026-02-03
> **Status**: 설계 진행 중

---

## 📐 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTUS 9단계 워크플로우 아키텍처                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    INPUT: 미션/이벤트 + 6W                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│   PHASE 1-3: 발견 (DISCOVER)                                               │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐                         │
│   │  SENSE    │───▶│  ANALYZE  │───▶│ STRATEGIZE│                         │
│   │  (감지)   │    │  (분석)   │    │  (전략)   │                         │
│   │ Ray Dalio │    │Elon Musk  │    │Peter Thiel│                         │
│   └───────────┘    └───────────┘    └───────────┘                         │
│        │                │                │                                  │
│        ▼                ▼                ▼                                  │
│   [Collect Engine] [Compute Engine] [ReAct Engine]                         │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│   PHASE 4-6: 실행 (EXECUTE)                                                │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐                         │
│   │  DESIGN   │───▶│   BUILD   │───▶│  LAUNCH   │                         │
│   │  (설계)   │    │  (구축)   │    │  (출시)   │                         │
│   │Jeff Bezos │    │Jeff Bezos │    │Reid Hoffman│                        │
│   └───────────┘    └───────────┘    └───────────┘                         │
│        │                │                │                                  │
│        ▼                ▼                ▼                                  │
│   [Predict Engine] [CodeAct Engine]  [Alert Engine]                        │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│   PHASE 7-9: 학습 (LEARN)                                                  │
│   ┌───────────┐    ┌───────────┐    ┌───────────┐                         │
│   │  MEASURE  │───▶│   LEARN   │───▶│   SCALE   │                         │
│   │  (측정)   │    │  (학습)   │    │  (확장)   │                         │
│   │Andy Grove │    │ Ray Dalio │    │Jeff Bezos │                         │
│   └───────────┘    └───────────┘    └───────────┘                         │
│        │                │                │                                  │
│        ▼                ▼                ▼                                  │
│   [Proof Engine]   [Learn Engine]    [Predict Engine]                      │
│                                                                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    OUTPUT: 역할 배정 + 실행 계획                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1: SENSE (감지)
# ═══════════════════════════════════════════════════════════════════════════

## 1.1 개요

| 항목 | 내용 |
|------|------|
| **리더** | Ray Dalio (Bridgewater) |
| **원칙** | "약한 신호 포착" (Weak Signal Detection) |
| **AUTUS 기능** | 🔮 예측 (Predict) |
| **Engine** | Collect Engine + Predict Engine |
| **목표** | 환경 변화 감지 → 기회/위협 식별 |

## 1.2 세부 프로세스

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SENSE Phase 세부 프로세스                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STEP 1: 데이터 수집 (Collect)                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   │   │
│   │   │ Internal  │   │  Voice    │   │ External  │   │ Trigger   │   │   │
│   │   │   Data    │   │   Data    │   │   Data    │   │   Data    │   │   │
│   │   ├───────────┤   ├───────────┤   ├───────────┤   ├───────────┤   │   │
│   │   │• 매출     │   │• 리뷰     │   │• 경쟁사   │   │• 날짜     │   │   │
│   │   │• 출석     │   │• 불만     │   │• 시장     │   │• 시즌     │   │   │
│   │   │• 결제     │   │• 칭찬     │   │• 경제     │   │• 이벤트   │   │   │
│   │   │• 이탈     │   │• 요청     │   │• 트렌드   │   │• 기념일   │   │   │
│   │   └───────────┘   └───────────┘   └───────────┘   └───────────┘   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 2: 신호 탐지 (Signal Detection)                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   Signal Score = Σ(Weight_i × Deviation_i × Trend_i)               │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │  신호 유형          │ 임계값   │ 가중치  │ 긴급도          │   │   │
│   │   ├─────────────────────┼──────────┼─────────┼─────────────────┤   │   │
│   │   │  매출 급감          │  -15%    │  0.30   │  🔴 HIGH        │   │   │
│   │   │  이탈 징후 증가     │  +20%    │  0.25   │  🔴 HIGH        │   │   │
│   │   │  출석률 하락        │  -10%    │  0.20   │  🟡 MEDIUM      │   │   │
│   │   │  불만 리뷰 증가     │  +30%    │  0.15   │  🟡 MEDIUM      │   │   │
│   │   │  경쟁사 이벤트      │  발생시  │  0.10   │  🟢 LOW         │   │   │
│   │   └─────────────────────┴──────────┴─────────┴─────────────────┘   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 3: 8대 외부환경 요소 분석                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   σ (환경지수) = Σ(Factor_i × Impact_i) / 8                        │   │
│   │                                                                     │   │
│   │   ┌────────┬────────┬────────┬────────┐                            │   │
│   │   │ 경쟁   │ 경제   │ 기술   │ 사회   │                            │   │
│   │   │ ⚔️     │ 💰     │ 🔧     │ 👥     │                            │   │
│   │   │[-5,+2] │[-3,+3] │[-1,+5] │[-2,+4] │                            │   │
│   │   └────────┴────────┴────────┴────────┘                            │   │
│   │   ┌────────┬────────┬────────┬────────┐                            │   │
│   │   │ 정책   │ 계절   │ 트렌드 │ 고객   │                            │   │
│   │   │ 📜     │ 🌸     │ 📈     │ 🎯     │                            │   │
│   │   │[-4,+2] │[-3,+5] │[-2,+4] │[-2,+3] │                            │   │
│   │   └────────┴────────┴────────┴────────┘                            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 4: 미래 예측                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   R(t+n) = R(t) × (1 + σ)^n                                        │   │
│   │                                                                     │   │
│   │   R(t)   = 현재 결과값 (매출, 회원수 등)                            │   │
│   │   σ      = 월간 성장률 (환경지수 합계 / 100)                        │   │
│   │   n      = 예측 기간 (월)                                           │   │
│   │   R(t+n) = 예측 결과값                                              │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   OUTPUT:                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • 감지된 신호 목록 (기회/위협)                                      │   │
│   │  • 8대 외부환경 스코어                                               │   │
│   │  • 3개월 후 예측 결과값                                              │   │
│   │  • 긴급도 레벨 (HIGH/MEDIUM/LOW)                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 데이터 소스 (교육서비스업)

| 구분 | 데이터 항목 | 수집 주기 | 소스 |
|------|-----------|----------|------|
| **Internal** | 등록/재등록 건수 | 일간 | CRM |
| | 출석률 | 일간 | 출석시스템 |
| | 결제 현황 | 일간 | PG |
| | 휴면 전환률 | 주간 | CRM |
| **Voice** | 학부모 리뷰 | 실시간 | 앱/카카오 |
| | 상담 문의 | 실시간 | 상담 시스템 |
| | 불만/환불 요청 | 실시간 | CS 시스템 |
| **External** | 경쟁 학원 이벤트 | 주간 | 크롤링 |
| | 시장 성장률 | 월간 | 통계청 |
| | 지역 인구 변화 | 월간 | 통계청 |
| **Trigger** | 방학 시작/종료 | 캘린더 | 교육부 |
| | 대회/행사 일정 | 월간 | 협회 |
| | 계절 변화 | 자동 | 시스템 |

## 1.4 알고리즘: 신호 감지 (Signal Detection)

```javascript
// SENSE Phase Algorithm
const sensePhase = {

  // STEP 1: 데이터 수집
  collectData: (brandConfig) => {
    return {
      internal: {
        revenue: getCurrentRevenue(),           // 현재 매출
        revenueChange: getRevenueChange(30),    // 30일 변화율
        activeMembers: getActiveMembers(),      // 활성 회원
        churnRate: getChurnRate(30),           // 30일 이탈률
        attendanceRate: getAttendanceRate(7),   // 7일 출석률
      },
      voice: {
        reviewScore: getAvgReviewScore(30),     // 30일 평균 리뷰
        complaintCount: getComplaints(30),      // 30일 불만 건수
        inquiryCount: getInquiries(30),         // 30일 문의 건수
      },
      external: {
        marketGrowth: getMarketGrowth(),        // 시장 성장률
        competitorEvents: getCompetitorEvents(), // 경쟁사 이벤트
        seasonFactor: getSeasonFactor(),        // 계절 요소
      },
      trigger: {
        upcomingEvents: getUpcomingEvents(),    // 예정 이벤트
        holidays: getUpcomingHolidays(),        // 휴일
        seasonChange: getSeasonChange(),        // 시즌 변화
      }
    };
  },

  // STEP 2: 신호 탐지
  detectSignals: (data) => {
    const signals = [];
    const thresholds = {
      revenueDrop: { value: -0.15, weight: 0.30, urgency: 'HIGH' },
      churnIncrease: { value: 0.20, weight: 0.25, urgency: 'HIGH' },
      attendanceDrop: { value: -0.10, weight: 0.20, urgency: 'MEDIUM' },
      complaintIncrease: { value: 0.30, weight: 0.15, urgency: 'MEDIUM' },
      competitorEvent: { value: 1, weight: 0.10, urgency: 'LOW' },
    };

    // 매출 급감 신호
    if (data.internal.revenueChange < thresholds.revenueDrop.value) {
      signals.push({
        type: 'THREAT',
        signal: '매출 급감 감지',
        value: data.internal.revenueChange,
        threshold: thresholds.revenueDrop.value,
        urgency: 'HIGH',
        weight: 0.30,
      });
    }

    // 이탈률 증가 신호
    if (data.internal.churnRate > thresholds.churnIncrease.value) {
      signals.push({
        type: 'THREAT',
        signal: '이탈률 증가 감지',
        value: data.internal.churnRate,
        threshold: thresholds.churnIncrease.value,
        urgency: 'HIGH',
        weight: 0.25,
      });
    }

    // ... 추가 신호 탐지

    return signals;
  },

  // STEP 3: 환경 지수 계산
  calculateEnvironmentIndex: (factors) => {
    // factors = { competition: -2, economy: 1, technology: 3, ... }
    const sum = Object.values(factors).reduce((a, b) => a + b, 0);
    const sigma = sum / 100; // 월간 성장률로 변환
    return sigma;
  },

  // STEP 4: 미래 예측
  predictFuture: (currentValue, sigma, months = 3) => {
    // R(t+n) = R(t) × (1 + σ)^n
    const predicted = currentValue * Math.pow(1 + sigma, months);
    const change = ((predicted - currentValue) / currentValue) * 100;
    return {
      current: currentValue,
      predicted: Math.round(predicted),
      change: change.toFixed(1),
      months: months,
      sigma: sigma,
    };
  },

  // 전체 실행
  execute: (brandConfig, missionInput) => {
    const data = this.collectData(brandConfig);
    const signals = this.detectSignals(data);
    const sigma = this.calculateEnvironmentIndex(brandConfig.factors);
    const prediction = this.predictFuture(data.internal.revenue, sigma);

    return {
      phase: 'SENSE',
      status: 'COMPLETE',
      signals: signals,
      environmentIndex: sigma,
      prediction: prediction,
      urgencyLevel: signals.some(s => s.urgency === 'HIGH') ? 'HIGH' :
                   signals.some(s => s.urgency === 'MEDIUM') ? 'MEDIUM' : 'LOW',
      nextPhase: 'ANALYZE',
    };
  }
};
```

---

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 7: MEASURE (측정)
# ═══════════════════════════════════════════════════════════════════════════

## 7.1 개요

| 항목 | 내용 |
|------|------|
| **리더** | Andy Grove (Intel) |
| **원칙** | "OKR & Input Metrics" |
| **AUTUS 기능** | 📊 측정 (Measure) |
| **Engine** | Proof Engine |
| **목표** | 실행 결과 측정 → 성과 검증 |

## 7.2 세부 프로세스

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MEASURE Phase 세부 프로세스                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STEP 1: OKR 자동 생성                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   Mission Input → OKR 매핑                                          │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │  Mission: "휴면고객 재활성화"                                │   │   │
│   │   ├─────────────────────────────────────────────────────────────┤   │   │
│   │   │  Objective: 30일+ 미방문 고객의 복귀율 향상                  │   │   │
│   │   │                                                             │   │   │
│   │   │  Key Results:                                               │   │   │
│   │   │  ├─ KR1: 휴면고객 복귀율 15% → 30% (2주 내)                 │   │   │
│   │   │  ├─ KR2: 복귀 고객 재이탈률 50% → 25% (1개월 내)            │   │   │
│   │   │  └─ KR3: 휴면고객 발생률 20% → 15% (1개월 내)               │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 2: Input Metrics 정의 (선행지표)                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   "Output을 만드는 Input을 측정하라" - Andy Grove                   │   │
│   │                                                                     │   │
│   │   ┌───────────────────────────────────────────────────────────┐     │   │
│   │   │  Output (결과)        │  Input (선행지표)                 │     │   │
│   │   ├───────────────────────┼───────────────────────────────────┤     │   │
│   │   │  복귀율 30%           │  • 발송 메시지 수 (목표: 100건)   │     │   │
│   │   │                       │  • 오픈율 (목표: 40%)             │     │   │
│   │   │                       │  • 클릭률 (목표: 15%)             │     │   │
│   │   │                       │  • 상담 요청 (목표: 20건)         │     │   │
│   │   ├───────────────────────┼───────────────────────────────────┤     │   │
│   │   │  재이탈률 25%         │  • 복귀 후 출석률 (목표: 80%)     │     │   │
│   │   │                       │  • 만족도 점수 (목표: 4.0+)       │     │   │
│   │   │                       │  • 재결제 의향 (목표: 70%)        │     │   │
│   │   └───────────────────────┴───────────────────────────────────┘     │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 3: TSEL 지수 측정                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   R = T(0.25) + S(0.30) + E(0.25) + L(0.20)                        │   │
│   │                                                                     │   │
│   │   ┌───────────────────────────────────────────────────────────┐     │   │
│   │   │  지수    │ 측정 방법           │ Before  │ After  │ 변화 │     │   │
│   │   ├──────────┼─────────────────────┼─────────┼────────┼──────┤     │   │
│   │   │ T(신뢰)  │ 재등록 의향 설문    │  0.65   │  0.78  │ +0.13│     │   │
│   │   │ S(만족)  │ NPS 점수 / 100     │  0.58   │  0.72  │ +0.14│     │   │
│   │   │ E(참여)  │ 출석률 × 활동률    │  0.70   │  0.82  │ +0.12│     │   │
│   │   │ L(충성)  │ 재결제율 × 추천율  │  0.55   │  0.68  │ +0.13│     │   │
│   │   ├──────────┼─────────────────────┼─────────┼────────┼──────┤     │   │
│   │   │ R (합계) │ 가중 평균          │  0.62   │  0.75  │ +0.13│     │   │
│   │   └──────────┴─────────────────────┴─────────┴────────┴──────┘     │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   STEP 4: Proof Pack 생성                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                    📋 PROOF PACK                             │   │   │
│   │   ├─────────────────────────────────────────────────────────────┤   │   │
│   │   │                                                             │   │   │
│   │   │  Mission: 휴면고객 재활성화                                 │   │   │
│   │   │  Period: 2026-02-03 ~ 2026-02-17                           │   │   │
│   │   │  Status: ✅ 목표 달성                                       │   │   │
│   │   │                                                             │   │   │
│   │   │  ═══════════════════════════════════════════════════════   │   │   │
│   │   │  OKR Achievement                                           │   │   │
│   │   │  ─────────────────────────────────────────────────────────  │   │   │
│   │   │  KR1: 복귀율 15% → 32% (목표: 30%) ✅ 106%                 │   │   │
│   │   │  KR2: 재이탈률 50% → 28% (목표: 25%) ⚠️ 88%               │   │   │
│   │   │  KR3: 휴면발생률 20% → 14% (목표: 15%) ✅ 107%             │   │   │
│   │   │                                                             │   │   │
│   │   │  ═══════════════════════════════════════════════════════   │   │   │
│   │   │  TSEL Impact                                               │   │   │
│   │   │  ─────────────────────────────────────────────────────────  │   │   │
│   │   │  R Index: 0.62 → 0.75 (+21%)                               │   │   │
│   │   │  Predicted Revenue Impact: +₩320만/월                       │   │   │
│   │   │                                                             │   │   │
│   │   │  ═══════════════════════════════════════════════════════   │   │   │
│   │   │  Evidence (증거)                                           │   │   │
│   │   │  ─────────────────────────────────────────────────────────  │   │   │
│   │   │  • 발송 로그: 100건 (2/3~2/10)                             │   │   │
│   │   │  • 복귀 고객 리스트: 32명                                   │   │   │
│   │   │  • 출석 기록: 평균 출석률 82%                               │   │   │
│   │   │  • 설문 응답: 28명 응답, NPS 72점                           │   │   │
│   │   │                                                             │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   OUTPUT:                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • OKR 달성률 (%)                                                   │   │
│   │  • Input Metrics 실적                                               │   │
│   │  • TSEL 지수 변화                                                   │   │
│   │  • Proof Pack (증거 문서)                                           │   │
│   │  • 학습 포인트 (LEARN 단계로 전달)                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7.3 알고리즘: OKR 자동 생성

```javascript
// MEASURE Phase Algorithm
const measurePhase = {

  // 미션 → OKR 매핑 템플릿
  OKR_TEMPLATES: {
    '휴면고객 재활성화': {
      objective: '30일+ 미방문 고객의 복귀율 향상',
      keyResults: [
        { id: 'KR1', metric: '복귀율', baseline: 15, target: 30, unit: '%', period: '2주' },
        { id: 'KR2', metric: '재이탈률', baseline: 50, target: 25, unit: '%', period: '1개월' },
        { id: 'KR3', metric: '휴면발생률', baseline: 20, target: 15, unit: '%', period: '1개월' },
      ],
      inputMetrics: [
        { name: '발송 메시지 수', target: 100, unit: '건' },
        { name: '오픈율', target: 40, unit: '%' },
        { name: '클릭률', target: 15, unit: '%' },
        { name: '상담 요청', target: 20, unit: '건' },
      ],
    },
    '재등록률 향상': {
      objective: '만료 예정 회원의 재등록 전환율 향상',
      keyResults: [
        { id: 'KR1', metric: '재등록률', baseline: 60, target: 80, unit: '%', period: '1개월' },
        { id: 'KR2', metric: '조기재등록률', baseline: 20, target: 40, unit: '%', period: '1개월' },
        { id: 'KR3', metric: '평균등록기간', baseline: 3, target: 6, unit: '개월', period: '1개월' },
      ],
      inputMetrics: [
        { name: '리마인드 발송', target: 50, unit: '건' },
        { name: '개별 상담', target: 30, unit: '건' },
        { name: '혜택 안내', target: 50, unit: '건' },
      ],
    },
    '신규 회원 확보': {
      objective: '체험 → 정규 전환율 극대화',
      keyResults: [
        { id: 'KR1', metric: '전환율', baseline: 30, target: 50, unit: '%', period: '1개월' },
        { id: 'KR2', metric: '체험신청', baseline: 20, target: 40, unit: '건', period: '1개월' },
        { id: 'KR3', metric: '3개월유지율', baseline: 70, target: 85, unit: '%', period: '3개월' },
      ],
      inputMetrics: [
        { name: '마케팅 노출', target: 5000, unit: '회' },
        { name: '체험 문의', target: 60, unit: '건' },
        { name: '체험 후 상담', target: 40, unit: '건' },
      ],
    },
  },

  // STEP 1: OKR 생성
  generateOKR: (missionType) => {
    const template = this.OKR_TEMPLATES[missionType];
    if (!template) {
      // 커스텀 미션의 경우 기본 템플릿 사용
      return {
        objective: `${missionType} 목표 달성`,
        keyResults: [
          { id: 'KR1', metric: '목표달성률', baseline: 0, target: 100, unit: '%', period: '1개월' },
        ],
        inputMetrics: [],
      };
    }
    return template;
  },

  // STEP 2: TSEL 지수 계산
  calculateTSEL: (data) => {
    const weights = { T: 0.25, S: 0.30, E: 0.25, L: 0.20 };

    const T = data.trustScore || 0;      // 재등록 의향 (0~1)
    const S = data.satisfactionScore || 0; // NPS/100 (0~1)
    const E = data.engagementScore || 0;  // 출석률×활동률 (0~1)
    const L = data.loyaltyScore || 0;     // 재결제율×추천율 (0~1)

    const R = (T * weights.T) + (S * weights.S) + (E * weights.E) + (L * weights.L);

    return {
      T: T.toFixed(2),
      S: S.toFixed(2),
      E: E.toFixed(2),
      L: L.toFixed(2),
      R: R.toFixed(2),
      breakdown: {
        trust: { value: T, weight: weights.T, contribution: (T * weights.T).toFixed(3) },
        satisfaction: { value: S, weight: weights.S, contribution: (S * weights.S).toFixed(3) },
        engagement: { value: E, weight: weights.E, contribution: (E * weights.E).toFixed(3) },
        loyalty: { value: L, weight: weights.L, contribution: (L * weights.L).toFixed(3) },
      }
    };
  },

  // STEP 3: OKR 달성률 계산
  calculateOKRProgress: (okr, actualData) => {
    return okr.keyResults.map(kr => {
      const actual = actualData[kr.id] || kr.baseline;
      let progress;

      if (kr.target > kr.baseline) {
        // 증가 목표 (예: 복귀율 15% → 30%)
        progress = ((actual - kr.baseline) / (kr.target - kr.baseline)) * 100;
      } else {
        // 감소 목표 (예: 이탈률 50% → 25%)
        progress = ((kr.baseline - actual) / (kr.baseline - kr.target)) * 100;
      }

      return {
        ...kr,
        actual: actual,
        progress: Math.min(Math.max(progress, 0), 150).toFixed(0), // 0~150%
        status: progress >= 100 ? '✅' : progress >= 70 ? '⚠️' : '❌',
      };
    });
  },

  // STEP 4: Proof Pack 생성
  generateProofPack: (missionType, okrProgress, tselBefore, tselAfter, evidence) => {
    const avgProgress = okrProgress.reduce((a, b) => a + parseFloat(b.progress), 0) / okrProgress.length;
    const tselChange = (parseFloat(tselAfter.R) - parseFloat(tselBefore.R)).toFixed(2);
    const tselChangePercent = ((parseFloat(tselAfter.R) - parseFloat(tselBefore.R)) / parseFloat(tselBefore.R) * 100).toFixed(0);

    return {
      mission: missionType,
      period: {
        start: evidence.startDate,
        end: evidence.endDate,
      },
      status: avgProgress >= 100 ? 'ACHIEVED' : avgProgress >= 70 ? 'PARTIAL' : 'FAILED',
      summary: {
        avgOKRProgress: avgProgress.toFixed(0) + '%',
        tselBefore: tselBefore.R,
        tselAfter: tselAfter.R,
        tselChange: `+${tselChange} (+${tselChangePercent}%)`,
      },
      okrResults: okrProgress,
      tselBreakdown: {
        before: tselBefore,
        after: tselAfter,
      },
      evidence: evidence.items,
      learningPoints: this.extractLearningPoints(okrProgress),
      generatedAt: new Date().toISOString(),
    };
  },

  // 학습 포인트 추출
  extractLearningPoints: (okrProgress) => {
    const points = [];

    okrProgress.forEach(kr => {
      if (parseFloat(kr.progress) >= 120) {
        points.push({
          type: 'SUCCESS',
          kr: kr.id,
          insight: `${kr.metric} 목표 초과 달성 (${kr.progress}%) - 성공 패턴 기록`,
        });
      } else if (parseFloat(kr.progress) < 70) {
        points.push({
          type: 'IMPROVE',
          kr: kr.id,
          insight: `${kr.metric} 목표 미달 (${kr.progress}%) - 원인 분석 필요`,
        });
      }
    });

    return points;
  },

  // 전체 실행
  execute: (missionType, actualData, tselBefore, tselAfter, evidence) => {
    const okr = this.generateOKR(missionType);
    const okrProgress = this.calculateOKRProgress(okr, actualData);
    const proofPack = this.generateProofPack(missionType, okrProgress, tselBefore, tselAfter, evidence);

    return {
      phase: 'MEASURE',
      status: 'COMPLETE',
      okr: okr,
      okrProgress: okrProgress,
      tsel: {
        before: tselBefore,
        after: tselAfter,
      },
      proofPack: proofPack,
      nextPhase: 'LEARN',
    };
  }
};
```

---

## 📊 업무 실행기 7기능 ↔ 9단계 매핑

| 업무 실행기 기능 | 주요 적용 단계 | 역할 |
|-----------------|---------------|------|
| 🎯 **객관화** | SENSE | 데이터 기반 현황 파악 |
| 📋 **구체화** | ANALYZE, DESIGN | 6W 정의, 상세 설계 |
| 📐 **표준화** | STRATEGIZE, BUILD | 워크플로우 표준 적용 |
| 🔮 **예측** | SENSE, SCALE | 미래 결과값 예측 |
| ⚡ **실행** | BUILD, LAUNCH | 실제 액션 수행 |
| 📊 **측정** | MEASURE | OKR/TSEL 측정 |
| 🔄 **개선** | LEARN, SCALE | 학습 및 확장 |

---

# ═══════════════════════════════════════════════════════════════════════════
# 5단계 솔루션 루프 ↔ 9단계 워크플로우 매핑
# ═══════════════════════════════════════════════════════════════════════════

## 통합 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              5단계 솔루션 루프 ↔ 9단계 글로벌 워크플로우 매핑                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   5단계 솔루션 루프              9단계 글로벌 워크플로우                      │
│   (AUTUS 내부 엔진)             (사용자 인터페이스)                          │
│                                                                             │
│   ┌─────────────┐               ┌─────────────┐                            │
│   │  1.DISCOVER │ ═══════════▶  │  1. SENSE   │  ← 데이터 수집 + 신호 감지  │
│   │  (수집)     │               │  2. ANALYZE │  ← 제1원리 분석             │
│   └──────┬──────┘               └─────────────┘                            │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐               ┌─────────────┐                            │
│   │  2.ANALYZE  │ ═══════════▶  │ 3.STRATEGIZE│  ← 전략 수립               │
│   │  (분석)     │               │  4. DESIGN  │  ← Working Backwards       │
│   └──────┬──────┘               └─────────────┘                            │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐               ┌─────────────┐                            │
│   │  3.REDESIGN │ ═══════════▶  │  5. BUILD   │  ← Two-Pizza Team 구성     │
│   │  (재설계)   │               │  6. LAUNCH  │  ← MVP 출시                │
│   └──────┬──────┘               └─────────────┘                            │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐               ┌─────────────┐                            │
│   │  4.OPTIMIZE │ ═══════════▶  │  7. MEASURE │  ← OKR 측정                │
│   │  (최적화)   │               │  8. LEARN   │  ← Post-Mortem             │
│   └──────┬──────┘               └─────────────┘                            │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐               ┌─────────────┐                            │
│   │  5.ELIMINATE│ ═══════════▶  │  9. SCALE   │  ← Flywheel 확장/소멸      │
│   │  (삭제)     │               └─────────────┘                            │
│   └─────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 상세 매핑 테이블

| 5단계 루프 | 9단계 워크플로우 | K·I·Ω 활용 | 주요 액션 |
|-----------|-----------------|-----------|----------|
| **1. DISCOVER** | 1. SENSE | K 초기화 | 데이터 수집, 노하우 통합 |
| | 2. ANALYZE | I 계산 | 제1원리 분해, 상호작용 분석 |
| **2. ANALYZE** | 3. STRATEGIZE | K ≥ 0.7 번영 / ≤ 0.3 삭제 | 전략 옵션 생성, 독점 가능성 |
| | 4. DESIGN | Ω 효율 계산 | PR/FAQ, Working Backwards |
| **3. REDESIGN** | 5. BUILD | 자동화 점수 ≥ 80% | AUTOMATE/COMPRESS/DELEGATE |
| | 6. LAUNCH | MVP 기준 | 최소 기능 출시 |
| **4. OPTIMIZE** | 7. MEASURE | K·Ω 재계산 | OKR 달성률, TSEL 측정 |
| | 8. LEARN | 피드백 반영 | Post-Mortem, 패턴 학습 |
| **5. ELIMINATE** | 9. SCALE | K < 0.3 삭제 | Flywheel 확장 또는 자연 소멸 |

## 통합 알고리즘

```javascript
// 5단계 루프 → 9단계 워크플로우 통합 엔진
const IntegratedWorkflowEngine = {

  // K·I·Ω 지수 정의
  INDICES: {
    K: 0,  // 가치 지수 (0~1)
    I: 0,  // 상호작용 지수 (-1~1)
    Omega: 0, // 효율 지수 (0~1)
  },

  // 1단계: DISCOVER (9단계: SENSE + ANALYZE)
  discover: async (missionInput, brandConfig) => {
    // === SENSE (1/9) ===
    const senseResult = await sensePhase.execute(brandConfig, missionInput);

    // === ANALYZE (2/9) ===
    // 제1원리 분해
    const firstPrinciples = analyzePhase.decomposeToFirstPrinciples(missionInput);

    // K 지수 초기화 (카테고리별 템플릿)
    const K = this.initializeK(missionInput.category, brandConfig);

    // I 지수 계산 (상호작용 영향)
    const I = this.calculateI(senseResult.signals, brandConfig.relationships);

    return {
      phase: 'DISCOVER',
      workflowPhases: ['SENSE', 'ANALYZE'],
      senseResult: senseResult,
      firstPrinciples: firstPrinciples,
      indices: { K, I },
      recommendation: K >= 0.7 ? 'PROCEED' : K <= 0.3 ? 'ELIMINATE' : 'ANALYZE_MORE',
    };
  },

  // 2단계: ANALYZE (9단계: STRATEGIZE + DESIGN)
  analyze: async (discoverResult, sixWAnswers) => {
    const { K, I } = discoverResult.indices;

    // === STRATEGIZE (3/9) ===
    const strategies = strategizePhase.generateStrategies(discoverResult, sixWAnswers);

    // === DESIGN (4/9) ===
    const design = designPhase.workingBackwards(strategies.selected);

    // Ω 지수 계산 (효율성)
    const Omega = this.calculateOmega(design.estimatedTime, design.expectedOutput);

    // 종합 점수 = (K + Ω) / 2 - |min(0, I)|
    const totalScore = (K + Omega) / 2 - Math.abs(Math.min(0, I));

    return {
      phase: 'ANALYZE',
      workflowPhases: ['STRATEGIZE', 'DESIGN'],
      strategies: strategies,
      design: design,
      indices: { K, I, Omega },
      totalScore: totalScore,
      verdict: totalScore >= 0.6 ? 'PROCEED' : totalScore <= 0.3 ? 'ELIMINATE' : 'REDESIGN',
    };
  },

  // 3단계: REDESIGN (9단계: BUILD + LAUNCH)
  redesign: async (analyzeResult, roleAssignments) => {
    const { Omega } = analyzeResult.indices;

    // 자동화 가능성 판단
    const automationScore = this.calculateAutomationScore(analyzeResult.design);

    // === BUILD (5/9) ===
    let buildAction;
    if (automationScore >= 80) {
      buildAction = 'AUTOMATE';  // 자동화
    } else if (automationScore >= 60) {
      buildAction = 'COMPRESS';  // 병합
    } else if (automationScore >= 40) {
      buildAction = 'DELEGATE';  // AI 대리
    } else {
      buildAction = 'KEEP';      // 인간 유지
    }

    const buildResult = buildPhase.execute(analyzeResult.design, buildAction, roleAssignments);

    // === LAUNCH (6/9) ===
    const launchResult = launchPhase.mvpLaunch(buildResult);

    return {
      phase: 'REDESIGN',
      workflowPhases: ['BUILD', 'LAUNCH'],
      automationScore: automationScore,
      buildAction: buildAction,
      buildResult: buildResult,
      launchResult: launchResult,
      estimatedTimeSaving: this.getTimeSaving(buildAction),
    };
  },

  // 4단계: OPTIMIZE (9단계: MEASURE + LEARN)
  optimize: async (redesignResult, actualMetrics) => {
    // === MEASURE (7/9) ===
    const measureResult = await measurePhase.execute(
      redesignResult.missionType,
      actualMetrics,
      redesignResult.tselBefore,
      redesignResult.tselAfter,
      redesignResult.evidence
    );

    // K·Ω 재계산 (피드백 기반)
    const feedback = this.processFeedback(actualMetrics);
    const newK = redesignResult.indices.K + feedback.kAdjustment;
    const newOmega = redesignResult.indices.Omega + feedback.omegaAdjustment;

    // === LEARN (8/9) ===
    const learnResult = learnPhase.postMortem(measureResult.proofPack);

    return {
      phase: 'OPTIMIZE',
      workflowPhases: ['MEASURE', 'LEARN'],
      measureResult: measureResult,
      learnResult: learnResult,
      indices: { K: newK, Omega: newOmega },
      patterns: learnResult.identifiedPatterns,
      improvements: learnResult.suggestedImprovements,
    };
  },

  // 5단계: ELIMINATE (9단계: SCALE)
  eliminate: async (optimizeResult) => {
    const { K, Omega } = optimizeResult.indices;

    // === SCALE (9/9) ===
    // 삭제 조건 체크
    const shouldEliminate =
      K < 0.3 ||                          // K 임계
      optimizeResult.indices.I < -0.3 ||  // I 임계
      (Omega < 0.4 && optimizeResult.stagnantDays > 30); // 정체

    let scaleAction;
    if (shouldEliminate) {
      scaleAction = 'ELIMINATE';
      // 월간 소요 시간 전체 회수
      // 에너지 100% 절감
      // 빈 슬롯 → 새 업무 수집 대기
    } else if (K >= 0.7 && Omega >= 0.6) {
      scaleAction = 'SCALE_UP';
      // Flywheel 효과 적용
      // 확장 시나리오 생성
    } else {
      scaleAction = 'MAINTAIN';
      // 현상 유지, 지속 모니터링
    }

    const scaleResult = scalePhase.execute(optimizeResult, scaleAction);

    return {
      phase: 'ELIMINATE',
      workflowPhases: ['SCALE'],
      scaleAction: scaleAction,
      scaleResult: scaleResult,
      finalIndices: { K, Omega },
      // 루프 재시작 여부
      shouldRestartLoop: scaleAction === 'MAINTAIN',
      nextCycleRecommendation: scaleResult.nextCycleRecommendation,
    };
  },

  // 헬퍼 함수들
  initializeK: (category, brandConfig) => {
    const categoryTemplates = {
      '교육서비스업': 0.6,
      '피트니스': 0.55,
      'F&B': 0.5,
      '리테일': 0.45,
    };
    return categoryTemplates[category] || 0.5;
  },

  calculateI: (signals, relationships) => {
    // 긍정 신호 vs 부정 신호 비율로 계산
    const positive = signals.filter(s => s.type === 'OPPORTUNITY').length;
    const negative = signals.filter(s => s.type === 'THREAT').length;
    return (positive - negative) / Math.max(signals.length, 1);
  },

  calculateOmega: (estimatedTime, expectedOutput) => {
    // 효율 = 산출 / 투입
    return Math.min(expectedOutput / estimatedTime, 1);
  },

  calculateAutomationScore: (design) => {
    const factors = {
      dataAvailable: design.hasData ? 20 : 0,
      patternRecognized: design.hasPattern ? 25 : 0,
      lowComplexity: design.complexity < 0.5 ? 20 : 0,
      highRepetition: design.isRepetitive ? 25 : 0,
      toolExists: design.toolAvailable ? 10 : 0,
    };
    return Object.values(factors).reduce((a, b) => a + b, 0);
  },

  getTimeSaving: (action) => {
    const savings = {
      'AUTOMATE': '80-95%',
      'COMPRESS': '40%',
      'DELEGATE': '95%',
      'KEEP': '0%',
    };
    return savings[action];
  },

  processFeedback: (actualMetrics) => {
    // 실제 결과 기반 K·Ω 조정
    let kAdjustment = 0;
    let omegaAdjustment = 0;

    // 예상보다 빠른 완료 → Ω +0.03
    if (actualMetrics.completionRatio > 1.2) omegaAdjustment += 0.03;

    // 품질 90% 이상 → K +0.04
    if (actualMetrics.qualityScore >= 0.9) kAdjustment += 0.04;

    // 피드백 4점 이상 → K·Ω +0.02
    if (actualMetrics.feedbackScore >= 4) {
      kAdjustment += 0.02;
      omegaAdjustment += 0.02;
    }

    return { kAdjustment, omegaAdjustment };
  },

  // 전체 워크플로우 실행
  runFullWorkflow: async (missionInput, brandConfig, sixWAnswers, roleAssignments) => {
    console.log('🚀 Starting Integrated Workflow...');

    // 1. DISCOVER (SENSE + ANALYZE)
    const discoverResult = await this.discover(missionInput, brandConfig);
    if (discoverResult.recommendation === 'ELIMINATE') {
      return { status: 'ELIMINATED_EARLY', reason: 'K too low at discovery' };
    }

    // 2. ANALYZE (STRATEGIZE + DESIGN)
    const analyzeResult = await this.analyze(discoverResult, sixWAnswers);
    if (analyzeResult.verdict === 'ELIMINATE') {
      return { status: 'ELIMINATED', reason: 'Total score too low' };
    }

    // 3. REDESIGN (BUILD + LAUNCH)
    const redesignResult = await this.redesign(analyzeResult, roleAssignments);

    // 4. OPTIMIZE (MEASURE + LEARN) - 실행 후 측정
    // 이 단계는 실제 실행 후 호출됨

    // 5. ELIMINATE (SCALE) - 측정 후 결정
    // 이 단계는 측정 후 호출됨

    return {
      status: 'LAUNCHED',
      results: {
        discover: discoverResult,
        analyze: analyzeResult,
        redesign: redesignResult,
      },
      nextAction: 'AWAIT_EXECUTION_AND_MEASURE',
    };
  },
};
```

## 실행 흐름도

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         통합 워크플로우 실행 흐름                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   USER INPUT                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  미션: "휴면고객 재활성화"                                          │   │
│   │  6W: WHO-휴면고객, WHAT-쿠폰, WHEN-트리거, WHERE-카카오, ...        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 1-2: SENSE + ANALYZE                                         │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  • 휴면 고객 데이터 수집 (Internal)                                 │   │
│   │  • 이탈 신호 감지 → K=0.62 (번영 기준 충족)                         │   │
│   │  • 제1원리: "왜 휴면이 되었나?" → 가격? 시간? 만족도?               │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  OUTPUT: K=0.62, I=0.1, 신호 3개 감지                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                          K ≥ 0.3? ─┼─ YES                                   │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 3-4: STRATEGIZE + DESIGN                                     │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  • 전략 옵션: A) 할인쿠폰 B) 신규프로그램 C) 1:1상담                │   │
│   │  • 독점 가능성: 1:1 상담 (경쟁사 없음) → 선택                       │   │
│   │  • Working Backwards: 복귀 후 만족 → 상담 → 컨택 → 리스트          │   │
│   │  • Ω=0.68 (효율 양호)                                               │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  OUTPUT: 전략 확정, PR/FAQ 초안, 총점=0.65 (PROCEED)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                       총점 ≥ 0.3? ─┼─ YES                                   │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 5-6: BUILD + LAUNCH                                          │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  • 자동화 점수: 75% → COMPRESS (병합)                               │   │
│   │  • Two-Pizza Team 구성:                                             │   │
│   │    - 이지현(CMO): 캠페인 기획                                       │   │
│   │    - 정수연(CS): 타겟 리스트                                        │   │
│   │    - 한동훈(Dev): 자동 발송                                         │   │
│   │    - 박성준(Coach): 혜택 프로그램                                   │   │
│   │  • MVP 출시: 50명 대상 파일럿                                       │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  OUTPUT: 역할 배정 완료, MVP 출시, 예상 시간절감 40%                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                            실행 대기 ─┼─ 2주 후                             │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 7-8: MEASURE + LEARN                                         │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  • OKR 달성률: KR1 106%, KR2 88%, KR3 107%                         │   │
│   │  • TSEL 변화: R 0.62 → 0.75 (+21%)                                 │   │
│   │  • K 재계산: 0.62 → 0.68 (+0.06)                                   │   │
│   │  • Post-Mortem: KR2 미달 → 복귀 후 케어 강화 필요                  │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  OUTPUT: Proof Pack, 학습 포인트 2개, 개선안                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 9: SCALE                                                     │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  • K=0.68 ≥ 0.7 (근접) → MAINTAIN                                  │   │
│   │  • Flywheel 후보: 복귀고객 → 추천 → 신규 → 휴면방지 → 복귀...      │   │
│   │  • 다음 사이클: 재등록률 향상 미션 추천                             │   │
│   │  ─────────────────────────────────────────────────────────────────  │   │
│   │  OUTPUT: MAINTAIN 결정, 다음 미션 추천                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│                           ┌───────────────┐                                 │
│                           │   LOOP BACK   │                                 │
│                           │   TO SENSE    │                                 │
│                           └───────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════════════════
# 교육서비스업 어댑터 (올댓바스켓)
# ═══════════════════════════════════════════════════════════════════════════

## 어댑터 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      교육서비스업 어댑터 아키텍처                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    AUTUS Core Engine (범용)                         │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│   │  │ Collect │ │ Compute │ │ Predict │ │ CodeAct │ │  Learn  │       │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Industry Adapter Layer                           │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │              🏀 교육서비스업 어댑터 (올댓바스켓)              │   │   │
│   │  │                                                             │   │   │
│   │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │   │   │
│   │  │  │ 용어 변환   │ │ 지표 매핑   │ │ 이벤트 템플릿│           │   │   │
│   │  │  │ Translator │ │ MetricMapper│ │EventTemplates│           │   │   │
│   │  │  └─────────────┘ └─────────────┘ └─────────────┘           │   │   │
│   │  │                                                             │   │   │
│   │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │   │   │
│   │  │  │ 시즌 캘린더 │ │  위험 규칙  │ │ OKR 템플릿  │           │   │   │
│   │  │  │SeasonCalendar│ │ RiskRules  │ │ OKRTemplates│           │   │   │
│   │  │  └─────────────┘ └─────────────┘ └─────────────┘           │   │   │
│   │  │                                                             │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Brand OS (올댓바스켓 UI)                         │   │
│   │  • 원장 뷰 • 관리자 뷰 • 코치 뷰 • 학부모 뷰                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 교육서비스업 어댑터 설정

```javascript
// 교육서비스업 어댑터 (올댓바스켓)
const EducationServiceAdapter = {

  // ═══════════════════════════════════════════════════════════════════════
  // 기본 설정
  // ═══════════════════════════════════════════════════════════════════════

  config: {
    id: 'education_service',
    name: '교육서비스업',
    brandId: 'allthatbasket',
    brandName: '올댓바스켓',
    industry: '교육서비스업',
    subCategory: '체육교육 (농구)',

    // 시장 현황
    market: {
      growth: 0.05,        // 시장 연간 성장률 5%
      companyGrowth: -0.03, // 올댓 성장률 -3%
      gap: -0.08,          // GAP -8%p
      status: 'WARNING',   // 위험 신호
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 용어 변환기 (Translator)
  // ═══════════════════════════════════════════════════════════════════════

  terminology: {
    // 범용 → 교육서비스업
    generic_to_industry: {
      'customer': '학생/회원',
      'member': '회원',
      'user': '학생',
      'employee': '코치/강사',
      'manager': '원장',
      'product': '프로그램/수업',
      'service': '레슨',
      'purchase': '등록',
      'subscription': '수강',
      'churn': '이탈/휴원',
      'retention': '재등록',
      'revenue': '수강료',
      'transaction': '결제',
      'engagement': '출석률',
      'satisfaction': '만족도',
      'loyalty': '재등록 의향',
      'referral': '추천',
    },

    // 교육서비스업 → 범용 (역변환)
    industry_to_generic: {
      '학생': 'user',
      '회원': 'member',
      '코치': 'employee',
      '강사': 'employee',
      '원장': 'manager',
      '수업': 'product',
      '레슨': 'service',
      '등록': 'purchase',
      '수강': 'subscription',
      '휴원': 'churn',
      '재등록': 'retention',
      '수강료': 'revenue',
      '출석률': 'engagement',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 지표 매핑 (Metric Mapper)
  // ═══════════════════════════════════════════════════════════════════════

  metrics: {
    // TSEL 지표 매핑
    tsel: {
      T: {  // Trust (신뢰)
        name: '신뢰도',
        sources: ['재등록 의향 설문', '추천 의향'],
        calculation: '(재등록의향 + 추천의향) / 2',
        weight: 0.25,
        benchmarks: { poor: 0.4, average: 0.6, good: 0.8 },
      },
      S: {  // Satisfaction (만족)
        name: '만족도',
        sources: ['수업 만족도', 'NPS 점수', '학부모 피드백'],
        calculation: 'NPS / 100',
        weight: 0.30,
        benchmarks: { poor: 0.3, average: 0.5, good: 0.7 },
      },
      E: {  // Engagement (참여)
        name: '참여도',
        sources: ['출석률', '보강 신청률', '이벤트 참여율'],
        calculation: '출석률 × 활동률',
        weight: 0.25,
        benchmarks: { poor: 0.5, average: 0.7, good: 0.85 },
      },
      L: {  // Loyalty (충성)
        name: '충성도',
        sources: ['재등록률', '등록 기간', '추천 실적'],
        calculation: '재등록률 × (등록기간/12)',
        weight: 0.20,
        benchmarks: { poor: 0.3, average: 0.5, good: 0.7 },
      },
    },

    // 핵심 KPI
    kpis: {
      enrollment_rate: { name: '등록 전환율', target: 0.5, unit: '%' },
      retention_rate: { name: '재등록률', target: 0.8, unit: '%' },
      churn_rate: { name: '이탈률', target: 0.15, unit: '%' },
      attendance_rate: { name: '출석률', target: 0.85, unit: '%' },
      dormant_rate: { name: '휴면율', target: 0.1, unit: '%' },
      nps_score: { name: 'NPS', target: 70, unit: 'points' },
      ltv: { name: '고객생애가치', target: 3600000, unit: '원' }, // 월 30만 × 12개월
      cac: { name: '고객획득비용', target: 100000, unit: '원' },
    },

    // 선행 지표 (Input Metrics)
    inputMetrics: {
      trial_inquiries: '체험 문의 건수',
      consultation_count: '상담 건수',
      message_sent: '발송 메시지 수',
      open_rate: '오픈율',
      click_rate: '클릭률',
      class_completion: '수업 완료율',
      parent_feedback: '학부모 피드백 수',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 이벤트 템플릿 (대표 미션)
  // ═══════════════════════════════════════════════════════════════════════

  eventTemplates: {
    missions: [
      {
        id: 'dormant_reactivation',
        name: '휴면고객 재활성화',
        description: '30일+ 미방문 회원 복귀 유도',
        trigger: '휴면 전환 시점',
        expectedROI: 2440,
        difficulty: 'MEDIUM',
        duration: '2주',
        targetAudience: 'dormant_30d',
        okrTemplate: {
          objective: '30일+ 미방문 고객의 복귀율 향상',
          keyResults: [
            { metric: '복귀율', baseline: 15, target: 30, unit: '%' },
            { metric: '재이탈률', baseline: 50, target: 25, unit: '%' },
            { metric: '휴면발생률', baseline: 20, target: 15, unit: '%' },
          ],
        },
        recommendedActions: [
          '개인화 복귀 메시지 발송',
          '복귀 혜택 (1회 무료 수업)',
          '1:1 상담 제안',
          '새 프로그램 안내',
        ],
      },
      {
        id: 'retention_improvement',
        name: '재등록률 향상',
        description: '만료 예정 회원 리텐션',
        trigger: '만료 30일 전',
        expectedROI: 3200,
        difficulty: 'MEDIUM',
        duration: '1개월',
        targetAudience: 'expiring_30d',
        okrTemplate: {
          objective: '만료 예정 회원의 재등록 전환율 향상',
          keyResults: [
            { metric: '재등록률', baseline: 60, target: 80, unit: '%' },
            { metric: '조기재등록률', baseline: 20, target: 40, unit: '%' },
            { metric: '평균등록기간', baseline: 3, target: 6, unit: '개월' },
          ],
        },
        recommendedActions: [
          '조기 재등록 할인 (10%)',
          '장기 등록 혜택 안내',
          '성과 리포트 공유',
          '다음 레벨 프로그램 소개',
        ],
      },
      {
        id: 'new_member_acquisition',
        name: '신규 회원 확보',
        description: '체험 → 정규 전환 극대화',
        trigger: '체험 완료 시점',
        expectedROI: 1850,
        difficulty: 'HIGH',
        duration: '1개월',
        targetAudience: 'trial_completed',
        okrTemplate: {
          objective: '체험 → 정규 전환율 극대화',
          keyResults: [
            { metric: '전환율', baseline: 30, target: 50, unit: '%' },
            { metric: '체험신청', baseline: 20, target: 40, unit: '건' },
            { metric: '3개월유지율', baseline: 70, target: 85, unit: '%' },
          ],
        },
        recommendedActions: [
          '체험 후 즉시 등록 혜택',
          '학부모 상담 진행',
          '레벨 테스트 결과 공유',
          '친구 동반 할인',
        ],
      },
    ],

    // 시즌별 추천 이벤트
    seasonalEvents: {
      spring: [ // 3-5월
        { name: '봄학기 조기등록', timing: '2월', focus: 'new_enrollment' },
        { name: '봄방학 특강', timing: '3월', focus: 'engagement' },
      ],
      summer: [ // 6-8월
        { name: '여름방학 캠프', timing: '7월', focus: 'engagement' },
        { name: '가을학기 선등록', timing: '8월', focus: 'retention' },
      ],
      fall: [ // 9-11월
        { name: '가을 대회 준비', timing: '9월', focus: 'engagement' },
        { name: '겨울학기 선등록', timing: '11월', focus: 'retention' },
      ],
      winter: [ // 12-2월
        { name: '겨울방학 집중반', timing: '12월', focus: 'engagement' },
        { name: '신년 프로모션', timing: '1월', focus: 'new_enrollment' },
        { name: '봄학기 선등록', timing: '2월', focus: 'retention' },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 시즌 캘린더
  // ═══════════════════════════════════════════════════════════════════════

  seasonCalendar: {
    // 학사 일정
    academic: {
      spring_semester: { start: '03-02', end: '07-15' },
      summer_vacation: { start: '07-16', end: '08-31' },
      fall_semester: { start: '09-01', end: '12-20' },
      winter_vacation: { start: '12-21', end: '03-01' },
    },

    // 고위험 기간 (이탈 증가)
    highRiskPeriods: [
      { period: '방학 시작 전 2주', reason: '일정 변화', action: '지속 유도 이벤트' },
      { period: '학기 시작', reason: '학업 부담', action: '시간 조정 안내' },
      { period: '시험 기간', reason: '시간 부족', action: '보강 예약 권유' },
    ],

    // 골든 타임 (등록 증가)
    goldenPeriods: [
      { period: '방학 시작', reason: '여유 시간 증가', action: '집중 프로그램 홍보' },
      { period: '새해', reason: '새로운 시작 심리', action: '신규 등록 프로모션' },
      { period: '개학 2주 전', reason: '일정 정리', action: '정규 수업 등록 유도' },
    ],

    // 시즌 팩터 (월별)
    monthlyFactor: {
      1: 1.2,   // 신년 효과
      2: 1.1,   // 봄학기 준비
      3: 0.9,   // 개학 적응
      4: 0.85,  // 중간고사
      5: 0.9,   // 회복
      6: 0.8,   // 기말고사
      7: 1.3,   // 여름방학 시작
      8: 1.2,   // 여름방학 중
      9: 0.85,  // 개학 적응
      10: 0.9,  // 중간고사
      11: 0.85, // 수능 영향
      12: 1.1,  // 겨울방학 준비
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 위험 규칙 (Risk Rules)
  // ═══════════════════════════════════════════════════════════════════════

  riskRules: {
    // 이탈 위험 감지 규칙
    churnRisk: [
      {
        id: 'consecutive_absence',
        name: '연속 결석',
        condition: 'absences >= 2 consecutive',
        severity: 'MEDIUM',
        action: '코치 1:1 연락',
        automatable: false,
      },
      {
        id: 'attendance_drop',
        name: '출석률 급락',
        condition: 'attendance_rate < 0.5 (2주)',
        severity: 'HIGH',
        action: '원장 상담 예약',
        automatable: false,
      },
      {
        id: 'payment_delay',
        name: '결제 지연',
        condition: 'payment_overdue > 7 days',
        severity: 'HIGH',
        action: '결제 안내 메시지',
        automatable: true,
      },
      {
        id: 'no_makeups',
        name: '보강 미신청',
        condition: 'missed_classes >= 3 AND makeups == 0',
        severity: 'MEDIUM',
        action: '보강 안내 발송',
        automatable: true,
      },
      {
        id: 'expiring_soon',
        name: '만료 임박',
        condition: 'days_to_expiry <= 14',
        severity: 'HIGH',
        action: '재등록 안내 + 혜택',
        automatable: true,
      },
    ],

    // 기회 감지 규칙
    opportunityRules: [
      {
        id: 'perfect_attendance',
        name: '개근',
        condition: 'attendance_rate == 1.0 (1개월)',
        action: '칭찬 메시지 + 추천 요청',
        automatable: true,
      },
      {
        id: 'skill_improvement',
        name: '실력 향상',
        condition: 'skill_score_delta > 0.2',
        action: '성과 리포트 공유 + 상위 프로그램 안내',
        automatable: true,
      },
      {
        id: 'long_term_member',
        name: '장기 회원',
        condition: 'membership_months >= 12',
        action: 'VIP 혜택 + 감사 메시지',
        automatable: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 조직 구조 (올댓바스켓)
  // ═══════════════════════════════════════════════════════════════════════

  organization: {
    company: {
      name: '올댓바스켓',
      industry: '교육서비스업',
    },
    roles: [
      {
        id: 'ceo',
        name: '오세호',
        role: '대표',
        department: '경영',
        skills: ['전략', '의사결정', '리더십'],
        authority: ['final_approval', 'budget', 'policy'],
        color: '#F97316',
      },
      {
        id: 'coo',
        name: '김민수',
        role: 'COO',
        department: '운영',
        skills: ['운영관리', '프로세스', '효율화'],
        authority: ['operation', 'scheduling', 'resource'],
        color: '#3B82F6',
      },
      {
        id: 'cmo',
        name: '이지현',
        role: 'CMO',
        department: '마케팅',
        skills: ['브랜딩', '캠페인', '콘텐츠'],
        authority: ['marketing', 'campaign', 'content'],
        color: '#EC4899',
      },
      {
        id: 'coach1',
        name: '박성준',
        role: '수석코치',
        department: '코칭',
        skills: ['농구지도', '선수육성', '프로그램'],
        authority: ['curriculum', 'assessment', 'coaching'],
        color: '#10B981',
      },
      {
        id: 'coach2',
        name: '최영호',
        role: '코치',
        department: '코칭',
        skills: ['유소년지도', '기초훈련'],
        authority: ['teaching', 'attendance'],
        color: '#10B981',
      },
      {
        id: 'cs',
        name: '정수연',
        role: 'CS담당',
        department: '고객서비스',
        skills: ['상담', 'CRM', '회원관리'],
        authority: ['customer_contact', 'crm', 'support'],
        color: '#06B6D4',
      },
      {
        id: 'dev',
        name: '한동훈',
        role: '개발',
        department: 'IT',
        skills: ['시스템', '데이터', '자동화'],
        authority: ['system', 'automation', 'data'],
        color: '#8B5CF6',
      },
    ],

    // 미션별 역할 자동 배정 규칙
    roleAssignmentRules: {
      '휴면고객 재활성화': [
        { roleId: 'cmo', task: '재활성화 캠페인 기획', priority: 1 },
        { roleId: 'cs', task: '타겟 고객 리스트 추출', priority: 2 },
        { roleId: 'dev', task: '자동 발송 시스템 설정', priority: 3 },
        { roleId: 'coach1', task: '복귀 혜택 프로그램 설계', priority: 4 },
      ],
      '재등록률 향상': [
        { roleId: 'cs', task: '만료 예정 회원 분석', priority: 1 },
        { roleId: 'cmo', task: '리텐션 혜택 설계', priority: 2 },
        { roleId: 'coach1', task: '맞춤 프로그램 제안', priority: 3 },
        { roleId: 'ceo', task: '할인 정책 최종 승인', priority: 4 },
      ],
      '신규 회원 확보': [
        { roleId: 'cmo', task: '체험 마케팅 캠페인', priority: 1 },
        { roleId: 'coach2', task: '체험 프로그램 운영', priority: 2 },
        { roleId: 'cs', task: '체험 → 정규 전환 상담', priority: 3 },
        { roleId: 'coo', task: '수용 인원 조정', priority: 4 },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 어댑터 함수들
  // ═══════════════════════════════════════════════════════════════════════

  // 용어 변환
  translateTerm: (term, direction = 'generic_to_industry') => {
    const map = this.terminology[direction];
    return map[term] || term;
  },

  // 시즌 팩터 가져오기
  getSeasonFactor: (date = new Date()) => {
    const month = date.getMonth() + 1;
    return this.seasonCalendar.monthlyFactor[month];
  },

  // 현재 위험 기간 체크
  isHighRiskPeriod: (date = new Date()) => {
    // 학사 일정 기반 위험 기간 체크 로직
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 중간/기말고사 기간 (4월, 6월, 10월, 12월 중순)
    if ([4, 6, 10, 12].includes(month) && day >= 10 && day <= 25) {
      return { isHighRisk: true, reason: '시험 기간' };
    }

    return { isHighRisk: false, reason: null };
  },

  // 미션에 맞는 OKR 가져오기
  getOKRTemplate: (missionName) => {
    const mission = this.eventTemplates.missions.find(m => m.name === missionName);
    return mission ? mission.okrTemplate : null;
  },

  // 역할 자동 배정
  assignRoles: (missionName) => {
    const rules = this.organization.roleAssignmentRules[missionName];
    if (!rules) {
      // 기본 배정
      return [
        { ...this.organization.roles.find(r => r.id === 'ceo'), task: '미션 검토 및 승인' },
        { ...this.organization.roles.find(r => r.id === 'coo'), task: '실행 계획 수립' },
      ];
    }

    return rules.map(rule => ({
      ...this.organization.roles.find(r => r.id === rule.roleId),
      task: rule.task,
      priority: rule.priority,
    })).sort((a, b) => a.priority - b.priority);
  },

  // 위험 감지
  detectRisks: (memberData) => {
    const risks = [];

    this.riskRules.churnRisk.forEach(rule => {
      // 규칙 평가 로직
      if (this.evaluateRule(rule, memberData)) {
        risks.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          action: rule.action,
          automatable: rule.automatable,
        });
      }
    });

    return risks;
  },

  // 규칙 평가 (간단한 구현)
  evaluateRule: (rule, data) => {
    switch (rule.id) {
      case 'consecutive_absence':
        return data.consecutiveAbsences >= 2;
      case 'attendance_drop':
        return data.recentAttendanceRate < 0.5;
      case 'payment_delay':
        return data.paymentOverdueDays > 7;
      case 'expiring_soon':
        return data.daysToExpiry <= 14;
      default:
        return false;
    }
  },

  // 추천 이벤트 가져오기
  getRecommendedEvents: (currentMonth) => {
    const season = this.getSeason(currentMonth);
    return this.eventTemplates.seasonalEvents[season] || [];
  },

  getSeason: (month) => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  },
};

// Export
export default EducationServiceAdapter;
```

---

# ═══════════════════════════════════════════════════════════════════════════
# 나머지 7단계 세부 프로세스
# ═══════════════════════════════════════════════════════════════════════════

## PHASE 2: ANALYZE (분석)

| 항목 | 내용 |
|------|------|
| **리더** | Elon Musk (Tesla/SpaceX) |
| **원칙** | "제1원리 사고" (First Principles Thinking) |
| **AUTUS 기능** | 📋 구체화 (Specify) |
| **Engine** | Compute Engine |

```javascript
const analyzePhase = {
  // 제1원리로 분해
  decomposeToFirstPrinciples: (problem) => {
    return {
      // 현상 → 원인 → 근본 원인
      phenomenon: problem.description,
      causes: this.identifyCauses(problem),
      rootCause: this.findRootCause(problem),

      // 가정 제거
      assumptions: this.listAssumptions(problem),
      validatedAssumptions: this.validateAssumptions(problem),

      // 기본 요소로 분해
      basicElements: this.breakdownToBasics(problem),
    };
  },

  // 원인 식별
  identifyCauses: (problem) => {
    // 5 Whys 기법 적용
    const whys = [];
    let current = problem.description;
    for (let i = 0; i < 5; i++) {
      const why = this.askWhy(current);
      whys.push({ level: i + 1, question: `왜 ${current}?`, answer: why });
      current = why;
    }
    return whys;
  },

  // 교육서비스업 예시
  example: {
    problem: '휴면 고객 증가',
    firstPrinciples: {
      phenomenon: '30일 이상 미방문 회원이 전체의 20%',
      whys: [
        { level: 1, question: '왜 미방문?', answer: '시간이 안 맞아서' },
        { level: 2, question: '왜 시간이 안 맞아?', answer: '학업/학원 일정 충돌' },
        { level: 3, question: '왜 일정 충돌?', answer: '수업 시간대가 제한적' },
        { level: 4, question: '왜 시간대가 제한적?', answer: '코치 수 부족' },
        { level: 5, question: '왜 코치 부족?', answer: '채용/유지 어려움' },
      ],
      rootCause: '유연한 시간대 제공 불가',
      solution: '온라인 보강/자습 프로그램 도입',
    },
  },
};
```

---

## PHASE 3: STRATEGIZE (전략)

| 항목 | 내용 |
|------|------|
| **리더** | Peter Thiel (PayPal/Palantir) |
| **원칙** | "독점 가능성" (Monopoly Question) |
| **AUTUS 기능** | 📐 표준화 (Standardize) |
| **Engine** | ReAct Engine |

```javascript
const strategizePhase = {
  // 전략 옵션 생성
  generateStrategies: (analyzeResult, sixW) => {
    const strategies = [];

    // Peter Thiel의 4가지 질문 적용
    const thielQuestions = {
      technology: '10배 나은 기술을 가지고 있는가?',
      timing: '지금이 적절한 타이밍인가?',
      monopoly: '작은 시장에서 독점 가능한가?',
      team: '이걸 실행할 팀이 있는가?',
    };

    // 각 전략의 독점 가능성 평가
    strategies.push({
      id: 'strategy_a',
      name: '할인 쿠폰 캠페인',
      thielScore: this.evaluateThiel(thielQuestions, 'discount'),
      monopolyPotential: 0.2,  // 경쟁사도 쉽게 따라함
      recommendation: 'AVOID',
    });

    strategies.push({
      id: 'strategy_b',
      name: '개인화 1:1 상담',
      thielScore: this.evaluateThiel(thielQuestions, 'consultation'),
      monopolyPotential: 0.7,  // 차별화 가능
      recommendation: 'PURSUE',
    });

    strategies.push({
      id: 'strategy_c',
      name: 'AI 성장 리포트',
      thielScore: this.evaluateThiel(thielQuestions, 'ai_report'),
      monopolyPotential: 0.9,  // 경쟁사 없음
      recommendation: 'STRONG_PURSUE',
    });

    // 최고 점수 전략 선택
    const selected = strategies.sort((a, b) =>
      b.monopolyPotential - a.monopolyPotential
    )[0];

    return { strategies, selected };
  },

  evaluateThiel: (questions, strategyType) => {
    const scores = {
      discount: { technology: 0.2, timing: 0.8, monopoly: 0.1, team: 0.9 },
      consultation: { technology: 0.5, timing: 0.7, monopoly: 0.6, team: 0.8 },
      ai_report: { technology: 0.9, timing: 0.9, monopoly: 0.9, team: 0.6 },
    };
    const s = scores[strategyType];
    return (s.technology + s.timing + s.monopoly + s.team) / 4;
  },
};
```

---

## PHASE 4: DESIGN (설계)

| 항목 | 내용 |
|------|------|
| **리더** | Jeff Bezos (Amazon) |
| **원칙** | "Working Backwards" (역순 사고) |
| **AUTUS 기능** | 📐 표준화 (Standardize) |
| **Engine** | Predict Engine |

```javascript
const designPhase = {
  // Working Backwards 방식
  workingBackwards: (selectedStrategy) => {
    // 1. 미래 보도자료 작성 (Press Release)
    const pressRelease = this.writePressRelease(selectedStrategy);

    // 2. FAQ 작성
    const faq = this.writeFAQ(selectedStrategy);

    // 3. 역순으로 필요한 것 도출
    const requirements = this.deriveRequirements(pressRelease, faq);

    return { pressRelease, faq, requirements };
  },

  // PR/FAQ 템플릿
  writePressRelease: (strategy) => {
    return {
      headline: `올댓바스켓, "${strategy.name}" 도입으로 고객 복귀율 2배 달성`,
      subheadline: '업계 최초 AI 기반 개인화 서비스',
      date: 'YYYY-MM-DD',
      body: `
        올댓바스켓이 ${strategy.name}을(를) 도입하여
        휴면 고객 복귀율을 기존 15%에서 30%로 2배 향상시켰습니다.

        이 서비스는 [핵심 가치] 를 제공하며,
        [차별화 포인트]로 경쟁사와 구별됩니다.

        고객 반응: "[고객 인용문]"
      `,
      callToAction: '지금 바로 체험하세요',
    };
  },

  writeFAQ: (strategy) => {
    return [
      { q: '이 서비스는 무엇인가요?', a: `${strategy.description}` },
      { q: '기존 서비스와 뭐가 다른가요?', a: '...' },
      { q: '얼마나 걸리나요?', a: '...' },
      { q: '비용은 얼마인가요?', a: '...' },
      { q: '어떻게 시작하나요?', a: '...' },
    ];
  },

  deriveRequirements: (pr, faq) => {
    // PR/FAQ에서 필요한 것 역추론
    return {
      technical: ['자동 메시지 시스템', '고객 분석 대시보드'],
      content: ['캠페인 메시지', '혜택 안내문'],
      process: ['타겟 선정 기준', '발송 일정'],
      team: ['마케팅 담당', 'CS 담당', '개발 담당'],
    };
  },
};
```

---

## PHASE 5: BUILD (구축)

| 항목 | 내용 |
|------|------|
| **리더** | Jeff Bezos (Amazon) |
| **원칙** | "Two-Pizza Team" (2피자 팀) |
| **AUTUS 기능** | ⚡ 실행 (Execute) |
| **Engine** | CodeAct Engine |

```javascript
const buildPhase = {
  // Two-Pizza Team 구성
  formTeam: (requirements, organization) => {
    // 팀 규모: 피자 2판으로 식사 가능한 인원 (6-8명)
    const MAX_TEAM_SIZE = 8;

    const team = [];

    // 필수 역할 매핑
    const roleMapping = {
      technical: ['dev'],
      content: ['cmo'],
      process: ['coo'],
      customer: ['cs'],
      coaching: ['coach1', 'coach2'],
      approval: ['ceo'],
    };

    // 요구사항에 따라 팀 구성
    Object.keys(requirements).forEach(reqType => {
      const roles = roleMapping[reqType] || [];
      roles.forEach(roleId => {
        const member = organization.roles.find(r => r.id === roleId);
        if (member && team.length < MAX_TEAM_SIZE && !team.find(t => t.id === roleId)) {
          team.push(member);
        }
      });
    });

    return team;
  },

  // 자동화 수준 결정
  determineAutomation: (task, automationScore) => {
    if (automationScore >= 80) return { action: 'AUTOMATE', savings: '80-95%' };
    if (automationScore >= 60) return { action: 'COMPRESS', savings: '40%' };
    if (automationScore >= 40) return { action: 'DELEGATE', savings: '95%' };
    return { action: 'KEEP', savings: '0%' };
  },

  // 빌드 실행
  execute: (design, action, team) => {
    return {
      team: team,
      action: action,
      tasks: this.assignTasks(design.requirements, team),
      timeline: this.createTimeline(design.requirements),
      dependencies: this.identifyDependencies(design.requirements),
    };
  },

  assignTasks: (requirements, team) => {
    // 각 팀원에게 태스크 배정
    const tasks = [];
    team.forEach(member => {
      const memberTasks = requirements[member.department.toLowerCase()] || [];
      memberTasks.forEach(task => {
        tasks.push({
          assignee: member.name,
          task: task,
          deadline: this.calculateDeadline(task),
          status: 'PENDING',
        });
      });
    });
    return tasks;
  },
};
```

---

## PHASE 6: LAUNCH (출시)

| 항목 | 내용 |
|------|------|
| **리더** | Reid Hoffman (LinkedIn) |
| **원칙** | "MVP Rule" (창피하지 않으면 너무 늦은 것) |
| **AUTUS 기능** | ⚡ 실행 (Execute) |
| **Engine** | Alert Engine |

```javascript
const launchPhase = {
  // MVP 정의
  defineMVP: (fullFeatures) => {
    // "완벽한 제품"이 아닌 "학습 가능한 최소 제품"
    return {
      mustHave: fullFeatures.filter(f => f.priority === 'P0'),
      niceToHave: fullFeatures.filter(f => f.priority === 'P1'),
      future: fullFeatures.filter(f => f.priority === 'P2'),

      // Reid Hoffman: "출시 첫 버전이 창피하지 않다면 너무 늦게 출시한 것"
      launchCriteria: {
        minFeatures: 3,
        maxDefects: 0,  // Critical만 없으면 됨
        userTestPassed: true,
      },
    };
  },

  // 단계적 출시
  mvpLaunch: (buildResult) => {
    return {
      phases: [
        {
          name: 'Alpha',
          audience: '내부 테스트 (팀원 10명)',
          duration: '3일',
          goal: '기본 기능 검증',
        },
        {
          name: 'Beta',
          audience: '파일럿 고객 (50명)',
          duration: '1주',
          goal: '실제 사용성 검증',
        },
        {
          name: 'GA',
          audience: '전체 타겟 (200명)',
          duration: '지속',
          goal: '성과 측정',
        },
      ],
      rollbackPlan: {
        trigger: '심각한 오류 또는 부정 피드백 30%+',
        action: '이전 버전으로 롤백',
      },
    };
  },

  // 출시 체크리스트
  launchChecklist: [
    { item: '타겟 리스트 확정', required: true },
    { item: '메시지 콘텐츠 승인', required: true },
    { item: '발송 시스템 테스트', required: true },
    { item: '모니터링 대시보드 준비', required: true },
    { item: '롤백 계획 수립', required: true },
    { item: '담당자 연락망 확보', required: true },
  ],
};
```

---

## PHASE 8: LEARN (학습)

| 항목 | 내용 |
|------|------|
| **리더** | Ray Dalio (Bridgewater) |
| **원칙** | "Blameless Post-Mortem" (비난 없는 회고) |
| **AUTUS 기능** | 🔄 개선 (Improve) |
| **Engine** | Learn Engine |

```javascript
const learnPhase = {
  // Post-Mortem 실행
  postMortem: (proofPack) => {
    return {
      // 1. 무엇이 일어났는가? (사실만)
      whatHappened: this.extractFacts(proofPack),

      // 2. 왜 일어났는가? (근본 원인)
      whyItHappened: this.analyzeRootCause(proofPack),

      // 3. 어떻게 개선할 것인가?
      howToImprove: this.generateImprovements(proofPack),

      // 4. 패턴 식별
      patterns: this.identifyPatterns(proofPack),

      // Ray Dalio: "실패로부터 배우지 못하는 것이 진짜 실패"
      principle: '모든 결과는 학습 기회. 비난 X, 분석 O',
    };
  },

  extractFacts: (proofPack) => {
    return {
      objective: proofPack.mission,
      targetOKR: proofPack.okrResults.map(kr => `${kr.metric}: ${kr.target}${kr.unit}`),
      actualOKR: proofPack.okrResults.map(kr => `${kr.metric}: ${kr.actual}${kr.unit} (${kr.progress}%)`),
      timeline: proofPack.period,
    };
  },

  analyzeRootCause: (proofPack) => {
    const underperformed = proofPack.okrResults.filter(kr => parseFloat(kr.progress) < 100);

    return underperformed.map(kr => ({
      kr: kr.id,
      gap: `${kr.target - kr.actual}${kr.unit}`,
      possibleCauses: [
        '타겟 선정 기준 부적절',
        '메시지 타이밍 미스',
        '혜택 매력도 부족',
        '경쟁사 대응',
        '외부 환경 변화',
      ],
      rootCause: '추가 분석 필요', // MoltBot이 패턴 분석 후 제안
    }));
  },

  generateImprovements: (proofPack) => {
    const improvements = [];

    proofPack.learningPoints.forEach(point => {
      if (point.type === 'IMPROVE') {
        improvements.push({
          area: point.kr,
          current: point.insight,
          proposed: this.suggestImprovement(point),
          expectedImpact: '+5~10%',
        });
      }
    });

    return improvements;
  },

  identifyPatterns: (proofPack) => {
    // MoltBot 학습 데이터로 활용
    return {
      successPatterns: [
        { condition: 'X를 했을 때', result: 'Y가 달성됨', confidence: 0.8 },
      ],
      failurePatterns: [
        { condition: 'A 상황에서', result: 'B 결과 발생', avoidAction: 'C를 피하라' },
      ],
      // Shadow Rule 후보
      shadowRuleCandidates: [],
    };
  },
};
```

---

## PHASE 9: SCALE (확장)

| 항목 | 내용 |
|------|------|
| **리더** | Jeff Bezos (Amazon) |
| **원칙** | "Flywheel Effect" (플라이휠 효과) |
| **AUTUS 기능** | 🔮 예측 + 🔄 개선 |
| **Engine** | Predict Engine |

```javascript
const scalePhase = {
  // Flywheel 설계
  designFlywheel: (missionResult) => {
    // Amazon Flywheel 예시:
    // 낮은 가격 → 더 많은 고객 → 더 많은 판매자 → 더 많은 선택 → 더 나은 경험 → (반복)

    return {
      // 교육서비스업 Flywheel
      elements: [
        { step: 1, action: '만족한 회원', metric: 'NPS 70+' },
        { step: 2, action: '추천 증가', metric: '추천률 30%' },
        { step: 3, action: '신규 회원 증가', metric: '월 +10명' },
        { step: 4, action: '수익 증가', metric: '월 +300만원' },
        { step: 5, action: '프로그램 투자', metric: '신규 클래스 개설' },
        { step: 6, action: '품질 향상', metric: '만족도 +5%' },
        // → 1번으로 돌아감
      ],

      // 플라이휠 가속 조건
      accelerators: [
        '개인화 서비스 강화',
        '자동화로 운영 효율화',
        '데이터 기반 의사결정',
      ],

      // 플라이휠 감속 요인 (제거 대상)
      decelerators: [
        '수동 프로세스',
        '고객 불만 미처리',
        '경쟁사 대응 지연',
      ],
    };
  },

  // 확장 vs 삭제 결정
  execute: (optimizeResult, scaleAction) => {
    if (scaleAction === 'SCALE_UP') {
      return {
        action: 'SCALE_UP',
        flywheel: this.designFlywheel(optimizeResult),
        nextMissions: this.suggestNextMissions(optimizeResult),
        resourcePlan: this.planResources(optimizeResult),
      };
    }

    if (scaleAction === 'ELIMINATE') {
      return {
        action: 'ELIMINATE',
        savedTime: optimizeResult.estimatedTime,
        savedEnergy: '100%',
        freedSlot: '새 미션 수용 가능',
        postElimination: '30일 후 재평가',
      };
    }

    return {
      action: 'MAINTAIN',
      nextCycleRecommendation: this.recommendNextCycle(optimizeResult),
      monitoringPlan: '7일 주기 모니터링',
    };
  },

  suggestNextMissions: (result) => {
    // Flywheel 다음 단계 미션 추천
    const currentFocus = result.mission;
    const recommendations = {
      '휴면고객 재활성화': ['재등록률 향상', '추천 프로그램 도입'],
      '재등록률 향상': ['장기 회원 혜택', '프리미엄 프로그램 출시'],
      '신규 회원 확보': ['온보딩 강화', '첫달 경험 최적화'],
    };
    return recommendations[currentFocus] || ['데이터 분석 강화'];
  },
};
```

---

## 📋 전체 9단계 요약

| 단계 | 이름 | 리더 | 원칙 | 핵심 질문 |
|------|------|------|------|---------|
| 1 | SENSE | Ray Dalio | 약한 신호 포착 | 무슨 변화가 감지되는가? |
| 2 | ANALYZE | Elon Musk | 제1원리 사고 | 왜 이 문제가 발생했는가? |
| 3 | STRATEGIZE | Peter Thiel | 독점 가능성 | 10배 나은 전략은 무엇인가? |
| 4 | DESIGN | Jeff Bezos | Working Backwards | 성공하면 어떤 모습인가? |
| 5 | BUILD | Jeff Bezos | Two-Pizza Team | 누가 무엇을 만드는가? |
| 6 | LAUNCH | Reid Hoffman | MVP Rule | 최소한 뭘 내보낼 수 있는가? |
| 7 | MEASURE | Andy Grove | OKR & Input Metrics | 성과를 어떻게 측정하는가? |
| 8 | LEARN | Ray Dalio | Blameless Post-Mortem | 무엇을 배웠는가? |
| 9 | SCALE | Jeff Bezos | Flywheel Effect | 어떻게 확장/삭제하는가? |

---

*문서 버전: 1.0.0*
*최종 업데이트: 2026-02-03*
*작성: AUTUS × Claude*
