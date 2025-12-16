#!/bin/bash
set -e

API=${1:-"https://solar.autus-ai.com"}

echo "=========================================="
echo "AUTUS v1.0 SMOKE TEST"
echo "Target: $API"
echo "=========================================="

echo ""
echo "1) Health:"
curl -sS -w " [%{http_code}]\n" "$API/health"

echo ""
echo "2) Status:"
curl -sS "$API/status" | head -c 100
echo ""

echo ""
echo "3) Solar Status:"
curl -sS "$API/autus/solar/status" | head -c 100
echo ""

echo ""
echo "4) Galaxy Status:"
curl -sS "$API/autus/galaxy/status" | head -c 100
echo ""

echo ""
echo "5) Routes:"
curl -sS "$API/routes" 2>/dev/null | python3 -m json.tool | head -50 || echo "Routes unavailable"

echo ""
echo "6) Determinism Test:"
curl -sX POST "$API/autus/solar/full-reset" > /dev/null
curl -sX POST "$API/autus/solar/pressure" > /dev/null
curl -sX POST "$API/autus/solar/pressure" > /dev/null
curl -sX POST "$API/autus/solar/decision" > /dev/null
curl -sS "$API/autus/solar/status"

echo ""
echo "=========================================="
echo "SMOKE TEST COMPLETE"
echo "=========================================="
