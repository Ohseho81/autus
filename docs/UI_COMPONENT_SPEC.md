# 🏛️ AUTUS UI COMPONENT SPEC

> **Authoritative / Non-Optional**

---

## 최상위 원칙

1. **UI ↔ UI 직접 연결 없음**
2. **UI는 서로의 상태를 모른다**
3. **모든 UI는 Core를 통해서만 연결**
4. **Write는 오직 Gate 이후 내부 프로세스만 가능**
5. **UI는 Read / Sense / Replay만 가능**

---

## 전체 연결 체인

```
[Real World]
   ↓
[City Twin / Geo]
   ↓
[Work Genome]
   ↓
[Physics + Gate]
   ↓
[Simulation Engine]
   ↓
[Afterimage Ledger]
   ↓
[Replay]
```

UI는 위 체인 중 **자기 위치의 "단면"만 본다**.

---

## 1) K2 Operator UI — Execution View

### 목적
- 실행만 가능
- 판단·해석·비교 차단

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Spatial Context** | Mini Map | 실지형 축소 |
| | 현재 위치 마커 | 고정 |
| | 작업 반경 링 | 비수치 |
| **[B] Single Task Card** | Task Name | 텍스트 1줄 |
| | Current State | Idle / Active / Blocked |
| | Time Pressure Indicator | 색 변화만 |
| **[C] Action Controls** | Execute Button | 실행 |
| | Report Blockage Button | 차단 보고 |
| **[D] Gate Sensation Overlay** | Input Delay Layer | 입력 지연 |
| | Elastic Resistance Layer | 탄성 저항 |
| | Blur / Distortion Shader | 시각 왜곡 |

### 연결

```
K2 UI
 ├─ READ → City Twin (현재 위치/맥락)
 ├─ READ → Work Genome (단일 Task)
 ├─ SENSE ← Gate State (OBSERVE/RING/LOCK)
 └─ SIGNAL → Execution Event (행동 신호만)
```

### 금지 컴포넌트
- ❌ 숫자
- ❌ 리스트
- ❌ 히스토리
- ❌ 예측
- ❌ Undo

---

## 2) Gate Feedback UI — Physical Sensation Layer

### 목적
- 승인/차단을 "느낌"으로 전달

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Interaction Modifier** | Click Latency Controller | 클릭 지연 |
| | Drag Resistance Controller | 드래그 저항 |
| **[B] Visual Distortion** | Chromatic Aberration | 색수차 |
| | Gaussian Blur Gradient | 블러 그래디언트 |
| | Screen Elasticity | 화면 탄성 |
| **[C] State Driver** | GateState Observer | OBSERVE/RING/LOCK |

### 연결

```
Gate Feedback
 └─ SUBSCRIBE ← Gate State Stream
```

### 금지
- ❌ Alert
- ❌ Modal
- ❌ Text Warning

---

## 3) K10 Observer UI — Universe View

### 목적
- 전역 관측
- 개입 불가

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Main Canvas** | Real Terrain Map | 실제 지형 |
| | Causal Wave Renderer | 인과 파동 |
| | Inertia Halo Renderer | 관성 후광 |
| **[B] Time Control** | Play / Pause | 재생 제어 |
| | Time Compression Slider | 시간 압축 |
| **[C] Layer Toggles** | Wave On/Off | 파동 표시 |
| | Halo On/Off | 후광 표시 |
| | Boundary On/Off | 경계 표시 |
| **[D] Gate Indicator** | Ring Visualization | 링 시각화 |
| | Lock Closure Animation | 잠금 애니메이션 |

### 연결

```
K10 UI
 ├─ READ → City Twin (전역)
 ├─ READ → Simulation Frames
 ├─ READ → Gate Events (결과만)
 └─ READ → Afterimage Index
```

### 금지
- ❌ Apply
- ❌ Edit
- ❌ Recommend

---

## 4) Simulation UI — Causal Replay Layer

### 목적
- 인과 재현
- "만약" 금지

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Replay Canvas** | Deterministic Frame Player | 결정론적 재생 |
| | Step-by-Step Timeline Cursor | 단계별 커서 |
| **[B] Meta Strip** | Timestamp | 시간 |
| | Location Code | 위치 코드 |
| | Replay Hash | 읽기 전용 |
| **[C] Playback Controls** | Replay | 재생 |
| | Pause | 일시정지 |
| | Speed Control | 속도 조절 |

