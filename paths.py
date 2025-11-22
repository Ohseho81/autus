"""AUTUS Standard Paths"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
CORE_DIR = PROJECT_ROOT / "core"
PACKS_DIR = PROJECT_ROOT / "packs"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
SERVER_DIR = PROJECT_ROOT / "server"
PACKS_DEVELOPMENT_DIR = PACKS_DIR / "development"
PACKS_EXAMPLES_DIR = PACKS_DIR / "examples"
PACKS_INTEGRATION_DIR = PACKS_DIR / "integration"
