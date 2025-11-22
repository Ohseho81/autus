#!/usr/bin/env python3
"""AUTUS 경로 표준화"""
from pathlib import Path

# 프로젝트 루트 정의
PROJECT_ROOT = Path(__file__).resolve().parent

# 표준 경로
CORE_DIR = PROJECT_ROOT / "core"
PACKS_DIR = PROJECT_ROOT / "packs"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"

# 개발 팩
PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"

if __name__ == "__main__":
    print("AUTUS Path Configuration")
    print(f"ROOT: {PROJECT_ROOT}")
    print(f"CORE: {CORE_DIR}")
    print(f"PACKS: {PACKS_DIR}")
    print(f"PROTOCOLS: {PROTOCOLS_DIR}")
