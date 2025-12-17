# Decision Log Slot

## Purpose
모든 결정의 이유를 기록한다.

## DONE Definition
모든 결정의 이유 기록

## Checklist
- [x] dev/today.md에 결정 로그 섹션
- [ ] 결정 로그 자동 수집
- [ ] 결정 카테고리 분류
- [ ] 결정 검색 기능

## Status
PARTIAL

## 결정 로그 포맷
```markdown
| 시간 | 결정 | 이유 | 대안 |
|------|------|------|------|
| HH:MM | {무엇을 결정했나} | {왜 그렇게 했나} | {다른 선택지는?} |
```

## 결정 카테고리
- **ARCHITECTURE**: 구조 결정
- **PRIORITY**: 우선순위 결정
- **TRADEOFF**: 트레이드오프 선택
- **POLICY**: 정책 결정
- **TECHNICAL**: 기술 선택

## 예시 결정 로그
| 시간 | 결정 | 이유 | 카테고리 |
|------|------|------|----------|
| 00:00 | Recovery를 1순위로 | 위기 시 Output 집착이 더 큰 실패 유발 | PRIORITY |
| 00:30 | 슬롯 기반 개발 도입 | 완벽 + 종료 가능 동시 만족 | ARCHITECTURE |
| 01:00 | Multi-Entity OFF | 단일 Entity 집중, Phase 2로 연기 | TRADEOFF |

## Notes
- 2025-12-17: 슬롯 생성
- TODO: 결정 로그 자동 수집 시스템

