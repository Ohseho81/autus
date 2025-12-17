# State Engine Slot

## Purpose
Event → State → Memory 흐름을 완결시킨다.

## DONE Definition
Event → State → Memory 완결

## Checklist
- [x] Engine 클래스 구현 (app/main.py)
- [x] SQLite 영속성
- [x] Tick 기반 상태 업데이트
- [x] /api/state 엔드포인트
- [x] 9 Planets 매핑 로직
- [x] Twin 상태 (entropy, pressure, risk, flow)
- [x] Audit 로그

## Status
FILLED

## 아키텍처
```
Event (add_work, remove_work, commit_decision)
    ↓
Engine._tick() - 매 초 상태 업데이트
    ↓
State (pressure, release, decision, gravity, entropy)
    ↓
Memory (SQLite: state, actors, audit 테이블)
```

## API 엔드포인트
- `GET /api/state` - Solar HQ용 통합 상태
- `GET /status` - 내부 상태
- `POST /event/add_work` - 작업 추가
- `POST /event/remove_work` - 작업 완료
- `POST /event/commit_decision` - 결정

## Notes
- 2025-12-17: 슬롯 생성, FILLED 상태
- /api/state가 프론트엔드와 연결됨

