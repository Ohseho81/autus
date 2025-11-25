#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
echo "🔍 AUTUS structure & endpoint inspection"
echo "   Root: $ROOT"
echo
EXIT_CODE=0
echo "1) Required directories"
for d in core protocols packs server server/routes docs docs/cells docs/packs scripts tests; do
  if [[ -d "$d" ]]; then
    printf "   [OK]   %s\n" "$d"
  else
    printf "   [MISS] %s\n" "$d"
    EXIT_CODE=1
  fi
done
echo
echo "2) Required core files"
for f in config.py standard.py pyproject.toml server/main.py; do
  if [[ -f "$f" ]]; then
    printf "   [OK]   %s\n" "$f"
  else
    printf "   [MISS] %s\n" "$f"
    EXIT_CODE=1
  fi
done
echo
echo "3) Core packs (autogen + routes)"
pairs=(
  "packs/emo_cmms_autogen.py server/routes/emo_cmms.py"
  "packs/jeju_school_autogen.py server/routes/jeju_school.py"
  "packs/nba_atb_autogen.py server/routes/nba_atb.py"
  "packs/local_memory_autogen.py server/routes/local_memory.py"
  "packs/style_analyzer_autogen.py server/routes/style_analyzer.py"
  "packs/zero_identity_autogen.py server/routes/zero_identity.py"
  "packs/autogen_cells_autogen.py server/routes/autogen_cells.py"
  "packs/pack_factory_autogen.py server/routes/pack_factory.py"
  "packs/meta_tester_autogen.py server/routes/meta_tester.py"
)
for pair in "${pairs[@]}"; do
  set -- $pair
  P="$1"
  R="$2"
  if [[ -f "$P" ]] && [[ -f "$R" ]]; then
    printf "   [OK]   %s / %s\n" "$P" "$R"
  else
    printf "   [MISS] %s / %s\n" "$P" "$R"
    EXIT_CODE=1
  fi
done
echo
echo "4) HTTP endpoint check (requires uvicorn running on 127.0.0.1:8000)"
endpoints=(
  "/pack/emo_cmms"
  "/pack/jeju_school"
  "/pack/nba_atb"
  "/pack/local_memory"
  "/pack/style_analyzer"
  "/pack/zero_identity"
  "/pack/autogen_cells"
  "/pack/pack_factory"
  "/pack/meta_tester"
)
for EP in "${endpoints[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://127.0.0.1:8000${EP}" \
    -H "Content-Type: application/json" \
    -d '{"ping":"pong"}' || echo "000")
  if [[ "$CODE" == "200" ]]; then
    printf "   [OK]   POST %s -> %s\n" "$EP" "$CODE"
  else
    printf "   [FAIL] POST %s -> %s\n" "$EP" "$CODE"
  fi
done
echo
echo "5) Summary"
if [[ "$EXIT_CODE" -eq 0 ]]; then
  echo "   ✅ Structure OK (required dirs/files/packs/routes all present)"
else
  echo "   ⚠️  Some required dirs/files/packs/routes are missing. See [MISS] items above."
fi
exit "$EXIT_CODE"
