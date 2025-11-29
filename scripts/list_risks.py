import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from packs.security.enforcer import enforcer

if __name__ == "__main__":
    print(f"Total risks: {len(enforcer.risks)}")
    for i, risk in enumerate(enforcer.risks, 1):
        print(f"{i:2d}. {risk.name} [{risk.category.value} | {risk.severity.value}]")
