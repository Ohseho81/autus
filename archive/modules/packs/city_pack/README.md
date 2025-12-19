# City Pack PoC v1.0

도시 거버넌스 · 리스크 · 회복력 시뮬레이션

## 이벤트 종류
- **incident**: 재난/사고 (압력↑, 자원↓)
- **policy**: 규제/행정 (Boundary↑)
- **investment**: 투자/인프라 (Core↑, 자원↑)

## 시나리오
- default: 투자 → 사고 → 정책
- crisis: 연속 재난
- growth: 연속 투자

## API
- POST /autus/city/create
- POST /autus/city/event
- POST /autus/city/scenario
- GET /autus/city/{city_id}
