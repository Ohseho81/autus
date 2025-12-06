#!/usr/bin/env python3
"""AUTUS Universal Structure Restructure Tool"""

import os
import sys
import shutil
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class AUTUSRestructure:
    STANDARD_STRUCTURE = {
        "core": ["engine", "llm", "pack"],
        "protocols": ["auth", "memory", "reality", "rules"],
        "packs": ["development", "integration", "examples"],
        "api": ["routes", "middleware"],
        "services": [],
        "workers": [],
        "plugins": ["installed"],
        "evolved": [],
        "specs": [],
        "sdk": ["python", "javascript"],
        "web": [],
        "tests": [],
        "docs": ["api", "guides"],
        "scripts": [],
        "logs": ["archive"],
        "archive": [],
        "config": [],
    }

    def __init__(self, root_path: str = "."):
        self.root = Path(root_path).resolve()
        self.backup_dir = None
        self.log = []
        self.stats = {"moved": 0, "deleted": 0, "created": 0, "updated": 0}

    def log_action(self, action: str):
        print(f"  -> {action}")
        self.log.append(action)

    def create_backup(self):
        print("\n[1] Backup")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir = self.root / f".backup_{timestamp}"
        self.backup_dir.mkdir(exist_ok=True)
        for item in ["src", "main.py", "api", "core", "protocols"]:
            src = self.root / item
            if src.exists():
                dst = self.backup_dir / item
                if src.is_dir():
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)
                self.log_action(f"Backup: {item}")

    def create_standard_structure(self):
        print("\n[2] Create Structure")
        for folder, subs in self.STANDARD_STRUCTURE.items():
            path = self.root / folder
            if not path.exists():
                path.mkdir(parents=True, exist_ok=True)
                self.log_action(f"Created: {folder}/")
                self.stats["created"] += 1
            init = path / "__init__.py"
            if not init.exists() and folder not in ["docs", "logs", "archive", "specs", "web"]:
                init.touch()
            for sub in subs:
                sub_path = path / sub
                if not sub_path.exists():
                    sub_path.mkdir(parents=True, exist_ok=True)
                    self.stats["created"] += 1

    def migrate_from_src(self):
        print("\n[3] Migrate src/")
        src_dir = self.root / "src"
        if not src_dir.exists():
            self.log_action("No src/ found")
            return
        for item in src_dir.iterdir():
            if item.name.startswith(".") or item.name == "__pycache__":
                continue
            dst = self.root / item.name
            if item.is_dir():
                if dst.exists():
                    for f in item.rglob("*"):
                        if f.is_file():
                            rel = f.relative_to(item)
                            target = dst / rel
                            target.parent.mkdir(parents=True, exist_ok=True)
                            if not target.exists():
                                shutil.copy2(f, target)
                                self.stats["moved"] += 1
                else:
                    shutil.move(str(item), str(dst))
                    self.stats["moved"] += 1
                self.log_action(f"Moved: src/{item.name}/ -> {item.name}/")
        if src_dir.exists():
            shutil.rmtree(src_dir)
            self.log_action("Deleted: src/")

    def clean_cache(self):
        print("\n[4] Clean Cache")
        for pattern in ["__pycache__", ".pytest_cache"]:
            for path in self.root.rglob(pattern):
                if ".venv" in str(path) or ".backup_" in str(path):
                    continue
                try:
                    shutil.rmtree(path)
                    self.stats["deleted"] += 1
                except:
                    pass

    def organize_root_files(self):
        print("\n[5] Organize Files")
        moves = [
            ("main.py.backup", "archive/main.py.backup"),
            ("test_memory.yaml", "tests/test_memory.yaml"),
            ("standard.py", "core/standard.py"),
        ]
        for src, dst in moves:
            src_path = self.root / src
            dst_path = self.root / dst
            if src_path.exists():
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src_path), str(dst_path))
                self.log_action(f"Moved: {src} -> {dst}")
                self.stats["moved"] += 1

    def update_imports(self):
        print("\n[6] Update Imports")
        replacements = [("from ", "from "), ("import ", "import ")]
        updated = 0
        for py in self.root.rglob("*.py"):
            if ".venv" in str(py) or ".backup_" in str(py):
                continue
            try:
                content = py.read_text(encoding="utf-8")
                new = content
                for old, repl in replacements:
                    new = new.replace(old, repl)
                if new != content:
                    py.write_text(new, encoding="utf-8")
                    updated += 1
                    self.stats["updated"] += 1
            except:
                pass
        self.log_action(f"Updated {updated} files")

    def update_conftest(self):
        print("\n[7] Update conftest.py")
        path = self.root / "tests" / "conftest.py"
        content = "import sys\nfrom pathlib import Path\nroot = Path(__file__).parent.parent\nsys.path.insert(0, str(root))\n"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        self.log_action("Updated: tests/conftest.py")

    def verify(self):
        print("\n[8] Verify")
        for item in ["core", "protocols", "packs", "api", "main.py"]:
            path = self.root / item
            status = "OK" if path.exists() else "MISSING"
            self.log_action(f"{item}: {status}")

    def run(self, skip_backup=False, dry_run=False):
        print("=" * 50)
        print("AUTUS Structure Restructure Tool")
        print(f"Target: {self.root}")
        print("=" * 50)
        if dry_run:
            print("DRY RUN - no changes")
            return
        if not skip_backup:
            self.create_backup()
        self.create_standard_structure()
        self.migrate_from_src()
        self.clean_cache()
        self.organize_root_files()
        self.update_imports()
        self.update_conftest()
        self.verify()
        print("\n" + "=" * 50)
        print(f"Created: {self.stats['created']}")
        print(f"Moved: {self.stats['moved']}")
        print(f"Deleted: {self.stats['deleted']}")
        print(f"Updated: {self.stats['updated']}")
        print("=" * 50)
        print("Done!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("path", nargs="?", default=".")
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-backup", action="store_true")
    args = parser.parse_args()
    if not args.run and not args.dry_run:
        print("Usage: python scripts/restructure.py --run")
        sys.exit(0)
    tool = AUTUSRestructure(args.path)
    tool.run(skip_backup=args.skip_backup, dry_run=args.dry_run)
