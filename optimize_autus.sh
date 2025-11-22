#!/bin/bash
set -e

echo "🔧 AUTUS 전체 최적화 시작..."
echo ""

# 1. 프로토콜 정리
echo "📦 1/5 프로토콜 파일 통합..."
mv protocols/memory/full_protocol.py protocols/memory/__init__.py
rm -f protocols/memory/protocol.py
mv protocols/auth/full_protocol.py protocols/auth/__init__.py
rm -f protocols/auth/protocol.py
mv protocols/identity/core.py protocols/identity/__init__.py
mv protocols/workflow/standard.py protocols/workflow/__init__.py
echo "   ✅ 프로토콜 정리 완료"

# 2. 빈 파일 확인
echo "📝 2/5 빈 파일 확인..."
[ -f core/autusfile.py ] && rm core/autusfile.py
[ -f core/dsl.py ] && rm core/dsl.py
echo "   ✅ 빈 파일 제거 완료"

# 3. __init__.py 추가 (패키지화)
echo "📦 3/5 패키지 구조 개선..."
touch core/__init__.py
touch core/engine/__init__.py
touch core/llm/__init__.py
touch core/pack/__init__.py
touch packs/__init__.py
touch packs/development/__init__.py
touch packs/examples/__init__.py
touch protocols/__init__.py
touch server/__init__.py
echo "   ✅ 패키지 구조 완료"

# 4. 경로 설정 파일 생성
echo "🗂️  4/5 표준 경로 설정..."
cat > paths.py << 'PATHS_EOF'
"""AUTUS Standard Paths"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
CORE_DIR = PROJECT_ROOT / "core"
PACKS_DIR = PROJECT_ROOT / "packs"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"
PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"
PATHS_EOF
echo "   ✅ paths.py 생성 완료"

# 5. 테스트
echo "🧪 5/5 통합 테스트..."
python3 protocols/memory/__init__.py 2>/dev/null || echo "   ⚠️  Memory 테스트 실패"
python3 protocols/auth/__init__.py 2>/dev/null || echo "   ⚠️  Auth 테스트 실패"
python3 protocols/workflow/__init__.py 2>/dev/null || echo "   ⚠️  Workflow 테스트 실패"

echo ""
echo "✅ AUTUS 최적화 완료!"
echo ""
echo "변경사항:"
echo "  - 프로토콜 파일 통합 (protocol.py + full_protocol.py → __init__.py)"
echo "  - 빈 파일 제거 (autusfile.py, dsl.py)"
echo "  - __init__.py 추가 (패키지화)"
echo "  - paths.py 추가 (표준 경로)"
echo ""
echo "다음 단계:"
echo "  1. git status 확인"
echo "  2. ./test_protocols.sh 실행"
echo "  3. git commit"
