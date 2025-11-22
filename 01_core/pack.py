"""
Pack 시스템
"""
import yaml
from pathlib import Path

def load_pack(pack_name: str):
    """Pack YAML 로드"""
    pack_path = Path(f"02_packs/{pack_name}.yaml")
    
    if not pack_path.exists():
        raise FileNotFoundError(f"Pack 없음: {pack_name}")
    
    with open(pack_path) as f:
        pack = yaml.safe_load(f)
    
    return pack

def list_packs():
    """사용 가능한 Pack 목록"""
    pack_dir = Path("02_packs")
    
    if not pack_dir.exists():
        return []
    
    packs = []
    for pack_file in pack_dir.glob("*.yaml"):
        try:
            with open(pack_file) as f:
                pack = yaml.safe_load(f)
                packs.append({
                    "name": pack.get("pack_name"),
                    "version": pack.get("version"),
                    "description": pack.get("metadata", {}).get("description")
                })
        except:
            pass
    
    return packs

def get_cell_from_pack(pack_name: str, cell_name: str):
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
