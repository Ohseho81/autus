# ARMP API Reference

AUTUS Risk Management Policy - Zero Trust, Maximum Defense.

## ARMPEnforcer

Core risk management system. Automatically enforces all risk policies.

### Methods

#### `prevent_all() -> None`

Run all prevention measures.

**Example:**
```python
from core.armp.enforcer import enforcer

enforcer.prevent_all()
```

#### `detect_violations() -> List[Risk]`

Detect violations.

**Returns:**
- `List[Risk]`: List of detected risk violations

**Example:**
```python
violations = enforcer.detect_violations()
if violations:
    print(f"Found {len(violations)} violations")
    for risk in violations:
        print(f"  - {risk.name}")
```

#### `respond_to(risk: Risk) -> None`

Respond to a risk.

**Parameters:**
- `risk` (Risk): Risk to respond to

**Example:**
```python
violations = enforcer.detect_violations()
for risk in violations:
    enforcer.respond_to(risk)
```

#### `recover_from(risk: Risk) -> None`

Recover from a risk.

**Parameters:**
- `risk` (Risk): Risk to recover from

**Example:**
```python
enforcer.recover_from(risk)
```

### Properties

- `risks` (List[Risk]): All registered risks (30 total)
- `incidents` (List[Dict]): Incident history
- `safe_mode` (bool): Safe mode status

## ARMPMonitor

Real-time risk monitoring system.

### Methods

#### `start() -> None`

Start monitoring.

**Example:**
```python
from core.armp.monitor import monitor

monitor.start()
```

#### `stop() -> None`

Stop monitoring.

**Example:**
```python
monitor.stop()
```

#### `is_running() -> bool`

Check if monitor is running.

**Returns:**
- `bool`: True if running

**Example:**
```python
if monitor.is_running():
    print("Monitor is active")
```

#### `get_metrics() -> Dict[str, Any]`

Get monitoring metrics.

**Returns:**
- `Dict[str, Any]`: Metrics including check_count, violation_count, etc.

**Example:**
```python
metrics = monitor.get_metrics()
print(f"Checks: {metrics['check_count']}")
print(f"Violations: {metrics['violation_count']}")
```

## Risk Categories

- **SECURITY**: Security risks (PII, Code Injection, SQL Injection, etc.)
- **API**: API and external service risks
- **DATA**: Data integrity risks
- **PERFORMANCE**: Performance risks
- **PROTOCOL**: Protocol compliance risks

## Risk Severity

- **CRITICAL**: S1 - 5 minutes response time
- **HIGH**: S2 - 1 hour response time
- **MEDIUM**: S3 - 1 day response time
- **LOW**: S4 - 1 week response time

## Example Usage

```python
from core.armp.enforcer import enforcer
from core.armp.monitor import monitor

# Run prevention
enforcer.prevent_all()

# Detect violations
violations = enforcer.detect_violations()
if violations:
    for risk in violations:
        enforcer.respond_to(risk)
        enforcer.recover_from(risk)

# Start monitoring
monitor.start()

# Check status
if monitor.is_running():
    metrics = monitor.get_metrics()
    print(f"Monitor active: {metrics}")
```






