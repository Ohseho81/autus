"""
ARMP CLI Commands

Commands for managing ARMP (AUTUS Risk Management Policy)
"""

from typing import Dict, Any
from core.armp.enforcer import enforcer
from core.armp.monitor import monitor
from core.utils.logging import get_logger

logger = get_logger(__name__)


def armp_commands() -> Dict[str, Any]:
    """
    ARMP command handlers

    Returns:
        Dictionary of command handlers
    """
    return {
        "armp:status": cmd_armp_status,
        "armp:prevent": cmd_armp_prevent,
        "armp:detect": cmd_armp_detect,
        "armp:monitor": cmd_armp_monitor,
        "armp:risks": cmd_armp_risks,
        "armp:incidents": cmd_armp_incidents,
    }


def cmd_armp_status() -> None:
    """Show ARMP status"""
    print("🛡️  ARMP Status")
    print("=" * 50)
    print(f"Total Risks: {len(enforcer.risks)}")
    print(f"Incidents: {len(enforcer.incidents)}")
    print(f"Safe Mode: {enforcer.safe_mode}")
    print(f"Monitor Running: {monitor.is_running()}")

    # Risk breakdown by category
    from collections import defaultdict
    by_category = defaultdict(int)
    by_severity = defaultdict(int)

    for risk in enforcer.risks:
        by_category[risk.category.value] += 1
        by_severity[risk.severity.value] += 1

    print("\n📊 Risks by Category:")
    for category, count in sorted(by_category.items()):
        print(f"  {category}: {count}")

    print("\n📊 Risks by Severity:")
    for severity, count in sorted(by_severity.items()):
        print(f"  {severity}: {count}")


def cmd_armp_prevent() -> None:
    """Run all prevention measures"""
    print("🛡️  Running ARMP Prevention...")
    enforcer.prevent_all()
    print("✅ Prevention complete")


def cmd_armp_detect() -> None:
    """Detect violations"""
    print("🔍 Detecting violations...")
    violations = enforcer.detect_violations()

    if violations:
        print(f"⚠️  Found {len(violations)} violations:")
        for risk in violations:
            print(f"  - {risk.name} ({risk.severity.value})")
    else:
        print("✅ No violations detected")


def cmd_armp_monitor(args: list) -> None:
    """Start/stop ARMP monitor"""
    if not args:
        print("Usage: autus armp:monitor [start|stop|status]")
        return

    action = args[0]

    if action == "start":
        if monitor.is_running():
            print("⚠️  Monitor already running")
        else:
            monitor.start()
            print("✅ Monitor started")

    elif action == "stop":
        if not monitor.is_running():
            print("⚠️  Monitor not running")
        else:
            monitor.stop()
            print("✅ Monitor stopped")

    elif action == "status":
        if monitor.is_running():
            print("✅ Monitor is running")
            metrics = monitor.get_metrics()
            print(f"  Checks: {metrics.get('check_count', 0)}")
            print(f"  Violations: {metrics.get('violation_count', 0)}")
        else:
            print("❌ Monitor is not running")

    else:
        print(f"❌ Unknown action: {action}")


def cmd_armp_risks() -> None:
    """List all risks"""
    print("📋 ARMP Risks")
    print("=" * 50)

    for i, risk in enumerate(enforcer.risks, 1):
        print(f"{i}. {risk.name}")
        print(f"   Category: {risk.category.value}")
        print(f"   Severity: {risk.severity.value}")
        print(f"   Description: {risk.description[:60]}...")
        print()


def cmd_armp_incidents() -> None:
    """Show recent incidents"""
    print("📋 Recent ARMP Incidents")
    print("=" * 50)

    if not enforcer.incidents:
        print("✅ No incidents")
        return

    recent = enforcer.incidents[-10:]  # Last 10

    for i, incident in enumerate(recent, 1):
        print(f"{i}. {incident.get('risk_name', 'Unknown')}")
        print(f"   Time: {incident.get('timestamp', 'Unknown')}")
        print(f"   Status: {incident.get('status', 'Unknown')}")
        print()



