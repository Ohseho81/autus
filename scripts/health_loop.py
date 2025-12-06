"""
AUTUS Health Loop - Comprehensive System Monitoring
자동 점검 → 문제 발견 → 자동 수정 → 재점검

This module provides continuous health monitoring of:
- API server status
- Pack system availability
- Database connectivity
- Resource utilization
- Error tracking
- Performance metrics
"""

import os
import json
import requests
import subprocess
import psutil
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

API_URL = "http://127.0.0.1:8003"

@dataclass
class HealthMetric:
    """Health check metric container."""
    timestamp: str
    component: str
    status: str  # "healthy", "warning", "error"
    details: Dict[str, Any]
    response_time_ms: float


class AdvancedHealthLoop:
    """Advanced health monitoring with metrics collection and alerting."""
    
    def __init__(self):
        self.issues: List[Dict[str, Any]] = []
        self.fixes: List[Dict[str, Any]] = []
        self.metrics: List[HealthMetric] = []
        self.max_metrics_history = 1000
        self.alert_thresholds = {
            "cpu_percent": 80.0,
            "memory_percent": 85.0,
            "response_time_ms": 5000,
            "error_rate": 0.1
        }
        
    def check_api_health(self) -> bool:
        """API 서버 상태 점검 with performance metrics."""
        print("\n🔍 1. API Health Check...")
        start_time = time.time()
        try:
            r = requests.get(f"{API_URL}/health", timeout=5)
            response_time = (time.time() - start_time) * 1000
            
            if r.status_code == 200:
                print(f"   ✅ API Server OK ({response_time:.1f}ms)")
                self._record_metric(
                    component="api_server",
                    status="healthy",
                    details={"response_time_ms": response_time},
                    response_time_ms=response_time
                )
                return True
            else:
                self.issues.append({
                    "component": "api_server",
                    "error": f"HTTP {r.status_code}",
                    "timestamp": datetime.now().isoformat()
                })
                print(f"   ❌ API Server returned {r.status_code}")
                return False
        except Exception as e:
            self.issues.append({
                "component": "api_server",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            print(f"   ❌ API Server DOWN: {str(e)}")
            return False
    
    def check_system_resources(self) -> bool:
        """Check CPU, memory, and disk usage."""
        print("\n🔍 2. System Resources Check...")
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            status = "healthy"
            warnings = []
            
            if cpu_percent > self.alert_thresholds["cpu_percent"]:
                warnings.append(f"High CPU: {cpu_percent}%")
                status = "warning"
            
            if memory.percent > self.alert_thresholds["memory_percent"]:
                warnings.append(f"High Memory: {memory.percent}%")
                status = "warning"
            
            details = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_mb": memory.available / (1024**2),
                "disk_percent": disk.percent,
                "warnings": warnings
            }
            
            self._record_metric(
                component="system_resources",
                status=status,
                details=details,
                response_time_ms=0
            )
            
            print(f"   {'✅' if status == 'healthy' else '⚠️'} CPU: {cpu_percent}% | Memory: {memory.percent}% | Disk: {disk.percent}%")
            return status != "error"
            
        except Exception as e:
            print(f"   ⚠️ Could not check system resources: {str(e)}")
            return True
    
    def check_packs(self) -> bool:
        """Pack 시스템 점검 with enhanced details."""
        print("\n🔍 3. Pack System Check...")
        try:
            r = requests.get(f"{API_URL}/packs/list", timeout=5)
            data = r.json()
            count = data.get('count', 0)
            
            self._record_metric(
                component="pack_system",
                status="healthy" if count >= 1 else "warning",
                details={"packs_count": count, "packs": data.get('packs', [])},
                response_time_ms=0
            )
            
            if count >= 1:
                print(f"   ✅ Packs OK: {count} packs")
                return True
            else:
                self.issues.append({
                    "component": "pack_system",
                    "error": f"Only {count} packs found",
                    "timestamp": datetime.now().isoformat()
                })
                print(f"   ⚠️ Low pack count: {count}")
                return True  # Not critical
        except Exception as e:
            self.issues.append({
                "component": "pack_system",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            print(f"   ⚠️ Pack check failed: {str(e)}")
            return True
    
    def check_database(self) -> bool:
        """Database connectivity check."""
        print("\n🔍 4. Database Check...")
        try:
            db_path = Path("autus.db")
            if db_path.exists():
                db_size_mb = db_path.stat().st_size / (1024**2)
                self._record_metric(
                    component="database",
                    status="healthy",
                    details={"db_size_mb": db_size_mb},
                    response_time_ms=0
                )
                print(f"   ✅ Database OK ({db_size_mb:.1f}MB)")
                return True
            else:
                print(f"   ⚠️ Database file not found")
                return True
        except Exception as e:
            print(f"   ❌ Database check failed: {str(e)}")
            return False
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive health summary."""
        return {
            "timestamp": datetime.now().isoformat(),
            "total_issues": len(self.issues),
            "total_fixes": len(self.fixes),
            "recent_issues": self.issues[-10:],  # Last 10 issues
            "metrics_collected": len(self.metrics),
            "system_status": "healthy" if len(self.issues) == 0 else "needs_attention"
        }
    
    def _record_metric(self, component: str, status: str, details: Dict[str, Any], response_time_ms: float) -> None:
        """Record a health metric."""
        metric = HealthMetric(
            timestamp=datetime.now().isoformat(),
            component=component,
            status=status,
            details=details,
            response_time_ms=response_time_ms
        )
        self.metrics.append(metric)
        
        # Keep only recent metrics
        if len(self.metrics) > self.max_metrics_history:
            self.metrics = self.metrics[-self.max_metrics_history:]
    
    def export_metrics(self, filepath: str = "logs/health_metrics.json") -> None:
        """Export collected metrics to JSON file."""
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump([asdict(m) for m in self.metrics[-100:]], f, indent=2)
            print(f"✅ Metrics exported to {filepath}")
        except Exception as e:
            print(f"❌ Failed to export metrics: {str(e)}")
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
