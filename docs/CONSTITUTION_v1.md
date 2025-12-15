# AUTUS Constitution v1.0 (FINAL LOCK)

> 이 문서는 LOCK 상태입니다. 수정 불가.
> 이후 변경은 v2.0에서만 가능합니다.

---

## 선언

AUTUS는 **현실의 운영 체제**입니다.
숫자를 조작하지 않고, 미래를 **보이게** 만듭니다.

---

## 제1조: 물리 우선 (Physics First)

1. 모든 계산은 **Backend에서만** 수행된다.
2. UI는 **렌더링만** 담당한다.
3. 결정론: **동일 입력 → 동일 출력**

---

## 제2조: 데이터 주권 (Data Sovereignty)

1. Shadow는 **상태**이다.
2. Orbit은 **궤도**이다.
3. Sim은 **가상**이다 (현실 불변).
4. 원본은 저장하지 않는다.

---

## 제3조: 9행성 고정 (Nine Planets Fixed)

```
OUTPUT    — 생산
QUALITY   — 품질
TIME      — 시간
FRICTION  — 마찰
STABILITY — 안정
COHESION  — 결속
RECOVERY  — 회복
TRANSFER  — 전이
SHOCK     — 충격
```

행성의 개수와 의미는 **변경 불가**.
값의 범위: **0 ~ 1**

---

## 제4조: 이중 렌즈 (Dual Lens)

1. **SolarLens** — 태양계 (외면)
2. **CockpitLens** — 계기판 (내면)

같은 진실을, 다른 관점으로 본다.

---

## 제5조: 시간의 3궤도 (Three Orbits)

1. **Past** — 확정된 과거
2. **Now** — 현재 상태
3. **Forecast** — 물리적 연장

확률이 아닌, **결정론적 예측**.

---

## 제6조: 가상 시뮬레이션 (SimPreview)

1. Admin 전용
2. 가상 Force 주입 가능
3. Shadow는 **불변**
4. "What-if"만 표시

---

## 제7조: 스킨 확장 (Skin Extension)

1. Entity 타입별 스킨: human, company, city, nation, admin
2. 스킨은 **표현만** 담당
3. 물리는 **공통**
4. 새 스킨 추가 시 코어 변경 **금지**

---

## 제8조: 이벤트 추적 (Event Trace)

1. 모든 변화는 Event로 기록
2. trace_id / span_id로 추적
3. Replay로 재생 가능
4. Append-only (수정 불가)

---

## 제9조: 성능 기준 (Performance)

1. API 응답: **< 500ms** (P95)
2. WS 지연: **< 100ms**
3. UI: **60fps** 유지
4. 초기 로드: **< 3초**

---

## 제10조: 변경 금지 (No Change)

v1.0 이후:

### 변경 불가 항목
- 9행성 개수/의미
- Shadow/Orbit/Sim 분리
- 물리 우선 원칙
- API 계약 7개
- WS 계약 1개

### 확장 가능 항목
- 새 스킨 추가
- 새 FX 추가
- 성능 최적화
- 버그 수정

---

## 서명

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              AUTUS CONSTITUTION v1.0                       ║
║                                                            ║
║                      FINAL LOCK                            ║
║                                                            ║
║   "See the Future. Don't Touch It."                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 부록: Series 로드맵

### v1.x Series (현재)
- v1.0: MVP Complete ✓
- v1.1: PostgreSQL 마이그레이션
- v1.2: Redis 캐시
- v1.3: 인증/권한 (JWT + RBAC)

### v2.0 Series (미래)
- 멀티 테넌트
- 스킨 마켓
- 고급 예측 모델
- 모바일 앱

### v3.0 Series (장기)
- 연합 학습
- 크로스 엔티티 분석
- AI 기반 이상 탐지

---

v1.0 FINAL LOCK