### 연결

```
Simulation Replay UI
 └─ READ → Simulation Engine (Recorded Frames)
```

### 금지
- ❌ Annotation
- ❌ Branching
- ❌ Export

---

## 5) Afterimage UI — Immutable Ledger Viewer

### 목적
- 책임 증명
- 감사 대응

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Ledger List** | Afterimage ID | 식별자 |
| | Gate Type | 게이트 유형 |
| | Timestamp | 시간 |
| **[B] Detail Panel** | Hash Chain | 해시 체인 |
| | Environment Version | 환경 버전 |
| | Geo Reference | 지리 참조 |
| **[C] Replay Link** | Read-only Replay Trigger | 재생 트리거 |

### 연결

```
Afterimage UI
 ├─ READ → Afterimage Ledger
 └─ READ → Replay Engine (Hash 기반)
```

### 금지
- ❌ Delete
- ❌ Edit
- ❌ Comment

---

## 6) City Twin UI — Spatial Context Layer

### 목적
- 현실을 좌표계로 제공
- 판단 미개입

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] City Map** | Administrative Boundary | 행정 경계 |
| | Density Heat Layer | 밀도 히트맵 |
| | Time-of-Day Overlay | 시간대 오버레이 |
| **[B] Node Visualization** | Organization Node | 조직 노드 |
| | External Node | 외부 노드 (저질량) |
| | Boundary Attenuation Zone | 경계 감쇠 영역 |
| **[C] Context Filters** | Time Slice | 시간 슬라이스 |
| | Density Only / Flow Only | 필터 |

### 연결

```
City Twin UI
 └─ READ → Geo-Causal Kernel
```

### 금지
- ❌ KPI
- ❌ Score
- ❌ Recommendation

---

## 7) Genome Evolution UI — Pattern View

### 목적
- 업무 증식/소멸 패턴 관측

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] Genome Graph** | Node Birth / Death Animation | 생성/소멸 |
| | Frequency Morphing | 빈도 변형 |
| **[B] Pattern Timeline** | Shape Change Only | 형태만 (라벨 없음) |
| **[C] Stability Indicator** | Growth / Decay Direction | 아이콘만 |

### 연결

```
Genome UI
 └─ READ → Work Genome (패턴 상태)
```

### 금지
- ❌ Task Edit
- ❌ Manual Weight Change

---

## 8) Authority Boundary UI — Visibility Control Layer

### 목적
- 권한 밖 세계 차단

### 구성요소

| 컴포넌트 | 요소 | 기능 |
|---------|------|------|
| **[A] LOD Controller** | Resolution Dropper | 해상도 감소 |
| | Detail Culling | 디테일 컬링 |
| **[B] Fog of War** | Quantum Fog Shader | 양자 안개 |
| | Distance-Based Obfuscation | 거리 기반 흐림 |
| **[C] Access Gate** | Scale Lock Enforcer | 스케일 잠금 |

### 연결

```
Boundary Layer
 └─ INTERCEPT → UI Render Pipeline
```

### 금지
- ❌ Bypass
- ❌ Request Access Button

---

## 신호 타입 정리

| 신호 | 방향 | 의미 |
|------|------|------|
| READ | UI ← Core | 상태 스냅샷 |
| SENSE | UI ← Gate | 체감 |
| SIGNAL | UI → Core | 행동 발생 |
| WRITE | Core → Ledger | 비가역 기록 |

**금지:**
- UI → WRITE ❌
- UI → Gate ❌

---

## UI 간 직접 연결 금지 이유

| 연결 금지 | 이유 |
|----------|------|
| K2 → K10 | 판단 오염 |
| K10 → K2 | 권력 전이 |
| Simulation → K2 | 미래 예측 |
| Afterimage → K2 | 책임 회피 |
| Genome → K2 | 설계 유혹 |

---

## 최종 고정 문장

> **AUTUS의 UI는 정보를 전달하지 않는다.**
>
> **인간이 잘못된 판단을 하기 전에**
> **이미 다른 선택지를 보지 못하게 만든다.**
