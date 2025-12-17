# Multi-Entity Slot

## Purpose
여러 개체(Entity)를 동시에 관리하는 개념과 인터페이스를 정의한다.

## DONE Definition
개념·인터페이스 정의 (비활성 OK)

## Checklist
- [x] Multi-Entity 개념 정의
- [x] Entity 인터페이스 설계
- [ ] Galaxy (Entity 집합) 개념
- [ ] Entity 간 상호작용 모델
- [ ] Multi-Entity UI 설계

## Status
OFF

## 비활성화 사유
- 현재 단일 Entity (SUN_001) 집중
- Multi-Entity는 Phase 2 범위
- 개념 정의만 완료, 구현은 보류

## 개념 정의

### Entity
하나의 독립적인 상태 시스템
- 고유 ID (예: SUN_001, MOON_002)
- 독립적인 9 Planets 상태
- 독립적인 Twin 상태

### Galaxy
Entity들의 집합
- Entity 간 Transfer 가능
- 집단 Recovery 계산
- 전체 Stability 측정

## 인터페이스 (Draft)
```python
class Entity:
    id: str
    planets: Dict[str, float]  # 9 planets
    twin: TwinState
    
class Galaxy:
    entities: List[Entity]
    def aggregate_risk(self) -> float
    def transfer(self, from_id, to_id, resource, amount)
```

## Notes
- 2025-12-17: 슬롯 생성, OFF 상태
- Phase 2에서 활성화 예정

