#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge: Build Script
Windows 실행 파일(EXE) 빌드 스크립트

사용법:
    python build_exe.py

결과물:
    dist/AUTUS_Bridge.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_requirements():
    """필수 패키지 확인"""
    required = ['pyautogui', 'pytesseract', 'requests', 'Pillow', 'pyinstaller']
    missing = []
    
    for pkg in required:
        try:
            __import__(pkg.lower().replace('-', '_'))
        except ImportError:
            missing.append(pkg)
    
    if missing:
        print(f"[!] 누락된 패키지: {', '.join(missing)}")
        print("[*] 설치 중...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing)
        print("[✓] 설치 완료")
    else:
        print("[✓] 모든 패키지 준비됨")


def build_exe():
    """PyInstaller로 EXE 빌드"""
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_universal.py"
    
    if not main_script.exists():
        print(f"[!] 오류: {main_script} 파일을 찾을 수 없습니다.")
        return False
    
    print("\n" + "=" * 60)
    print("  AUTUS Bridge 빌드 시작")
    print("=" * 60)
    
    # PyInstaller 명령어 구성
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--noconsole',           # 콘솔 창 숨김
        '--onefile',             # 단일 EXE 파일
        '--name=AUTUS_Bridge',   # 출력 파일명
        '--clean',               # 이전 빌드 정리
        str(main_script)
    ]
    
    # 아이콘 파일이 있으면 추가
    icon_path = script_dir / "icon.ico"
    if icon_path.exists():
        cmd.insert(-1, f'--icon={icon_path}')
        print(f"[*] 아이콘 적용: {icon_path}")
    
    print(f"[*] 빌드 명령: {' '.join(cmd)}")
    print("\n[*] 빌드 중... (약 1~3분 소요)")
    
    try:
        result = subprocess.run(cmd, cwd=script_dir, capture_output=True, text=True)
        
        if result.returncode == 0:
            exe_path = script_dir / "dist" / "AUTUS_Bridge.exe"
            print("\n" + "=" * 60)
            print("  ✅ 빌드 성공!")
            print("=" * 60)
            print(f"\n  📦 실행 파일: {exe_path}")
            print(f"  📂 배포 폴더: {script_dir / 'dist'}")
            print("\n  다음 단계:")
            print("  1. dist/AUTUS_Bridge.exe를 USB에 복사")
            print("  2. 매장 PC에 Tesseract OCR 설치")
            print("  3. AUTUS_Bridge.exe 실행")
            return True
        else:
            print(f"\n[!] 빌드 실패:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"\n[!] 빌드 오류: {e}")
        return False


def create_installer_package():
    """설치 패키지 구성"""
    script_dir = Path(__file__).parent
    dist_dir = script_dir / "dist"
    package_dir = dist_dir / "AUTUS_Bridge_Package"
    
    if not (dist_dir / "AUTUS_Bridge.exe").exists():
        print("[!] EXE 파일이 없습니다. 먼저 빌드를 실행하세요.")
        return
    
    # 패키지 폴더 생성
    package_dir.mkdir(exist_ok=True)
    
    # 파일 복사
    import shutil
    shutil.copy(dist_dir / "AUTUS_Bridge.exe", package_dir)
    
    # 설치 안내 파일 생성
    install_guide = package_dir / "설치_안내서.txt"
    with open(install_guide, 'w', encoding='utf-8') as f:
        f.write("""
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AUTUS Bridge 설치 안내서                                ║
╚═══════════════════════════════════════════════════════════════════════════╝

[1단계] Tesseract OCR 설치 (최초 1회)
────────────────────────────────────────────────────────────────────────────
1. 아래 주소에서 Tesseract 설치 파일 다운로드:
   https://github.com/UB-Mannheim/tesseract/wiki

2. 설치 시 다음 옵션 선택:
   ☑ Additional language data (download)
   ☑ Korean (한국어)

3. 설치 경로는 기본값 유지:
   C:\\Program Files\\Tesseract-OCR\\


[2단계] AUTUS Bridge 실행
────────────────────────────────────────────────────────────────────────────
1. AUTUS_Bridge.exe 파일을 바탕화면에 복사

2. 더블클릭하여 실행

3. 본인의 업장 선택:
   - 학원 → ACADEMY
   - 식당 → RESTAURANT  
   - 스포츠센터 → SPORTS

4. [📐 좌표 설정] 버튼을 클릭하여 감시할 영역 지정
   - 회원관리 프로그램의 회원 정보 창에 맞춤

5. 녹색 "● SYSTEM READY"가 표시되면 정상 작동


[3단계] 자동 시작 설정 (선택)
────────────────────────────────────────────────────────────────────────────
PC 부팅 시 자동 실행하려면:

1. Win + R 키를 누르고 "shell:startup" 입력
2. 열린 폴더에 AUTUS_Bridge.exe 바로가기 복사


[문의]
────────────────────────────────────────────────────────────────────────────
서버 URL 변경이나 오류 발생 시 본사 IT팀에 문의하세요.

""")
    
    print(f"\n[✓] 설치 패키지 생성 완료: {package_dir}")


def main():
    print("""
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AUTUS Bridge Build System                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
    """)
    
    print("[1/3] 의존성 확인...")
    check_requirements()
    
    print("\n[2/3] EXE 빌드...")
    if build_exe():
        print("\n[3/3] 설치 패키지 생성...")
        create_installer_package()
    
    print("\n완료!")


if __name__ == "__main__":
    main()
