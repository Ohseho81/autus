#!/usr/bin/env python3
"""
AUTUS Auto-Development Script
Meta-Circular Development: AUTUS develops AUTUS

Note: This script is now replaced by evolution_orchestrator.py and main.py
For auto-evolution, use: python evolution_orchestrator.py <spec_path>

Legacy Usage (archived):
    python auto_dev.py --single    # Develop single feature
    python auto_dev.py             # Develop all pending features
    python auto_dev.py --list      # List backlog
    python auto_dev.py --status    # Show status

Status: ARCHIVED - See evolution_orchestrator.py for current implementation
"""

import yaml
import json
import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests


class AutoDeveloper:
    def __init__(self, backlog_path: str = "specs/backlog.yaml"):
        self.backlog_path = Path(backlog_path)
        self.backlog = self._load_backlog()
        self.settings = self.backlog.get("auto_dev", {})
        self.api_base = self.settings.get("api_base_url", "http://127.0.0.1:8003")
        self.output_dir = Path(self.settings.get("output_dir", "auto_generated"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_backlog(self) -> dict:
        """Load backlog from YAML file"""
        if not self.backlog_path.exists():
            print(f"❌ Backlog not found: {self.backlog_path}")
            sys.exit(1)
        
        with open(self.backlog_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _save_backlog(self):
        """Save backlog back to YAML file"""
        with open(self.backlog_path, 'w') as f:
            yaml.dump(self.backlog, f, default_flow_style=False, allow_unicode=True)
    
    def list_features(self):
        """List all features in backlog"""
        print("\n" + "=" * 60)
        print("📋 AUTUS Auto-Development Backlog")
        print("=" * 60)
        
        for item in self.backlog.get("backlog", []):
            status_emoji = {
                "pending": "⏳",
                "in_progress": "🔄",
                "completed": "✅",
                "blocked": "🚫"
            }.get(item["status"], "❓")
            
            print(f"\n{status_emoji} [{item['priority']}] {item['name']}")
            print(f"   ID: {item['id']}")
            print(f"   Layer: {item['layer']} | Pillar: {item['pillar']}")
            print(f"   Source: {item['source']}")
            print(f"   Status: {item['status']}")
        
        print("\n" + "-" * 60)
        stats = self.backlog.get("stats", {})
        print(f"Total: {stats.get('total', 0)} | "
              f"Pending: {stats.get('pending', 0)} | "
              f"Completed: {stats.get('completed', 0)}")
        print("=" * 60 + "\n")
    
    def show_status(self):
        """Show current development status"""
        print("\n🔧 AUTUS Auto-Development Status")
        print("-" * 40)
        print(f"API Base: {self.api_base}")
        print(f"Output Dir: {self.output_dir}")
        print(f"Backlog: {self.backlog_path}")
        
        # Check API health
        try:
            resp = requests.get(f"{self.api_base}/health", timeout=5)
            if resp.status_code == 200:
                print(f"API Status: ✅ Online")
            else:
                print(f"API Status: ⚠️ Status {resp.status_code}")
        except Exception as e:
            print(f"API Status: ❌ Offline ({e})")
        
        print("-" * 40 + "\n")
    
    def get_next_pending(self) -> dict:
        """Get next pending feature by priority"""
        for item in sorted(self.backlog.get("backlog", []), key=lambda x: x["priority"]):
            if item["status"] == "pending":
                return item
        return None
    
    def call_architect(self, feature: dict) -> dict:
        """Call architect_pack to generate design"""
        print(f"\n📐 Calling Architect Pack for: {feature['name']}")
        
        description = f"""
Feature: {feature['name']}
Description: {feature['description']}
Layer: {feature['layer']}
Pillar: {feature['pillar']}
Source: {feature['source']}

Requirements:
{chr(10).join('- ' + r for r in feature.get('requirements', []))}

API Endpoints:
{chr(10).join('- ' + e for e in feature.get('api_endpoints', []))}

Files to generate:
{chr(10).join('- ' + f for f in feature.get('files_to_generate', []))}
"""
        
        try:
            resp = requests.post(
                f"{self.api_base}/packs/architect",
                params={"feature_description": description},
                timeout=60
            )
            if resp.status_code == 200:
                result = resp.json()
                print(f"   ✅ Architecture generated")
                return result
            else:
                print(f"   ❌ Architect failed: {resp.status_code}")
                return {"error": resp.text}
        except Exception as e:
            print(f"   ❌ Architect error: {e}")
            return {"error": str(e)}
    
    def call_codegen(self, file_path: str, purpose: str) -> dict:
        """Call codegen_pack to generate code"""
        print(f"\n💻 Generating: {file_path}")
        
        try:
            resp = requests.post(
                f"{self.api_base}/packs/codegen",
                params={"file_path": file_path, "purpose": purpose},
                timeout=60
            )
            if resp.status_code == 200:
                result = resp.json()
                print(f"   ✅ Code generated")
                return result
            else:
                print(f"   ❌ Codegen failed: {resp.status_code}")
                return {"error": resp.text}
        except Exception as e:
            print(f"   ❌ Codegen error: {e}")
            return {"error": str(e)}
    
    def save_generated_file(self, feature_id: str, file_path: str, content: str):
        """Save generated content to file"""
        # Create feature directory
        feature_dir = self.output_dir / feature_id
        feature_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file
        output_path = feature_dir / Path(file_path).name
        with open(output_path, 'w') as f:
            f.write(content)
        
        print(f"   💾 Saved: {output_path}")
        return output_path
    
    def git_commit(self, feature_name: str):
        """Commit changes to git"""
        if not self.settings.get("commit_after_each", True):
            return
        
        message = self.settings.get(
            "commit_message_template", 
            "feat(auto): {feature_name}"
        ).format(feature_name=feature_name)
        
        try:
            subprocess.run(["git", "add", "-A"], check=True, capture_output=True)
            subprocess.run(["git", "commit", "-m", message], check=True, capture_output=True)
            print(f"   📦 Git commit: {message}")
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Git commit skipped (no changes or error)")
    
    def update_feature_status(self, feature_id: str, status: str):
        """Update feature status in backlog"""
        for item in self.backlog.get("backlog", []):
            if item["id"] == feature_id:
                item["status"] = status
                item["updated_at"] = datetime.now().isoformat()
                break
        
        # Update stats
        stats = {"pending": 0, "in_progress": 0, "completed": 0, "blocked": 0}
        for item in self.backlog.get("backlog", []):
            stats[item["status"]] = stats.get(item["status"], 0) + 1
        stats["total"] = len(self.backlog.get("backlog", []))
        self.backlog["stats"] = stats
        
        self._save_backlog()
    
    def develop_feature(self, feature: dict) -> bool:
        """Develop a single feature"""
        print("\n" + "=" * 60)
        print(f"🚀 Developing: {feature['name']}")
        print(f"   Layer: {feature['layer']} | Pillar: {feature['pillar']}")
        print("=" * 60)
        
        # Update status to in_progress
        self.update_feature_status(feature["id"], "in_progress")
        
        # Step 1: Call Architect
        arch_result = self.call_architect(feature)
        if "error" in arch_result:
            print(f"\n❌ Architecture generation failed")
            self.update_feature_status(feature["id"], "blocked")
            return False
        
        # Save architecture
        arch_path = self.save_generated_file(
            feature["id"],
            "architecture.json",
            json.dumps(arch_result, indent=2, ensure_ascii=False)
        )
        
        # Step 2: Generate code for each file
        generated_files = []
        for file_path in feature.get("files_to_generate", []):
            purpose = f"Part of {feature['name']}: {feature['description']}"
            code_result = self.call_codegen(file_path, purpose)
            
            if "error" not in code_result:
                content = code_result.get("code", code_result.get("output", str(code_result)))
                saved_path = self.save_generated_file(feature["id"], file_path, content)
                generated_files.append(saved_path)
        
        # Step 3: Git commit
        self.git_commit(feature["name"])
        
        # Step 4: Update status
        self.update_feature_status(feature["id"], "completed")
        
        print("\n" + "-" * 60)
        print(f"✅ Completed: {feature['name']}")
        print(f"   Generated {len(generated_files)} files")
        print("-" * 60 + "\n")
        
        return True
    
    def develop_single(self):
        """Develop next pending feature"""
        feature = self.get_next_pending()
        if not feature:
            print("✅ No pending features in backlog!")
            return
        
        self.develop_feature(feature)
    
    def develop_all(self):
        """Develop all pending features"""
        import time
        
        while True:
            feature = self.get_next_pending()
            if not feature:
                print("\n🎉 All features completed!")
                break
            
            self.develop_feature(feature)
            
            delay = self.settings.get("delay_between_features_sec", 5)
            print(f"⏳ Waiting {delay}s before next feature...")
            time.sleep(delay)


def main():
    parser = argparse.ArgumentParser(description="AUTUS Auto-Development")
    parser.add_argument("--single", action="store_true", help="Develop single feature")
    parser.add_argument("--list", action="store_true", help="List backlog")
    parser.add_argument("--status", action="store_true", help="Show status")
    parser.add_argument("--backlog", default="specs/backlog.yaml", help="Backlog file path")
    
    args = parser.parse_args()
    
    dev = AutoDeveloper(args.backlog)
    
    if args.list:
        dev.list_features()
    elif args.status:
        dev.show_status()
    elif args.single:
        dev.develop_single()
    else:
        dev.develop_all()


if __name__ == "__main__":
    main()



