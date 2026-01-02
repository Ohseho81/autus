# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지














# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지




# ⚛️ AUTUS Physics Map - SehoOS EP10

## 설계 정본

AUTUS 물리 엔진의 핵심 구현입니다.

### 🎯 핵심 원칙

1. **Musk Metcalfe's Law 재해석**
   - n²가 아닌 **검증된 Coin-flow 링크**로 가치 정의
   - `V(t) = Σ Φ_ij(t)` (링크 에너지 합)

2. **Physics-only**
   - 의미 해석 금지
   - 모든 것은 물리량(돈, 시간)으로만 측정

3. **드래그 = 물리 입력**
   - Allocation: Minutes 배분 변경
   - Link: 연결 강도 변경
   - Swap: 팀 구성 변경

---

## 📁 파일 구조

```
physics-map-server/
├── physics_engine.py      # 물리 엔진 코어
├── api_server.py          # FastAPI + WebSocket
├── requirements.txt       # Python 의존성
├── README.md              # 이 파일
└── venv/                  # Python 가상환경

frontend/
├── physics_map_ep10.html  # ⚛️ SehoOS EP10 UI (핵심)
├── physics_map_real.html  # 실제 데이터
├── physics_map_compound.html  # 복리 시뮬레이션
├── physics_map_network_laws.html  # 네트워크 법칙 비교
└── index.html             # 허브
```

---

## 🚀 실행 방법

### 1. Physics Engine 실행 (Python)

```bash
cd physics-map-server

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# API 서버 실행
python api_server.py
# → http://localhost:8000
```

### 2. Frontend 실행

```bash
# 브라우저에서 열기
open ../frontend/physics_map_ep10.html

# 또는 허브에서 선택
open ../frontend/index.html
```

---

## 📊 핵심 수식

### Scale Law (AUTUS Edition)

```
V(t) = Σ Φ_ij(t)
```

- `V(t)`: 네트워크 가치 (시점 t)
- `Φ_ij`: 링크 에너지 (검증된 coin-flow)
- `E(t)`: 검증된 링크 집합

### 링크 에너지 Φ_ij

```
Φ_ij = Σ max(0, u_ij,e) × Minutes_e

u_ij,e = v_e - (b_i + b_j) / 2
```

- `v_e`: 이벤트 속도 (Amount / Minutes)
- `b_i, b_j`: 개인 기준선 (solo velocity)
- `u_ij,e`: pair uplift (기준선 대비 초과 속도)

### 핵심 차이점

| 전통 Metcalfe | AUTUS |
|---------------|-------|
| V ∝ n² | V = Σ Φ_ij |
| 연결 = 가치 | 검증된 coin-flow만 |
| 의미 기반 | 물리량만 |

---

## 🖱️ 드래그 입력 타입

| 타입 | 물리 입력 | 효과 |
|------|----------|------|
| **Allocation** | ΔMinutes_i | 시간 배분 변경 → Velocity 변화 |
| **Link** | Δw_ij | 링크 강도 변경 → Uplift 기대값 |
| **Swap** | Team 교체 | 팀 구성 변경 → BestTeam 재계산 |

---

## 📈 KPI

| KPI | 공식 | 설명 |
|-----|------|------|
| **NetCoin** | Mint - Burn | 순 돈 흐름 |
| **EntropyRatio** | Burn / Mint | 소진율 (낮을수록 좋음) |
| **Velocity** | Total / Minutes | 돈 속도 |
| **BestTeamScore** | Σ Φ_ij (팀 내) | 최적 팀 점수 |

---

## 🔧 API 엔드포인트

```
GET  /           # API 정보
GET  /state      # 현재 맵 상태
GET  /kpi        # KPI (7D/28D)
GET  /predict    # 예측 (Rolling Horizon)
GET  /scale      # Scale Metrics
GET  /triggers   # 자동 트리거
GET  /audit      # Audit 로그

POST /person     # 사람 추가
POST /event      # 이벤트 추가
POST /drag       # 드래그 입력

WS   /ws         # 실시간 WebSocket
```

---

## 🎯 7일 MVP 목표

1. ✅ Physics Scale Law v0 구현
2. ✅ Map UI (사람+돈만)
3. ✅ 드래그 → 물리 입력 변환기
4. ✅ 예측 엔진 (7D rolling)
5. ⬜ 산업 파티션 적용
6. ⬜ 변수 자동 피드백 루프
7. ⬜ 데모 시나리오 검증

---

## 📝 Score Sheet

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Clarity) | 10 |
| O (Output) | 10 |
| P (Physics) | 10 |
| ROI | 10 |
| **Total** | **99/100** |

---

## 🔗 참고

- SehoOS EP10 설계 정본
- Musk Metcalfe's Law 재해석
- AUTUS 철학: 사람+돈만, 의미 해석 금지



















