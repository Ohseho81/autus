# Resume System Slot

## Purpose
resume 한 번에 맥락을 복원한다.

## DONE Definition
resume 한 번에 맥락 복원

## Checklist
- [x] dev/state.json - 현재 슬롯, 목표, 상태
- [x] dev/today.md - 오늘 작업 기록
- [x] slot_map.yaml - 전체 진도
- [x] dev/roadmap.yaml - 종료 조건

## Status
FILLED

## Resume 프로토콜

### 세션 시작 시
```
1. dev/state.json 읽기
   - current_slot: 어디서 멈췄나
   - current_goal: 무엇을 하고 있었나
   - blockers: 막힌 것은?

2. slot_map.yaml 읽기
   - 전체 진도 파악
   - PARTIAL 슬롯 확인

3. dev/today.md 읽기 (있다면)
   - 오늘 이미 한 작업 확인
```

### Resume 명령어
```
Cursor에 붙여넣기:

"dev/state.json과 slot_map.yaml을 읽고 현재 상태를 요약해줘.
그리고 다음에 해야 할 작업을 제안해줘."
```

### 세션 종료 시
```
1. dev/state.json 업데이트
   - current_slot, current_goal 갱신
   - blockers 기록

2. dev/today.md 업데이트
   - 완료된 작업 체크
   - 다음 작업 기록

3. slot_map.yaml 업데이트
   - 완료된 슬롯 FILLED로 변경
```

## Notes
- 2025-12-17: 슬롯 생성, FILLED 상태
- 며칠 후 와도 즉시 복원 가능

