"""
Pack 시스템
"""
import yaml
from pathlib import Path

try:
    import sys
    from pathlib import Path
    ROOT = Path(__file__).resolve().parent.parent.parent
    sys.path.insert(0, str(ROOT))
    from config import (
        PACKS_DIR,
        PACKS_DEVELOPMENT_DIR,
        PACKS_EXAMPLES_DIR,
        PACKS_INTEGRATION_DIR,
        get_pack_path,
        list_pack_dirs
    )
except ImportError:
    # fallback
    PACKS_DIR = Path("packs")
    PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
    PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
    PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"

    def get_pack_path(pack_name: str, category: Optional[str] = None) -> Path:
        if category:
            return PACKS_DIR / category / f"{pack_name}.yaml"
        for cat_dir in [PACKS_DEVELOPMENT_DIR, PACKS_EXAMPLES_DIR, PACKS_INTEGRATION_DIR]:
            pack_path = cat_dir / f"{pack_name}.yaml"
            if pack_path.exists():
                return pack_path
        raise FileNotFoundError(f"Pack 없음: {pack_name}")

    def list_pack_dirs() -> List[Path]:
        return [PACKS_DEVELOPMENT_DIR, PACKS_EXAMPLES_DIR, PACKS_INTEGRATION_DIR]

def load_pack(pack_name: str, pack_dir: Optional[str] = None) -> Dict[str, Any]:
    """Pack YAML 로드"""
    try:
        pack_path = get_pack_path(pack_name, pack_dir)
    except FileNotFoundError:
        # 하위 호환성: 직접 경로 시도
        if pack_dir:
            pack_path = PACKS_DIR / pack_dir / f"{pack_name}.yaml"
        else:
            pack_path = PACKS_DIR / f"{pack_name}.yaml"

        if not pack_path.exists():
            raise FileNotFoundError(f"Pack 없음: {pack_name}")

    with open(pack_path, 'r', encoding='utf-8') as f:
        pack = yaml.safe_load(f)

    return pack

def list_packs() -> List[Dict[str, Any]]:
    """사용 가능한 Pack 목록"""

    packs = []

    # 루트 디렉토리 스캔
    if PACKS_DIR.exists():
        for pack_file in PACKS_DIR.glob("*.yaml"):
            try:
                with open(pack_file, 'r', encoding='utf-8') as f:
                    pack = yaml.safe_load(f)
                    if pack:
                        packs.append({
                            "name": pack.get("name") or pack.get("pack_name", pack_file.stem),
                            "version": pack.get("version", "1.0.0"),
                            "description": pack.get("metadata", {}).get("description", "No description")
                        })
            except Exception:
                pass

    # 하위 디렉토리 스캔
    for pack_subdir in list_pack_dirs():
        if pack_subdir.exists():
            for pack_file in pack_subdir.glob("*.yaml"):
                try:
                    with open(pack_file, 'r', encoding='utf-8') as f:
                        pack = yaml.safe_load(f)
                        if pack:
                            packs.append({
                                "name": pack.get("name") or pack.get("pack_name", pack_file.stem),
                                "version": pack.get("version", "1.0.0"),
                                "description": pack.get("metadata", {}).get("description", "No description")
                            })
                except Exception:
                    pass

    return packs

def get_cell_from_pack(pack_name: str, cell_name: str) -> Optional[Dict[str, Any]]:
    """Pack에서 특정 Cell 가져오기"""
    pack = load_pack(pack_name)
    cells = pack.get("cells", {})

    if cell_name not in cells:
        raise ValueError(f"Cell 없음: {cell_name}")

    cell = cells[cell_name]
    return cell.get("command")

# 테스트
if __name__ == "__main__":
    print("🧪 Pack 시스템 테스트\n")

    # Pack 목록
    packs = list_packs()
    print("사용 가능한 Packs:")
    for pack in packs:
        print(f"  - {pack['name']} v{pack['version']}")
        print(f"    {pack['description']}\n")

    # Cell 가져오기
    if packs:
        cmd = get_cell_from_pack("github_pack", "user_info")
        print(f"✅ Cell 명령어: {cmd}")
