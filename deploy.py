#!/usr/bin/env python3
"""
AUTUS Deployment Script
========================

24/7 무인 자율 가동 배포 스크립트

Usage:
    python deploy.py              # 전체 시스템 시작
    python deploy.py --backend    # 백엔드만 시작
    python deploy.py --eternal    # 영원의 엔진만 시작
    python deploy.py --status     # 시스템 상태 확인

Environment:
    AUTUS_MODE=SOVEREIGN
    AUTUS_PORT=8000

Version: 1.0.0
"""

import subprocess
import os
import sys
import time
import signal
import argparse
from datetime import datetime
from typing import List, Optional


# ================================================================
# CONFIGURATION
# ================================================================

class DeployConfig:
    """배포 설정"""
    
    # 서버 설정
    BACKEND_HOST = "0.0.0.0"
    BACKEND_PORT = int(os.getenv("AUTUS_PORT", "8000"))
    
    # 프로세스 설정
    PROCESS_CHECK_INTERVAL = 5  # seconds
    MAX_RESTART_ATTEMPTS = 3
    
    # 로그 설정
    LOG_DIR = "logs"
    
    # 모드
    MODE = os.getenv("AUTUS_MODE", "SOVEREIGN")


# ================================================================
# PROCESS MANAGER
# ================================================================

class ProcessManager:
    """프로세스 관리자"""
    
    def __init__(self):
        self.processes: dict = {}
        self.running = False
        
        # 시그널 핸들러
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """시그널 핸들러"""
        print(f"\n🛑 Received signal {signum}, initiating graceful shutdown...")
        self.stop_all()
    
    def start_process(
        self,
        name: str,
        command: List[str],
        log_file: Optional[str] = None
    ) -> bool:
        """프로세스 시작"""
        try:
            # 로그 파일 설정
            if log_file:
                os.makedirs(DeployConfig.LOG_DIR, exist_ok=True)
                log_path = os.path.join(DeployConfig.LOG_DIR, log_file)
                log_handle = open(log_path, 'a')
            else:
                log_handle = subprocess.DEVNULL
            
            # 프로세스 시작
            process = subprocess.Popen(
                command,
                stdout=log_handle if log_file else subprocess.DEVNULL,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid if os.name != 'nt' else None,
            )
            
            self.processes[name] = {
                "process": process,
                "command": command,
                "log_file": log_file,
                "started_at": datetime.now(),
                "restart_count": 0,
            }
            
            print(f"✅ Started {name} (PID: {process.pid})")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")
            return False
    
    def stop_process(self, name: str) -> bool:
        """프로세스 중지"""
        if name not in self.processes:
            return False
        
        proc_info = self.processes[name]
        process = proc_info["process"]
        
        try:
            if os.name != 'nt':
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            else:
                process.terminate()
            
            process.wait(timeout=10)
            print(f"🛑 Stopped {name}")
            
        except subprocess.TimeoutExpired:
            process.kill()
            print(f"⚠️ Force killed {name}")
        except Exception as e:
            print(f"❌ Error stopping {name}: {e}")
        
        del self.processes[name]
        return True
    
    def stop_all(self):
        """모든 프로세스 중지"""
        self.running = False
        
        for name in list(self.processes.keys()):
            self.stop_process(name)
    
    def check_health(self) -> dict:
        """헬스 체크"""
        status = {}
        
        for name, info in self.processes.items():
            process = info["process"]
            is_running = process.poll() is None
            
            status[name] = {
                "running": is_running,
                "pid": process.pid if is_running else None,
                "uptime": str(datetime.now() - info["started_at"]) if is_running else "N/A",
                "restart_count": info["restart_count"],
            }
        
        return status
    
    def restart_process(self, name: str) -> bool:
        """프로세스 재시작"""
        if name not in self.processes:
            return False
        
        info = self.processes[name]
        
        if info["restart_count"] >= DeployConfig.MAX_RESTART_ATTEMPTS:
            print(f"❌ Max restart attempts reached for {name}")
            return False
        
        self.stop_process(name)
        time.sleep(2)
        
        success = self.start_process(
            name,
            info["command"],
            info["log_file"],
        )
        
        if success:
            self.processes[name]["restart_count"] = info["restart_count"] + 1
        
        return success
    
    def monitor(self):
        """프로세스 모니터링 루프"""
        self.running = True
        
        print("\n📡 Monitoring processes (Press Ctrl+C to stop)...\n")
        
        while self.running:
            for name, info in list(self.processes.items()):
                process = info["process"]
                
                if process.poll() is not None:
                    print(f"⚠️ Process {name} died, attempting restart...")
                    self.restart_process(name)
            
            time.sleep(DeployConfig.PROCESS_CHECK_INTERVAL)


