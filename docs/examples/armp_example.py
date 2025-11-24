"""
ARMP Usage Examples

Examples for AUTUS Risk Management Policy
"""

from core.armp.enforcer import enforcer
from core.armp.monitor import monitor


def example_basic_armp():
    """Basic ARMP usage"""
    # Run prevention
    enforcer.prevent_all()
    print("✅ Prevention measures executed")

    # Detect violations
    violations = enforcer.detect_violations()
    if violations:
        print(f"⚠️  Found {len(violations)} violations")
        for risk in violations:
            print(f"  - {risk.name} ({risk.severity.value})")
    else:
        print("✅ No violations detected")


def example_armp_response():
    """Respond to detected violations"""
    violations = enforcer.detect_violations()

    for risk in violations:
        # Respond
        enforcer.respond_to(risk)

        # Recover
        enforcer.recover_from(risk)

        print(f"✅ Handled: {risk.name}")


def example_armp_monitoring():
    """Start ARMP monitoring"""
    # Start monitor
    monitor.start()
    print("✅ Monitor started")

    # Check status
    if monitor.is_running():
        metrics = monitor.get_metrics()
        print(f"Monitor active:")
        print(f"  Checks: {metrics.get('check_count', 0)}")
        print(f"  Violations: {metrics.get('violation_count', 0)}")

    # Stop monitor
    # monitor.stop()


def example_armp_status():
    """Check ARMP status"""
    print(f"Total Risks: {len(enforcer.risks)}")
    print(f"Incidents: {len(enforcer.incidents)}")
    print(f"Safe Mode: {enforcer.safe_mode}")

    # Risk breakdown
    from collections import defaultdict
    by_category = defaultdict(int)
    by_severity = defaultdict(int)

    for risk in enforcer.risks:
        by_category[risk.category.value] += 1
        by_severity[risk.severity.value] += 1

    print("\nRisks by Category:")
    for category, count in sorted(by_category.items()):
        print(f"  {category}: {count}")

    print("\nRisks by Severity:")
    for severity, count in sorted(by_severity.items()):
        print(f"  {severity}: {count}")


def example_armp_incidents():
    """View recent incidents"""
    if not enforcer.incidents:
        print("✅ No incidents")
        return

    recent = enforcer.incidents[-10:]  # Last 10

    print(f"Recent Incidents ({len(recent)}):")
    for i, incident in enumerate(recent, 1):
        print(f"{i}. {incident.get('risk', 'Unknown')}")
        print(f"   Time: {incident.get('timestamp', 'Unknown')}")
        print(f"   Severity: {incident.get('severity', 'Unknown')}")


def example_armp_risk_list():
    """List all risks"""
    print(f"ARMP Risks ({len(enforcer.risks)}):")
    for i, risk in enumerate(enforcer.risks, 1):
        print(f"{i}. {risk.name}")
        print(f"   Category: {risk.category.value}")
        print(f"   Severity: {risk.severity.value}")
        print(f"   Description: {risk.description[:60]}...")
        print()




