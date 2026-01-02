# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*
















# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






# 📝 AUTUS DECISIONS LOG

> "모든 결정은 기록되어야 한다" - Ray Dalio

---

## 📋 결정 로그 형식

```yaml
ID: DEC-YYYY-MM-###
Date: YYYY-MM-DD
Category: [ARCHITECTURE|FORMULA|FEATURE|POLICY]
Decision: [결정 내용]
Rationale: [근거]
Data: [데이터 기반 증거]
Impact: [예상 영향]
Status: [PROPOSED|APPROVED|IMPLEMENTED|REVERTED]
```

---

## 🏛️ 아키텍처 결정

### DEC-2025-12-001
```yaml
ID: DEC-2025-12-001
Date: 2025-12-18
Category: ARCHITECTURE
Decision: 레이 달리오 + 스티브 잡스 하이브리드 아키텍처 채택
Rationale: |
  - 완벽한 개발 목표에 부합
  - 원칙 기반 시스템 (달리오)
  - 제품 경험 완성도 (잡스)
Data: |
  - 기존 구조: ~200 파일, 깊이 4-5
  - 신규 구조: ~50 파일, 깊이 2-3
  - 예상 개선: 75% 복잡도 감소
Impact: |
  - 온보딩 시간 1주 → 1일
  - 유지보수 비용 감소
  - 코드 품질 향상
Status: IMPLEMENTED
```

### DEC-2025-12-002
```yaml
ID: DEC-2025-12-002
Date: 2025-12-18
Category: ARCHITECTURE
Decision: principles/machine/metrics 3계층 구조 채택
Rationale: |
  - principles: 원칙과 공식 (변경 드묾)
  - machine: 실행 코드 (개발 영역)
  - metrics: 측정과 피드백 (검증 영역)
Data: N/A (설계 결정)
Impact: 명확한 책임 분리
Status: IMPLEMENTED
```

---

## 📐 공식 결정

### DEC-2025-12-003
```yaml
ID: DEC-2025-12-003
Date: 2025-12-18
Category: FORMULA
Decision: BaseRate v1.2 백오프 방식 채택
Rationale: |
  - SOLO 이벤트 우선으로 기준선 오염 방지
  - 데이터 부족 시 ROLE_BUCKET으로 백오프
  - 최종 fallback은 ALL
Data: |
  - SOLO만: 정확도 높으나 데이터 부족 가능
  - ALL만: 협업 이벤트로 기준선 오염
  - 백오프: 두 문제 해결
Impact: 시너지 계산 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

### DEC-2025-12-004
```yaml
ID: DEC-2025-12-004
Date: 2025-12-18
Category: FORMULA
Decision: 프로젝트 가중치 기반 시너지 합산 (v1.3)
Rationale: |
  - 프로젝트마다 중요도가 다름
  - 최근 Mint 비중으로 가중치 결정
  - 실제 돈이 나온 맥락 반영
Data: |
  - 최근 4주 Mint 기준
  - weight_p = mint_p / Σ(mint)
Impact: 시너지 계산의 비즈니스 맥락 반영
Status: LOCKED (v1.3 FINAL)
```

---

## 🎯 기능 결정

### DEC-2025-12-005
```yaml
ID: DEC-2025-12-005
Date: 2025-12-18
Category: FEATURE
Decision: customer_id 필수화 (v1.3)
Rationale: |
  - 프로젝트 파티션의 전제 조건
  - 사용자 실수 방지
  - 데이터 품질 보장
Data: |
  - customer_id 없는 이벤트: 분석 불가
  - 자동 할당 시: 의미 없는 파티션
Impact: |
  - 데이터 입력 강제
  - 분석 정확도 향상
Status: LOCKED (v1.3 FINAL)
```

---

## 📊 정책 결정

### DEC-2025-12-006
```yaml
ID: DEC-2025-12-006
Date: 2025-12-18
Category: POLICY
Decision: 엔트로피 30% 초과 시 Stabilization Mode
Rationale: |
  - 엔트로피 급등은 시스템 불안정 신호
  - 모든 파라미터 보수적으로 조정
  - 손실 최소화 우선
Data: |
  - 엔트로피 30%+ 시 평균 손실 2배 증가
Impact: 시스템 자동 안정화
Status: IMPLEMENTED
```

---

## 🔄 변경 이력

| Date | ID | Category | Summary |
|------|-----|----------|---------|
| 2025-12-18 | DEC-001 | ARCH | 레이달리오+잡스 아키텍처 |
| 2025-12-18 | DEC-002 | ARCH | 3계층 구조 |
| 2025-12-18 | DEC-003 | FORMULA | BaseRate 백오프 |
| 2025-12-18 | DEC-004 | FORMULA | 프로젝트 가중치 |
| 2025-12-18 | DEC-005 | FEATURE | customer_id 필수 |
| 2025-12-18 | DEC-006 | POLICY | Stabilization Mode |

---

## 📝 다음 결정 대기

```
[ ] MVP 기능 범위 확정
[ ] 타겟 사용자 정의
[ ] 수익 모델 결정
[ ] 법적 이슈 검토 결과
```

---

*"결정을 기록하면 실수를 반복하지 않는다"*






















