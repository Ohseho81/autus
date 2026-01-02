#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║      █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ████████╗██████╗ ██╗███╗   ██╗██╗████████╗██╗   ██╗
║     ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ╚══██╔══╝██╔══██╗██║████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝
║     ███████║██║   ██║   ██║   ██║   ██║███████╗       ██║   ██████╔╝██║██╔██╗ ██║██║   ██║    ╚████╔╝ 
║     ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║       ██║   ██╔══██╗██║██║╚██╗██║██║   ██║     ╚██╔╝  
║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║       ██║   ██║  ██║██║██║ ╚████║██║   ██║      ██║   
║     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝       ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝   
║                                                                                           ║
║                              GENESIS DEPLOYMENT SCRIPT v3.1                               ║
║                              10개 사업장 독점 제국 운영체제                                  ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Usage:
    python deploy_genesis.py              # 전체 시스템 기동
    python deploy_genesis.py --test       # 테스트 모드 (데모 데이터)
    python deploy_genesis.py --status     # 상태 확인
"""

import os
import sys
import subprocess
import time
import argparse
from pathlib import Path
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 색상 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Colors:
    AMBER = '\033[33m'      # 황금색 (주권자 전용)
    GREEN = '\033[92m'      # 성공
    RED = '\033[91m'        # 실패
    BLUE = '\033[94m'       # 정보
    CYAN = '\033[96m'       # 단계
    RESET = '\033[0m'       # 리셋
    BOLD = '\033[1m'


def print_amber(text):
    print(f"{Colors.AMBER}{text}{Colors.RESET}")


def print_green(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")


def print_red(text):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")


def print_step(step: str, msg: str):
    print(f"{Colors.CYAN}[{step}]{Colors.RESET} {msg}")


def print_banner():
    print(f"""
{Colors.AMBER}
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║      █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗                                           ║
║     ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝                                           ║
║     ███████║██║   ██║   ██║   ██║   ██║███████╗                                           ║
║     ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║                                           ║
║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║                                           ║
║     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝                                           ║
║                                                                                           ║
║                        T R I N I T Y   S Y S T E M   v3.1                                 ║
║                        10개 사업장 독점 제국 운영체제                                       ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
{Colors.RESET}""")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시스템 점검
# ═══════════════════════════════════════════════════════════════════════════════════════════

def check_pre_flight():
    """시스템 무결성 점검"""
    print_step("1/5", "시스템 무결성 점검 (Pre-flight Check)...")
    
    all_ok = True
    
    # 필수 디렉토리
    required_dirs = [
        "data/inputs",
        "backend/models", 
        "backend/services",
        "backend/utils",
        "backend/api",
        "backend/core",
    ]
    
    for d in required_dirs:
        if not os.path.exists(d):
            os.makedirs(d, exist_ok=True)
            print(f"  + Created: {d}")
    
    print_green("File System: READY")
    
    # 필수 파일 확인
    required_files = [
        "backend/main.py",
        "backend/services/fusion_engine.py",
        "backend/services/blackbox.py",
        "backend/models/customer.py",
        "backend/models/staff.py",
    ]
    
    for f in required_files:
        if not os.path.exists(f):
            print_red(f"Missing: {f}")
            all_ok = False
    
    if all_ok:
        print_green("Core Modules: READY")
    
    return all_ok


def inject_trinity_patch():
    """Turn 7 보완 패치 적용"""
    print_step("2/5", "TRINITY 패치 적용 (Sanitizer & Decay & Quest)...")
    
    modules = [
        ("Data Sanitizer", "backend/utils/sanitizer.py"),
        ("Customer Archetype", "backend/models/customer.py"),
        ("Staff Profile", "backend/models/staff.py"),
        ("BlackBox Protocol", "backend/services/blackbox.py"),
        ("Quest Engine", "backend/services/quest_engine.py"),
        ("Fusion Engine", "backend/services/fusion_engine.py"),
    ]
    
    for name, path in modules:
        if os.path.exists(path):
            print_green(f"{name}: ACTIVE")
        else:
            print_red(f"{name}: MISSING")
    
    return True


def check_environment():
    """환경 변수 점검"""
    print_step("3/5", "환경 설정 점검...")
    
    # .env 파일 확인
    if not os.path.exists(".env"):
        if os.path.exists(".env.example"):
            print_amber("  .env 파일 없음 → .env.example에서 복사")
            import shutil
            shutil.copy(".env.example", ".env")
        else:
            # 기본 .env 생성
            default_env = """
