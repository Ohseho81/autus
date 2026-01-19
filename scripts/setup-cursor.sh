#!/bin/bash
# ============================================
# AUTUS MCP 서버 설치 스크립트
# ============================================

set -e

echo "🚀 AUTUS MCP 서버 설치 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 1. Node.js 버전 확인
echo -e "${CYAN}1. Node.js 버전 확인...${NC}"
node_version=$(node -v 2>/dev/null || echo "not installed")
if [ "$node_version" = "not installed" ]; then
    echo "❌ Node.js가 설치되어 있지 않습니다. 먼저 Node.js를 설치해주세요."
    exit 1
fi
echo "✅ Node.js $node_version"
echo ""

# 2. MCP 서버 설치
echo -e "${CYAN}2. MCP 서버 패키지 설치...${NC}"

packages=(
    "@modelcontextprotocol/server-filesystem"
    "@modelcontextprotocol/server-github"
    "@modelcontextprotocol/server-postgres"
    "@modelcontextprotocol/server-fetch"
    "@modelcontextprotocol/server-memory"
    "@modelcontextprotocol/server-sequential-thinking"
    "@modelcontextprotocol/server-brave-search"
    "@modelcontextprotocol/server-puppeteer"
    "@modelcontextprotocol/server-time"
    "mcp-server-supabase"
    "mcp-server-vercel"
    "@modelcontextprotocol/server-slack"
)

for package in "${packages[@]}"; do
    echo -e "${YELLOW}Installing $package...${NC}"
    npm install -g "$package" 2>/dev/null || echo "⚠️ $package 설치 실패 (나중에 npx로 실행됨)"
done

echo ""
echo -e "${GREEN}✅ MCP 서버 설치 완료!${NC}"
echo ""

# 3. .cursor 폴더 확인
echo -e "${CYAN}3. .cursor/mcp.json 설정 확인...${NC}"
if [ -f ".cursor/mcp.json" ]; then
    echo "✅ .cursor/mcp.json 파일이 존재합니다."
else
    echo "⚠️ .cursor/mcp.json 파일이 없습니다. 생성해주세요."
fi
echo ""

# 4. 환경 변수 안내
echo -e "${CYAN}4. 환경 변수 설정 필요:${NC}"
echo ""
echo "  📌 .cursor/mcp.json 파일에서 다음 값들을 실제 값으로 변경하세요:"
echo ""
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - POSTGRES_CONNECTION_STRING (비밀번호 포함)"
echo "  - GITHUB_PERSONAL_ACCESS_TOKEN"
echo "  - SLACK_BOT_TOKEN"
echo "  - SLACK_TEAM_ID"
echo "  - VERCEL_TOKEN"
echo "  - BRAVE_API_KEY (선택)"
echo ""

# 5. Claude Code 설치 안내
echo -e "${CYAN}5. Claude Code CLI 설치 (선택):${NC}"
echo ""
echo "  npm install -g @anthropic-ai/claude-code"
echo ""

# 6. 완료 메시지
echo "============================================"
echo -e "${GREEN}🎉 설치 완료!${NC}"
echo "============================================"
echo ""
echo "다음 단계:"
echo "  1. .cursor/mcp.json의 API 키들을 실제 값으로 변경"
echo "  2. Cursor 재시작"
echo "  3. Cursor에서 MCP 서버 연결 확인"
echo ""
echo "사용 예시:"
echo "  - \"students 테이블 조회해줘\"          → Supabase MCP"
echo "  - \"새 이슈 만들어줘: 버그 수정\"       → GitHub MCP"
echo "  - \"배포 상태 확인해줘\"                → Vercel MCP"
echo ""
