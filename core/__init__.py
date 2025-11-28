"""
AUTUS Core - Minimal Engine (Article IV)

Core modules moved to packs/ for extensibility:
- core.armp -> packs.security
- core.learning -> packs.ai
- core.connector -> packs.integration
- core.utils -> packs.utils
"""

# 호환성: 기존 import 유지
import sys
from pathlib import Path

# packs를 모듈 경로에 추가
packs_path = Path(__file__).parent.parent / "packs"
if str(packs_path) not in sys.path:
    sys.path.insert(0, str(packs_path))

# 기존 경로 호환성
try:
    from packs import security as armp
    sys.modules['core.armp'] = armp
except ImportError:
    pass
