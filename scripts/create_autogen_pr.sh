#!/bin/bash
# AUTUS 자동 PR 생성 스크립트 (신규 테스트/팩/제안 자동 PR)
# 1. 새 브랜치 생성 (autogen/test-suggestion-YYYYMMDD)
# 2. 변경 파일 add/commit
# 3. 원격 저장소로 push
# 4. gh CLI로 PR 생성 (제목/본문 자동)

set -e

BRANCH="autogen/test-suggestion-$(date '+%Y%m%d')"
BASE_BRANCH="main"  # 필요시 master로 변경
PR_TITLE="[AUTUS][AUTO] 신규 테스트/팩 자동 생성 제안"
PR_BODY="자동화 시스템이 생성한 신규 테스트/팩 제안 또는 코드입니다.\n\n자동 생성 리포트 및 템플릿을 참고해 주세요."

# 1. 브랜치 생성 및 체크아웃
git checkout -b "$BRANCH"

# 2. 변경 파일 add/commit
git add reports/autus_test_suggestion_*.md
if git diff --cached --quiet; then
  echo "[INFO] 커밋할 변경 사항이 없습니다."
  exit 0
fi
git commit -m "$PR_TITLE"

# 3. 원격 저장소로 push
git push origin "$BRANCH"

# 4. gh CLI로 PR 생성 (gh 설치 필요)
gh pr create --base "$BASE_BRANCH" --head "$BRANCH" --title "$PR_TITLE" --body "$PR_BODY"

echo "[자동 PR 생성 완료] 브랜치: $BRANCH"
