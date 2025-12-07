"""
Automated Changelog Generation

Generates changelog and release notes from Git commits
"""

from pathlib import Path
from datetime import datetime
import re
from typing import List, Dict, Any
import json
import subprocess


class ChangelogGenerator:
    """Generate changelog from Git commits"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
    
    def get_commits_since_tag(self, tag: str = None) -> List[Dict[str, Any]]:
        """Get commits since last tag"""
        try:
            if tag:
                cmd = f"cd {self.repo_path} && git log {tag}..HEAD --oneline --decorate"
            else:
                cmd = f"cd {self.repo_path} && git log --oneline --decorate | head -50"
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            commits = []
            
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                    
                parts = line.split(' ', 1)
                commit_hash = parts[0]
                message = parts[1] if len(parts) > 1 else ''
                
                commits.append({
                    'hash': commit_hash,
                    'message': message,
                    'type': self._parse_commit_type(message),
                    'scope': self._parse_commit_scope(message),
                    'description': self._parse_commit_description(message)
                })
            
            return commits
        except Exception as e:
            print(f"Error getting commits: {e}")
            return []
    
    def _parse_commit_type(self, message: str) -> str:
        """Parse commit type (feat, fix, docs, etc.)"""
        # Conventional Commits format
        match = re.match(r'([a-z]+)(\(.+\))?:', message)
        if match:
            return match.group(1)
        
        # Alternative patterns
        if message.startswith('✨'):
            return 'feat'
        elif message.startswith('🐛') or message.startswith('🔧'):
            return 'fix'
        elif message.startswith('📚'):
            return 'docs'
        elif message.startswith('⚡'):
            return 'perf'
        elif message.startswith('🎨'):
            return 'style'
        elif message.startswith('♻️'):
            return 'refactor'
        elif message.startswith('🧪'):
            return 'test'
        else:
            return 'chore'
    
    def _parse_commit_scope(self, message: str) -> str:
        """Parse commit scope"""
        match = re.match(r'[a-z]+\(([^)]+)\):', message)
        return match.group(1) if match else ''
    
    def _parse_commit_description(self, message: str) -> str:
        """Parse commit description"""
        # Remove type and scope
        desc = re.sub(r'^[a-z]+(\(.+\))?:\s*', '', message)
        # Remove emoji
        desc = re.sub(r'^[✨🐛🔧📚⚡🎨♻️🧪]\s*', '', desc)
        return desc.strip()
    
    def generate_changelog(self, version: str = "Unreleased") -> str:
        """Generate changelog in Markdown format"""
        
        commits = self.get_commits_since_tag()
        
        # Group commits by type
        grouped = {}
        for commit in commits:
            commit_type = commit['type']
            if commit_type not in grouped:
                grouped[commit_type] = []
            grouped[commit_type].append(commit)
        
        # Type order and display names
        type_order = {
            'feat': ('🎉 Features', 0),
            'fix': ('🐛 Bug Fixes', 1),
            'perf': ('⚡ Performance', 2),
            'docs': ('📚 Documentation', 3),
            'style': ('🎨 Style', 4),
            'refactor': ('♻️ Refactor', 5),
            'test': ('🧪 Tests', 6),
            'chore': ('🔧 Chore', 7),
        }
        
        changelog = f"""# Changelog

## [{version}] - {datetime.now().strftime('%Y-%m-%d')}

"""
        
        # Add commits by type
        for commit_type in sorted(type_order.keys(), key=lambda x: type_order[x][1]):
            if commit_type not in grouped:
                continue
            
            display_name = type_order[commit_type][0]
            commits_of_type = grouped[commit_type]
            
            changelog += f"### {display_name}\n\n"
            
            for commit in commits_of_type:
                desc = commit['description']
                if commit['scope']:
                    changelog += f"- **{commit['scope']}**: {desc}\n"
                else:
                    changelog += f"- {desc}\n"
            
            changelog += "\n"
        
        return changelog
    
    def generate_release_notes(self, version: str, tag: str = None) -> str:
        """Generate release notes"""
        
        changelog = self.generate_changelog(version)
        
        breaking_changes = self._extract_breaking_changes()
        deprecated_features = self._extract_deprecated_features()
        
        release_notes = f"""# Release {version}

**Release Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

{changelog}
"""
        
        if breaking_changes:
            release_notes += f"""## ⚠️ Breaking Changes

{chr(10).join(f"- {change}" for change in breaking_changes)}

"""
        
        if deprecated_features:
            release_notes += f"""## 📋 Deprecated Features

{chr(10).join(f"- {feature}" for feature in deprecated_features)}

"""
        
        release_notes += """## Migration Guide

If you're upgrading from a previous version, please refer to the documentation for any required changes.

## Contributors

Thank you to all contributors for this release!

---

For more information, visit: https://github.com/Ohseho81/autus
"""
        
        return release_notes
    
    def _extract_breaking_changes(self) -> List[str]:
        """Extract breaking changes from commits"""
        commits = self.get_commits_since_tag()
        breaking = []
        
        for commit in commits:
            if 'BREAKING CHANGE' in commit['message'].upper():
                breaking.append(commit['description'])
        
        return breaking
    
    def _extract_deprecated_features(self) -> List[str]:
        """Extract deprecated features from commits"""
        commits = self.get_commits_since_tag()
        deprecated = []
        
        for commit in commits:
            if 'DEPRECATED' in commit['message'].upper() or 'deprecat' in commit['message'].lower():
                deprecated.append(commit['description'])
        
        return deprecated
    
    def save_changelog(self, output_path: str = "CHANGELOG.md", version: str = "Unreleased"):
        """Save changelog to file"""
        changelog = self.generate_changelog(version)
        
        output_file = Path(output_path)
        
        # Prepend to existing changelog if it exists
        existing_content = ""
        if output_file.exists():
            with open(output_file, 'r') as f:
                existing_content = f.read()
        
        with open(output_file, 'w') as f:
            f.write(changelog)
            if existing_content and not existing_content.startswith(changelog):
                f.write(existing_content)
        
        print(f"✅ Changelog saved: {output_path}")
    
    def save_release_notes(self, output_path: str = "RELEASE_NOTES.md", version: str = "Unreleased"):
        """Save release notes to file"""
        release_notes = self.generate_release_notes(version)
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            f.write(release_notes)
        
        print(f"✅ Release notes saved: {output_path}")


def generate_all(repo_path: str = ".", version: str = "Unreleased"):
    """Generate all changelog files"""
    
    gen = ChangelogGenerator(repo_path)
    
    # Generate changelog
    gen.save_changelog("CHANGELOG.md", version)
    
    # Generate release notes
    gen.save_release_notes(f"releases/RELEASE_{version.replace(' ', '_')}.md", version)
    
    # Print summary
    changelog = gen.generate_changelog(version)
    print(changelog)


if __name__ == "__main__":
    import sys
    
    version = sys.argv[1] if len(sys.argv) > 1 else "Unreleased"
    
    gen = ChangelogGenerator()
    print(gen.generate_changelog(version))
