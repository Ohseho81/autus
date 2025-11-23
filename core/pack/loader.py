"""
AUTUS Pack Loader
Loads and manages Pack YAML files for infinite extensibility.
"""

from __future__ import annotations

import os
import yaml
import json
from pathlib import Path
from typing import Dict, List, Any, Optional


class PackLoader:
    """
    Pack Loader for AUTUS Pack System
    Handles loading, validation, and management of Pack YAML files.
    """
    
    def __init__(self, pack_dirs: Optional[List[str]] = None):
        """Initialize Pack Loader."""
        if pack_dirs is None:
            # Default pack directories
            base_path = Path(__file__).parent.parent.parent
            self.pack_dirs = [
                base_path / 'packs' / 'development',
                base_path / 'packs' / 'examples',
                base_path / 'packs' / 'integration',
                base_path / 'packs',
            ]
        else:
            self.pack_dirs = [Path(d) for d in pack_dirs]
        
        self._pack_cache = {}
    
    def list_packs(self) -> List[Dict[str, str]]:
        """List all available packs."""
        packs = []
        
        for pack_dir in self.pack_dirs:
            if not pack_dir.exists():
                continue
            
            # Look for YAML files
            for pack_file in pack_dir.glob('*.yaml'):
                packs.append({
                    'name': pack_file.stem,
                    'path': str(pack_file),
                    'category': pack_dir.name if pack_dir.name != 'packs' else 'root'
                })
            
            # Also check .yml extension
            for pack_file in pack_dir.glob('*.yml'):
                packs.append({
                    'name': pack_file.stem,
                    'path': str(pack_file),
                    'category': pack_dir.name if pack_dir.name != 'packs' else 'root'
                })
        
        return packs
    
    def load_pack(self, pack_name: str) -> Dict[str, Any]:
        """Load a Pack by name."""
        # Check cache first
        if pack_name in self._pack_cache:
            return self._pack_cache[pack_name]
        
        # Search for pack file
        pack_file = None
        for pack_dir in self.pack_dirs:
            if not pack_dir.exists():
                continue
            
            # Try .yaml
            test_file = pack_dir / f"{pack_name}.yaml"
            if test_file.exists():
                pack_file = test_file
                break
            
            # Try .yml
            test_file = pack_dir / f"{pack_name}.yml"
            if test_file.exists():
                pack_file = test_file
                break
            
            # Search subdirectories
            for sub_file in pack_dir.rglob(f"{pack_name}.yaml"):
                pack_file = sub_file
                break
            
            if pack_file:
                break
        
        if not pack_file:
            raise FileNotFoundError(f"Pack '{pack_name}' not found")
        
        # Load and parse YAML
        try:
            with open(pack_file, 'r') as f:
                pack_data = yaml.safe_load(f) or {}
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in pack '{pack_name}': {e}")
        
        # Add metadata
        pack_data['_file_path'] = str(pack_file)
        pack_data['_loaded_from'] = pack_file.parent.name
        
        # Cache the pack
        self._pack_cache[pack_name] = pack_data
        
        return pack_data
    
    def get_cell_from_pack(self, pack_name: str, cell_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific cell from a pack."""
        pack = self.load_pack(pack_name)
        
        for cell in pack.get('cells', []):
            if cell.get('name') == cell_name:
                return cell
        
        return None
    
    def create_pack_template(self, pack_name: str, pack_type: str = 'generic') -> str:
        """Create a pack template YAML."""
        templates = {
            'generic': {
                'name': pack_name,
                'version': '1.0.0',
                'description': f'Pack for {pack_name}',
                'cells': [
                    {
                        'name': 'main_cell',
                        'prompt': f'Execute task for {pack_name}',
                        'output': 'result'
                    }
                ]
            }
        }
        
        template = templates.get(pack_type, templates['generic'])
        template['name'] = pack_name
        
        return yaml.dump(template, default_flow_style=False, sort_keys=False)
    
    def save_pack(self, pack_name: str, pack_data: Dict[str, Any], category: str = 'examples') -> str:
        """Save a pack to file."""
        pack_dir = Path(__file__).parent.parent.parent / 'packs' / category
        pack_dir.mkdir(parents=True, exist_ok=True)
        
        pack_file = pack_dir / f"{pack_name}.yaml"
        
        with open(pack_file, 'w') as f:
            yaml.dump(pack_data, f, default_flow_style=False, sort_keys=False)
        
        return str(pack_file)


# Backward compatibility
PackManager = PackLoader  # Alias for compatibility

# Test the module
if __name__ == "__main__":
    print("Testing PackLoader...")
    loader = PackLoader()
    packs = loader.list_packs()
    print(f"✅ Found {len(packs)} packs")
    for pack in packs[:3]:
        print(f"  - {pack['name']} ({pack['category']})")
