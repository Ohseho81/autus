# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*















# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





# 🧬 AUTUS v3.0 Complete Automation System

> **v1.3 FINAL LOCK 100% 보존 + 5 Pillars + 6 Automation Loops**
> 
> **우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감**

---

## 🏛️ 5 Pillars Framework (Autus Concept v1.0)

| 기둥 | 핵심 | 모듈 |
|------|------|------|
| **Vision Mastery** | Flywheel, Goal Tree, 후회 최소화 | vision.py, flywheel.py |
| **Risk Equilibrium** | Entropy, Safety Margin | PIPELINE KPI 활용 |
| **Innovation Disruption** | Moat, 10x Thinking, 제1원칙 | moat.py, innovation.py |
| **Learning Acceleration** | Audit, Tuning, Post-Mortem | PIPELINE Audit 활용 |
| **Impact Amplification** | 재투자율, Social Value | impact.py |

---

## 🔒 v1.3 FINAL LOCK (100% 보존)

| 버전 | 핵심 업그레이드 |
|------|----------------|
| **v1.0** | ControllerScore (PREVENTED/FIXED), Synergy Uplift |
| **v1.1** | BaseRate SOLO only, Group Synergy (k=3~4) |
| **v1.2** | BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션 |
| **v1.3** | 프로젝트 가중치 기반 시너지 합산, customer_id 필수 |

---

## 📊 Score Sheet (FINAL)

| 항목 | 점수 |
|------|------|
| I (Ingest) | 10 |
| C (Config) | 10 |
| Axes (MTS) | 10 |
| O (Normalization) | 10 |
| P (Transform) | 10 |
| R (Roles) | 10 |
| H (Synergy) | 10 |
| ROI (KPI) | 10 |
| M (Consortium) | 10 |
| D (Tuning) | 10 |
| G (Audit) | 10 |
| V (Report) | 10 |
| Risk | 7 |
| F (Execution) | 10 |
| W (Integration) | 10 |
| **Total** | **100/100** |

---

## 🗂️ 디렉토리 구조

```
autus_pipeline/
├── requirements.txt
├── README.md
├── data/
│   ├── input/
│   │   ├── money_events.csv      # v1.3: customer_id 필수
│   │   ├── burn_events.csv       # v1.0: PREVENTED/FIXED
│   │   ├── fx_rates.csv
│   │   ├── edges.csv
│   │   └── historical_burns.csv
│   └── output/
│       ├── weekly_metrics.json
│       ├── role_assignments.csv
│       ├── consortium_best.json
│       ├── pair_synergy.csv      # v1.3: 가중 합산
│       ├── group_synergy.csv     # v1.1: 3~4인 조합
│       ├── baseline_rates.csv    # v1.2: 백오프 결과
│       ├── person_scores.csv
│       ├── params.json
│       ├── weekly_report.md
│       ├── goals.json            # v2.0: Goal Tree
│       ├── pillars_analysis.json # v2.0: 5 Pillars 결과
│       └── pillars_report.md     # v2.0: 5 Pillars 리포트
└── src/
    ├── __init__.py
    │
    │   # ═══ v1.3 FINAL LOCK (수정 금지) ═══
    ├── config.py          # 설정값 (LOCK)
    ├── schemas.py         # 데이터 스키마
    ├── ingest.py          # v1.3: customer_id 필수
    ├── normalize.py       # 정규화/환산
    ├── transform.py       # v1.2: BaseRate 백오프
    ├── synergy.py         # v1.3: 파티션 + 가중 합산
    ├── roles.py           # v1.0: ControllerScore
    ├── consortium.py      # v1.1: pair + group synergy
    ├── tuning.py          # α/λ/γ 자동 튜닝
    ├── audit.py           # 감사 로그
    ├── report.py          # 리포트 생성
    ├── run_weekly_cycle.py  # v1.3 실행
    │
    │   # ═══ v2.0 5 Pillars (신규 추가) ═══
    ├── vision.py          # Pillar 1: Goal Tree, 후회 최소화
    ├── flywheel.py        # Pillar 1: Bezos Flywheel
    ├── moat.py            # Pillar 3: Economic Moat
    ├── innovation.py      # Pillar 3: 10x Thinking
    ├── impact.py          # Pillar 5: Social Value
    ├── pillars.py         # 5 Pillars 통합
    └── run_weekly_cycle_v2.py  # v2.0 실행
```

---

## 📋 입력 CSV 스키마

### 1. money_events.csv (v1.3)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| event_id | string | ✅ | 이벤트 고유 ID |
| date | date | ✅ | 발생 일자 |
| event_type | enum | ✅ | CASH_IN, CONTRACT_SIGNED, MRR, ... |
| currency | string | ✅ | 통화 코드 |
| amount | number | ✅ | 금액 |
| people_tags | string | ✅ | 참여자 (P01;P07) |
| effective_minutes | int | ✅ | 투입 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| recommendation_type | enum | ✅ | DIRECT_DRIVEN, INDIRECT_DRIVEN, MIXED |
| **customer_id** | string | **✅** | **고객 ID (v1.3 필수)** |
| project_id | string | ◯ | 프로젝트 ID (없으면 자동 생성) |

