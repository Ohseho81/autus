#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🧹 AUTUS System Cleanup Script
═══════════════════════════════════════════════════════════════════════════════

중복 파일 제거 및 시스템 정리

사용법:
  python scripts/cleanup_system.py --dry-run   # 미리보기 (실제 삭제 안함)
  python scripts/cleanup_system.py             # 실제 정리 실행

정리 대상:
1. 레거시 노드 정의 파일
2. 중복 시뮬레이터/아키타입 파일
3. 사용하지 않는 엔진 파일
4. 빈 __init__.py 파일 정리
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from datetime import datetime

# 프로젝트 루트
ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"

# ═══════════════════════════════════════════════════════════════════════════════
# 삭제 대상 파일 정의
# ═══════════════════════════════════════════════════════════════════════════════

# 레거시 노드 정의 (autus_unified.py로 대체)
LEGACY_NODE_FILES = [
    "backend/core/nodes.py",          # v2.1 36노드 → deprecated
    "backend/core/nodes36.py",        # 36노드 인터페이스 → deprecated
    "backend/core/strategic_nodes.py", # 36 전략노드 → deprecated
    "backend/core/nodes.json",        # JSON 36노드 → deprecated
    "backend/core/nodes16.json",      # JSON 48노드 → autus_48nodes.json으로 통합
    "backend/core/domains16.py",      # → autus_unified.py로 통합
]

# 레거시 시뮬레이터 (autus_unified.py로 대체)
LEGACY_SIMULATOR_FILES = [
    "backend/archetypes/global_simulator.py",  # v2 시뮬레이터 → deprecated
    "backend/core/simulator_v3.py",            # → autus_unified.py로 통합
]

# 레거시 아키타입 (autus_archetypes_v3.json으로 통합)
LEGACY_ARCHETYPE_FILES = [
    "backend/archetypes/autus_archetypes.json",  # v2 아키타입 → deprecated
]

# 레거시 API (autus_unified_api.py로 대체)
LEGACY_API_FILES = [
    "backend/api/simulator_v3_api.py",  # → autus_unified_api.py로 통합
    "backend/api/universe_api.py",      # → autus_unified_api.py로 통합
    "backend/api/distribution_api.py",  # → 정리 필요
]

# 빈 또는 불필요한 모듈
EMPTY_MODULES = [
    "backend/engine_v2/__init__.py",
    "backend/autus_final/__init__.py",
]

# ═══════════════════════════════════════════════════════════════════════════════
# 정리 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_file_info(filepath: Path) -> dict:
    """파일 정보 조회"""
    if filepath.exists():
        stat = filepath.stat()
        return {
            "exists": True,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime),
        }
    return {"exists": False}


def backup_file(filepath: Path, backup_dir: Path) -> bool:
    """파일 백업"""
    if not filepath.exists():
        return False
    
    backup_dir.mkdir(parents=True, exist_ok=True)
    relative = filepath.relative_to(ROOT)
    backup_path = backup_dir / relative
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    
    shutil.copy2(filepath, backup_path)
    return True


def delete_file(filepath: Path, dry_run: bool = True) -> bool:
    """파일 삭제"""
    if not filepath.exists():
        return False
    
    if dry_run:
        print(f"  [DRY-RUN] Would delete: {filepath}")
        return True
    else:
        filepath.unlink()
        print(f"  [DELETED] {filepath}")
        return True


def cleanup_empty_dirs(path: Path, dry_run: bool = True):
    """빈 디렉토리 정리"""
    for dirpath in sorted(path.rglob("*"), reverse=True):
        if dirpath.is_dir() and not any(dirpath.iterdir()):
            if dry_run:
                print(f"  [DRY-RUN] Would remove empty dir: {dirpath}")
            else:
                dirpath.rmdir()
                print(f"  [REMOVED] Empty dir: {dirpath}")


