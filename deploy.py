#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Genesis Deployment Script                           ║
║                          시스템 가동 스크립트                                              ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Usage:
    python deploy.py              # 전체 시스템 기동
    python deploy.py --build      # 이미지 재빌드 후 기동
    python deploy.py --stop       # 시스템 중지
    python deploy.py --logs       # 로그 확인
    python deploy.py --status     # 상태 확인
"""

import os
import sys
import subprocess
import time
import argparse
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 색상 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Colors:
    AMBER = '\033[33m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    BLUE = '\033[34m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_amber(text):
    print(f"{Colors.AMBER}{text}{Colors.RESET}")


def print_green(text):
    print(f"{Colors.GREEN}{text}{Colors.RESET}")


def print_red(text):
    print(f"{Colors.RED}{text}{Colors.RESET}")


def print_header():
    print(f"""
{Colors.AMBER}╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗███╗   ███║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║████╗ ████║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██╔████╔██║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██║     ██║  ██║██║██║ ╚═╝ ██║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝
║                                                                               ║
║                           GENESIS DEPLOYMENT SCRIPT                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝{Colors.RESET}
""")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 점검
# ═══════════════════════════════════════════════════════════════════════════════════════════

def check_docker():
    """Docker 설치 및 실행 상태 확인"""
    try:
        result = subprocess.run(
            ["docker", "--version"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        print_green(f"  ✓ Docker: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_red("  ✗ Docker가 설치되지 않았거나 실행 중이지 않습니다.")
        print_red("    → Docker Desktop을 설치하고 실행해주세요.")
        return False


def check_docker_compose():
    """Docker Compose 확인"""
    try:
        result = subprocess.run(
            ["docker", "compose", "version"], 
            capture_output=True, 
            text=True, 
            check=True
        )
        print_green(f"  ✓ Docker Compose: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        try:
            result = subprocess.run(
                ["docker-compose", "--version"], 
                capture_output=True, 
                text=True, 
                check=True
            )
            print_green(f"  ✓ Docker Compose: {result.stdout.strip()}")
            return True
        except:
            print_red("  ✗ Docker Compose를 찾을 수 없습니다.")
            return False
    

def check_env_file():
    """환경 변수 파일 확인/생성"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if env_file.exists():
        print_green("  ✓ .env 파일 존재")
        return True
    
    if env_example.exists():
        print_amber("  ⚠ .env 파일이 없습니다. 기본 설정으로 생성합니다.")
        with open(env_example, 'r') as src:
            content = src.read()
        with open(env_file, 'w') as dst:
            dst.write(content)
        print_green("  ✓ .env 파일 생성 완료")
        return True
    
    print_amber("  ⚠ .env 파일을 기본 설정으로 생성합니다.")
    default_env = """
DB_USER=autus_admin
DB_PASSWORD=autus_secret_2024
DB_NAME=autus_prime
MASTER_KEY=autus_sovereign_v1
JWT_SECRET=autus-jwt-secret-key
ENV=development
VITE_API_URL=http://localhost:8000
""".strip()
    
    with open(env_file, 'w') as f:
        f.write(default_env)
    
    print_green("  ✓ .env 파일 생성 완료")
    return True


def check_environment():
    """전체 환경 점검"""
    print_amber("\n[1/4] 환경 점검 중...")
    
    checks = [
        ("Docker", check_docker),
        ("Docker Compose", check_docker_compose),
        ("Environment", check_env_file),
    ]
    
    all_passed = True
    for name, check_func in checks:
        if not check_func():
            all_passed = False
    
    return all_passed


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배포 명령
# ═══════════════════════════════════════════════════════════════════════════════════════════

def get_compose_cmd():
    """Docker Compose 명령어 반환"""
    try:
        subprocess.run(["docker", "compose", "version"], capture_output=True, check=True)
        return ["docker", "compose"]
    except:
        return ["docker-compose"]


def build_images():
    """Docker 이미지 빌드"""
    print_amber("\n[2/4] 컨테이너 이미지 빌드 중...")
    
    cmd = get_compose_cmd() + ["build"]
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print_green("  ✓ 이미지 빌드 완료")
        return True
    else:
        print_red("  ✗ 이미지 빌드 실패")
        return False


def start_services():
    """서비스 시작"""
    print_amber("\n[3/4] 서비스 기동 중 (Genesis)...")
    
    cmd = get_compose_cmd() + ["up", "-d"]
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print_green("  ✓ 서비스 기동 완료")
        return True
    else:
        print_red("  ✗ 서비스 기동 실패")
        return False


def stop_services():
    """서비스 중지"""
    print_amber("\n서비스 중지 중...")
    
    cmd = get_compose_cmd() + ["down"]
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print_green("  ✓ 서비스 중지 완료")
    else:
        print_red("  ✗ 서비스 중지 실패")


def show_logs():
    """로그 표시"""
    cmd = get_compose_cmd() + ["logs", "-f", "--tail=100"]
    subprocess.run(cmd)


def show_status():
    """서비스 상태 표시"""
    print_amber("\n서비스 상태:")
    cmd = get_compose_cmd() + ["ps"]
    subprocess.run(cmd)


def health_check():
    """헬스 체크"""
    print_amber("\n[4/4] 시스템 상태 확인 중...")
    
    print("  ⏳ DB 초기화 대기 중... (5초)")
    time.sleep(5)
    
    try:
        import urllib.request
        response = urllib.request.urlopen("http://localhost:8000/health", timeout=10)
        if response.status == 200:
            print_green("  ✓ Backend: ONLINE")
        else:
            print_amber("  ⚠ Backend: DEGRADED")
    except Exception as e:
        print_amber(f"  ⚠ Backend: 응답 대기 중... ({e})")
    
    try:
        import urllib.request
        response = urllib.request.urlopen("http://localhost:3000", timeout=10)
        if response.status == 200:
            print_green("  ✓ Frontend: ONLINE")
        else:
            print_amber("  ⚠ Frontend: DEGRADED")
    except Exception as e:
        print_amber(f"  ⚠ Frontend: 응답 대기 중... ({e})")


def print_success_message():
    """성공 메시지 출력"""
    print(f"""
{Colors.GREEN}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                         >>> SYSTEM ONLINE <<<                                 ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   🖥  Dashboard:   http://localhost:3000                                      ║
║   🔌 API Server:  http://localhost:8000                                       ║
║   📚 API Docs:    http://localhost:8000/docs                                  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Commands:                                                                   ║
║   • python deploy.py --logs    로그 확인                                      ║
║   • python deploy.py --stop    서비스 중지                                    ║
║   • python deploy.py --status  상태 확인                                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
{Colors.RESET}""")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS-PRIME Deployment Script")
    parser.add_argument("--build", action="store_true", help="Force rebuild images")
    parser.add_argument("--stop", action="store_true", help="Stop all services")
    parser.add_argument("--logs", action="store_true", help="Show logs")
    parser.add_argument("--status", action="store_true", help="Show service status")
    
    args = parser.parse_args()
    
    print_header()
    
    if args.stop:
        stop_services()
        return
    
    if args.logs:
        show_logs()
        return
    
    if args.status:
        show_status()
        return
    
    if not check_environment():
        print_red("\n❌ 환경 점검 실패. 위 오류를 해결 후 다시 시도해주세요.")
        sys.exit(1)
    
    if args.build:
        if not build_images():
            sys.exit(1)
    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()

    
    if not start_services():
        sys.exit(1)
    
    health_check()
    print_success_message()


if __name__ == "__main__":
    main()