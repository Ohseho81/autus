# Troubleshooting Guide

Common issues and solutions for AUTUS.

## Memory OS Issues

### Database Connection Errors

**Error:** `Failed to connect to the database`

**Solutions:**
1. Check file permissions
2. Ensure directory exists
3. Check disk space

```python
from pathlib import Path

# Ensure directory exists
Path(".autus/memory").mkdir(parents=True, exist_ok=True)

# Check permissions
db_path = Path(".autus/memory/memory.db")
if db_path.exists():
    print(f"Permissions: {oct(db_path.stat().st_mode)}")
```

### PII Validation Errors

**Error:** `PIIViolationError: PII detected`

**Solutions:**
1. Check key names (no email, phone, name patterns)
2. Check values (no email addresses, phone numbers)
3. Use anonymous identifiers

```python
# ❌ Bad
memory.set_preference("user_email", "user@example.com")  # PII!

# ✅ Good
memory.set_preference("notification_preference", "email_enabled")  # No PII
```

### Search Not Returning Results

**Issue:** Search returns empty results

**Solutions:**
1. Ensure data is indexed
2. Check search query
3. Verify data exists

```python
# Check if data exists
summary = memory.get_memory_summary()
print(f"Total entries: {summary['total']}")

# Try broader search
results = memory.search("")  # Empty query returns all
print(f"Total searchable: {len(results)}")
```

## Identity Issues

### Identity Not Evolving

**Issue:** Surface not evolving after tracking patterns

**Solutions:**
1. Ensure surface is created
2. Check pattern format
3. Verify tracking is called

```python
# Ensure surface exists
identity = IdentityCore("device_001")
surface = identity.create_surface()  # Create if not exists

# Track pattern correctly
tracker = BehavioralPatternTracker(identity)
tracker.track_workflow_completion("test", {
    "nodes_executed": 1,
    "total_time": 1.0,
    "success": True
})

# Check evolution
print(f"Pattern count: {surface.pattern_count}")
```

### Identity Export/Import Fails

**Error:** `KeyError` or `TypeError` during import

**Solutions:**
1. Check export format
2. Verify all required fields
3. Use latest version

```python
# Export
data = identity.export_to_dict()
print(f"Exported keys: {list(data.keys())}")

# Verify before import
required_keys = ['seed_hash', 'created_at']
for key in required_keys:
    if key not in data:
        print(f"Missing key: {key}")

# Import
identity2 = IdentityCore.from_dict(data)
```

## Auth Issues

### QR Code Not Scanning

**Issue:** QR code scan returns None

**Solutions:**
1. Check if QR code expired
2. Verify pyzbar is installed
3. Check image quality

```python
# Check expiration
from datetime import datetime
# QR codes expire after expiration_minutes

# Install pyzbar
# pip install pyzbar

# Check image
from PIL import Image
img = Image.open("qr_code.png")
print(f"Image size: {img.size}")
print(f"Image mode: {img.mode}")
```

### Device Sync Fails

**Issue:** `sync_from_qr()` returns False

**Solutions:**
1. Check QR code expiration
2. Verify identity format
3. Check conflict resolution

```python
# Check sync statistics
stats = sync.get_sync_statistics()
print(f"Failed syncs: {stats['failed_syncs']}")

# Try manual sync
identity_data = scanner.scan_from_image("qr.png")
if identity_data:
    identity = IdentityCore.from_dict(identity_data)
    print("Sync successful")
else:
    print("QR code expired or invalid")
```

## Workflow Issues

### Workflow Validation Fails

**Error:** `Validation Error: Each node must have 'id' and 'type'`

**Solutions:**
1. Ensure all nodes have required fields
2. Check edge references
3. Verify no cycles

```python
# Validate nodes
for node in nodes:
    if 'id' not in node or 'type' not in node:
        print(f"Invalid node: {node}")

# Validate edges
for edge in edges:
    node_ids = [n['id'] for n in nodes]
    if edge['source'] not in node_ids:
        print(f"Invalid source: {edge['source']}")
    if edge['target'] not in node_ids:
        print(f"Invalid target: {edge['target']}")
```

### Workflow Serialization Fails

**Error:** `JSONDecodeError` or `KeyError`

**Solutions:**
1. Check JSON format
2. Verify required fields
3. Use `to_json()` and `from_json()` methods

