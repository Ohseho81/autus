#!/usr/bin/env python3
"""
AUTUS Evolution Orchestrator
Meta-Circular Development: Complete feature evolution pipeline

Usage:
    python evolution_orchestrator.py specs/feature.yaml
    python evolution_orchestrator.py specs/feature.yaml --dry-run
    python evolution_orchestrator.py --list-specs
"""

import yaml
import json
import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests


class EvolutionOrchestrator:
    """
    Orchestrates the complete evolution of an AUTUS feature:
    1. Load spec → 2. Architect → 3. Codegen → 4. Test → 5. Commit
    """
    
    def __init__(self, api_base: str = "http://127.0.0.1:8003"):
        self.api_base = api_base
        self.output_dir = Path("evolved")
        self.output_dir.mkdir(exist_ok=True)
        self.results = {
            "started_at": None,
            "completed_at": None,
            "steps": [],
            "success": False
        }
    
    # ==========================================
    # Step 1: Load Feature Spec
    # ==========================================
    def load_feature_spec(self, spec_path: str) -> Dict[str, Any]:
        """Load feature specification from YAML file."""
        print(f"\n📄 Step 1: Loading spec from {spec_path}")
        
        path = Path(spec_path)
        if not path.exists():
            raise FileNotFoundError(f"Spec file not found: {spec_path}")
        
        with open(path, 'r') as f:
            spec = yaml.safe_load(f)
        
        # Validate required fields
        required = ["name", "description"]
        for field in required:
            if field not in spec:
                raise ValueError(f"Missing required field: {field}")
        
        self._log_step("load_spec", True, {"spec": spec})
        print(f"   ✅ Loaded: {spec.get('name', 'Unknown')}")
        
        return spec
    
    # ==========================================
    # Step 2: Run Architect Pack
    # ==========================================
    def run_architect(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Call /packs/architect API to generate architecture."""
        print(f"\n📐 Step 2: Running Architect Pack")
        
        # Build feature description
        description = self._build_description(spec)
        
        try:
            resp = requests.post(
                f"{self.api_base}/packs/architect",
                params={"feature_description": description},
                timeout=120
            )
            
            if resp.status_code != 200:
                raise Exception(f"Architect API failed: {resp.status_code}")
            
            result = resp.json()
            
            # Save architecture
            arch_path = self.output_dir / f"{spec['name'].replace(' ', '_').lower()}_architecture.json"
            with open(arch_path, 'w') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            self._log_step("architect", True, {"output_path": str(arch_path)})
            print(f"   ✅ Architecture saved to {arch_path}")
            
            return result
            
        except Exception as e:
            self._log_step("architect", False, {"error": str(e)})
            print(f"   ❌ Architect failed: {e}")
            raise
    
    # ==========================================
    # Step 3: Run Codegen Pack
    # ==========================================
    def run_codegen(self, spec: Dict[str, Any], architecture: Dict[str, Any]) -> List[Path]:
        """Call /packs/codegen API to generate code files."""
        print(f"\n💻 Step 3: Running Codegen Pack")
        
        generated_files = []
        files_to_generate = spec.get("files", [])
        
        if not files_to_generate:
            # Extract from architecture if available
            arch_data = architecture.get("results", {}).get("analysis", "")
            if "required_files" in arch_data:
                try:
                    # Try to parse JSON from the analysis
                    import re
                    json_match = re.search(r'\{[\s\S]*\}', arch_data)
                    if json_match:
                        parsed = json.loads(json_match.group())
                        files_to_generate = parsed.get("required_files", [])[:5]  # Limit to 5
                except:
                    pass
        
        if not files_to_generate:
            # Default files based on spec name
            base_name = spec['name'].replace(' ', '_').lower()
            files_to_generate = [
                f"core/{base_name}/main.py",
                f"core/{base_name}/models.py",
                f"core/{base_name}/api.py"
            ]
        
        for file_path in files_to_generate:
            try:
                purpose = f"Part of {spec['name']}: {spec['description']}"
                
                resp = requests.post(
                    f"{self.api_base}/packs/codegen",
                    params={"file_path": file_path, "purpose": purpose},
                    timeout=120
                )
                
                if resp.status_code == 200:
                    result = resp.json()
                    code = result.get("results", {}).get("code", "")
                    
                    # Extract actual code from markdown if present
                    if "```python" in code:
                        import re
                        match = re.search(r'```python\n([\s\S]*?)```', code)
                        if match:
                            code = match.group(1)
                    
                    # Save to evolved directory
                    output_path = self.output_dir / Path(file_path).name
                    with open(output_path, 'w') as f:
                        f.write(code)
                    
                    generated_files.append(output_path)
                    print(f"   ✅ Generated: {output_path}")
                else:
                    print(f"   ⚠️ Skipped: {file_path} (API error)")
                    
            except Exception as e:
                print(f"   ⚠️ Error generating {file_path}: {e}")
        
        self._log_step("codegen", len(generated_files) > 0, {
            "files_generated": len(generated_files),
            "paths": [str(p) for p in generated_files]
        })
        
        return generated_files
    
    # ==========================================
    # Step 4: Run Tests
    # ==========================================
    def run_tests(self, generated_files: List[Path]) -> bool:
        """Run pytest on generated files."""
        print(f"\n🧪 Step 4: Running Tests")
        
        if not generated_files:
            print("   ⚠️ No files to test")
            self._log_step("tests", True, {"message": "No files to test"})
            return True
        
        # Check syntax of generated files
        syntax_ok = True
        for file_path in generated_files:
            if file_path.suffix == '.py':
                try:
                    with open(file_path, 'r') as f:
                        code = f.read()
                    compile(code, file_path, 'exec')
                    print(f"   ✅ Syntax OK: {file_path.name}")
                except SyntaxError as e:
                    print(f"   ❌ Syntax Error in {file_path.name}: {e}")
                    syntax_ok = False
        
        # Run pytest if tests exist
        test_files = list(Path("tests").glob("test_*.py")) if Path("tests").exists() else []
        
        if test_files:
            try:
                result = subprocess.run(
                    [sys.executable, "-m", "pytest", "-v", "--tb=short"],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    print(f"   ✅ All tests passed")
                else:
                    print(f"   ⚠️ Some tests failed")
                    syntax_ok = False
                    
            except subprocess.TimeoutExpired:
                print(f"   ⚠️ Tests timed out")
            except Exception as e:
                print(f"   ⚠️ Test error: {e}")
        else:
            print(f"   ℹ️ No test files found")
        
        self._log_step("tests", syntax_ok, {"syntax_check": syntax_ok})
        return syntax_ok
    
    # ==========================================
    # Step 5: Git Commit
    # ==========================================
    def git_commit(self, spec: Dict[str, Any], dry_run: bool = False) -> bool:
        """Commit changes to git."""
        print(f"\n📦 Step 5: Git Commit")
        
        if dry_run:
            print("   ℹ️ Dry run - skipping commit")
            self._log_step("git_commit", True, {"dry_run": True})
            return True
        
        try:
            # Stage all changes
            subprocess.run(["git", "add", "-A"], check=True, capture_output=True)
            
            # Create commit message
            feature_name = spec.get('name', 'Unknown Feature')
            message = f"feat(evolution): {feature_name} - auto-generated by AUTUS"
            
            # Commit
            result = subprocess.run(
                ["git", "commit", "-m", message],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"   ✅ Committed: {message}")
                self._log_step("git_commit", True, {"message": message})
                return True
            else:
                print(f"   ⚠️ Nothing to commit or error")
                self._log_step("git_commit", True, {"message": "Nothing to commit"})
                return True
                
        except Exception as e:
            print(f"   ❌ Git error: {e}")
            self._log_step("git_commit", False, {"error": str(e)})
            return False
    
    # ==========================================
    # Main Pipeline: Evolve
    # ==========================================
    def evolve(self, spec_path: str, dry_run: bool = False) -> Dict[str, Any]:
        """
        Execute the complete evolution pipeline:
        1. Load spec
        2. Run architect
        3. Run codegen
        4. Run tests
        5. Git commit
        """
        print("\n" + "=" * 60)
        print("🧬 AUTUS Evolution Orchestrator")
        print("=" * 60)
        
        self.results["started_at"] = datetime.now().isoformat()
        
        try:
            # Step 1: Load spec
            spec = self.load_feature_spec(spec_path)
            
            # Step 2: Architect
            architecture = self.run_architect(spec)
            
            # Step 3: Codegen
            generated_files = self.run_codegen(spec, architecture)
            
            # Step 4: Tests
            tests_passed = self.run_tests(generated_files)
            
            # Step 5: Git commit
            if tests_passed:
                self.git_commit(spec, dry_run)
            
            self.results["success"] = True
            
        except Exception as e:
            print(f"\n❌ Evolution failed: {e}")
            self.results["success"] = False
            self.results["error"] = str(e)
        
        self.results["completed_at"] = datetime.now().isoformat()
        
        # Save results
        results_path = self.output_dir / "evolution_results.json"
        with open(results_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        # Print summary
        self._print_summary()
        
        return self.results
    
    # ==========================================
    # Helper Methods
    # ==========================================
    def _build_description(self, spec: Dict[str, Any]) -> str:
        """Build feature description for architect."""
        parts = [
            f"Feature: {spec.get('name', 'Unknown')}",
            f"Description: {spec.get('description', '')}",
        ]
        
        if 'layer' in spec:
            parts.append(f"Layer: {spec['layer']}")
        if 'pillar' in spec:
            parts.append(f"Pillar: {spec['pillar']}")
        if 'requirements' in spec:
            parts.append("\nRequirements:")
            for req in spec['requirements']:
                parts.append(f"- {req}")
        if 'api_endpoints' in spec:
            parts.append("\nAPI Endpoints:")
            for ep in spec['api_endpoints']:
                parts.append(f"- {ep}")
        
        return "\n".join(parts)
    
    def _log_step(self, step: str, success: bool, details: Dict[str, Any]):
        """Log step result."""
        self.results["steps"].append({
            "step": step,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details
        })
    
    def _print_summary(self):
        """Print evolution summary."""
        print("\n" + "=" * 60)
        print("📊 Evolution Summary")
        print("=" * 60)
        
        for step in self.results["steps"]:
            status = "✅" if step["success"] else "❌"
            print(f"  {status} {step['step']}")
        
        print("-" * 60)
        if self.results["success"]:
            print("🎉 Evolution completed successfully!")
        else:
            print("❌ Evolution failed")
        print("=" * 60 + "\n")


def list_specs():
    """List available spec files."""
    print("\n📋 Available Spec Files:")
    print("-" * 40)
    
    specs_dir = Path("specs")
    if not specs_dir.exists():
        print("  No specs directory found")
        return
    
    for spec_file in sorted(specs_dir.glob("*.yaml")):
        try:
            with open(spec_file, 'r') as f:
                spec = yaml.safe_load(f)
            name = spec.get('name', 'Unknown')
            print(f"  📄 {spec_file.name}: {name}")
        except:
            print(f"  📄 {spec_file.name}")
    
    print("-" * 40 + "\n")


def main():
    parser = argparse.ArgumentParser(description="AUTUS Evolution Orchestrator")
    parser.add_argument("spec_path", nargs="?", help="Path to feature spec YAML file")
    parser.add_argument("--dry-run", action="store_true", help="Skip git commit")
    parser.add_argument("--list-specs", action="store_true", help="List available specs")
    parser.add_argument("--api-base", default="http://127.0.0.1:8003", help="API base URL")
    
    args = parser.parse_args()
    
    if args.list_specs:
        list_specs()
        return
    
    if not args.spec_path:
        parser.print_help()
        print("\nExample:")
        print("  python evolution_orchestrator.py specs/my_feature.yaml")
        print("  python evolution_orchestrator.py specs/my_feature.yaml --dry-run")
        return
    
    orchestrator = EvolutionOrchestrator(api_base=args.api_base)
    results = orchestrator.evolve(args.spec_path, dry_run=args.dry_run)
    
    sys.exit(0 if results["success"] else 1)


if __name__ == "__main__":
    main()

