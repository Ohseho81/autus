"""
AUTUS Health Loop
자동 점검 → 문제 발견 → 자동 수정 → 재점검
"""

import os
import json
import requests
import subprocess
from pathlib import Path
from datetime import datetime

API_URL = "http://127.0.0.1:8003"

class HealthLoop:
    def __init__(self):
        self.issues = []
        self.fixes = []
        
    def check_api_health(self):
        """API 서버 상태 점검"""
        print("\n🔍 1. API Health Check...")
        try:
            r = requests.get(f"{API_URL}/health", timeout=5)
            if r.status_code == 200:
                print("   ✅ API Server OK")
                return True
            else:
                self.issues.append("API server returned non-200")
                return False
        except:
            self.issues.append("API server not running")
            print("   ❌ API Server DOWN")
            return False
    
    def check_packs(self):
        """Pack 시스템 점검"""
        print("\n🔍 2. Pack System Check...")
        try:
            r = requests.get(f"{API_URL}/packs/list", timeout=5)
            data = r.json()
            count = data.get('count', 0)
            
            if count >= 2:
                print(f"   ✅ Packs OK: {count} packs")
                return True
            else:
                self.issues.append(f"Only {count} packs found")
                return False
        except Exception as e:
            self.issues.append(f"Pack check failed: {e}")
            return False
    
    def check_evolved_files(self):
        """Evolved 파일 크기 점검"""
        print("\n🔍 3. Evolved Files Check...")
        evolved_dir = Path("evolved")
        
        if not evolved_dir.exists():
            self.issues.append("evolved/ directory missing")
            return False
        
        small_files = []
        for f in evolved_dir.glob("*.py"):
            size = f.stat().st_size
            if size < 100:
                small_files.append((f.name, size))
        
        if small_files:
            print(f"   ⚠️ Small files found: {small_files}")
            self.issues.append(f"Small evolved files: {small_files}")
            return False
        else:
            print("   ✅ Evolved files OK")
            return True
    
    def check_auto_generated(self):
        """Auto-generated 폴더 점검"""
        print("\n🔍 4. Auto-Generated Check...")
        auto_dir = Path("auto_generated")
        
        if not auto_dir.exists():
            self.issues.append("auto_generated/ missing")
            return False
        
        folders = list(auto_dir.iterdir())
        if len(folders) >= 7:
            print(f"   ✅ Auto-Generated OK: {len(folders)} features")
            return True
        else:
            self.issues.append(f"Only {len(folders)} auto-generated features")
            return False
    
    def check_git_status(self):
        """Git 상태 점검"""
        print("\n🔍 5. Git Status Check...")
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True
        )
        
        uncommitted = result.stdout.strip()
        if uncommitted:
            print(f"   ⚠️ Uncommitted changes: {len(uncommitted.splitlines())} files")
            self.issues.append("Uncommitted changes exist")
            return False
        else:
            print("   ✅ Git Clean")
            return True
    
    def fix_small_evolved_files(self):
        """작은 evolved 파일 재생성"""
        print("\n🔧 Fixing small evolved files...")
        
        try:
            # Evolution Orchestrator로 재생성
            result = subprocess.run(
                ["python", "evolution_orchestrator.py", 
                 "specs/reality_stream_minimal.yaml", "--force"],
                capture_output=True, text=True, timeout=120
            )
            
            if "Evolution completed" in result.stdout:
                print("   ✅ Evolved files regenerated")
                self.fixes.append("Regenerated evolved files")
                return True
        except Exception as e:
            print(f"   ❌ Fix failed: {e}")
        
        return False
    
    def fix_uncommitted(self):
        """커밋되지 않은 변경사항 커밋"""
        print("\n🔧 Committing changes...")
        
        try:
            subprocess.run(["git", "add", "-A"], check=True)
            subprocess.run(
                ["git", "commit", "-m", "fix(health-loop): auto-commit uncommitted changes"],
                check=True
            )
            print("   ✅ Changes committed")
            self.fixes.append("Auto-committed changes")
            return True
        except:
            print("   ⚠️ Nothing to commit")
            return False
    
    def run_loop(self, max_iterations=3):
        """메인 점검 + 수정 루프"""
        print("\n" + "="*60)
        print("🔄 AUTUS Health Loop Started")
        print("="*60)
        
        for i in range(max_iterations):
            print(f"\n--- Iteration {i+1}/{max_iterations} ---")
            self.issues = []
            
            # 점검
            checks = [
                self.check_api_health(),
                self.check_packs(),
                self.check_evolved_files(),
                self.check_auto_generated(),
                self.check_git_status()
            ]
            
            # 모든 점검 통과?
            if all(checks):
                print("\n" + "="*60)
                print("✅ All checks passed!")
                print("="*60)
                return True
            
            # 문제 발견 → 자동 수정 시도
            print(f"\n⚠️ Issues found: {len(self.issues)}")
            
            if "Small evolved files" in str(self.issues):
                self.fix_small_evolved_files()
            
            if "Uncommitted changes" in str(self.issues):
                self.fix_uncommitted()
        
        # 최종 보고
        print("\n" + "="*60)
        print("📊 Health Loop Summary")
        print("="*60)
        print(f"Issues remaining: {self.issues}")
        print(f"Fixes applied: {self.fixes}")
        
        return len(self.issues) == 0


def main():
    loop = HealthLoop()
    success = loop.run_loop(max_iterations=3)
    
    if success:
        print("\n🎉 AUTUS is healthy!")
    else:
        print("\n⚠️ Some issues need manual review")


if __name__ == "__main__":
    main()
