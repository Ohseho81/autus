# AUTUS 개발 인계 문서

## 1. 정의
Autus는 결정이다.
현상을 물리의 최소단위로 분해하고 목표를 향해 재합성하여
개체가 가장 효율적으로 도달하도록 보완/지원한다.

## 2. 구조

### 업무: 4개
- People (사람)
- Money (자본)
- Work (운영)
- Policy (제도)

### Organism: 7슬롯
- Brain (사고) - Thiel
- Sensors (감지) - Hastings
- Heart (의지) - Altman
- Core (본질) - Jobs
- Engines (실행) - Musk
- Base (안정) - Bezos
- Boundary (적응) - CZ

### 외부 입력: 3종
- Vector (방향/성장)
- Pressure (압력/위협)
- Resource (자원 유입)

## 3. 4업무 → 7슬롯 매트릭스
```
              Brain  Sensors  Heart  Core  Engines  Base  Boundary
People        0.7    0.8      0.3    0.1   0.1      0.0   0.2
Money         0.2    0.1      0.4    0.8   0.3      0.9   0.3
Work          0.3    0.2      0.2    0.3   0.9      0.2   0.1
Policy        0.5    0.3      0.6    0.2   0.1      0.3   0.8
```

## 4. 7인 Rule

| Rule ID | 원칙 | 조건 | 결과 |
|---------|------|------|------|
| MUSK-001 | 가정 2개 이상 차단 | assumption_count > 2 | block |
| JOBS-001 | UI는 결정하지 않음 | 숫자 직접 렌더링 | block |
| BEZOS-001 | 단위 비용 감소 | 비용 증가 추세 | warn |
| THIEL-001 | 경쟁 구조 회피 | 경쟁자 ≥ 3 | warn |
| ALTMAN-001 | 인간 안전 | "harm" 키워드 | block |
| HASTINGS-001 | 규칙 최소화 | 규칙 > 10개 | warn |
| CZ-001 | 관할권 전환 | 규제 차단 시 | 전환 제안 |

## 5. 상태 관리

- State: Lock에서만 갱신 (안정)
- Shift: 매 프레임 누적 (실시간)
- Lock Window: Freeze(200ms) → Snap(200ms) → Resume(200ms)
- Afterimage: Lock 시점 상태 저장 (8단계 링버퍼)

## 6. GMU (Global Management Unit)

하나의 관리 대상 인스턴스.
- GMU_LGES_001: LG에너지솔루션
- GMU_LIME_PH_001: 필리핀 인력송출
- GMU_CITY_SEOUL: 서울시

## 7. Input Adapter 매핑

### Vector
- 소스: KPI 목표, OKR, 전략 문서
- 필드: angle, intensity, coherence

### Pressure
- 소스: 경쟁사 뉴스, 규제, 이슈 티켓
- 필드: intensity, duration, frequency

### Resource
- 소스: 매출, 투자, 채용, 예산
- 필드: rate, quality, absorption

## 8. 기술 스택

- Backend: FastAPI + SQLite/PostgreSQL
- Frontend: WebGL (Canvas 폴백)
- 배포: Railway
- 상태: Hash Chain (Ledger)

## 9. 배포 URL

- API: https://railway-up-detach-production.up.railway.app
- UI: /static/autus_organism.html

## 10. 다음 개발

1. Input Adapter 구현
2. Ledger 영구 저장
3. GMU 멀티 인스턴스
4. 외부 API 연동
