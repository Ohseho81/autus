"""
Protocol CLI Commands

Commands for managing protocols
"""

from typing import Dict, Any
from pathlib import Path
from core.utils.logging import get_logger

logger = get_logger(__name__)


def protocol_commands() -> Dict[str, Any]:
    """
    Protocol command handlers
    
    Returns:
        Dictionary of command handlers
    """
    return {
        "protocol:list": cmd_protocol_list,
        "protocol:status": cmd_protocol_status,
        "protocol:test": cmd_protocol_test,
    }


def cmd_protocol_list() -> None:
    """List all protocols"""
    print("📋 AUTUS Protocols")
    print("=" * 50)
    
    protocols = [
        ("memory", "Local Memory OS", "protocols/memory"),
        ("identity", "Zero Identity", "protocols/identity"),
        ("auth", "Zero Auth", "protocols/auth"),
        ("workflow", "Workflow Graph", "protocols/workflow"),
    ]
    
    for name, description, path in protocols:
        protocol_path = Path(path)
        if protocol_path.exists():
            print(f"✅ {name}: {description}")
            print(f"   Path: {path}")
        else:
            print(f"❌ {name}: {description} (not found)")
        print()


def cmd_protocol_status(args: list) -> None:
    """Show protocol status"""
    if not args:
        print("Usage: autus protocol:status <protocol_name>")
        print("Available: memory, identity, auth, workflow")
        return
    
    protocol_name = args[0]
    protocol_path = Path(f"protocols/{protocol_name}")
    
    if not protocol_path.exists():
        print(f"❌ Protocol not found: {protocol_name}")
        return
    
    print(f"📊 {protocol_name.upper()} Protocol Status")
    print("=" * 50)
    
    # Count Python files
    py_files = list(protocol_path.rglob("*.py"))
    print(f"Python files: {len(py_files)}")
    
    # Count test files
    test_path = Path(f"tests/protocols/{protocol_name}")
    if test_path.exists():
        test_files = list(test_path.rglob("test_*.py"))
        print(f"Test files: {len(test_files)}")
    else:
        print("Test files: 0")
    
    # Check for __init__.py
    if (protocol_path / "__init__.py").exists():
        print("✅ Module initialized")
    else:
        print("❌ Module not initialized")


def cmd_protocol_test(args: list) -> None:
    """Run protocol tests"""
    if not args:
        print("Usage: autus protocol:test <protocol_name>")
        print("Available: memory, identity, auth, workflow")
        return
    
    protocol_name = args[0]
    test_path = Path(f"tests/protocols/{protocol_name}")
    
    if not test_path.exists():
        print(f"❌ Test directory not found: {test_path}")
        return
    
    print(f"🧪 Running tests for {protocol_name}...")
    import subprocess
    result = subprocess.run(
        ["pytest", str(test_path), "-v"],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode == 0:
        print("✅ All tests passed")
    else:
        print("❌ Some tests failed")

