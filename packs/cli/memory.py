"""
Memory CLI Commands

Commands for managing Local Memory OS
"""

from typing import Dict, Any, Optional
from pathlib import Path
from protocols.memory.os import MemoryOS
from packs.utils.logging import get_logger

logger = get_logger(__name__)


def memory_commands() -> Dict[str, Any]:
    """
    Memory command handlers

    Returns:
        Dictionary of command handlers
    """
    return {
        "memory:status": cmd_memory_status,
        "memory:get": cmd_memory_get,
        "memory:set": cmd_memory_set,
        "memory:search": cmd_memory_search,
        "memory:export": cmd_memory_export,
        "memory:clear": cmd_memory_clear,
    }


def cmd_memory_status() -> None:
    """Show memory status"""
    print("💾 Memory OS Status")
    print("=" * 50)

    try:
        memory = MemoryOS()
        summary = memory.get_memory_summary()

        print(f"Preferences: {summary['preferences']}")
        print(f"Patterns: {summary['patterns']}")
        print(f"Context: {summary['context']}")
        print(f"Total: {summary['total']}")

        memory.close()
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_memory_get(args: list) -> None:
    """Get preference value"""
    if not args:
        print("Usage: autus memory:get <key>")
        return

    key = args[0]

    try:
        memory = MemoryOS()
        value = memory.get_preference(key)

        if value is not None:
            print(f"✅ {key} = {value}")
        else:
            print(f"❌ Preference not found: {key}")

        memory.close()
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_memory_set(args: list) -> None:
    """Set preference value"""
    if len(args) < 2:
        print("Usage: autus memory:set <key> <value> [category]")
        return

    key = args[0]
    value = args[1]
    category = args[2] if len(args) > 2 else "general"

    try:
        memory = MemoryOS()
        memory.set_preference(key, value, category)
        print(f"✅ Set {key} = {value} (category: {category})")
        memory.close()
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_memory_search(args: list) -> None:
    """Search memory"""
    if not args:
        print("Usage: autus memory:search <query>")
        return

    query = " ".join(args)

    try:
        memory = MemoryOS()
        results = memory.search(query, limit=10)

        if results:
            print(f"🔍 Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"{i}. {result.get('text', 'N/A')[:60]}...")
        else:
            print("❌ No results found")

        memory.close()
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_memory_export(args: list) -> None:
    """Export memory to YAML"""
    output_path = args[0] if args else ".autus/memory.yaml"

    try:
        memory = MemoryOS()
        memory.export_memory(output_path)
        print(f"✅ Memory exported to {output_path}")
        memory.close()
    except Exception as e:
        print(f"❌ Error: {e}")


def cmd_memory_clear() -> None:
    """Clear all memory (WARNING: destructive)"""
    print("⚠️  WARNING: This will delete all memory data!")
    response = input("Type 'yes' to confirm: ")

    if response.lower() != "yes":
        print("❌ Cancelled")
        return

    try:
        db_path = Path(".autus/memory/memory.db")
        if db_path.exists():
            db_path.unlink()
            print("✅ Memory cleared")
        else:
            print("ℹ️  No memory database found")
    except Exception as e:
        print(f"❌ Error: {e}")



