#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()



















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS Bridge Ultimate - Windows EXE 빌드 스크립트
=================================================

사용법:
    python build_ultimate.py

요구사항:
    pip install pyinstaller

결과:
    dist/AUTUS_Bridge_Ultimate.exe
"""

import subprocess
import sys
import os
from pathlib import Path


def check_pyinstaller():
    """PyInstaller 설치 확인"""
    try:
        import PyInstaller
        print(f"✅ PyInstaller {PyInstaller.__version__} 발견")
        return True
    except ImportError:
        print("❌ PyInstaller가 설치되지 않았습니다.")
        print("   설치: pip install pyinstaller")
        return False


def build():
    """EXE 빌드"""
    if not check_pyinstaller():
        sys.exit(1)
    
    # 현재 디렉토리
    script_dir = Path(__file__).parent
    main_script = script_dir / "autus_bridge_ultimate.py"
    
    if not main_script.exists():
        print(f"❌ {main_script} 파일을 찾을 수 없습니다.")
        sys.exit(1)
    
    print("🔨 빌드 시작...")
    print(f"   소스: {main_script}")
    
    # PyInstaller 옵션
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",          # 콘솔 창 숨김
        "--onefile",            # 단일 EXE 파일
        "--name=AUTUS_Bridge_Ultimate",
        "--clean",              # 이전 빌드 캐시 삭제
        # 아이콘 (있는 경우)
        # "--icon=icon.ico",
        str(main_script)
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ 빌드 완료!")
        print(f"   결과: {script_dir / 'dist' / 'AUTUS_Bridge_Ultimate.exe'}")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 빌드 실패: {e}")
        sys.exit(1)


def clean():
    """빌드 캐시 정리"""
    import shutil
    
    script_dir = Path(__file__).parent
    
    dirs_to_clean = ["build", "__pycache__"]
    files_to_clean = ["*.spec"]
    
    for d in dirs_to_clean:
        path = script_dir / d
        if path.exists():
            shutil.rmtree(path)
            print(f"🗑️ 삭제: {path}")
    
    for pattern in files_to_clean:
        for f in script_dir.glob(pattern):
            f.unlink()
            print(f"🗑️ 삭제: {f}")
    
    print("✅ 정리 완료")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AUTUS Bridge Ultimate 빌드")
    parser.add_argument("--clean", action="store_true", help="빌드 캐시 정리")
    
    args = parser.parse_args()
    
    if args.clean:
        clean()
    else:
        build()

