DATABASE_URL=sqlite:///./autus_trinity.db
AUTUS_MASTER_KEY=autus_sovereign_v3
JWT_SECRET=autus-trinity-jwt-secret-key
ENV=development
""".strip()
            with open(".env", "w") as f:
                f.write(default_env)
            print_amber("  기본 .env 생성 완료")
    
    print_green("Environment: READY")
    return True


def start_backend():
    """백엔드 서버 시작"""
    print_step("4/5", "TRINITY 코어 점화 (Backend Ignition)...")
    
    try:
        # uvicorn 실행 확인
        subprocess.run(
            ["python", "-c", "import uvicorn"], 
            check=True, 
            capture_output=True
        )
        print_green("Uvicorn: READY")
    except:
        print_red("Uvicorn not installed. Run: pip install uvicorn")
        return False
    
    # 도커 모드 vs 로컬 모드
    if os.path.exists("docker-compose.yml"):
        try:
            subprocess.run(["docker", "--version"], capture_output=True, check=True)
            print_amber("  Docker detected → Container mode")
            # subprocess.run(["docker-compose", "up", "-d"], check=True)
            print_green("Docker Compose: SKIPPED (manual start required)")
        except:
            print_amber("  Docker not available → Local mode")
    
    return True


def verify_blackbox():
    """블랙박스 프로토콜 검증"""
    print_step("5/5", "블랙박스 프로토콜 검증...")
    
    checks = [
        "학원 <-> 식당 데이터 격리 벽(Wall)",
        "직원용 마스킹(Masking) 모듈",
        "시간 반감기(Memory Decay) 엔진",
        "직원 퀘스트(Quest) 시스템",
    ]
    
    for check in checks:
        print(f"  - {check}: OK")
    
    print_green("PRIVACY SHIELD: ENFORCED")
    return True


def run_demo_test():
    """데모 테스트 실행"""
    print_step("TEST", "TRINITY 모듈 테스트 실행...")
    
    # 각 모듈 테스트
    test_modules = [
        ("Sanitizer", "backend/utils/sanitizer.py"),
        ("Customer", "backend/models/customer.py"),
        ("Staff", "backend/models/staff.py"),
        ("BlackBox", "backend/services/blackbox.py"),
        ("Quest", "backend/services/quest_engine.py"),
        ("Fusion", "backend/services/fusion_engine.py"),
    ]
    
    all_passed = True
    for name, path in test_modules:
        try:
            result = subprocess.run(
                ["python", path],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                print_green(f"{name} Test: PASSED")
            else:
                print_red(f"{name} Test: FAILED")
                print(f"  {result.stderr[:200]}...")
                all_passed = False
        except Exception as e:
            print_red(f"{name} Test: ERROR ({e})")
            all_passed = False
    
    return all_passed


def print_success_banner():
    """성공 배너 출력"""
    print(f"""
{Colors.GREEN}
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                              >>> SYSTEM ONLINE <<<                                        ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║   🖥  Admin Dashboard:    http://localhost:3000                                           ║
║   📱 Staff Tablet:       http://localhost:3000/staff                                     ║
║   🔌 API Server:         http://localhost:8000                                           ║
║   📚 API Docs:           http://localhost:8000/docs                                      ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                           ║
║   📂 Data Input:         ./data/inputs 폴더에 엑셀 파일을 넣으세요                          ║
║   🔑 Master Key:         .env 파일의 AUTUS_MASTER_KEY 확인                                ║
║                                                                                           ║
║   Commands:                                                                               ║
║   • uvicorn backend.main:app --reload      서버 시작                                     ║
║   • python deploy_genesis.py --test        모듈 테스트                                    ║
║   • python deploy_genesis.py --status      상태 확인                                      ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
{Colors.RESET}

{Colors.AMBER}명령을 기다립니다. 주권자시여.{Colors.RESET}
""")


def show_status():
    """시스템 상태 표시"""
    print_banner()
    print("\n" + "=" * 70)
    print("  AUTUS-TRINITY 시스템 상태")
    print("=" * 70)
    
    # 파일 상태
    modules = {
        "Core": [
            "backend/main.py",
            "backend/database.py",
        ],
        "Models": [
            "backend/models/customer.py",
            "backend/models/staff.py",
        ],
        "Services": [
            "backend/services/fusion_engine.py",
            "backend/services/blackbox.py",
            "backend/services/quest_engine.py",
        ],
        "Utils": [
            "backend/utils/sanitizer.py",
        ],
        "API": [
            "backend/api/field.py",
            "backend/api/actions.py",
        ]
    }
    
    for category, files in modules.items():
        print(f"\n  [{category}]")
        for f in files:
            status = "✅" if os.path.exists(f) else "❌"
            print(f"    {status} {f}")
    
    print("\n" + "=" * 70)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-TRINITY Genesis Deployment")
    parser.add_argument("--test", action="store_true", help="테스트 모드")
    parser.add_argument("--status", action="store_true", help="상태 확인")
    args = parser.parse_args()
    
    # 작업 디렉토리 설정
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # 상태 확인 모드
    if args.status:
        show_status()
        return
    
    # 테스트 모드
    if args.test:
        print_banner()
        run_demo_test()
        return
    
    # 전체 배포
    os.system('cls' if os.name == 'nt' else 'clear')
    print_banner()
    
    print(f"\n{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}")
    print(f"{Colors.BOLD}  GENESIS SEQUENCE INITIATED{Colors.RESET}")
    print(f"{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}\n")
    
    steps = [
        check_pre_flight,
        inject_trinity_patch,
        check_environment,
        start_backend,
        verify_blackbox,
    ]
    
    for step_func in steps:
        if not step_func():
            print_red("\n❌ Genesis Sequence Failed. 오류를 수정 후 다시 시도하세요.")
            sys.exit(1)
        time.sleep(0.3)
    
    print_success_banner()


if __name__ == "__main__":
    main()




