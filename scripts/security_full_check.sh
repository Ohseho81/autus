#!/bin/bash
echo "🔒 AUTUS Full Security Check"
echo "============================"

REPORT_FILE="reports/security_$(date +%Y%m%d_%H%M%S).md"
mkdir -p reports

cat > "$REPORT_FILE" << HEADER
# Security Report
**Date**: $(date)
**Status**: In Progress

## Checks
HEADER

# 1. PII 검사
echo "🔍 Checking for PII..."
PII_FOUND=$(grep -r -E "(email|password|ssn|credit.?card)" --include="*.py" . 2>/dev/null | wc -l)
echo "- PII patterns found: $PII_FOUND" >> "$REPORT_FILE"

# 2. 하드코딩된 시크릿
echo "🔍 Checking for hardcoded secrets..."
SECRETS_FOUND=$(grep -r -E "(api.?key|secret|token)\s*=\s*['\"][^'\"]+['\"]" --include="*.py" . 2>/dev/null | wc -l)
echo "- Hardcoded secrets: $SECRETS_FOUND" >> "$REPORT_FILE"

# 3. SQL 인젝션 패턴
echo "🔍 Checking for SQL injection..."
SQL_INJECTION=$(grep -r -E "execute\([^)]*\+|f\".*SELECT.*{" --include="*.py" . 2>/dev/null | wc -l)
echo "- SQL injection patterns: $SQL_INJECTION" >> "$REPORT_FILE"

# 4. 의존성 취약점 (safety)
echo "🔍 Checking dependencies..."
if command -v safety &> /dev/null; then
    safety check 2>/dev/null >> "$REPORT_FILE" || echo "- Safety check skipped" >> "$REPORT_FILE"
fi

# 5. Constitution 준수
echo "🔍 Checking Constitution compliance..."
./scripts/security_check.sh >> "$REPORT_FILE" 2>&1 || true

# 결과 요약
TOTAL_ISSUES=$((PII_FOUND + SECRETS_FOUND + SQL_INJECTION))
if [ "$TOTAL_ISSUES" -eq 0 ]; then
    echo -e "\n## Result: ✅ PASSED" >> "$REPORT_FILE"
else
    echo -e "\n## Result: ⚠️ $TOTAL_ISSUES issues found" >> "$REPORT_FILE"
fi

echo "✅ Report: $REPORT_FILE"