# ═══════════════════════════════════════════════════════════════════════════════
# 메인 정리 로직
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_duplicates():
    """중복 분석"""
    print("\n" + "=" * 70)
    print("🔍 AUTUS 시스템 중복 분석")
    print("=" * 70)
    
    categories = [
        ("레거시 노드 정의", LEGACY_NODE_FILES),
        ("레거시 시뮬레이터", LEGACY_SIMULATOR_FILES),
        ("레거시 아키타입", LEGACY_ARCHETYPE_FILES),
        ("레거시 API", LEGACY_API_FILES),
        ("빈 모듈", EMPTY_MODULES),
    ]
    
    total_files = 0
    total_size = 0
    
    for category, files in categories:
        print(f"\n📁 {category}:")
        for f in files:
            filepath = ROOT / f
            info = get_file_info(filepath)
            if info["exists"]:
                total_files += 1
                total_size += info["size"]
                print(f"   ✓ {f} ({info['size']:,} bytes)")
            else:
                print(f"   ✗ {f} (not found)")
    
    print("\n" + "-" * 70)
    print(f"📊 총계: {total_files}개 파일, {total_size:,} bytes ({total_size/1024:.1f} KB)")
    print("-" * 70)
    
    return total_files, total_size


def run_cleanup(dry_run: bool = True, backup: bool = True):
    """정리 실행"""
    print("\n" + "=" * 70)
    if dry_run:
        print("🧹 AUTUS 시스템 정리 (DRY-RUN 모드)")
    else:
        print("🧹 AUTUS 시스템 정리 (실행 모드)")
    print("=" * 70)
    
    # 백업 디렉토리
    backup_dir = ROOT / "_backup" / datetime.now().strftime("%Y%m%d_%H%M%S")
    
    all_files = (
        LEGACY_NODE_FILES +
        LEGACY_SIMULATOR_FILES +
        LEGACY_ARCHETYPE_FILES +
        LEGACY_API_FILES +
        EMPTY_MODULES
    )
    
    deleted_count = 0
    
    for f in all_files:
        filepath = ROOT / f
        
        if not filepath.exists():
            continue
        
        # 백업
        if backup and not dry_run:
            backup_file(filepath, backup_dir)
        
        # 삭제
        if delete_file(filepath, dry_run):
            deleted_count += 1
    
    # 빈 디렉토리 정리
    print("\n📂 빈 디렉토리 정리:")
    cleanup_empty_dirs(BACKEND, dry_run)
    
    print("\n" + "-" * 70)
    print(f"✅ 완료: {deleted_count}개 파일 {'삭제 예정' if dry_run else '삭제됨'}")
    if backup and not dry_run:
        print(f"📦 백업 위치: {backup_dir}")
    print("-" * 70)


def update_imports():
    """import 문 업데이트 가이드"""
    print("\n" + "=" * 70)
    print("📝 Import 업데이트 가이드")
    print("=" * 70)
    
    updates = [
        ("from backend.core.nodes import ...", "from backend.core.autus_unified import ..."),
        ("from backend.core.nodes36 import ...", "from backend.core.autus_unified import ..."),
        ("from backend.core.strategic_nodes import ...", "from backend.core.autus_unified import ..."),
        ("from backend.core.simulator_v3 import ...", "from backend.core.autus_unified import ..."),
        ("from backend.archetypes.global_simulator import ...", "from backend.core.autus_unified import ..."),
    ]
    
    for old, new in updates:
        print(f"\n❌ {old}")
        print(f"✅ {new}")


# ═══════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="AUTUS 시스템 정리")
    parser.add_argument("--dry-run", action="store_true", default=True,
                       help="미리보기 모드 (기본값)")
    parser.add_argument("--execute", action="store_true",
                       help="실제 삭제 실행")
    parser.add_argument("--no-backup", action="store_true",
                       help="백업 없이 삭제")
    parser.add_argument("--analyze", action="store_true",
                       help="중복 분석만 실행")
    
    args = parser.parse_args()
    
    print("\n" + "═" * 70)
    print("🏛️ AUTUS System Cleanup v3.0")
    print("═" * 70)
    
    # 분석
    analyze_duplicates()
    
    if args.analyze:
        return
    
    # 정리 실행
    dry_run = not args.execute
    backup = not args.no_backup
    
    run_cleanup(dry_run=dry_run, backup=backup)
    
    # Import 가이드
    update_imports()
    
    if dry_run:
        print("\n⚠️  실제 삭제를 원하면: python scripts/cleanup_system.py --execute")


if __name__ == "__main__":
    main()
