#!/bin/bash
echo "📦 AUTUS Release Automation"
echo "============================"

VERSION=$1
if [ -z "$VERSION" ]; then
    # 자동 버전 계산
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    MAJOR=$(echo $LAST_TAG | cut -d. -f1 | tr -d 'v')
    MINOR=$(echo $LAST_TAG | cut -d. -f2)
    PATCH=$(echo $LAST_TAG | cut -d. -f3)
    VERSION="v${MAJOR}.${MINOR}.$((PATCH + 1))"
fi

echo "📌 Version: $VERSION"

# 1. CHANGELOG 업데이트
./scripts/gen_changelog.sh

# 2. 테스트 실행
echo "🧪 Running tests..."
python -m pytest -q --tb=no || {
    echo "❌ Tests failed, aborting release"
    exit 1
}

# 3. Git 태그
git add -A
git commit -m "Release $VERSION" || true
git tag -a "$VERSION" -m "Release $VERSION"

# 4. 릴리즈 노트 생성
cat > "releases/RELEASE_${VERSION}.md" << RELEASE_EOF
# Release $VERSION

**Date**: $(date +%Y-%m-%d)

## Changes
$(git log --oneline $(git describe --tags --abbrev=0 HEAD^)..HEAD 2>/dev/null || echo "Initial release")

## Test Results
$(python -m pytest -q --tb=no 2>&1 | tail -1)
RELEASE_EOF

echo "✅ Release $VERSION created"
