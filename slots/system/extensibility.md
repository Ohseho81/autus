# Extensibility Slot

## Purpose
슬롯 추가로만 확장 가능하게 만든다.

## DONE Definition
슬롯 추가로만 확장

## Checklist
- [x] 슬롯 템플릿 정의
- [x] slot_map.yaml 자동 구조
- [ ] 새 슬롯 추가 CLI/스크립트
- [ ] 슬롯 간 의존성 그래프

## Status
PARTIAL

## 슬롯 템플릿
```markdown
# {Slot Name} Slot

## Purpose
{한 문장으로 이 슬롯이 해결하는 문제}

## DONE Definition
{완료 조건 - 명확하고 검증 가능}

## Checklist
- [ ] {구체적 항목 1}
- [ ] {구체적 항목 2}

## Status
{FILLED | PARTIAL | OFF}

## Notes
- {날짜}: {메모}
```

## 확장 규칙
1. **기존 슬롯 수정 금지** - 새 슬롯으로 확장
2. **의존성 최소화** - 각 슬롯은 독립적으로 완료 가능
3. **OFF 허용** - 불필요한 슬롯은 OFF로 명시적 비활성화

## Notes
- 2025-12-17: 슬롯 생성
- TODO: add-slot 스크립트 작성

