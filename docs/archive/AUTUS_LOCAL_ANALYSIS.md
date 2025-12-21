# AUTUS 현재 상태 분석 리포트

> 분석일: 2024-12-15
> 위치: ~/Desktop/autus
> 프로덕션: https://solar.autus-ai.com

---

## 📊 규모 요약

| 항목 | 수치 |
|------|------|
| **Python 파일** | 470개 |
| **Frontend HTML** | 25+ 페이지 |
| **최상위 폴더** | 40+ 개 |
| **DB 테이블** | 3개 (events, shadow_snapshots, trace_pairs) |
| **API 라우터** | 10+ 개 |

---

## ✅ 이미 구현된 것

### 1. 9행성 시스템 (LOCK)
```python
PLANETS = [
    "OUTPUT",      # 생산량
    "QUALITY",     # 품질
    "TIME",        # 시간 효율
    "FRICTION",    # 마찰/저항
    "STABILITY",   # 안정성
    "COHESION",    # 응집력
    "RECOVERY",    # 회복력
    "TRANSFER",    # 전달 효율
    "SHOCK",       # 충격/위험
]
```
**상태: ✅ 완전 구현**

### 2. Shadow32f → 9 Planets 매핑
```python
PLANET_RANGES = {
    "OUTPUT": (0, 4),
    "QUALITY": (4, 8),
    "TIME": (8, 12),
    "FRICTION": (12, 16),
    "STABILITY": (16, 20),
    "COHESION": (20, 24),
    "RECOVERY": (24, 28),
    "TRANSFER": (28, 31),
    "SHOCK": (31, 32),
}
```
**상태: ✅ 완전 구현**

### 3. 궤도 물리 (3궤도)
- `past` (t=0.0)
- `now` (t=1.0)
- `forecast` (t=2.0)

**상태: ✅ 완전 구현** (`planets_to_orbit()`)

### 4. Force Injection (SimPreview)
```python
Forces:
    E: OUTPUT 증가
    R: FRICTION 감소
    T: TIME 감소
    Q: QUALITY 증가
    MU: COHESION 증가
```
**상태: ✅ 완전 구현** (`apply_forces()`)

### 5. API 엔드포인트

| 엔드포인트 | 파일 | 상태 |
|------------|------|------|
| `/shadow/{entity_id}` | app/api/shadow.py | ✅ |
| `/orbit/{entity_id}` | app/api/orbit.py | ✅ |
| `/sim/preview` | app/api/sim.py | ✅ |
| `/events` | app/api/events.py | ✅ |
| `/replay` | app/api/replay.py | ✅ |

### 6. 데이터베이스 모델

| 테이블 | 용도 | 상태 |
|--------|------|------|
| `events` | Immutable ledger (원장) | ✅ |
| `shadow_snapshots` | Entity별 상태 캐시 | ✅ |
| `trace_pairs` | Event→Snapshot 추적 | ✅ |

### 7. 물리 엔진

| 모듈 | 위치 | 기능 |
|------|------|------|
| Solar Physics | core/solar/physics.py | PRESSURE/RELEASE/DECISION |
| Orbit Physics | app/physics/orbit.py | 9행성 궤도 계산 |
| Constants | core/solar/constants.py | ALPHA, BETA, GAMMA, K |

### 8. Frontend 페이지

| 페이지 | 용도 |
|--------|------|
| one-screen.html | **통합 화면** (Force Intervention + Universe + Intelligence) |
| globe-pack-hq.html | Globe + 8레이어 스택 |
| galaxy3d.html | 3D Galaxy |
| hud-system.html | HUD 시스템 |
| control-hq.html | 제어 HQ |
| simulation-hq.html | 시뮬레이션 HQ |

---

## 🔴 오늘 개발한 것 vs 로컬 비교

| 항목 | 오늘 (STEP 12~15) | 로컬 (기존) |
|------|-------------------|-------------|
| 9행성 정의 | ✅ | ✅ **동일** |
| Shadow/Orbit API | ✅ 스켈레톤 | ✅ **실제 구현** |
| SimPreview | ✅ 설계 | ✅ **실제 구현** |
| Solar Lens (태양계) | ✅ Three.js | 🔶 Globe 방식 |
| Cockpit Lens (계기판) | ✅ 새로 설계 | ❌ 없음 |
| Force Sliders | ✅ 설계 | ✅ **실제 구현** |

---

## 🔶 차이점: Solar vs Globe

### 로컬 (현재)
- **Globe 방식**: 지구본 형태
- 노드 50개 점으로 표시
- Entropy/Pressure/Flow/Energy/Risk 6개 지표

### 오늘 설계 (STEP 13)
- **Solar 방식**: 태양계 형태
- 9행성이 태양 주위 공전
- 궤도 트레일 표시

### 통합 방안
로컬에 **Solar Lens 탭 추가** 가능
- 기존 Globe 유지
- Solar 탭 새로 추가
- 동일 Shadow 데이터 사용

---

## 🟢 추가 가능한 것: Cockpit Lens

로컬에 **없는** 기능:
- Cockpit (계기판) 뷰
- 9행성 → 9게이지 매핑
- Alert Level 시스템

**통합 권장**

---

## 📋 권장 다음 단계

### 옵션 A: Cockpit Lens만 추가 (1일)
```
frontend/cockpit.html 생성
- 9개 원형 게이지
- Alert 상태 표시
- 기존 API 그대로 사용
```

### 옵션 B: Solar Lens 추가 (2일)
```
frontend/solar.html 생성
- Three.js 태양계
- 9행성 궤도
- 기존 API 그대로 사용
```

### 옵션 C: 둘 다 추가 (3일)
```
frontend/
├── globe.html (기존)
├── solar.html (새로)
└── cockpit.html (새로)

탭으로 전환 가능
```

---

## 🎯 결론

**로컬 AUTUS는 이미 95% 완성 상태**

| 항목 | 상태 |
|------|------|
| Backend API | ✅ 100% |
| 9행성 물리 | ✅ 100% |
| Database | ✅ 100% |
| Globe UI | ✅ 100% |
| Railway 배포 | ✅ 100% |
| **Solar Lens** | 🔶 추가 가능 |
| **Cockpit Lens** | 🔶 추가 가능 |

**오늘 설계한 STEP 12~15는 "Solar + Cockpit" 추가 시 참고 자료로 활용**

---

## 파일 위치 요약

```
~/Desktop/autus/
├── app/                    # FastAPI 앱 ✅
│   ├── main.py
│   ├── api/               # 5개 라우터
│   ├── physics/           # 궤도 계산
│   ├── models.py          # 3개 테이블
│   └── schemas.py         # 9행성 타입
├── core/solar/            # 물리 엔진 ✅
│   ├── physics.py
│   ├── constants.py
│   └── solar_entity.py
├── frontend/              # UI ✅
│   ├── one-screen.html    # 통합 화면
│   ├── globe-pack-hq.html # Globe HQ
│   └── ...
└── main.py                # 진입점
```
