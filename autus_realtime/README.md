# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |












# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


# ⚡ AUTUS Realtime

## SehoOS EP10 v0.1 - FastAPI + WebSocket 구현

Real-time Physics Map with Drag Input → Prediction

---

## 🎯 Economic Physics Engine

> "이건 시각화가 아니라 실시간 물리 시뮬레이션 엔진이다.
> 지구를 노드와 엣지로 환원했다." — Elon Style

### First Principles
- **사람** = 노드
- **돈** = 에너지 흐름
- **나머지** = 노이즈 (제거)

### Quantum Cluster Flow (QCF)
| 상태 | 설명 | 자원 사용량 |
|------|------|------------|
| **Quantum** | 미관측 상태 (메타데이터만) | 최소 |
| **Observe** | 관측 영역 실체화 | 고정 |
| **Cluster** | 클러스터 붕괴 모드 | 감소 |

### Physics Effects
- 🌀 **Quantum Superposition**: 다중 상태 중첩
- 🦋 **Chaos (Butterfly)**: 작은 변화 → 지수적 변동
- 🔥 **Entropy Correction**: 시너지 낮으면 비율 하락
- 🔗 **Quantum Entanglement**: 거리 무관 즉시 동기화
- 🌊 **Action Relativity**: 연결 상대에 따라 비율 다름

---

## 📁 폴더 구조

```
autus_realtime/
├── requirements.txt
├── src/
│   ├── main.py              # FastAPI + WebSocket
│   ├── config.py            # 설정
│   ├── protocol.py          # WS 프로토콜 (LOCK)
│   ├── state_store.py       # 상태 저장소
│   ├── audit.py             # Audit 로그
│   ├── ingest/
│   │   ├── csv_reader.py    # CSV 로더
│   │   └── validators.py    # 검증
│   ├── engine/
│   │   ├── rolling_kpi.py   # Rolling KPI
│   │   ├── baselines.py     # 개인 기준선
│   │   ├── synergy_partitioned.py  # 파티션별 시너지
│   │   ├── project_weights.py      # 프로젝트 가중치
│   │   ├── team_score.py    # 팀 점수
│   │   └── rebalance.py     # 리밸런스 트리거
│   └── services/
│       ├── predictor.py     # 예측 서비스 (핵심)
│       └── mapper.py        # 드래그 → 물리 입력
└── data/
    ├── input/
    │   ├── money_events.csv
    │   └── burn_events.csv
    └── output/
        ├── state.json
        └── audit.jsonl
```

---

## 🚀 실행

```bash
cd autus_realtime

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python -m src.main
# → http://localhost:8000
```

---

## 📡 API 엔드포인트

### REST

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| GET | `/state` | 현재 상태 |
| POST | `/state/init` | 상태 초기화 (CSV 로드) |

### WebSocket

| 경로 | 설명 |
|------|------|
| `/ws` | 실시간 연결 |

---

## 📨 WS 프로토콜 (LOCK)

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `STATE_SNAPSHOT` | 서버→클라 | 접속 직후 1회 (전체 상태) |
| `STATE_PATCH` | 서버→클라 | 필요 시 (델타) |
| `INPUT_APPLY` | 클라→서버 | 드래그 입력 |
| `PREDICT_RESULT` | 서버→클라 | 예측 결과 |
| `ERROR` | 서버→클라 | 에러 |

---

## 📊 KPI 정의

| KPI | 공식 | 설명 |
|-----|------|------|
| `net_7d_pred` | Mint - Burn | 순 돈 흐름 (7D) |
| `entropy_7d_pred` | Burn / Mint | 소진율 (낮을수록 좋음) |
| `velocity_7d_pred` | Total / Minutes | 돈 속도 |
| `best_team_score_pred` | Σ(개인) + Σ(Pair) + Σ(Group) | 최적 팀 점수 |

---

## 🖱️ 입력 타입 (v0 LOCK)

| 타입 | 설명 | 물리 입력 |
|------|------|----------|
| `SWAP` | 팀 교체 | out → in |
| `ALLOC` | 시간 배분 | ΔMinutes per person |

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Protocol) | 9 |
| ROI | 10 |
| **Total** | **98/100** |


