### 2. burn_events.csv (v1.0)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| burn_id | string | ✅ | Burn 고유 ID |
| date | date | ✅ | 발생 일자 |
| burn_type | enum | ✅ | DELAY, REWORK, **PREVENTED**, **FIXED**, ... |
| person_or_edge | string | ◯ | 책임자 ID |
| loss_minutes | int | ✅ | 손실 시간 (분) |
| evidence_id | string | ✅ | 증빙 ID |
| **prevented_by** | string | ◯ | **방지/해결자 ID (v1.0)** |
| **prevented_minutes** | int | ◯ | **줄인 시간 (v1.0)** |

---

## 🚀 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# v1.3 ONLY (기존 PIPELINE만)
python -m src.run_weekly_cycle

# v2.0 FULL (v1.3 + 5 Pillars)
python -m src.run_weekly_cycle_v2
```

---

## 🔬 핵심 로직

### 1. BaseRate v1.2 (백오프)

```
우선순위:
1) SOLO (tag_count == 1) 이벤트 ≥ 2개
2) ROLE_BUCKET (event_type 기반) ≥ 2개
3) ALL (전체 이벤트)
```

### 2. ControllerScore v1.0

```python
# PREVENTED/FIXED 이벤트의 prevented_minutes 기반
controller_score = prevented_minutes_i / total_prevented_minutes
```

### 3. Synergy v1.3

```python
# 1. 파티션별 계산 (customer_id, project_id)
pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
group_part = compute_group_synergy_uplift_partitioned(money, baseline)

# 2. 프로젝트 가중치 (최근 4주 Mint 비중)
project_weights = compute_project_weights_4w(money, weeks=4)

# 3. 가중 합산
final_synergy = Σ (synergy_p × weight_p)
```

### 4. Team Score v1.1

```python
TeamScore = base + γ × (pair_bonus + 0.6 × group_bonus) - burn_penalty

# base: 개인 score_per_min 합산
# pair_bonus: 양수 pair uplift 합산
# group_bonus: 팀 내 group uplift 합산
```

### 5. 5 Pillars Framework v2.0

```python
# Pillar 1: Vision Mastery
vision_score = goal_progress × 0.5 + flywheel_velocity × 0.5

# Pillar 2: Risk Equilibrium  
risk_score = entropy_score × 0.5 + safety_margin × 0.5

# Pillar 3: Innovation Disruption
innovation_score = moat_score × 0.5 + disruption_score × 0.5

# Pillar 4: Learning Acceleration
learning_score = audit × 0.3 + improvement × 0.4 + param_changes × 0.3

# Pillar 5: Impact Amplification
impact_score = reinvest × 0.3 + leverage × 0.3 + scale × 0.4

# Total = Average of all 5 pillars
```

---

## 📤 출력

| 파일 | 설명 |
|------|------|
| weekly_metrics.json | 주간 KPI |
| role_assignments.csv | 역할 할당 |
| consortium_best.json | 최적 팀 구성 |
| pair_synergy.csv | Pair Synergy (가중 합산) |
| group_synergy.csv | Group Synergy (k=3~4) |
| baseline_rates.csv | BaseRate 및 백오프 결과 |
| person_scores.csv | 개인 성과 점수 |
| params.json | 현재 파라미터 |
| weekly_report.md | 마크다운 리포트 |
| **goals.json** | **Goal Tree (v2.0)** |
| **pillars_analysis.json** | **5 Pillars 결과 (v2.0)** |
| **pillars_report.md** | **5 Pillars 리포트 (v2.0)** |

---

## ⚙️ 설정값 (LOCK)

```python
# config.py

# Consortium
base_consortium_size = 5
gamma_team_bonus = 0.20        # 팀 시너지 보너스

# BaseRate 백오프
min_events = 2                 # 최소 이벤트 수

# Role 임계값
thr_rainmaker = 0.40
thr_closer = 0.35
thr_operator = 0.30
thr_builder = 0.25
thr_connector = 0.20
thr_controller = 0.30

# event_type → role_bucket 매핑
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

---

## 🏛️ 5 Pillars 상세

### Pillar 1: Vision Mastery 🎯
- **Goal Tree**: 10Y → 3Y → 1Y → Q 계층적 목표
- **Flywheel**: Bezos 자가강화 루프 (INVEST → GROW → PROFIT → REINVEST)
- **후회 최소화**: 80세 테스트 (Regret Minimization Framework)

### Pillar 2: Risk Equilibrium ⚖️
- **Entropy**: 손실 비율 모니터링
- **Safety Margin**: Net/Mint 비율
- **Stabilization Mode**: 자동 튜닝 파라미터 추적

### Pillar 3: Innovation Disruption 💡
- **Moat Analysis**: Network Effect, Switching Cost, Cost Advantage, Intangible Asset
- **First Principles**: 기존 가정 파괴, 근본 원리 분석
- **10x Thinking**: 10배 목표 설정 및 갭 분석

