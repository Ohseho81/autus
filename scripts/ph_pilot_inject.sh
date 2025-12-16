#!/bin/bash
set -e
BASE="https://solar.autus-ai.com"

echo "=== 필리핀 10명 파일럿 이벤트 주입 ==="

echo "1) 10명 압력 주입 (ADD_WORK x3)"
for i in $(seq -w 1 10); do
  curl -sX POST "$BASE/event/add_work" -H "Content-Type: application/json" -d "{\"count\":3,\"weight\":1.0,\"actor_id\":\"PH_PILOT_$i\"}" > /dev/null
  echo "  PH_PILOT_$i: +3 work"
done

sleep 2

echo ""
echo "2) 상태 확인 (압력 누적 후):"
curl -sS "$BASE/autus/solar/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'tick={d[\"tick\"]} P={d[\"signals\"][\"pressure\"]:.2f} R={d[\"signals\"][\"release\"]:.2f} E={d[\"signals\"][\"entropy\"]:.3f} status={d[\"output\"][\"status\"]} bottleneck={d[\"output\"][\"bottleneck\"]} fail_in={d[\"output\"][\"failure_in_ticks\"]}')"

echo ""
echo "3) 추가 압력 주입 (5명 x4)"
for i in $(seq -w 1 5); do
  curl -sX POST "$BASE/event/add_work" -H "Content-Type: application/json" -d "{\"count\":4,\"weight\":1.0,\"actor_id\":\"PH_PILOT_$i\"}" > /dev/null
done

sleep 2

echo ""
echo "4) 상태 확인 (RED 예상):"
curl -sS "$BASE/autus/solar/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'tick={d[\"tick\"]} P={d[\"signals\"][\"pressure\"]:.2f} E={d[\"signals\"][\"entropy\"]:.3f} status={d[\"output\"][\"status\"]} bottleneck={d[\"output\"][\"bottleneck\"]} fail_in={d[\"output\"][\"failure_in_ticks\"]}')"

echo ""
echo "5) EXECUTE 개입 (AUTO_STABILIZE):"
curl -sX POST "$BASE/execute" -H "Content-Type: application/json" -d '{"action":"AUTO_STABILIZE","actor_id":"OPS"}'

echo ""
echo ""
echo "6) 최종 상태 (회복 확인):"
curl -sS "$BASE/autus/solar/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'tick={d[\"tick\"]} P={d[\"signals\"][\"pressure\"]:.2f} R={d[\"signals\"][\"release\"]:.2f} E={d[\"signals\"][\"entropy\"]:.3f} status={d[\"output\"][\"status\"]} bottleneck={d[\"output\"][\"bottleneck\"]}')"

echo ""
echo "=== 파일럿 완료 ==="
