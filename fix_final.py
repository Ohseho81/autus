#!/usr/bin/env python3
"""최종 수정 스크립트"""

import re
from pathlib import Path

def fix_final_issues():
    print("🔧 최종 문제 수정 중...")
    
    # 1. PER Loop 구문 오류 수정
    per_loop_file = Path("core/engine/per_loop.py")
    if per_loop_file.exists():
        with open(per_loop_file, 'r') as f:
            lines = f.readlines()
        
        # line 231 근처의 구문 오류 수정
        for i, line in enumerate(lines):
            # 잘못된 구문: max_cycles=3: str
            if "max_cycles=3: str" in line:
                lines[i] = line.replace("max_cycles=3: str", "max_cycles: int = 3")
                print(f"✅ Line {i+1}: PER Loop 구문 오류 수정")
            # 또는 이런 형태일 수도
            elif "def run(self, goal, max_cycles=3" in line and ": str)" in line:
                lines[i] = line.replace("max_cycles=3: str)", "max_cycles: int = 3)")
                print(f"✅ Line {i+1}: PER Loop 파라미터 수정")
        
        with open(per_loop_file, 'w') as f:
            f.writelines(lines)
    
    # 2. IdentityCore 수정 - encode 오류
    identity_file = Path("protocols/identity/core.py")
    if identity_file.exists():
        with open(identity_file, 'r') as f:
            content = f.read()
        
        # seed가 이미 bytes인 경우 encode 하지 않도록
        fixed_content = '''"""Identity Protocol Core"""
import secrets
import hashlib
from typing import Optional, Tuple

class IdentityCore:
    def __init__(self, seed: Optional[bytes] = None):
        """Initialize with optional seed"""
        if seed is None:
            self.seed = secrets.token_bytes(32)
        else:
            # seed가 str이면 encode, bytes면 그대로 사용
            if isinstance(seed, str):
                self.seed = seed.encode('utf-8')
            else:
                self.seed = seed
    
    def generate_core(self) -> Tuple[float, float, float]:
        """Generate 3D coordinates from seed"""
        # SHA256 hash
        hash_digest = hashlib.sha256(self.seed).digest()
        
        # Convert to coordinates
        x = int.from_bytes(hash_digest[0:4], 'big') / (2**32 - 1)
        y = int.from_bytes(hash_digest[4:8], 'big') / (2**32 - 1) 
        z = int.from_bytes(hash_digest[8:12], 'big') / (2**32 - 1)
        
        return (x, y, z)
    
    def export_for_sync(self) -> str:
        """Export for QR sync"""
        import base64
        return base64.b64encode(self.seed).decode('utf-8')
    
    @classmethod
    def import_from_sync(cls, sync_data: str):
        """Import from QR sync"""
        import base64
        seed = base64.b64decode(sync_data)
        return cls(seed)
'''
        
        with open(identity_file, 'w') as f:
            f.write(fixed_content)
        print("✅ IdentityCore encode 오류 수정")
    
    print("\n✅ 모든 문제 수정 완료!")

if __name__ == "__main__":
    fix_final_issues()
