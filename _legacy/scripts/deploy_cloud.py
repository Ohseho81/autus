#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-PRIME: Cloud Deployment Script                             ║
║                          Railway + Vercel + Supabase 자동 배포                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

Usage:
    python deploy_cloud.py setup      # 초기 설정 가이드
    python deploy_cloud.py backend    # Railway 배포
    python deploy_cloud.py frontend   # Vercel 배포
    python deploy_cloud.py all        # 전체 배포
    python deploy_cloud.py status     # 배포 상태 확인
"""

import os
import sys
import subprocess
import json
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 색상 출력
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Colors:
    AMBER = '\033[33m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header():
    print(f"""
{Colors.AMBER}╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║      █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗                               ║
║     ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝                               ║
║     ███████║██║   ██║   ██║   ██║   ██║███████╗                               ║
║     ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║                               ║
║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║                               ║
║     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝                               ║
║                                                                               ║
║                      CLOUD DEPLOYMENT SCRIPT                                  ║
║                   Railway + Vercel + Supabase                                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝{Colors.RESET}
""")


def print_step(step: str, msg: str):
    print(f"{Colors.CYAN}[{step}]{Colors.RESET} {msg}")


def print_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")


def print_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")


def print_warn(msg: str):
    print(f"{Colors.AMBER}⚠ {msg}{Colors.RESET}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CLI 도구 체크
# ═══════════════════════════════════════════════════════════════════════════════════════════

def check_cli_tool(name: str, install_cmd: str) -> bool:
    """CLI 도구 설치 확인"""
    try:
        subprocess.run([name, "--version"], capture_output=True, check=True)
        print_success(f"{name} 설치됨")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error(f"{name} 미설치")
        print(f"       설치: {install_cmd}")
        return False


def check_prerequisites() -> bool:
    """필수 도구 확인"""
    print_step("1", "필수 도구 확인...")
    
    tools = [
        ("railway", "npm install -g @railway/cli"),
        ("vercel", "npm install -g vercel"),
        ("git", "https://git-scm.com/downloads"),
    ]
    
    all_ok = True
    for name, install_cmd in tools:
        if not check_cli_tool(name, install_cmd):
            all_ok = False
    
    return all_ok


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정 가이드
# ═══════════════════════════════════════════════════════════════════════════════════════════

def show_setup_guide():
    """초기 설정 가이드 표시"""
    print_header()
    
    print(f"""
{Colors.BOLD}📋 AUTUS-PRIME 클라우드 배포 설정 가이드{Colors.RESET}

{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}
{Colors.BOLD}Step 1: Supabase 설정{Colors.RESET}
{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}

1. https://supabase.com 접속 → 회원가입
2. "New Project" 생성:
   - Name: autus-prime
   - Password: (안전한 비밀번호)
   - Region: Seoul (Northeast Asia)
   
3. Settings → Database → Connection string 복사
   형식: postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres

{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}
{Colors.BOLD}Step 2: Railway CLI 로그인{Colors.RESET}
{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}

$ npm install -g @railway/cli
$ railway login

{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}
{Colors.BOLD}Step 3: Vercel CLI 로그인{Colors.RESET}
{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}

$ npm install -g vercel
$ vercel login

{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}
{Colors.BOLD}Step 4: 환경 변수 설정{Colors.RESET}
{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}

backend/.env:
  DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
  AUTUS_MASTER_KEY=your-secret-master-key
  JWT_SECRET=your-jwt-secret-min-32-chars

frontend/.env:
  VITE_API_URL=https://your-backend.railway.app
  VITE_GOOGLE_CLIENT_ID=your-google-client-id (선택)

{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}
{Colors.BOLD}Step 5: 배포 실행{Colors.RESET}
{Colors.AMBER}═══════════════════════════════════════════════════════════════════════════════{Colors.RESET}

$ python deploy_cloud.py backend    # 백엔드 배포
$ python deploy_cloud.py frontend   # 프론트엔드 배포
$ python deploy_cloud.py all        # 전체 배포

