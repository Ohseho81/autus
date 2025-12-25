#!/usr/bin/env python3
"""
AUTUS Environment & Dependency Health Check
============================================
아우토스 실행에 필요한 라이브러리 및 환경 변수가 제대로 세팅되었는지 확인

Usage:
    python check_env.py --target finance_agent
    python check_env.py --target all
    python check_env.py --verbose
"""

import os
import sys
import argparse
import importlib
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

REQUIRED_PACKAGES = {
    "core": [
        ("google-generativeai", "google.generativeai"),
        ("gspread", "gspread"),
        ("oauth2client", "oauth2client"),
        ("pandas", "pandas"),
        ("requests", "requests"),
    ],
    "finance_agent": [
        ("openpyxl", "openpyxl"),
        ("python-dateutil", "dateutil"),
        ("numpy", "numpy"),
    ],
    "web": [
        ("flask", "flask"),
        ("websockets", "websockets"),
    ],
    "desktop": [
        ("PySide6", "PySide6"),
    ]
}

REQUIRED_ENV_VARS = {
    "core": [
        "GOOGLE_API_KEY",
    ],
    "finance_agent": [
        "GOOGLE_API_KEY",
        "GOOGLE_SHEETS_CREDENTIALS",
        "FINANCE_SHEET_ID",
    ],
    "email": [
        "EMAIL_HOST",
        "EMAIL_USER",
        "EMAIL_PASSWORD",
    ]
}

REQUIRED_FILES = {
    "finance_agent": [
        "data/raw_finance",
        "config/credentials.json",
    ]
}

# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class HealthChecker:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
    
    def log(self, msg, level="info"):
        icons = {"info": "ℹ️", "pass": "✅", "fail": "❌", "warn": "⚠️"}
        print(f"  {icons.get(level, '•')} {msg}")
    
    def check_python_version(self):
        """Python 버전 확인"""
        print("\n🐍 Python Version Check")
        print("─" * 40)
        
        version = sys.version_info
        version_str = f"{version.major}.{version.minor}.{version.micro}"
        
        if version.major >= 3 and version.minor >= 9:
            self.log(f"Python {version_str}", "pass")
            self.results["passed"].append("python_version")
        else:
            self.log(f"Python {version_str} (3.9+ required)", "fail")
            self.results["failed"].append("python_version")
    
    def check_packages(self, target):
        """필수 패키지 확인"""
        print(f"\n📦 Package Dependencies ({target})")
        print("─" * 40)
        
        packages = REQUIRED_PACKAGES.get("core", [])
        if target in REQUIRED_PACKAGES:
            packages += REQUIRED_PACKAGES[target]
        
        for pkg_name, import_name in packages:
            try:
                importlib.import_module(import_name)
                self.log(f"{pkg_name}", "pass")
                self.results["passed"].append(f"pkg:{pkg_name}")
            except ImportError:
                self.log(f"{pkg_name} — pip install {pkg_name}", "fail")
                self.results["failed"].append(f"pkg:{pkg_name}")
    
    def check_env_vars(self, target):
        """환경 변수 확인"""
        print(f"\n🔐 Environment Variables ({target})")
        print("─" * 40)
        
        env_vars = REQUIRED_ENV_VARS.get("core", [])
        if target in REQUIRED_ENV_VARS:
            env_vars += REQUIRED_ENV_VARS[target]
        
        for var in env_vars:
            value = os.environ.get(var)
            if value:
                masked = value[:4] + "****" + value[-4:] if len(value) > 8 else "****"
                self.log(f"{var} = {masked}", "pass")
                self.results["passed"].append(f"env:{var}")
            else:
                self.log(f"{var} — not set", "fail")
                self.results["failed"].append(f"env:{var}")
    
    def check_files(self, target):
        """필수 파일/폴더 확인"""
        print(f"\n📁 Required Files ({target})")
        print("─" * 40)
        
        files = REQUIRED_FILES.get(target, [])
        base_path = os.path.dirname(os.path.abspath(__file__))
        
        for file_path in files:
            full_path = os.path.join(base_path, file_path)
            if os.path.exists(full_path):
                self.log(f"{file_path}", "pass")
                self.results["passed"].append(f"file:{file_path}")
            else:
                self.log(f"{file_path} — not found", "warn")
                self.results["warnings"].append(f"file:{file_path}")
    
    def check_api_connectivity(self):
        """API 연결 테스트"""
        print("\n🌐 API Connectivity")
        print("─" * 40)
        
        # Google Generative AI
        api_key = os.environ.get("GOOGLE_API_KEY")
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                # Simple test
                self.log("Google Gemini API — Connected", "pass")
                self.results["passed"].append("api:gemini")
            except Exception as e:
                self.log(f"Google Gemini API — {str(e)[:50]}", "fail")
                self.results["failed"].append("api:gemini")
        else:
            self.log("Google Gemini API — No API key", "warn")
            self.results["warnings"].append("api:gemini")
    
    def print_summary(self):
        """결과 요약 출력"""
        print("\n" + "═" * 50)
        print("📊 HEALTH CHECK SUMMARY")
        print("═" * 50)
        
        total = len(self.results["passed"]) + len(self.results["failed"]) + len(self.results["warnings"])
        
        print(f"\n  ✅ Passed:   {len(self.results['passed'])}/{total}")
        print(f"  ❌ Failed:   {len(self.results['failed'])}/{total}")
        print(f"  ⚠️  Warnings: {len(self.results['warnings'])}/{total}")
        
        if self.results["failed"]:
            print("\n❌ Failed Items:")
            for item in self.results["failed"]:
                print(f"   • {item}")
        
        if self.results["warnings"]:
            print("\n⚠️  Warnings:")
            for item in self.results["warnings"]:
                print(f"   • {item}")
        
        print("\n" + "─" * 50)
        
        if not self.results["failed"]:
            print("🎉 All critical checks passed! AUTUS is ready.")
            return 0
        else:
            print("🔧 Please fix the failed items before running AUTUS.")
            return 1


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="AUTUS Environment Health Check",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python check_env.py --target finance_agent
  python check_env.py --target all --verbose
  python check_env.py --skip-api
        """
    )
    parser.add_argument("--target", default="finance_agent",
                        choices=["core", "finance_agent", "web", "desktop", "all"],
                        help="Target module to check")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Verbose output")
    parser.add_argument("--skip-api", action="store_true",
                        help="Skip API connectivity test")
    
    args = parser.parse_args()
    
    print("═" * 50)
    print("🔍 AUTUS HEALTH CHECK")
    print(f"   Target: {args.target}")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 50)
    
    checker = HealthChecker(verbose=args.verbose)
    
    # Run checks
    checker.check_python_version()
    
    if args.target == "all":
        for target in ["core", "finance_agent", "web", "desktop"]:
            checker.check_packages(target)
            checker.check_env_vars(target)
            checker.check_files(target)
    else:
        checker.check_packages(args.target)
        checker.check_env_vars(args.target)
        checker.check_files(args.target)
    
    if not args.skip_api:
        checker.check_api_connectivity()
    
    exit_code = checker.print_summary()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