# ================================================================
# DEPLOYMENT FUNCTIONS
# ================================================================

def launch_backend(pm: ProcessManager):
    """백엔드 서버 시작"""
    print("\n🔧 Starting Backend Server...")
    
    pm.start_process(
        "backend",
        [
            sys.executable, "-m", "uvicorn", "backend.main:app",
            "--host", DeployConfig.BACKEND_HOST,
            "--port", str(DeployConfig.BACKEND_PORT),
            "--reload",
        ],
        "backend.log",
    )


def launch_eternal_engine(pm: ProcessManager):
    """영원의 엔진 시작"""
    print("\n🚀 Starting Eternal Engine...")
    
    pm.start_process(
        "eternal_engine",
        [sys.executable, "-m", "backend.core.eternal_engine"],
        "eternal_engine.log",
    )


def print_status(pm: ProcessManager):
    """상태 출력"""
    print("\n" + "=" * 60)
    print("AUTUS SYSTEM STATUS")
    print("=" * 60)
    
    status = pm.check_health()
    
    if not status:
        print("\n⚠️ No processes running")
        return
    
    for name, info in status.items():
        icon = "✅" if info["running"] else "❌"
        print(f"\n{icon} {name.upper()}")
        print(f"   PID: {info['pid']}")
        print(f"   Uptime: {info['uptime']}")
        print(f"   Restarts: {info['restart_count']}")
    
    print("\n" + "=" * 60)


def print_banner():
    """배너 출력"""
    banner = """
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗           ║
    ║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝           ║
    ║    ███████║██║   ██║   ██║   ██║   ██║███████╗           ║
    ║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║           ║
    ║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║           ║
    ║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝           ║
    ║                                                           ║
    ║          24/7 ZERO-TOUCH SOVEREIGN SYSTEM                ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """
    print(banner)


# ================================================================
# MAIN
# ================================================================

def main():
    parser = argparse.ArgumentParser(description="AUTUS Deployment Script")
    parser.add_argument("--backend", action="store_true", help="Start backend only")
    parser.add_argument("--eternal", action="store_true", help="Start eternal engine only")
    parser.add_argument("--status", action="store_true", help="Show system status")
    parser.add_argument("--no-monitor", action="store_true", help="Don't monitor processes")
    
    args = parser.parse_args()
    
    print_banner()
    
    pm = ProcessManager()
    
    if args.status:
        print_status(pm)
        return
    
    print(f"\n🌐 Mode: {DeployConfig.MODE}")
    print(f"📡 Backend: http://localhost:{DeployConfig.BACKEND_PORT}")
    
    # 선택적 시작
    if args.backend:
        launch_backend(pm)
    elif args.eternal:
        launch_eternal_engine(pm)
    else:
        # 전체 시스템 시작
        print("\n🚀 Launching Full System...")
        launch_backend(pm)
        time.sleep(3)
        launch_eternal_engine(pm)
    
    print("\n" + "=" * 60)
    print("✅ AUTUS SYSTEM DEPLOYED SUCCESSFULLY")
    print("=" * 60)
    
    print(f"\n🔗 API Docs: http://localhost:{DeployConfig.BACKEND_PORT}/docs")
    
    # 모니터링
    if not args.no_monitor:
        pm.monitor()


if __name__ == "__main__":
    main()
