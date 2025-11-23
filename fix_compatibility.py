#!/usr/bin/env python3
"""AUTUS 호환성 수정 스크립트"""

import os
from pathlib import Path

def fix_all():
    print("🔧 AUTUS 호환성 문제 수정 중...")
    
    # 1. PER Loop 수정 - max_cycles 파라미터 추가
    per_loop_file = Path("core/engine/per_loop.py")
    if per_loop_file.exists():
        with open(per_loop_file, 'r') as f:
            content = f.read()
        
        # run 메서드에 max_cycles 파라미터가 없으면 추가
        if "def run(self" in content and "max_cycles" not in content:
            content = content.replace(
                "def run(self, goal",
                "def run(self, goal, max_cycles=3"
            )
            with open(per_loop_file, 'w') as f:
                f.write(content)
            print("✅ PER Loop max_cycles 파라미터 추가")
    
    # 2. PackLoader 클래스 확인 및 수정
    loader_file = Path("core/pack/loader.py")
    if loader_file.exists():
        with open(loader_file, 'r') as f:
            content = f.read()
        
        # PackManager를 PackLoader로 변경
        if "PackManager" in content:
            content = content.replace("PackManager", "PackLoader")
            with open(loader_file, 'w') as f:
                f.write(content)
            print("✅ PackManager → PackLoader 변경")
        
        # 클래스가 아예 없으면 기본 구조 추가
        if "class " not in content:
            basic_loader = '''"""Pack Loader Module"""
import os
import yaml
from pathlib import Path
from typing import Dict, List, Any

class PackLoader:
    def __init__(self):
        self.packs_dir = Path(__file__).parent.parent.parent / 'packs'
    
    def list_packs(self) -> List[Dict]:
        """List all available packs"""
        packs = []
        if self.packs_dir.exists():
            for pack_file in self.packs_dir.rglob('*.yaml'):
                packs.append({
                    'name': pack_file.stem,
                    'path': str(pack_file)
                })
        return packs
    
    def load_pack(self, name: str) -> Dict:
        """Load a pack by name"""
        pack_file = self.packs_dir / f"{name}.yaml"
        if not pack_file.exists():
            pack_file = list(self.packs_dir.rglob(f"{name}.yaml"))
            if pack_file:
                pack_file = pack_file[0]
            else:
                raise FileNotFoundError(f"Pack {name} not found")
        
        with open(pack_file, 'r') as f:
            return yaml.safe_load(f)
'''
            with open(loader_file, 'w') as f:
                f.write(basic_loader)
            print("✅ PackLoader 기본 구조 생성")
    
    # 3. IdentityCore 수정 - seed를 optional로
    identity_file = Path("protocols/identity/core.py")
    if identity_file.exists():
        with open(identity_file, 'r') as f:
            content = f.read()
        
        # __init__ 메서드 수정
        if "def __init__(self, seed)" in content:
            content = content.replace(
                "def __init__(self, seed)",
                "def __init__(self, seed=None)"
            )
            # seed 생성 로직 추가
            if "self.seed = seed" in content:
                content = content.replace(
                    "self.seed = seed",
                    """if seed is None:
        import secrets
        self.seed = secrets.token_bytes(32)
    else:
        self.seed = seed"""
            )
            with open(identity_file, 'w') as f:
                f.write(content)
            print("✅ IdentityCore seed 파라미터 optional로 변경")
    
    print("\n✅ 모든 호환성 문제 수정 완료!")

if __name__ == "__main__":
    fix_all()
