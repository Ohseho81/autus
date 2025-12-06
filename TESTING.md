# AUTUS Testing Guide

## Running Tests

### Quick Start

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific test file
pytest tests/test_api_health.py -v
```

## Test Files

| File | Purpose |
|------|---------|
| `test_api_health.py` | Health check and status endpoints |
| `test_api_god.py` | God Mode admin endpoints |
| `test_api_twin.py` | Twin CRUD operations |
| `test_api_devices.py` | IoT device management |
| `test_api_analytics.py` | Analytics endpoints |
| `test_api_sovereign.py` | Data sovereignty endpoints |
| `test_protocols.py` | Core protocols validation |
| `test_reality_protocol.py` | Reality event handling |
| `test_rules_engine.py` | Rules engine functionality |
| `test_telemetry.py` | Telemetry collection |

## Test Structure

```
tests/
├── test_api_*.py          # API endpoint tests
├── test_protocols.py      # Protocol tests
├── test_rules_engine.py   # Rules engine tests
└── test_telemetry.py      # Telemetry tests
```

## Writing New Tests

### Basic Test Template

```python
"""
AUTUS <Feature> Tests
"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_feature_basic():
    """Test basic feature functionality."""
    response = client.get("/endpoint")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_async_feature():
    """Test async feature."""
    # async test code here
    pass
```

## Test Coverage Goals

- ✅ API endpoints: 80%+
- ✅ Core protocols: 90%+
- ✅ Business logic: 75%+
- ✅ Integration tests: Required

## CI/CD Integration

Tests run automatically on:
- Every push to `main`
- Every pull request
- Pre-deployment checks

## Troubleshooting

### ImportError: No module named 'main'

Make sure you're running pytest from the project root:

```bash
cd /path/to/autus
pytest tests/
```

### Tests fail with "Address already in use"

Port conflict detected. Kill existing processes:

```bash
lsof -i :8003 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Async test issues

Ensure `pytest-asyncio` is installed:

```bash
pip install pytest-asyncio
```

Then use `@pytest.mark.asyncio` decorator for async tests.

## Performance Tests

For load testing:

```bash
# Install locust
pip install locust

# Run load test
locust -f locustfile.py --host=http://localhost:8003
```

---

**Last Updated**: 2025-12-06
**Test Framework**: pytest 9.0+
**Coverage Tool**: pytest-cov
