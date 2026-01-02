# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*
















# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






# 📐 AUTUS FORMULAS v1.3 FINAL

> "공식이 명확하면 결과도 명확하다"

---

## 🧮 1. 개인 성과 (Individual Performance)

### 1.1 Coin Rate (분당 수익률)
```python
coin_rate_per_min = total_mint_krw / total_minutes
coin_rate_per_hr = coin_rate_per_min × 60
```

### 1.2 BaseRate (기준선) - v1.2
```python
# 우선순위 백오프
def compute_baseline(events):
    solo = events[tag_count == 1]
    
    if len(solo) >= 2:
        return mean(solo.rate), "SOLO"
    
    role_bucket = events[event_type in ROLE_BUCKET_MAP]
    if len(role_bucket) >= 2:
        return mean(role_bucket.rate), "ROLE_BUCKET"
    
    return mean(events.rate), "FALLBACK_ALL"
```

### 1.3 Score (최종 점수)
```python
score_per_min = coin_rate_per_min + indirect_contribution
score_per_hr = score_per_min × 60
```

---

## 🤝 2. 시너지 (Synergy)

### 2.1 Pair Synergy Uplift
```python
# 2인 조합의 초과 수익
uplift = event_rate - (baseline_i + baseline_j) / 2

# 가중 평균
synergy_uplift = Σ(uplift × minutes) / Σ(minutes)
```

### 2.2 Group Synergy Uplift (k=3~4)
```python
# 그룹의 초과 수익
uplift = event_rate - Σ(baseline_i) / k

# k = 그룹 인원수 (3 또는 4)
```

### 2.3 Project Weight (v1.3)
```python
# 최근 4주 프로젝트별 Mint 비중
weight_p = mint_4w_project / Σ(mint_4w_all)

# 최종 시너지 = 가중 합산
final_synergy = Σ(synergy_p × weight_p)
```

---

## 👤 3. 역할 (Roles)

### 3.1 역할 점수 계산
```python
ROLES = {
    "RAINMAKER": top_30%_events / total_events,
    "CLOSER": (CONTRACT_SIGNED + CASH_IN) / total,
    "OPERATOR": (DELIVERY_COMPLETE + INVOICE_ISSUED) / total,
    "BUILDER": (MRR + COST_SAVED) / total,
    "CONNECTOR": (INDIRECT_DRIVEN + MIXED) / total,
    "CONTROLLER": prevented_minutes_i / Σ(prevented_minutes),
}
```

### 3.2 역할 임계값 (Thresholds)
```python
THR = {
    "RAINMAKER": 0.40,
    "CLOSER": 0.35,
    "OPERATOR": 0.30,
    "BUILDER": 0.25,
    "CONNECTOR": 0.20,
    "CONTROLLER": 0.30,
}
```

### 3.3 역할 할당 규칙
```python
# 1. 임계값 통과자 중 최고 점수 1명
# 2. 1인 최대 2개 역할
# 3. 충돌 시 더 높은 점수 역할 유지
```

---

## 🏆 4. 팀 (Team)

### 4.1 Team Score v1.1
```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

Where:
- base = Σ(member.score_per_min)
- pair_bonus = Σ(positive_pair_uplift)  # 팀 내 양수 페어만
- group_bonus = Σ(group_uplift)  # 팀의 부분집합인 그룹만
- burn_penalty = burn_krw / team_size × 1e-6
- γ = 0.20 (gamma, 시너지 가중치)
```

### 4.2 최적 팀 탐색
```python
# 상위 K명 중 team_size 조합 전수 탐색
candidates = top_k_by_score(12)
best_team = max(combinations(candidates, 5), key=team_score)
```

---

## 📊 5. KPI

### 5.1 핵심 지표
```python
KPI = {
    "mint_krw": Σ(amount_krw),
    "burn_krw": loss_minutes × avg_coin_per_min,
    "net_krw": mint - burn,
    "coin_velocity": net / effective_minutes,
    "entropy_ratio": burn / mint,
    "velocity_change": (vel - vel_prev) / vel_prev,
}
```

### 5.2 엔트로피 기준
```python
ENTROPY = {
    "GOOD": < 0.15,
    "WARN": 0.15 ~ 0.25,
    "BAD": > 0.25,
    "CRITICAL": > 0.30,
}
```

---

## ⚙️ 6. 파라미터 튜닝

### 6.1 파라미터 범위
```python
PARAMS = {
    "alpha": (0.05, 0.20),   # 학습률
    "lambda": (0.20, 0.60),  # 간접 기여 가중치
    "gamma": (0.05, 0.30),   # 팀 시너지 가중치
}

STEP = {
    "d_alpha": 0.02,
    "d_lambda": 0.05,
    "d_gamma": 0.02,
}
```

### 6.2 튜닝 규칙
```python
# Alpha (α)
if entropy <= 0.15 and velocity_up:
    alpha += d_alpha  # 더 공격적
elif entropy >= 0.25 or velocity_down:
    alpha -= d_alpha  # 더 보수적

# Lambda (λ)
if indirect_mint_ratio >= 0.30:
    lambda += d_lambda  # 간접 기여 인정
elif indirect_burn_ratio >= 0.20:
    lambda -= d_lambda  # 간접 기여 페널티

# Gamma (γ)
if corr_team_to_net >= 0.6:
    gamma += d_gamma  # 팀 효과 인정
elif entropy >= 0.25:
    gamma -= d_gamma  # 팀 효과 감소

# Stabilization Mode
if entropy >= 0.30:
    alpha -= d_alpha
    lambda -= d_lambda
    gamma -= d_gamma
```

---

## 📋 7. 이벤트 타입 매핑

### 7.1 Money Event Types
```python
MONEY_EVENTS = {
    "CASH_IN",
    "CONTRACT_SIGNED",
    "INVEST_CONFIRMED",
    "COST_SAVED",
    "MRR",
    "REFERRAL_TO_CONTRACT",
    "DELIVERY_COMPLETE",
    "INVOICE_ISSUED",
}
```

### 7.2 Role Bucket 매핑
```python
ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}
```

### 7.3 Burn Event Types
```python
BURN_TYPES = {
    "LOSS_TIME",
    "DELAY",
    "REWORK",
    "MEETING",
    "PREVENTED",  # Controller 기여
    "FIXED",      # Controller 기여
}
```

---

## 🔐 버전 정보

```
Version: 1.3 FINAL
Date: 2025-12-18
Status: LOCKED
```

---

*"공식은 진실이다. 진실은 바꿀 수 없다."*






















