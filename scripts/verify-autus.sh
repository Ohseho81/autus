#!/bin/bash
# ============================================================
#  🔍 AUTUS 6-Agent Environment Verifier
#
#  Usage:
#    bash verify-autus.sh
#    bash verify-autus.sh /path/to/project
# ============================================================

ROOT="${1:-.}"
cd "$ROOT" 2>/dev/null || { echo "❌ 경로 없음: $ROOT"; exit 1; }

PASS=0
FAIL=0
WARN=0

echo ""
echo "  ┌───────────────────────────────────────┐"
echo "  │  🔍 AUTUS Environment Verifier        │"
echo "  │  $(pwd)"
echo "  └───────────────────────────────────────┘"
echo ""

# ── 검증 함수 ──────────────────────────────────────────────

check_file() {
  local path="$1"
  local label="$2"
  local required_text="$3"

  if [ ! -f "$path" ]; then
    echo "  ❌ $label — 파일 없음: $path"
    FAIL=$((FAIL + 1))
    return 1
  fi

  local size
  size=$(wc -c < "$path" | tr -d ' ')
  if [ "$size" -lt 50 ]; then
    echo "  ⚠️  $label — 파일 너무 작음 (${size}B): $path"
    WARN=$((WARN + 1))
    return 1
  fi

  if [ -n "$required_text" ]; then
    if grep -q "$required_text" "$path" 2>/dev/null; then
      local lines
      lines=$(wc -l < "$path" | tr -d ' ')
      echo "  ✅ $label (${lines}줄, ${size}B)"
      PASS=$((PASS + 1))
      return 0
    else
      echo "  ⚠️  $label — 핵심 내용 누락: \"$required_text\""
      WARN=$((WARN + 1))
      return 1
    fi
  fi

  local lines
  lines=$(wc -l < "$path" | tr -d ' ')
  echo "  ✅ $label (${lines}줄, ${size}B)"
  PASS=$((PASS + 1))
  return 0
}

check_frontmatter() {
  local path="$1"
  local label="$2"

  if [ ! -f "$path" ]; then
    return 1
  fi

  local first_line
  first_line=$(head -1 "$path")
  if [ "$first_line" != "---" ]; then
    echo "      ⚠️  $label — YAML frontmatter 누락 (Cursor가 못 읽을 수 있음)"
    WARN=$((WARN + 1))
    return 1
  fi

  if ! grep -q "alwaysApply:" "$path" 2>/dev/null; then
    echo "      ⚠️  $label — alwaysApply 설정 없음"
    WARN=$((WARN + 1))
    return 1
  fi

  if ! grep -q "globs:" "$path" 2>/dev/null; then
    echo "      ⚠️  $label — globs 설정 없음"
    WARN=$((WARN + 1))
    return 1
  fi

  echo "      ✅ frontmatter 정상 (alwaysApply + globs)"
  return 0
}

check_command() {
  local path="$1"
  local label="$2"

  if [ ! -f "$path" ]; then
    return 1
  fi

  if ! grep -q '\$ARGUMENTS\|Instructions\|Check all\|Generate completion' "$path" 2>/dev/null; then
    echo "      ⚠️  $label — Claude Code 명령어 형식 아닐 수 있음"
    WARN=$((WARN + 1))
    return 1
  fi

  echo "      ✅ 명령어 형식 정상"
  return 0
}

# ── 1. 폴더 구조 ──────────────────────────────────────────

echo "━━ 폴더 구조 ━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d ".cursor/rules" ]; then
  echo "  ✅ .cursor/rules/"
  PASS=$((PASS + 1))
else
  echo "  ❌ .cursor/rules/ — 폴더 없음"
  FAIL=$((FAIL + 1))
fi

if [ -d ".claude/commands" ]; then
  echo "  ✅ .claude/commands/"
  PASS=$((PASS + 1))
else
  echo "  ❌ .claude/commands/ — 폴더 없음"
  FAIL=$((FAIL + 1))
fi

# ── 2. 핵심 파일: CLAUDE.md ───────────────────────────────

echo ""
echo "━━ ① CLAUDE.md (라우팅 헌법) ━━━━━━━━━━"
check_file "CLAUDE.md" "CLAUDE.md" "6-Agent"

