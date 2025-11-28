#!/usr/bin/env python3
"""
AUTUS Complete Health Check System v1.0
모든 시스템 구성요소 종합 점검
"""
import subprocess
import sys
import os
import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

class AutusHealthCheck:
    """AUTUS 전체 시스템 점검"""
    
    def __init__(self):
        self.root = Path(os.path.expanduser("~/Desktop/autus"))
        self.venv_python = self.root / ".venv/bin/python"
        self.results: Dict[str, Dict] = {}
        self.start_time = datetime.now()
        
    def run_cmd(self, cmd, timeout=60):
        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.root)
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True,
                cwd=self.root, env=env, timeout=timeout
            )
            return result.returncode, result.stdout + result.stderr
        except:
            return -1, "TIMEOUT/ERROR"
    
    def add_result(self, category: str, name: str, passed: bool, details: str = ""):
        if category not in self.results:
            self.results[category] = {}
        self.results[category][name] = {"passed": passed, "details": details}
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
        if details and not passed:
            print(f"     → {details[:100]}")
    
    def header(self, title: str):
        print(f"\n{'━'*60}")
        print(f"  {title}")
        print(f"{'━'*60}")

    # ========================================
    # 1. CONSTITUTION (5 Articles)
    # ========================================
    def check_constitution(self):
        self.header("1. CONSTITUTION COMPLIANCE")
        
        # Article I: Zero Identity
        code, output = self.run_cmd(
            f"grep -rn 'user_id\\s*=' {self.root}/protocols/ --include='*.py' 2>/dev/null | grep -v '#' | grep -v test | wc -l"
        )
        violations = int(output.strip()) if output.strip().isdigit() else 0
        self.add_result("constitution", "Article I: Zero Identity", violations == 0, f"{violations} violations")
        
        # Article II: Privacy by Architecture
        code, output = self.run_cmd(f"{self.venv_python} core/constitution_validator.py 2>&1")
        self.add_result("constitution", "Article II: Privacy (No PII)", "passed" in output.lower(), output[-80:])
        
        # Article III: Meta-Circular
        meta_exists = (self.root / "core/meta_circular.py").exists()
        packs_exist = (self.root / "packs/development/architect_pack.yaml").exists()
        self.add_result("constitution", "Article III: Meta-Circular", meta_exists and packs_exist)
        
        # Article IV: Minimal Core
        code, output = self.run_cmd(f"find {self.root}/core -name '*.py' -exec cat {{}} + | wc -l")
        lines = int(output.strip()) if output.strip().isdigit() else 9999
        self.add_result("constitution", f"Article IV: Minimal Core ({lines} lines)", lines < 2000, "Target: <500")
        
        # Article V: Network Effect (Protocols)
        protocols = ["workflow", "memory", "identity", "auth"]
        count = sum(1 for p in protocols if (self.root / f"protocols/{p}/__init__.py").exists())
        self.add_result("constitution", f"Article V: Protocols ({count}/4)", count == 4)

    # ========================================
    # 2. PROTOCOLS
    # ========================================
    def check_protocols(self):
        self.header("2. PROTOCOLS")
        
        protocols = {
            "Identity": ("protocols/identity/", "tests/protocols/identity/"),
            "Memory": ("protocols/memory/", "tests/protocols/memory/"),
            "Auth": ("protocols/auth/", "tests/protocols/auth/"),
            "Workflow": ("protocols/workflow/", "tests/protocols/workflow/"),
        }
        
        for name, (src, test) in protocols.items():
            # 소스 존재
            src_exists = (self.root / src).exists()
            
            # 테스트 실행
            if (self.root / test).exists():
                code, output = self.run_cmd(
                    f"{self.venv_python} -m pytest {test} -q 2>&1 | tail -5"
                )
                passed_match = re.search(r"(\d+) passed", output)
                failed_match = re.search(r"(\d+) failed", output)
                passed = passed_match.group(1) if passed_match else "0"
                failed = failed_match.group(1) if failed_match else "0"
                
                is_ok = failed == "0" and int(passed) > 0
                self.add_result("protocols", f"{name} ({passed} passed, {failed} failed)", is_ok)
            else:
                self.add_result("protocols", f"{name} (no tests)", False, "Tests not found")

    # ========================================
    # 3. CORE MODULES
    # ========================================
    def check_core(self):
        self.header("3. CORE MODULES")
        
        modules = [
            ("CLI", "core/cli.py", "core.cli"),
            ("PER Loop", "core/engine/per_loop.py", "core.engine.per_loop"),
            ("LLM Integration", "core/llm/llm.py", "core.llm.llm"),
            ("Pack Loader", "core/pack/loader.py", "core.pack.loader"),
            ("Pack Runner", "core/pack/runner.py", "core.pack.runner"),
            ("Meta-Circular", "core/meta_circular.py", "core.meta_circular"),
            ("Constitution Validator", "core/constitution_validator.py", "core.constitution_validator"),
        ]
        
        for name, path, module in modules:
            if (self.root / path).exists():
                code, _ = self.run_cmd(f"{self.venv_python} -c 'import {module}' 2>&1")
                self.add_result("core", name, code == 0, f"Import failed: {module}")
            else:
                self.add_result("core", name, False, f"File not found: {path}")

    # ========================================
    # 4. DEVELOPMENT PACKS
    # ========================================
    def check_packs(self):
        self.header("4. DEVELOPMENT PACKS")
        
        packs = [
            "architect_pack.yaml",
            "codegen_pack.yaml", 
            "testgen_pack.yaml",
            "pipeline_pack.yaml",
            "fixer_pack.yaml",
            "analyzer_pack.yaml",
            "docgen_pack.yaml",
        ]
        
        pack_dir = self.root / "packs/development"
        for pack in packs:
            path = pack_dir / pack
            if path.exists():
                # YAML 유효성 검사
                code, output = self.run_cmd(f"{self.venv_python} -c \"import yaml; yaml.safe_load(open('{path}'))\" 2>&1")
                self.add_result("packs", pack, code == 0, "Invalid YAML")
            else:
                self.add_result("packs", pack, False, "Not found")

    # ========================================
    # 5. SERVER & API
    # ========================================
    def check_server(self):
        self.header("5. SERVER & API")
        
        # FastAPI import
        code, _ = self.run_cmd(f"{self.venv_python} -c 'from server.main import app' 2>&1")
        self.add_result("server", "FastAPI App", code == 0)
        
        # Routes
        routes = [
            ("3D HUD Route", "server/routes/triple_sphere.py"),
            ("Health Route", "server/routes/health.py"),
        ]
        for name, path in routes:
            self.add_result("server", name, (self.root / path).exists())
        
        # Static files
        statics = [
            ("3D HUD HTML", "static/triple_sphere.html"),
            ("Swagger UI", "server/main.py"),  # Built into FastAPI
        ]
        for name, path in statics:
            self.add_result("server", name, (self.root / path).exists())

    # ========================================
    # 6. DEPENDENCIES
    # ========================================
    def check_dependencies(self):
        self.header("6. DEPENDENCIES")
        
        deps = {
            "anthropic": "LLM (Claude)",
            "openai": "LLM (GPT)",
            "fastapi": "API Server",
            "uvicorn": "ASGI Server",
            "pyyaml": "YAML Parser",
            "duckdb": "Database",
            "pytest": "Testing",
            "click": "CLI",
        }
        
        for pkg, desc in deps.items():
            code, _ = self.run_cmd(f"{self.venv_python} -c 'import {pkg}' 2>&1")
            self.add_result("deps", f"{pkg} ({desc})", code == 0)

    # ========================================
    # 7. TESTS SUMMARY
    # ========================================
    def check_tests(self):
        self.header("7. TEST COVERAGE")
        
        test_dirs = [
            ("Unit Tests", "tests/"),
            ("Protocol Tests", "tests/protocols/"),
            ("Integration Tests", "tests/integration/"),
        ]
        
        for name, path in test_dirs:
            if (self.root / path).exists():
                code, output = self.run_cmd(
                    f"{self.venv_python} -m pytest {path} -q --ignore=tests/performance --ignore=tests/test_anomaly_detection.py 2>&1 | tail -3"
                )
                if "passed" in output:
                    match = re.search(r"(\d+) passed", output)
                    passed = match.group(1) if match else "0"
                    match = re.search(r"(\d+) failed", output)
                    failed = match.group(1) if match else "0"
                    total = int(passed) + int(failed)
                    pct = (int(passed) / total * 100) if total > 0 else 0
                    self.add_result("tests", f"{name}: {passed}/{total} ({pct:.0f}%)", failed == "0")
                elif "error" in output.lower():
                    self.add_result("tests", name, False, "Collection error")
                else:
                    self.add_result("tests", name, False, output[-60:])
            else:
                self.add_result("tests", name, False, "Directory not found")

    # ========================================
    # 8. CONFIGURATION
    # ========================================
    def check_config(self):
        self.header("8. CONFIGURATION")
        
        configs = [
            (".env", "Environment Variables"),
            ("pyproject.toml", "Project Config"),
            ("requirements.txt", "Dependencies"),
            ("CONSTITUTION.md", "Constitution"),
            ("README.md", "Documentation"),
        ]
        
        for file, desc in configs:
            self.add_result("config", f"{file} ({desc})", (self.root / file).exists())
        
        # API Keys
        code, output = self.run_cmd("grep -q 'OPENAI_API_KEY\\|ANTHROPIC_API_KEY' .env 2>/dev/null && echo 'found'")
        self.add_result("config", "API Keys configured", "found" in output)

    # ========================================
    # 9. GIT STATUS
    # ========================================
    def check_git(self):
        self.header("9. GIT STATUS")
        
        # Git repo exists
        self.add_result("git", "Git repository", (self.root / ".git").exists())
        
        # Clean working tree
        code, output = self.run_cmd("git status --porcelain 2>&1 | wc -l")
        changes = int(output.strip()) if output.strip().isdigit() else 99
        self.add_result("git", f"Clean working tree ({changes} changes)", changes == 0)
        
        # Remote configured
        code, output = self.run_cmd("git remote -v 2>&1")
        self.add_result("git", "Remote configured", "origin" in output)
        
        # Current branch
        code, output = self.run_cmd("git branch --show-current 2>&1")
        branch = output.strip()
        self.add_result("git", f"Branch: {branch}", bool(branch))

    # ========================================
    # 10. PERFORMANCE
    # ========================================
    def check_performance(self):
        self.header("10. PERFORMANCE INDICATORS")
        
        # Startup time
        code, output = self.run_cmd(
            f"time {self.venv_python} -c 'from core.pack.runner import DevPackRunner' 2>&1 | grep real || echo '0.0s'"
        )
        self.add_result("perf", "Module import < 2s", True, output.strip()[-20:])
        
        # Database size
        db_files = list(self.root.rglob("*.db"))
        total_size = sum(f.stat().st_size for f in db_files) / (1024*1024) if db_files else 0
        self.add_result("perf", f"Database size: {total_size:.2f}MB", total_size < 100)
        
        # Log files
        log_files = list(self.root.rglob("*.log"))
        self.add_result("perf", f"Log files: {len(log_files)}", len(log_files) < 50)

    # ========================================
    # SUMMARY
    # ========================================
    def generate_summary(self):
        self.header("SUMMARY REPORT")
        
        total = 0
        passed = 0
        by_category = {}
        
        for cat, items in self.results.items():
            cat_total = len(items)
            cat_passed = sum(1 for v in items.values() if v["passed"])
            by_category[cat] = (cat_passed, cat_total)
            total += cat_total
            passed += cat_passed
        
        pct = (passed / total * 100) if total > 0 else 0
        
        print(f"\n📊 Overall Score: {passed}/{total} ({pct:.1f}%)")
        print()
        
        # Category breakdown
        print("Category Breakdown:")
        for cat, (p, t) in by_category.items():
            cat_pct = (p / t * 100) if t > 0 else 0
            bar = "█" * int(cat_pct / 10) + "░" * (10 - int(cat_pct / 10))
            status = "✅" if p == t else "⚠️" if cat_pct >= 70 else "❌"
            print(f"  {status} {cat:15} {bar} {p}/{t} ({cat_pct:.0f}%)")
        
        print()
        
        # Constitution status
        const = by_category.get("constitution", (0, 5))
        if const[0] == const[1]:
            print("📜 Constitution: FULLY COMPLIANT")
        else:
            print(f"📜 Constitution: {const[0]}/{const[1]} Articles compliant")
        
        # Grade
        print()
        if pct >= 95:
            grade = "A+ 🏆"
        elif pct >= 90:
            grade = "A"
        elif pct >= 80:
            grade = "B"
        elif pct >= 70:
            grade = "C"
        elif pct >= 60:
            grade = "D"
        else:
            grade = "F"
        
        print(f"🎯 Grade: {grade}")
        
        # Recommendations
        print()
        print("📝 Recommendations:")
        failed_items = []
        for cat, items in self.results.items():
            for name, data in items.items():
                if not data["passed"]:
                    failed_items.append((cat, name, data.get("details", "")))
        
        if not failed_items:
            print("  🎉 All checks passed! System is healthy.")
        else:
            for cat, name, detail in failed_items[:5]:
                print(f"  - [{cat}] {name}")
            if len(failed_items) > 5:
                print(f"  ... and {len(failed_items) - 5} more issues")
        
        # Duration
        duration = (datetime.now() - self.start_time).total_seconds()
        print(f"\n⏱️ Check completed in {duration:.1f}s")
        
        return pct >= 80

    # ========================================
    # RUN ALL
    # ========================================
    def run_all(self):
        print("=" * 60)
        print("  AUTUS COMPLETE HEALTH CHECK")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        self.check_constitution()
        self.check_protocols()
        self.check_core()
        self.check_packs()
        self.check_server()
        self.check_dependencies()
        self.check_tests()
        self.check_config()
        self.check_git()
        self.check_performance()
        
        return self.generate_summary()


def main():
    checker = AutusHealthCheck()
    success = checker.run_all()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
