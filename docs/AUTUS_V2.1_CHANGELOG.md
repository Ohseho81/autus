# 🏛️ AUTUS v2.1 - 변경 사항

**A = T^σ · 가치의 법칙**

---

## v2.1 주요 변경 사항

### 1. λ 계산 방식 변경

**이전 (v2.0)**: 순환 참조 공식
```
λ = Σ(T_past^σ_past) / t_total  ❌ 문제: T 계산에 λ 필요
```

**변경 (v2.1)**: 기본값 + 성과 보정
```typescript
λ = λ_base × (1 + performance_factor)

// λ_base: 노드 타입별 고정값
// performance_factor: 성과 기반 보정 (-0.2 ~ +0.3)

performance_factor = 
  (avgSigmaHistory - 1.0) × 0.1 +   // σ 이력
  (retentionRate - 0.8) × 0.2 +      // 유지율
  min(tenureMonths / 120, 1) × 0.1   // 경력
```

**원칙**: λ는 "입력"이지 "계산 결과"가 아님

---

### 2. 시간 감쇠 (Time Decay) 추가

**이전 (v2.0)**: 시간 감쇠 없음 (1년 전 = 어제)

**변경 (v2.1)**: Tier별 반감기 적용
```typescript
decay(t) = e^(-t/τ)

// τ = halflife / ln(2)

Tier별 반감기:
├── Tier 1 (결정적): 365일 - 오래 유지
├── Tier 2 (확장): 180일
├── Tier 3 (참여): 90일
├── Tier 4 (유지): 60일
├── Tier 5 (표현): 120일
└── Tier 6 (부정): 30일 - 빨리 회복 기회

예시:
- 6개월 전 재등록: 0.6 × e^(-180/527) = 0.6 × 0.71 = 0.43
- 1주일 전 불만: -0.3 × e^(-7/43) = -0.3 × 0.85 = -0.26
```

---

### 3. 주체별 가중치 적용

**이전 (v2.0)**: 주체 구분 없음

**변경 (v2.1)**: 의사결정권자 차등
```typescript
SUBJECT_WEIGHTS = {
  PARENT: 1.5,        // 학부모 (의사결정권자)
  STUDENT: 1.0,       // 학생 (기본)
  STAFF_OBSERVED: 0.8 // 교사 관찰 (간접)
}

σ_contribution_final = rawSigma × subjectWeight × decay
```

---

### 4. 데이터 가용성 정규화

**이전 (v2.0)**: 외부 데이터 없을 때 미정의

**변경 (v2.1)**: 정규화 적용
```typescript
// 내부 σ 정규화
dataRatio = uniqueBehaviorTypes / 14
σ_internal_norm = σ_internal × max(dataRatio, 0.3)

// 외부 σ 정규화
dataRatio = availableSources / 8
σ_external_norm = σ_external × dataRatio

// 외부 데이터 없음 → σ_external = 0
```

---

### 5. Alert 다층화

**이전 (v2.0)**: σ < 0.7만 알림

**변경 (v2.1)**: 4단계 알림 시스템

| Level | 트리거 | 조건 |
|-------|--------|------|
| **Critical** | 즉시 조치 | σ < 0.7, Δσ30d < -0.3, Tier6 행위 |
| **Warning** | 주의 필요 | 0.7 ≤ σ < 1.0, Δσ30d < -0.15 |
| **Positive** | 긍정 이벤트 | σ ≥ 2.0 달성, 소개 등록 |
| **Info** | 정보성 | 마일스톤, 일반 알림 |

---

### 6. 이탈 고객 σ Decay

**이전 (v2.0)**: `σ × 0.8^(경과월/6)` (근거 불명확)

**변경 (v2.1)**: 사유별 지수 감쇠
```typescript
CHURN_DECAY_HALFLIFE = {
  graduation: 365,  // 졸업 - 천천히 감소
  relocation: 180,  // 이사 - 표준
  complaint: 60,    // 불만 - 빨리 감소 + 부정 위험
  competitor: 90,   // 경쟁사
  other: 180
}

σ_churned(t) = σ_final × e^(-t/τ)
```

---

### 7. 관계 방향성 지원

**이전 (v2.0)**: σ_AB = σ_BA (대칭만)

**변경 (v2.1)**: 비대칭 허용
```typescript
interface Relationship {
  sigmaAB: number;  // A→B 방향
  sigmaBA: number;  // B→A 방향
  sigma: number;    // 대표 σ (평균 또는 단방향)
}

// 교육 서비스: 주로 σ_engage (학생/학부모 → 학원) 측정
```

---

### 8. API 추가

| Endpoint | Method | 기능 |
|----------|--------|------|
| `/api/autus/sigma-history` | GET | σ 이력 조회 |
| `/api/autus/alerts` | GET/POST/DELETE | 알림 관리 |
| `/api/autus/dashboard` | GET | 역할별 대시보드 |

---

## 공식 요약 (v2.1)

```python
# 핵심 공식
T = λ × t
A = T^σ
Ω = Σ(T^σ)
σ = log(A) / log(T)

# λ 계산
λ = λ_base × (1 + performance_factor)

# σ 계산 (시간 감쇠 + 주체 가중치)
σ_contribution = rawSigma × subjectWeight × e^(-t/τ)

# 내부 σ (정규화)
σ_internal_norm = Σ(σ_contribution) × max(dataRatio, 0.3)

# 외부 σ (정규화)
σ_external_norm = Σ(weight × σ_source) × dataRatio

# 전체 σ
σ_total = clamp(1.0 + σ_internal_norm + σ_external_norm, 0.5, 3.0)
```

---

## 파일 변경

| 파일 | 변경 내용 |
|------|----------|
| `lib/autus/calculations.ts` | 전면 업데이트 (v2.1) |
| `api/autus/sigma-history/route.ts` | 신규 |
| `api/autus/alerts/route.ts` | 신규 |
| `api/autus/dashboard/route.ts` | 신규 |

---

## 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| T^σ vs e^(σt) | **T^σ 유지** | 직관적, 스케일 안정 |
| σ_base | **1.0 유지** | 중립이 가장 공정 |
| 관계 방향성 | **비대칭 허용** | 실제 관계 반영 |

---

**Build on the Rock. 🏛️**

*AUTUS v2.1 Changelog*
*Updated: 2026-01-25*
