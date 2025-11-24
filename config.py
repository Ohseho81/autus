"""
AUTUS 프로젝트 경로 설정
모든 경로는 여기서 중앙 관리

이 파일은 AUTUS 프로젝트의 폴더 구조를 고정하고,
모든 모듈에서 일관된 경로를 사용하도록 보장합니다.
"""
from pathlib import Path

# 프로젝트 루트 (이 파일이 루트에 위치)
PROJECT_ROOT = Path(__file__).resolve().parent

# ============================================
# 핵심 디렉토리
# ============================================

CORE_DIR = PROJECT_ROOT / "core"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"
PACKS_DIR = PROJECT_ROOT / "packs"
TOOLS_DIR = PROJECT_ROOT / "tools"
DOCS_DIR = PROJECT_ROOT / "docs"
TESTS_DIR = PROJECT_ROOT / "tests"

# ============================================
# Core 하위 디렉토리
# ============================================

CORE_ENGINE_DIR = CORE_DIR / "engine"
CORE_LLM_DIR = CORE_DIR / "llm"
CORE_PACK_DIR = CORE_DIR / "pack"

# ============================================
# Pack 디렉토리
# ============================================

PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"

# ============================================
# Protocols 하위 디렉토리
# ============================================

PROTOCOLS_WORKFLOW_DIR = PROTOCOLS_DIR / "workflow"
PROTOCOLS_MEMORY_DIR = PROTOCOLS_DIR / "memory"
PROTOCOLS_IDENTITY_DIR = PROTOCOLS_DIR / "identity"
PROTOCOLS_AUTH_DIR = PROTOCOLS_DIR / "auth"

# ============================================
# 설정 및 로그 파일
# ============================================

AUTUS_CONFIG_FILE = PROJECT_ROOT / ".autus"
LOGS_DIR = PROJECT_ROOT / "logs"
CELL_LOGS_DIR = LOGS_DIR / "cells" if (PROJECT_ROOT / "logs").exists() else None

# ============================================
# 유틸리티 함수
# ============================================

def ensure_dir(path: Path) -> Path:
    """
    디렉토리가 없으면 생성하고 Path 반환

    Args:
        path: 생성할 디렉토리 경로

    Returns:
        생성된 디렉토리 Path
    """
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_pack_path(pack_name: str, category: str = None) -> Path:
    """
    Pack 파일 경로 반환

    Args:
        pack_name: Pack 이름 (예: "architect_pack")
        category: Pack 카테고리 ("development", "examples", "integration")
                 None이면 자동으로 찾음

    Returns:
        Pack 파일 경로

    Raises:
        FileNotFoundError: Pack을 찾을 수 없을 때
    """
    if category:
        pack_path = PACKS_DIR / category / f"{pack_name}.yaml"
        if pack_path.exists():
            return pack_path
        raise FileNotFoundError(f"Pack not found: {pack_name} in {category}")

    # 자동으로 찾기
    for cat_dir in [PACKS_DEVELOPMENT_DIR, PACKS_EXAMPLES_DIR, PACKS_INTEGRATION_DIR]:
        pack_path = cat_dir / f"{pack_name}.yaml"
        if pack_path.exists():
            return pack_path

    raise FileNotFoundError(f"Pack not found: {pack_name}")


def list_pack_dirs() -> list[Path]:
    """
    모든 Pack 디렉토리 목록 반환

    Returns:
        Pack 디렉토리 Path 리스트
    """
    return [
        PACKS_DEVELOPMENT_DIR,
        PACKS_EXAMPLES_DIR,
        PACKS_INTEGRATION_DIR
    ]