### Pillar 4: Learning Acceleration 📚
- **Audit Tracking**: 감사 로그 활용
- **Improvement Rate**: KPI 개선율
- **Parameter Changes**: 튜닝 변화 추적

### Pillar 5: Impact Amplification 🌍
- **Reinvestment Ratio**: 재투자 비율
- **Social Value**: 직접 + 간접 가치 × 네트워크 승수
- **Compound Growth**: 10년 복리 성장 예측

---

## 🎯 v1.3 FINAL 선언

AUTUS는:
- ✅ 기준선 오염이 없고 (BaseRate 백오프)
- ✅ 시너지가 프로젝트 단위로 분리되며 (파티션)
- ✅ 실제 돈이 나온 맥락만 가중 반영되고 (프로젝트 가중치)
- ✅ Controller가 정확히 측정되고 (PREVENTED/FIXED)
- ✅ 사용자는 실수조차 할 수 없다 (customer_id 필수)

---

## 🏛️ v2.0 5 Pillars 선언

AUTUS 5 Pillars는:
- ✅ **Vision Mastery**: 장기 비전과 단기 목표가 정렬됨
- ✅ **Risk Equilibrium**: 위험과 기회가 균형 잡힘
- ✅ **Innovation Disruption**: 독점적 강점이 측정됨
- ✅ **Learning Acceleration**: 학습 속도가 추적됨
- ✅ **Impact Amplification**: 사회적 가치가 계량화됨

---

---

## 🔄 v3.0 6 Automation Loops

### Layer 3 추가 모듈
| 파일 | 역할 |
|------|------|
| `db_schema.py` | DB 스키마 정의 (SQLite/PostgreSQL) |
| `database.py` | 데이터베이스 연동 및 CRUD |
| `quality.py` | 이중 검증 시스템 (Schema + LLM) |
| `loops.py` | 6가지 자동화 루프 엔진 |
| `crew.py` | CrewAI 멀티 에이전트 |
| `run_v3.py` | v3.0 전체 실행 |

### 6 Loops 설명
| Loop | 이름 | 기능 |
|------|------|------|
| 1 | Auto Collect | Webhook/API → Schema 검증 → DB 저장 |
| 2 | Auto Learn | PIPELINE 결과 → LLM 분석 → 인사이트 생성 |
| 3 | Auto Delete | 저품질 데이터 → 요약 생성 → 아카이브 |
| 4 | Auto Improve | 실패 감지 → Reflexion 분석 → 개선 제안 |
| 5 | Auto Execute | Multi-Agent → 순차 실행 → 리포트 생성 |
| 6 | Auto Loop | Flywheel 순환 → 이력 관리 → ROI 추적 |

### 품질 시스템 (Priority 1)
```
입력 ──▶ 1차: Schema 검증 ──▶ 2차: LLM 검증 ──▶ 출력
              │                    │
              ▼                    ▼
         구조 검증              의미 검증
         (100% 통과)           (Score > 0.7)
```

### 멀티 에이전트 (Priority 2)
| Agent | Role | Goal |
|-------|------|------|
| Researcher | 데이터 조사 | 시장 트렌드, 경쟁 분석 |
| Analyzer | PIPELINE 분석 | KPI/Synergy 심층 분석 |
| Executor | 액션 실행 | 알림 발송, 작업 수행 |
| Reporter | 리포트 작성 | Executive Summary |

---

## 🚀 v3.0 실행

```bash
# v3.0 FULL (PIPELINE + Pillars + 6 Loops)
python -m src.run_v3

# v2.0 (PIPELINE + Pillars만)
python -m src.run_weekly_cycle_v2

# v1.3 (PIPELINE만)
python -m src.run_weekly_cycle
```

---

## 📁 v3.0 출력 파일

| 파일 | 내용 |
|------|------|
| `v3_results.json` | v3.0 전체 결과 |
| `pillars_analysis.json` | 5 Pillars 분석 |
| `pillars_report.md` | 5 Pillars 리포트 |
| `flywheel_cycle.json` | Flywheel 사이클 데이터 |
| `autus.db` | SQLite 데이터베이스 |
| `goals.json` | Goal Tree |

---

## 💰 비용 구조 (Priority 3)

| 항목 | 비용 |
|------|------|
| 호스팅 (Railway) | ~$5/월 |
| DB (SQLite/Supabase) | $0/월 |
| LLM (Claude + GPT) | ~$15/월 |
| n8n (self-host) | $0/월 |
| **Total** | **~$20/월** |

---

## 📈 다음 단계 (선택)

- [ ] n8n 워크플로 설정 (Webhook → 자동 수집)
- [ ] Supabase 연동 (SQLite → PostgreSQL)
- [ ] CrewAI 설치 (`pip install crewai langchain-openai`)
- [ ] Railway 배포
- [ ] 실시간 대시보드 연동

---

## 📄 라이선스

MIT License

---

*🧬 AUTUS v3.0 Complete Automation System | 2025*





