if [ -f "CLAUDE.md" ]; then
  # 핵심 섹션 존재 확인
  missing_sections=0
  for section in "Task Router" "Agent Specs" "Routing Table" "Chain Rules" "V-Index" "Critical Rules"; do
    if ! grep -q "$section" "CLAUDE.md" 2>/dev/null; then
      echo "      ⚠️  섹션 누락: $section"
      missing_sections=$((missing_sections + 1))
    fi
  done
  if [ "$missing_sections" -eq 0 ]; then
    echo "      ✅ 6개 핵심 섹션 모두 존재"
  fi

  # 6 에이전트 정의 확인
  agent_count=0
  for agent in "몰트봇" "Claude Code" "Cowork" "Chrome" "claude.ai" "Connectors"; do
    if grep -q "$agent" "CLAUDE.md" 2>/dev/null; then
      agent_count=$((agent_count + 1))
    fi
  done
  if [ "$agent_count" -eq 6 ]; then
    echo "      ✅ 6개 에이전트 모두 정의됨"
  else
    echo "      ⚠️  에이전트 ${agent_count}/6만 정의됨"
    WARN=$((WARN + 1))
  fi
fi

# ── 3. Cursor Rules ───────────────────────────────────────

echo ""
echo "━━ ②~⑤ Cursor Rules ━━━━━━━━━━━━━━━━━━"
check_file ".cursor/rules/task-router.mdc" "② task-router.mdc" "Signal"
check_frontmatter ".cursor/rules/task-router.mdc" "task-router"

check_file ".cursor/rules/code-style.mdc" "③ code-style.mdc" "strict"
check_frontmatter ".cursor/rules/code-style.mdc" "code-style"

check_file ".cursor/rules/git-deploy.mdc" "④ git-deploy.mdc" "Branch"
check_frontmatter ".cursor/rules/git-deploy.mdc" "git-deploy"

check_file ".cursor/rules/autus-physics.mdc" "⑤ autus-physics.mdc" "V-Index"
check_frontmatter ".cursor/rules/autus-physics.mdc" "autus-physics"

# ── 4. Claude Code Commands ───────────────────────────────

echo ""
echo "━━ ⑥~⑩ Claude Code Commands ━━━━━━━━━━"
check_file ".claude/commands/route.md" "⑥ route.md" "ARGUMENTS"
check_command ".claude/commands/route.md" "route"

check_file ".claude/commands/deploy.md" "⑦ deploy.md" "Deploy"
check_command ".claude/commands/deploy.md" "deploy"

check_file ".claude/commands/status.md" "⑧ status.md" "Status"
check_command ".claude/commands/status.md" "status"

check_file ".claude/commands/agent.md" "⑨ agent.md" "Agent"
check_command ".claude/commands/agent.md" "agent"

check_file ".claude/commands/chain.md" "⑩ chain.md" "Task Complete"
check_command ".claude/commands/chain.md" "chain"

# ── 5. 추가 환경 체크 ────────────────────────────────────

echo ""
echo "━━ 개발 환경 ━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Git
if [ -d ".git" ]; then
  branch=$(git branch --show-current 2>/dev/null)
  echo "  ✅ Git: $branch"
else
  echo "  ⬚  Git: 초기화 안 됨 (선택)"
fi

# Node
if command -v node &>/dev/null; then
  echo "  ✅ Node: $(node -v 2>/dev/null)"
else
  echo "  ⬚  Node: 미설치 (선택)"
fi

# Vercel CLI
if command -v vercel &>/dev/null; then
  echo "  ✅ Vercel CLI: 설치됨"
else
  echo "  ⬚  Vercel CLI: 미설치 → npm i -g vercel"
fi

# Railway CLI
if command -v railway &>/dev/null; then
  echo "  ✅ Railway CLI: 설치됨"
else
  echo "  ⬚  Railway CLI: 미설치 → npm i -g @railway/cli"
fi

# Claude Code
if command -v claude &>/dev/null; then
  echo "  ✅ Claude Code: 설치됨"
else
  echo "  ⬚  Claude Code: 미설치 → npm i -g @anthropic-ai/claude-code"
fi

# .env
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo "  ✅ .env: 존재"
else
  echo "  ⬚  .env: 없음 (선택)"
fi

# ── 결과 ──────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL=$((PASS + FAIL + WARN))

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  echo ""
  echo "  🎉 완벽! $PASS/$TOTAL 항목 통과"
  echo ""
  echo "  다음 단계:"
  echo "    1. Cursor 열기"
  echo "    2. Claude Code 패널 열기 (Cmd+Shift+P → Claude Code)"
  echo "    3. /route \"첫 번째 작업\" 입력"
  echo ""
  exit 0
elif [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "  ⚠️  $PASS 통과 / $WARN 경고 / $FAIL 실패"
  echo "  경고 항목은 동작에 큰 문제 없음. 권장 수정사항 확인."
  echo ""
  exit 0
else
  echo ""
  echo "  ❌ $PASS 통과 / $WARN 경고 / $FAIL 실패"
  echo ""
  echo "  수정 방법:"
  echo "    bash install-autus.sh $(pwd)"
  echo "  (설치 스크립트 재실행으로 누락 파일 복구)"
  echo ""
  exit 1
fi
