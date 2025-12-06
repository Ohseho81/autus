#!/usr/bin/env python3
"""
AUTUS Continuous Loop
Self-healing, self-evolving autonomous system

Usage:
    python continuous_loop.py           # Run forever (5 min intervals)
    python continuous_loop.py --once    # Run once and exit
    python continuous_loop.py --interval 60  # Custom interval (seconds)
"""

import os
import sys
import time
import json
import yaml
import subprocess
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import requests
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests


class ContinuousLoop:
    """
    AUTUS Self-Healing & Self-Evolving Loop
    
    Cycle:
    1. Check Health → 2. Auto-Fix → 3. Check Backlog → 4. Evolve → 5. Wait → Repeat
    """
    
    def __init__(self, api_base: str = "http://127.0.0.1:8003"):
        self.api_base = api_base
        self.project_root = Path(__file__).parent
        self.backlog_path = self.project_root / "specs" / "backlog.yaml"
        self.log_file = self.project_root / "logs" / "continuous_loop.log"
        self.log_file.parent.mkdir(exist_ok=True)
        
        self.stats = {
            "cycles": 0,
            "issues_found": 0,
            "issues_fixed": 0,
            "evolutions_run": 0,
            "started_at": datetime.now().isoformat()
        }
    
    # ==========================================
    # 1. Health Check
    # ==========================================
    def check_health(self) -> List[Dict[str, Any]]:
        """
        Check system health and return list of issues.
        """
        issues = []
        
        self._log("🔍 Starting health check...")
        
        # Check 1: API Server
        api_issue = self._check_api()
        if api_issue:
            issues.append(api_issue)
        
        # Check 2: Pack Engine
        pack_issue = self._check_packs()
        if pack_issue:
            issues.append(pack_issue)
        
        # Check 3: Required Files
        file_issues = self._check_required_files()
        issues.extend(file_issues)
        
        # Check 4: Git Status
        git_issue = self._check_git()
        if git_issue:
            issues.append(git_issue)
        
        # Check 5: Dependencies
        dep_issues = self._check_dependencies()
        issues.extend(dep_issues)
        
        self.stats["issues_found"] += len(issues)
        
        if issues:
            self._log(f"⚠️ Found {len(issues)} issue(s)")
        else:
            self._log("✅ All systems healthy")
        
        return issues
    
    def _check_api(self) -> Optional[Dict[str, Any]]:
        """Check if API server is running."""
        try:
            resp = requests.get(f"{self.api_base}/health", timeout=5)
            if resp.status_code == 200:
                self._log("  ✓ API server healthy")
                return None
            return {"type": "api", "severity": "high", "message": f"API returned {resp.status_code}"}
        except requests.exceptions.ConnectionError:
            return {"type": "api", "severity": "high", "message": "API server not running"}
        except Exception as e:
            return {"type": "api", "severity": "medium", "message": str(e)}
    
    def _check_packs(self) -> Optional[Dict[str, Any]]:
        """Check if Pack Engine is functional."""
        try:
            resp = requests.get(f"{self.api_base}/packs/list", timeout=5)
            if resp.status_code == 200:
                packs = resp.json().get("packs", [])
                if len(packs) >= 2:  # architect_pack, codegen_pack
                    self._log(f"  ✓ Pack Engine healthy ({len(packs)} packs)")
                    return None
                return {"type": "packs", "severity": "medium", "message": f"Only {len(packs)} packs found"}
            return {"type": "packs", "severity": "medium", "message": "Pack API failed"}
        except:
            return {"type": "packs", "severity": "low", "message": "Could not check packs (API down?)"}
    
    def _check_required_files(self) -> List[Dict[str, Any]]:
        """Check required files exist."""
        issues = []
        required_files = [
            "main.py",
            "core/pack/runner.py",
            "protocols/auth/zero_auth.py",
            "protocols/memory/local_memory.py",
            "evolution_orchestrator.py"
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if not full_path.exists():
                issues.append({
                    "type": "file",
                    "severity": "high",
                    "message": f"Missing: {file_path}"
                })
        
        if not issues:
            self._log(f"  ✓ All required files present")
        
        return issues
    
    def _check_git(self) -> Optional[Dict[str, Any]]:
        """Check git status."""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            uncommitted = len([l for l in result.stdout.strip().split('\n') if l])
            if uncommitted > 20:
                return {
                    "type": "git",
                    "severity": "low",
                    "message": f"{uncommitted} uncommitted changes"
                }
            
            self._log(f"  ✓ Git status OK ({uncommitted} changes)")
            return None
        except:
            return {"type": "git", "severity": "low", "message": "Git check failed"}
    
    def _check_dependencies(self) -> List[Dict[str, Any]]:
        """Check Python dependencies."""
        issues = []
        required_packages = ["fastapi", "uvicorn", "pyyaml", "requests", "python-dotenv"]
        
        for pkg in required_packages:
            try:
                __import__(pkg.replace("-", "_"))
            except ImportError:
                issues.append({
                    "type": "dependency",
                    "severity": "medium",
                    "message": f"Missing package: {pkg}"
                })
        
        if not issues:
            self._log(f"  ✓ Dependencies OK")
        
        return issues
    
    # ==========================================
    # 2. Auto Fix
    # ==========================================
    def auto_fix(self, issues: List[Dict[str, Any]]) -> int:
        """
        Attempt to automatically fix issues.
        Returns number of issues fixed.
        """
        if not issues:
            return 0
        
        self._log(f"\n🔧 Attempting to fix {len(issues)} issue(s)...")
        fixed = 0
        
        for issue in issues:
            try:
                if issue["type"] == "api":
                    if self._fix_api():
                        fixed += 1
                elif issue["type"] == "dependency":
                    if self._fix_dependency(issue["message"]):
                        fixed += 1
                elif issue["type"] == "git":
                    if self._fix_git():
                        fixed += 1
                elif issue["type"] == "file":
                    self._log(f"  ⚠️ Cannot auto-fix missing file: {issue['message']}")
            except Exception as e:
                self._log(f"  ❌ Fix failed: {e}")
        
        self.stats["issues_fixed"] += fixed
        self._log(f"  Fixed {fixed}/{len(issues)} issues")
        
        return fixed
    
    def _fix_api(self) -> bool:
        """Try to start API server."""
        self._log("  → Attempting to start API server...")
        try:
            subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"],
                cwd=self.project_root,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(3)
            
            # Verify it started
            resp = requests.get(f"{self.api_base}/health", timeout=5)
            if resp.status_code == 200:
                self._log("  ✓ API server started")
                return True
        except:
            pass
        return False
    
    def _fix_dependency(self, message: str) -> bool:
        """Install missing dependency."""
        # Extract package name from message like "Missing package: xyz"
        if "Missing package:" in message:
            pkg = message.split("Missing package:")[-1].strip()
            self._log(f"  → Installing {pkg}...")
            try:
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", pkg],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                self._log(f"  ✓ Installed {pkg}")
                return True
            except:
                pass
        return False
    
    def _fix_git(self) -> bool:
        """Auto-commit changes."""
        try:
            subprocess.run(["git", "add", "-A"], cwd=self.project_root, capture_output=True)
            result = subprocess.run(
                ["git", "commit", "-m", "chore: auto-commit by continuous_loop"],
                cwd=self.project_root,
                capture_output=True
            )
            if result.returncode == 0:
                self._log("  ✓ Auto-committed changes")
                return True
        except:
            pass
        return False
    
    # ==========================================
    # 3. Check Backlog
    # ==========================================
    def check_backlog(self) -> Optional[str]:
        """
        Check backlog for pending features.
        Returns path to next spec file, or None.
        """
        self._log("\n📋 Checking backlog...")
        
        if not self.backlog_path.exists():
            self._log("  No backlog.yaml found")
            return None
        
        try:
            with open(self.backlog_path) as f:
                backlog = yaml.safe_load(f)
            
            features = backlog.get("features", [])
            pending = [f for f in features if f.get("status") == "pending"]
            
            if not pending:
                self._log("  No pending features")
                return None
            
            # Get highest priority pending feature
            pending.sort(key=lambda x: x.get("priority", 999))
            next_feature = pending[0]
            
            self._log(f"  Found pending: {next_feature.get('name')}")
            
            # Generate spec file
            spec_path = self._generate_spec(next_feature)
            return spec_path
            
        except Exception as e:
            self._log(f"  ❌ Backlog error: {e}")
            return None
    
    def _generate_spec(self, feature: Dict[str, Any]) -> str:
        """Generate spec file from backlog feature."""
        spec = {
            "name": feature.get("name", "Unknown"),
            "description": feature.get("description", ""),
            "layer": feature.get("layer", "3_worlds"),
            "pillar": feature.get("pillar", "information"),
            "requirements": feature.get("requirements", []),
            "api_endpoints": feature.get("api_endpoints", []),
            "files": feature.get("files", [])
        }
        
        spec_name = feature.get("name", "feature").replace(" ", "_").lower()
        spec_path = self.project_root / "specs" / f"{spec_name}.yaml"
        spec_path.parent.mkdir(exist_ok=True)
        
        with open(spec_path, 'w') as f:
            yaml.dump(spec, f, default_flow_style=False, allow_unicode=True)
        
        return str(spec_path)
    
    # ==========================================
    # 4. Run Evolution
    # ==========================================
    def run_evolution(self, spec_path: str) -> bool:
        """
        Run Evolution Orchestrator on spec file.
        """
        self._log(f"\n🧬 Running Evolution: {spec_path}")
        
        try:
            result = subprocess.run(
                [sys.executable, "evolution_orchestrator.py", spec_path],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                self._log("  ✓ Evolution completed successfully")
                self.stats["evolutions_run"] += 1
                
                # Update backlog status
                self._update_backlog_status(spec_path, "completed")
                return True
            else:
                self._log(f"  ❌ Evolution failed: {result.stderr[:200]}")
                return False
                
        except subprocess.TimeoutExpired:
            self._log("  ❌ Evolution timed out")
            return False
        except Exception as e:
            self._log(f"  ❌ Evolution error: {e}")
            return False
    
    def _update_backlog_status(self, spec_path: str, status: str):
        """Update feature status in backlog."""
        try:
            spec_name = Path(spec_path).stem
            
            with open(self.backlog_path) as f:
                backlog = yaml.safe_load(f)
            
            for feature in backlog.get("features", []):
                feature_name = feature.get("name", "").replace(" ", "_").lower()
                if feature_name == spec_name:
                    feature["status"] = status
                    feature["completed_at"] = datetime.now().isoformat()
                    break
            
            with open(self.backlog_path, 'w') as f:
                yaml.dump(backlog, f, default_flow_style=False, allow_unicode=True)
                
        except Exception as e:
            self._log(f"  Warning: Could not update backlog: {e}")
    
    # ==========================================
    # 5. Main Loop
    # ==========================================
    def run_once(self) -> Dict[str, Any]:
        """Run one complete cycle."""
        self.stats["cycles"] += 1
        cycle_start = datetime.now()
        
        self._log("\n" + "=" * 60)
        self._log(f"🔄 CYCLE {self.stats['cycles']} - {cycle_start.strftime('%Y-%m-%d %H:%M:%S')}")
        self._log("=" * 60)
        
        # Step 1: Health Check
        issues = self.check_health()
        
        # Step 2: Auto Fix
        if issues:
            self.auto_fix(issues)
            # Re-check after fixes
            issues = self.check_health()
        
        # Step 3: Check Backlog (only if healthy)
        spec_path = None
        if not any(i["severity"] == "high" for i in issues):
            spec_path = self.check_backlog()
        
        # Step 4: Run Evolution
        if spec_path:
            self.run_evolution(spec_path)
        
        # Summary
        cycle_time = (datetime.now() - cycle_start).total_seconds()
        self._log(f"\n⏱️ Cycle completed in {cycle_time:.1f}s")
        self._log(f"📊 Stats: {self.stats['cycles']} cycles, {self.stats['issues_fixed']} fixes, {self.stats['evolutions_run']} evolutions")
        
        return {
            "cycle": self.stats["cycles"],
            "issues": len(issues),
            "evolution_run": spec_path is not None,
            "duration": cycle_time
        }
    
    def run_forever(self, interval: int = 300):
        """
        Run continuous loop forever.
        
        Args:
            interval: Seconds between cycles (default: 300 = 5 minutes)
        """
        self._log("\n" + "=" * 60)
        self._log("🚀 AUTUS CONTINUOUS LOOP STARTED")
        self._log(f"   Interval: {interval}s ({interval/60:.1f} min)")
        self._log(f"   API: {self.api_base}")
        self._log("   Press Ctrl+C to stop")
        self._log("=" * 60)
        
        try:
            while True:
                self.run_once()
                
                self._log(f"\n💤 Sleeping for {interval}s...")
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self._log("\n\n🛑 Loop stopped by user")
            self._print_final_stats()
    
    def _print_final_stats(self):
        """Print final statistics."""
        self._log("\n" + "=" * 60)
        self._log("📊 FINAL STATISTICS")
        self._log("=" * 60)
        self._log(f"   Total Cycles: {self.stats['cycles']}")
        self._log(f"   Issues Found: {self.stats['issues_found']}")
        self._log(f"   Issues Fixed: {self.stats['issues_fixed']}")
        self._log(f"   Evolutions Run: {self.stats['evolutions_run']}")
        self._log(f"   Started: {self.stats['started_at']}")
        self._log(f"   Ended: {datetime.now().isoformat()}")
        self._log("=" * 60)
    
    def _log(self, message: str):
        """Log message to console and file."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {message}"
        print(formatted)
        
        try:
            with open(self.log_file, 'a') as f:
                f.write(formatted + "\n")
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description="AUTUS Continuous Loop")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=300, help="Interval in seconds (default: 300)")
    parser.add_argument("--api-base", default="http://127.0.0.1:8003", help="API base URL")
    
    args = parser.parse_args()
    
    loop = ContinuousLoop(api_base=args.api_base)
    
    if args.once:
        result = loop.run_once()
        print(f"\n✅ Single cycle completed: {json.dumps(result, indent=2)}")
    else:
        loop.run_forever(interval=args.interval)


if __name__ == "__main__":
    main()

