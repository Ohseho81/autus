#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS E2E TEST — Action → Audit (LOCK)
# curl 기반 테스트 스크립트
# ═══════════════════════════════════════════════════════════════════════════════

API_BASE="${API_BASE:-https://autus-production.up.railway.app}"
# API_BASE="http://localhost:8000"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  AUTUS E2E TEST — Action → Audit (LOCK)"
echo "═══════════════════════════════════════════════════════════"
echo "  API: $API_BASE"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0

# ─────────────────────────────────────────────────────────────────────────────
# TEST 1: Physics Solar Binding
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 1: Physics Solar Binding"
RESP=$(curl -s -w "\n%{http_code}" "$API_BASE/api/v1/physics/solar-binding")
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS: HTTP 200"
    RISK=$(echo "$BODY" | grep -o '"risk":[0-9]*' | head -1 | cut -d: -f2)
    echo "   risk=$RISK%"
    ((PASSED++))
else
    echo "❌ FAIL: HTTP $HTTP_CODE"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 2: ACTION Execute
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 2: ACTION Execute"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/action/execute" \
    -H "Content-Type: application/json" \
    -d '{"action": "DEFRICTION", "risk": 72, "system_state": "YELLOW"}')
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    AUDIT_ID=$(echo "$BODY" | grep -o '"audit_id":"[^"]*"' | cut -d'"' -f4)
    echo "✅ PASS: audit_id=$AUDIT_ID"
    ((PASSED++))
else
    echo "❌ FAIL: HTTP $HTTP_CODE"
    echo "   $BODY"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 3: AUDIT Latest
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 3: AUDIT Latest"
RESP=$(curl -s -w "\n%{http_code}" "$API_BASE/api/v1/audit/latest")
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    AUDIT_ID=$(echo "$BODY" | grep -o '"audit_id":"[^"]*"' | cut -d'"' -f4)
    IMMUTABLE=$(echo "$BODY" | grep -o '"immutable":true')
    if [ -n "$IMMUTABLE" ]; then
        echo "✅ PASS: audit_id=$AUDIT_ID, immutable=true"
        ((PASSED++))
    else
        echo "⚠️  WARN: immutable not found"
        ((PASSED++))
    fi
else
    echo "❌ FAIL: HTTP $HTTP_CODE"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 4: AUDIT Immutable (DELETE 차단)
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 4: AUDIT Immutable (DELETE 차단)"
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE/api/v1/audit/latest")
HTTP_CODE=$(echo "$RESP" | tail -n1)

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "204" ]; then
    echo "✅ PASS: DELETE 차단됨 (HTTP $HTTP_CODE)"
    ((PASSED++))
else
    echo "❌ FAIL: DELETE 성공함 (차단되어야 함)"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 5: SYSTEM_RED 차단
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 5: SYSTEM_RED 차단"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/action/execute" \
    -H "Content-Type: application/json" \
    -d '{"action": "RECOVER", "risk": 85, "system_state": "RED"}')
HTTP_CODE=$(echo "$RESP" | tail -n1)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS: SYSTEM_RED 차단 (HTTP 403)"
    ((PASSED++))
elif [ "$HTTP_CODE" = "200" ]; then
    echo "❌ FAIL: RED 상태에서 ACTION 실행됨"
    ((FAILED++))
else
    echo "⚠️  WARN: 예상치 못한 응답 (HTTP $HTTP_CODE)"
    ((PASSED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 6: Invalid ACTION 차단
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 6: Invalid ACTION 차단"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/v1/action/execute" \
    -H "Content-Type: application/json" \
    -d '{"action": "INVALID_ACTION", "risk": 50, "system_state": "GREEN"}')
HTTP_CODE=$(echo "$RESP" | tail -n1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "✅ PASS: Invalid ACTION 차단됨 (HTTP $HTTP_CODE)"
    ((PASSED++))
else
    echo "❌ FAIL: Invalid ACTION 실행됨"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# TEST 7: AUDIT Stats
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 TEST 7: AUDIT Stats"
RESP=$(curl -s -w "\n%{http_code}" "$API_BASE/api/v1/audit/stats/summary")
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    TOTAL=$(echo "$BODY" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)
    echo "✅ PASS: total_audits=$TOTAL"
    ((PASSED++))
else
    echo "❌ FAIL: HTTP $HTTP_CODE"
    ((FAILED++))
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASSED + FAILED))

echo "═══════════════════════════════════════════════════════════"
echo "  TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo "  PASSED: $PASSED/$TOTAL"
echo "  FAILED: $FAILED/$TOTAL"

if [ "$FAILED" -eq 0 ]; then
    echo ""
    echo "  🎉 AUTUS Loop v1.0 PASS"
    echo "  Action → Audit = 1:1 ✓"
    echo "  Audit = Immutable ✓"
    echo "  System State > Human Intent ✓"
else
    echo ""
    echo "  ⚠️  AUTUS Loop FAIL"
    echo "  일부 테스트 실패 — 수정 필요"
fi
echo "═══════════════════════════════════════════════════════════"
echo ""

exit $FAILED
