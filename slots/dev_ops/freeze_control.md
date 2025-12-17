# Freeze Control Slot

## Purpose
고정 영역 변경 시 경고를 발생시킨다.

## DONE Definition
고정 영역 변경 시 경고 발생

## Checklist
- [x] Immutable 영역 정의
- [x] roadmap.yaml에 freeze_criteria 명시
- [ ] pre-commit hook으로 변경 감지
- [ ] 변경 시 강제 승인 프로세스

## Status
PARTIAL

## Immutable 영역 (변경 금지)
```
/spec/              # LAYER 0 - Core Spec
PHYSICS.md          # 물리 수식
CONSTITUTION.md     # 거버넌스 원칙
slot_map.yaml       # 구조 (내용은 변경 가능)
```

## Mutable 영역 (변경 허용)
```
/slots/             # 슬롯 내용
/dev/               # 개발 상태
/frontend/          # 구현체
/app/               # 백엔드 구현
```

## 변경 감지 로직 (Draft)
```bash
#!/bin/bash
# pre-commit hook

IMMUTABLE_FILES=(
  "PHYSICS.md"
  "CONSTITUTION.md"
  "spec/*"
)

for file in "${IMMUTABLE_FILES[@]}"; do
  if git diff --cached --name-only | grep -q "$file"; then
    echo "⚠️ WARNING: Attempting to modify immutable file: $file"
    echo "This requires explicit approval."
    exit 1
  fi
done
```

## Notes
- 2025-12-17: 슬롯 생성
- TODO: pre-commit hook 구현

