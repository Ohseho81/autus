#!/usr/bin/env bash
set -e

# 0. 기준 경로 이동
cd "$(dirname "$0")/.."

TS="$(date '+%Y%m%d_%H%M%S')"
OUT="autus_diagnostics_${TS}.txt"

{
  echo "=== AUTUS DIAGNOSTICS :: ${TS} ==="
  echo

  # 1. Python / 패키지 버전
  echo "## 1. PYTHON & PACKAGES"
  python --version 2>&1 || echo "python not found"
  echo
  echo "# 주요 패키지 버전"
  pip list | grep -E 'fastapi|uvicorn|anthropic|openai|duckdb|pyzbar|pytest' || echo "(no matching packages)"
  echo

  # 2. Git 상태 (있을 때만)
  if [ -d .git ]; then
    echo "## 2. GIT STATUS"
    git status -sb || true
    echo
  fi

  # 3. 상위 폴더 구조
  echo "## 3. PROJECT DIR TREE (DEPTH 2)"
  find . -maxdepth 2 -type d | sort
  echo

  # 4. 핵심 설정 파일 스냅샷
  echo "## 4. KEY CONFIG FILE SNAPSHOT (상위 120줄)"
  for f in \
    AUTUS_PROJECT.yaml \
    CONSTITUTION.md \
    pyproject.toml \
    config.py \
    core/__init__.py \
    core/engine/__init__.py \
    core/engine/per_loop.py \
    core/cli.py \
    core/cli/commands/__init__.py \
    protocols/identity/core.py \
    protocols/memory/memory_os.py \
    protocols/workflow/graph.py \
    server/main.py
  do
    if [ -f "$f" ]; then
      echo "------------------------------"
      echo "# FILE: $f"
      echo "------------------------------"
      sed -n '1,120p' "$f"
      echo
    fi
  done
  echo

  # 5. Registry 상태
  echo "## 5. REGISTRY STATE"
  if [ -d core/registry ]; then
    for f in core/registry/*.json; do
      [ -f "$f" ] || continue
      echo "------------------------------"
      echo "# REGISTRY: $f"
      echo "------------------------------"
      cat "$f"
      echo
    done
  else
    echo "core/registry 디렉터리 없음"
  fi
  echo

  # 6. Pack / Router 목록
  echo "## 6. PACKS & ROUTES"
  echo "# packs/"
  if [ -d packs ]; then
    ls -1 packs
  else
    echo "packs 디렉터리 없음"
  fi
  echo
  echo "# server/routes/"
  if [ -d server/routes ]; then
    find server/routes -maxdepth 1 -type f -name '*.py' | sort
  else
    echo "server/routes 디렉터리 없음"
  fi
  echo

  # 7. AUTUS 3D / 웹 관련 파일 존재 여부
  echo "## 7. 3D / WEB SHELL FILES"
  ls -1 autus_3d_web.* 2>/dev/null || echo "autus_3d_web.* 없음 (추후 생성 대상)"
  echo

  # 8. 핵심 테스트 스모크 런
  echo "## 8. PYTEST SMOKE (핵심 파일 위주)"
  echo "# style_analyzer / identity / memory_store 단위 테스트"
  python -m pytest -q \
    tests/learning/test_style_analyzer.py \
    tests/protocols/identity/test_identity.py \
    tests/protocols/memory/test_memory_store.py \
    || echo "[WARN] 스모크 테스트 실패 (진행 중 기능이 있으면 정상)"
  echo

  # 9. Pack 라우터 스모크 테스트 (엔드포인트 존재 여부)
  echo "## 9. ENDPOINT SMOKE (404 여부만 확인)"
  if pgrep -f "uvicorn server.main:app" >/dev/null 2>&1; then
    echo "# uvicorn 이미 실행 중으로 가정, curl 스모크 실행"
    for ep in \
      "/pack/emo_cmms" \
      "/pack/jeju_school" \
      "/pack/nba_atb" \
      "/pack/local_memory" \
      "/pack/style_analyzer" \
      "/pack/zero_identity"
    do
      echo "### GET $ep"
      curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8000${ep}" || echo "curl 실패: $ep"
    done
  else
    echo "uvicorn 서버 미실행 상태 (엔드포인트 스모크 생략)"
  fi
  echo

} | tee "$OUT"

echo
echo "=== AUTUS DIAGNOSTICS 완료 ==="
echo "리포트 파일: ${OUT}"