{Colors.GREEN}준비가 완료되면 위 명령어를 실행하세요!{Colors.RESET}
""")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배포 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def deploy_backend():
    """Railway로 백엔드 배포"""
    print_header()
    print_step("Backend", "Railway 배포 시작...")
    
    backend_path = Path(__file__).parent / "backend"
    
    if not backend_path.exists():
        print_error(f"backend 폴더를 찾을 수 없습니다: {backend_path}")
        return False
    
    os.chdir(backend_path)
    
    # Railway 프로젝트 확인/생성
    try:
        result = subprocess.run(["railway", "status"], capture_output=True, text=True)
        if "No project linked" in result.stderr or result.returncode != 0:
            print_step("Backend", "새 Railway 프로젝트 생성...")
            subprocess.run(["railway", "init"], check=True)
    except Exception as e:
        print_error(f"Railway 상태 확인 실패: {e}")
        return False
    
    # 환경 변수 확인
    env_file = backend_path / ".env"
    if not env_file.exists():
        print_warn(".env 파일이 없습니다. Railway 대시보드에서 환경 변수를 설정하세요.")
    
    # 배포
    try:
        print_step("Backend", "배포 중...")
        subprocess.run(["railway", "up", "--detach"], check=True)
        print_success("백엔드 배포 완료!")
        
        # 도메인 표시
        result = subprocess.run(["railway", "domain"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"\n  🌐 Backend URL: {result.stdout.strip()}")
        
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"배포 실패: {e}")
        return False


def deploy_frontend():
    """Vercel로 프론트엔드 배포"""
    print_header()
    print_step("Frontend", "Vercel 배포 시작...")
    
    frontend_path = Path(__file__).parent / "frontend"
    
    if not frontend_path.exists():
        print_error(f"frontend 폴더를 찾을 수 없습니다: {frontend_path}")
        return False
    
    os.chdir(frontend_path)
    
    # 환경 변수 확인
    env_file = frontend_path / ".env"
    if not env_file.exists():
        print_warn(".env 파일이 없습니다. Vercel 대시보드에서 환경 변수를 설정하세요.")
    
    # 빌드 테스트
    try:
        print_step("Frontend", "의존성 설치...")
        subprocess.run(["npm", "ci"], check=True, capture_output=True)
        
        print_step("Frontend", "빌드 테스트...")
        subprocess.run(["npm", "run", "build"], check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print_error(f"빌드 실패: {e}")
        return False
    
    # Vercel 배포
    try:
        print_step("Frontend", "배포 중...")
        result = subprocess.run(
            ["vercel", "--prod", "--yes"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print_success("프론트엔드 배포 완료!")
            # URL 추출
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if 'https://' in line:
                    print(f"\n  🌐 Frontend URL: {line.strip()}")
                    break
            return True
        else:
            print_error(f"배포 실패: {result.stderr}")
            return False
            
    except subprocess.CalledProcessError as e:
        print_error(f"배포 실패: {e}")
        return False


def deploy_all():
    """전체 배포"""
    print_header()
    
    if not check_prerequisites():
        print_error("\n필수 도구를 먼저 설치하세요.")
        return False
    
    print("\n")
    backend_ok = deploy_backend()
    
    print("\n")
    frontend_ok = deploy_frontend()
    
    print("\n" + "=" * 60)
    if backend_ok and frontend_ok:
        print_success("🎉 전체 배포 완료!")
    else:
        print_error("일부 배포 실패. 로그를 확인하세요.")
    
    return backend_ok and frontend_ok


def show_status():
    """배포 상태 확인"""
    print_header()
    print_step("Status", "배포 상태 확인...")
    
    # Railway 상태
    print("\n📦 Backend (Railway):")
    try:
        os.chdir(Path(__file__).parent / "backend")
        subprocess.run(["railway", "status"])
    except:
        print_warn("  Railway 상태를 확인할 수 없습니다.")
    
    # Vercel 상태
    print("\n🎨 Frontend (Vercel):")
    try:
        os.chdir(Path(__file__).parent / "frontend")
        subprocess.run(["vercel", "list", "--limit", "3"])
    except:
        print_warn("  Vercel 상태를 확인할 수 없습니다.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print_header()
        print("""
사용법:
  python deploy_cloud.py setup      초기 설정 가이드
  python deploy_cloud.py backend    Railway 배포
  python deploy_cloud.py frontend   Vercel 배포
  python deploy_cloud.py all        전체 배포
  python deploy_cloud.py status     배포 상태 확인
""")
        return
    
    command = sys.argv[1].lower()
    
    if command == "setup":
        show_setup_guide()
    elif command == "backend":
        deploy_backend()
    elif command == "frontend":
        deploy_frontend()
    elif command == "all":
        deploy_all()
    elif command == "status":
        show_status()
    else:
        print_error(f"알 수 없는 명령어: {command}")


if __name__ == "__main__":
    main()