```python
# Serialize
json_str = graph.to_json()

# Verify JSON
import json
data = json.loads(json_str)
print(f"Nodes: {len(data['nodes'])}")
print(f"Edges: {len(data['edges'])}")

# Deserialize
graph2 = WorkflowGraph.from_json(json_str)
```

## ARMP Issues

### Monitor Not Starting

**Issue:** Monitor doesn't start

**Solutions:**
1. Check if already running
2. Verify enforcer is initialized
3. Check thread status

```python
# Check status
if monitor.is_running():
    print("Monitor already running")
else:
    monitor.start()
    time.sleep(1)  # Wait for thread
    print(f"Monitor running: {monitor.is_running()}")
```

### Too Many Violations

**Issue:** ARMP detects many violations

**Solutions:**
1. Review violation details
2. Check risk configurations
3. Adjust thresholds if needed

```python
# Get violations
violations = enforcer.detect_violations()

# Review each
for risk in violations:
    print(f"Risk: {risk.name}")
    print(f"Category: {risk.category.value}")
    print(f"Severity: {risk.severity.value}")
    print(f"Description: {risk.description}")
    print()
```

### Safe Mode Stuck

**Issue:** System stuck in safe mode

**Solutions:**
1. Check critical incidents
2. Resolve root cause
3. Manually exit safe mode

```python
# Check safe mode
if enforcer.safe_mode:
    print("In safe mode")

    # Check incidents
    critical = [i for i in enforcer.incidents if i.get('severity') == 'critical']
    print(f"Critical incidents: {len(critical)}")

    # Resolve and exit (if safe)
    # enforcer.safe_mode = False  # Only if resolved
```

## Pack Issues

### Pack Not Found

**Error:** `PackNotFoundError: Pack 없음`

**Solutions:**
1. Check pack name
2. Verify pack directory
3. Check YAML format

```python
from core.pack.loader import list_packs

# List available packs
packs = list_packs()
print("Available packs:")
for pack in packs:
    print(f"  - {pack['name']}")

# Check pack path
from pathlib import Path
pack_path = Path("packs/development/architect_pack.yaml")
if pack_path.exists():
    print(f"Pack found: {pack_path}")
else:
    print(f"Pack not found: {pack_path}")
```

### LLM Provider Error

**Error:** `LLMProviderError: API 키를 찾을 수 없습니다`

**Solutions:**
1. Set environment variables
2. Check API key format
3. Verify provider

```python
import os

# Check environment
print(f"ANTHROPIC_API_KEY: {'Set' if os.getenv('ANTHROPIC_API_KEY') else 'Not set'}")
print(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")

# Set if missing
# os.environ['ANTHROPIC_API_KEY'] = 'your-key-here'
```

## Performance Issues

### Slow Search

**Issue:** Search is slow with large datasets

**Solutions:**
1. Limit search results
2. Use vector search for better performance
3. Optimize database

```python
# Limit results
results = memory.search("query", limit=5)  # Limit to 5

# Use vector search (faster)
vector_results = memory.vector_search("query", limit=5)
```

### Memory Usage High

**Issue:** High memory usage

**Solutions:**
1. Close connections properly
2. Use context managers
3. Clear old data

```python
# Use context manager
with MemoryOS() as memory:
    # Operations
    pass
# Automatically closed

# Clear old patterns
# (implement cleanup logic)
```

## General Issues

### Import Errors

**Error:** `ModuleNotFoundError` or `ImportError`

**Solutions:**
1. Install dependencies
2. Check Python version
3. Verify PYTHONPATH

```bash
# Install dependencies
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.11+

# Set PYTHONPATH
export PYTHONPATH="${PWD}:${PYTHONPATH}"
```

### Path Issues

**Error:** `FileNotFoundError` or path-related errors

**Solutions:**
1. Use absolute paths
2. Check directory existence
3. Use `core.utils.paths`

```python
from core.utils.paths import ensure_dir, safe_path

# Ensure directory exists
ensure_dir(".autus/memory")

# Safe path validation
path = safe_path("protocols/memory/store.py", must_exist=True)
```

## Getting Help

1. Check logs: `.autus/logs/`
2. Review documentation: `docs/`
3. Check examples: `docs/examples/`
4. Open issue on GitHub

## Common Solutions

### Reset Everything

```python
# Clear memory
from pathlib import Path
Path(".autus/memory/memory.db").unlink()

# Reset identity
identity = IdentityCore("new_device_001")

# Clear ARMP incidents
enforcer.incidents.clear()
```

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now all operations will log details
```






