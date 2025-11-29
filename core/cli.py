#!/usr/bin/env python3
"""
AUTUS CLI
The main command-line interface for AUTUS protocol.
"""

from __future__ import annotations

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configuration
AUTUS_DIR = Path.cwd()
AUTUS_CONFIG_FILE = AUTUS_DIR / '.autus.config.json'


def load_config() -> Dict[str, Any]:
    """Load AUTUS configuration."""
    if AUTUS_CONFIG_FILE.exists():
        try:
            with open(AUTUS_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_config(config: Dict[str, Any]) -> None:
    """Save AUTUS configuration."""
    with open(AUTUS_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def cmd_init(args: argparse.Namespace) -> None:
    """Initialize AUTUS project."""
    print("🚀 Initializing AUTUS Project")

    # Create directories
    dirs = ['outputs', 'cache', 'packs/examples', 'packs/development']
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)

    # Create config
    config = {
        'version': '1.0.0',
        'project_name': args.name or 'my_project',
        'initialized': True
    }
    save_config(config)

    # Create identity
    from protocols.identity.core import IdentityCore
    identity = IdentityCore()
    identity_file = AUTUS_DIR / '.autus.identity'
    with open(identity_file, 'w') as f:
        f.write(identity.export_for_sync())

    print(f"✅ Project initialized: {config['project_name']}")


def cmd_list(args: argparse.Namespace) -> None:
    """List packs."""
    from core.pack.loader import PackLoader

    loader = PackLoader()
    packs = loader.list_packs()

    if not packs:
        print("No packs found.")
        return

    print(f"\n📦 Available Packs ({len(packs)}):\n")

    # Group by category
    by_category = {}
    for pack in packs:
        category = pack.get('category', 'uncategorized')
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(pack['name'])

    for category, pack_names in sorted(by_category.items()):
        print(f"  [{category}]")
        for name in sorted(pack_names):
            print(f"    • {name}")
        print()


def cmd_run(args: argparse.Namespace) -> None:
    """Run a pack."""
    if not args.pack:
        print("❌ Please specify a pack with --pack")
        return

    from core.pack.loader import PackLoader
    from core.engine.per_loop import PERLoop

    print(f"🚀 Running pack: {args.pack}")

    # Parse inputs
    inputs = {}
    if args.inputs:
        try:
            inputs = json.loads(args.inputs)
        except:
            print("⚠️  Invalid JSON inputs, using empty inputs")

    try:
        # Try to load and execute pack
        loader = PackLoader()
        pack = loader.load_pack(args.pack)

        # Simple execution
        per_loop = PERLoop()
        goal = pack.get('description', f"Execute {args.pack}")
        result = per_loop.run(goal, context=inputs, max_cycles=1)

        print(f"✅ Success rate: {result['best_success_rate']*100:.1f}%")

    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_create(args: argparse.Namespace) -> None:
    """Create a new pack."""
    from core.pack.loader import PackLoader

    pack_name = args.name
    print(f"📝 Creating pack: {pack_name}")

    loader = PackLoader()
    template = loader.create_pack_template(pack_name, args.type)

    # Parse template
    import yaml
    pack_data = yaml.safe_load(template)

    # Save pack
    pack_file = loader.save_pack(pack_name, pack_data, 'examples')
    print(f"✅ Pack created: {pack_file}")


def cmd_info(args: argparse.Namespace) -> None:
    """Show project info."""
    config = load_config()

    print("\n📊 AUTUS Project Info")
    print("=" * 40)

    if config:
        print(f"Project: {config.get('project_name', 'Unknown')}")
        print(f"Version: {config.get('version', 'Unknown')}")
        print(f"Status: {'Initialized' if config.get('initialized') else 'Not initialized'}")
    else:
        print("Project not initialized. Run: ./autus init")

    # Check identity
    identity_file = AUTUS_DIR / '.autus.identity'
    if identity_file.exists():
        from protocols.identity.core import IdentityCore
        with open(identity_file, 'r') as f:
            sync_data = f.read()
        identity = IdentityCore.import_from_sync(sync_data)
        print(f"Identity: {identity}")

    # Count packs
    from core.pack.loader import PackLoader
    loader = PackLoader()
    packs = loader.list_packs()
    print(f"Packs: {len(packs)} available")

    print("=" * 40)


def main() -> None:
    """Main CLI entry point."""
    # Check if config exists, create if not
    if not AUTUS_CONFIG_FILE.exists() and len(sys.argv) > 1 and sys.argv[1] != 'init':
        print("⚠️  Project not initialized. Initializing...")
        config = {
            'version': '1.0.0',
            'project_name': 'my_project',
            'initialized': True
        }
        save_config(config)
        print(f"✅ Created config: {config['project_name']}")

    parser = argparse.ArgumentParser(
        description='AUTUS - The Protocol for Personal AI Operating Systems'
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize project')
    init_parser.add_argument('--name', help='Project name')

    # List command
    subparsers.add_parser('list', help='List packs')

    # Run command
    run_parser = subparsers.add_parser('run', help='Run pack')
    run_parser.add_argument('--pack', required=True, help='Pack name')
    run_parser.add_argument('--inputs', help='JSON inputs')

    # Create command
    create_parser = subparsers.add_parser('create', help='Create pack')
    create_parser.add_argument('name', help='Pack name')
    create_parser.add_argument('--type', default='generic', help='Pack type')

    # Info command
    subparsers.add_parser('info', help='Show project info')

    args = parser.parse_args()

    if not args.command:
        # Default to list if no command
        args.command = 'list'

    # Execute command
    commands = {
        'init': cmd_init,
        'list': cmd_list,
        'run': cmd_run,
        'create': cmd_create,
        'info': cmd_info,
    }

    handler = commands.get(args.command)
    if handler:
        try:
            handler(args)
        except KeyboardInterrupt:
            print("\n⚠️  Interrupted")
        except Exception as e:
            print(f"❌ Error: {e}")
            if os.getenv('DEBUG'):
                import traceback
                traceback.print_exc()
    else:
        print(f"❌ Unknown command: {args.command}")


if __name__ == "__main__":
    main()
