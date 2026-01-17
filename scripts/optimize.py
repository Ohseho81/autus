#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🔧 AUTUS Optimizer v1.0
═══════════════════════════════════════════════════════════════════════════════

자동 최적화 스크립트:
- 중복 파일 탐지 및 삭제
- 캐시 정리
- 코드 린트
- 빌드 최적화

사용법: python scripts/optimize.py [--dry-run] [--full]

═══════════════════════════════════════════════════════════════════════════════
"""
import os
import sys
import shutil
import hashlib
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set

# 프로젝트 루트
ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
DEPLOY = FRONTEND / "deploy"

# 무시 패턴
IGNORE_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache"}
IGNORE_FILES = {".DS_Store", ".gitkeep", "*.pyc"}


def find_duplicates(directory: Path) -> Dict[str, List[Path]]:
    """동일 해시 파일 탐지"""
    hashes = defaultdict(list)
    
    for path in directory.rglob("*"):
        if path.is_file():
            if any(ignored in path.parts for ignored in IGNORE_DIRS):
                continue
            try:
                content = path.read_bytes()
                h = hashlib.md5(content).hexdigest()
                hashes[h].append(path)
            except Exception:
                pass
    
    return {k: v for k, v in hashes.items() if len(v) > 1}


def clean_pycache(directory: Path, dry_run: bool = True) -> int:
    """__pycache__ 정리"""
    count = 0
    for path in directory.rglob("__pycache__"):
        if path.is_dir():
            print(f"  🗑️ {path.relative_to(ROOT)}")
            if not dry_run:
                shutil.rmtree(path)
            count += 1
    return count


def clean_empty_dirs(directory: Path, dry_run: bool = True) -> int:
    """빈 디렉토리 정리"""
    count = 0
    for path in sorted(directory.rglob("*"), key=lambda p: -len(p.parts)):
        if path.is_dir() and not any(path.iterdir()):
            if any(ignored in path.parts for ignored in IGNORE_DIRS):
                continue
            print(f"  📂 (empty) {path.relative_to(ROOT)}")
            if not dry_run:
                path.rmdir()
            count += 1
    return count


def analyze_frontend_html() -> Dict[str, int]:
    """Frontend HTML 파일 분석"""
    stats = {}
    if DEPLOY.exists():
        for html in DEPLOY.glob("*.html"):
            size = html.stat().st_size
            stats[html.name] = size
    return dict(sorted(stats.items(), key=lambda x: -x[1]))


def analyze_backend_api() -> List[str]:
    """Backend API 파일 분석"""
    api_dir = BACKEND / "api"
    apis = []
    if api_dir.exists():
        for py in api_dir.glob("*.py"):
            if py.name != "__init__.py":
                apis.append(py.stem)
    return sorted(apis)


def run_optimization(dry_run: bool = True, full: bool = False):
    """최적화 실행"""
    print()
    print("═" * 60)
    print("  🔧 AUTUS Optimizer v1.0")
    print("═" * 60)
    print()
    
    mode = "DRY-RUN" if dry_run else "EXECUTE"
    print(f"  Mode: {mode}")
    print()
    
    # 1. 중복 파일 탐지
    print("📁 중복 파일 탐지...")
    duplicates = find_duplicates(ROOT)
    if duplicates:
        for h, paths in duplicates.items():
            print(f"  Hash {h[:8]}...:")
            for p in paths:
                print(f"    - {p.relative_to(ROOT)}")
    else:
        print("  ✅ 중복 파일 없음")
    print()
    
    # 2. 캐시 정리
    print("🧹 캐시 정리...")
    cache_count = clean_pycache(ROOT, dry_run)
    print(f"  총 {cache_count}개 __pycache__ 폴더")
    print()
    
    # 3. 빈 디렉토리 정리
    if full:
        print("📂 빈 디렉토리 정리...")
        empty_count = clean_empty_dirs(ROOT, dry_run)
        print(f"  총 {empty_count}개 빈 폴더")
        print()
    
    # 4. Frontend HTML 분석
    print("📊 Frontend HTML 파일 크기:")
    html_stats = analyze_frontend_html()
    total_size = 0
    for name, size in html_stats.items():
        kb = size / 1024
        print(f"  {name:30} {kb:6.1f} KB")
        total_size += size
    print(f"  {'─' * 40}")
    print(f"  {'Total':30} {total_size/1024:6.1f} KB")
    print()
    
    # 5. Backend API 목록
    print("🔌 Backend API 모듈:")
    apis = analyze_backend_api()
    print(f"  총 {len(apis)}개 API")
    for api in apis:
        print(f"    - {api}")
    print()
    
    # 결과
    print("═" * 60)
    if dry_run:
        print("  💡 실제 실행: python scripts/optimize.py --execute")
    else:
        print("  ✅ 최적화 완료!")
    print("═" * 60)
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AUTUS Optimizer")
    parser.add_argument("--dry-run", action="store_true", help="실행하지 않고 미리보기만")
    parser.add_argument("--execute", action="store_true", help="실제 실행")
    parser.add_argument("--full", action="store_true", help="전체 최적화 (빈 폴더 포함)")
    
    args = parser.parse_args()
    
    dry_run = not args.execute
    run_optimization(dry_run=dry_run, full=args.full)
