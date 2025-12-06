import sys
from pathlib import Path

# 루트 경로 추가
root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

# src 경로 추가
sys.path.insert(0, str(root / "src"))
