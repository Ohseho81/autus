"""
Pack System Usage Examples

Examples for AUTUS Pack system
"""

from core.pack.runner import DevPackRunner
from core.pack.loader import load_pack, list_packs


def example_list_packs():
    """List available packs"""
    packs = list_packs()

    print(f"Available Packs ({len(packs)}):")
    for pack in packs:
        print(f"  - {pack['name']} v{pack['version']}")
        print(f"    {pack['description']}")


def example_load_pack():
    """Load a pack"""
    try:
        pack = load_pack("architect_pack", "development")
        print(f"Pack loaded: {pack.get('name', 'Unknown')}")
        print(f"Cells: {len(pack.get('cells', []))}")
    except Exception as e:
        print(f"Error: {e}")


def example_run_pack():
    """Run a development pack"""
    runner = DevPackRunner(provider="auto")

    # Run pack
    inputs = {
        "task": "Create a REST API endpoint",
        "language": "python",
        "framework": "fastapi"
    }

    try:
        results = runner.run_pack("architect_pack", inputs)
        print("Pack execution completed")
        print(f"Results: {list(results.keys())}")
    except Exception as e:
        print(f"Error: {e}")


def example_execute_cell():
    """Execute a single cell"""
    runner = DevPackRunner(provider="auto")

    # Load pack
    pack = runner.load_pack("codegen_pack")

    # Execute specific cell
    inputs = {
        "file_path": "example.py",
        "purpose": "Create a simple calculator class"
    }

    try:
        result = runner.execute_cell(pack, "generate_code", inputs)
        print("Cell executed successfully")
        print(f"Result length: {len(result)} characters")
    except Exception as e:
        print(f"Error: {e}")


def example_custom_provider():
    """Use specific LLM provider"""
    # Use Anthropic
    runner_anthropic = DevPackRunner(provider="anthropic")

    # Use OpenAI
    runner_openai = DevPackRunner(provider="openai")

    # Auto-detect (default)
    runner_auto = DevPackRunner(provider="auto")

    print("Runners initialized with different providers")






