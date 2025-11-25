"""
Memory OS Usage Examples

Examples for Local Memory OS protocol
"""

from protocols.memory.os import MemoryOS


def example_basic_usage():
    """Basic Memory OS usage"""
    # Initialize
    memory = MemoryOS()

    # Set preferences
    memory.set_preference("theme", "dark", "ui")
    memory.set_preference("language", "python", "development")
    memory.set_preference("editor", "vscode", "tools")

    # Get preferences
    theme = memory.get_preference("theme")
    print(f"Theme: {theme}")

    # Learn patterns
    memory.learn_pattern("coding", {
        "language": "python",
        "framework": "django",
        "duration": 3600
    })

    # Search
    results = memory.search("python")
    print(f"Found {len(results)} results")

    # Export
    memory.export_memory("backup/memory.yaml")

    # Close
    memory.close()


def example_context_manager():
    """Using MemoryOS as context manager"""
    with MemoryOS() as memory:
        memory.set_preference("timezone", "Asia/Seoul")
        memory.set_preference("work_hours", "09:00-18:00")

        # Automatically closed on exit
        summary = memory.get_memory_summary()
        print(f"Total entries: {summary['total']}")


def example_pattern_tracking():
    """Track behavioral patterns"""
    memory = MemoryOS()

    # Track coding patterns
    for i in range(10):
        memory.learn_pattern("coding_session", {
            "session_id": f"session_{i}",
            "duration": 3600 + i * 100,
            "files_edited": 5 + i,
            "language": "python"
        })

    # Get all coding patterns
    patterns = memory.get_patterns("coding_session")
    print(f"Tracked {len(patterns)} coding sessions")

    memory.close()


def example_search():
    """Search examples"""
    memory = MemoryOS()

    # Setup data
    memory.set_preference("project_name", "autus", "work")
    memory.set_preference("project_language", "python", "work")
    memory.learn_pattern("workflow", {"type": "development", "status": "active"})

    # Search
    results = memory.search("project")
    print(f"Search 'project': {len(results)} results")

    # Vector search
    vector_results = memory.vector_search("development work")
    print(f"Vector search: {len(vector_results)} results")

    memory.close()


def example_export_import():
    """Export and import memory"""
    memory = MemoryOS()

    # Store data
    memory.set_preference("backup_test", "test_value")

    # Export
    memory.export_memory("test_backup.yaml")

    # Create new instance and verify
    memory2 = MemoryOS(db_path="test_memory.db")
    value = memory2.get_preference("backup_test")
    print(f"Imported value: {value}")

    memory.close()
    memory2.close()





