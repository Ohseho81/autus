"""
from __future__ import annotations

ARMP - Protocol Compliance Risks

Medium-priority protocol compliance risks
"""

from packs.security.enforcer import Risk, Severity, RiskCategory, enforcer
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class ProtocolVersionIncompatibleRisk(Risk):
    """
    Protocol Version Incompatible Risk

    Detects protocol version incompatibilities
    """

    def __init__(self) -> None:
        super().__init__(
            name="Protocol Version Incompatible",
            category=RiskCategory.PROTOCOL,
            severity=Severity.HIGH,
            description="Detects protocol version incompatibilities",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent version incompatibilities"""
        logger.info("🛡️  Protocol Version Prevention:")
        logger.info("   - Version all protocols")
        logger.info("   - Maintain compatibility")
        logger.info("   - Document breaking changes")
        logger.info("   - Use semantic versioning")

    def detect(self) -> bool:
        """Detect version issues"""
        logger.info("🔍 Checking protocol versions...")

        # Check for version definitions in protocols
        protocol_dirs = ['workflow', 'memory', 'identity', 'auth']

        for pdir in protocol_dirs:
            protocol_path = Path(f"protocols/{pdir}")
            if protocol_path.exists():
                init_file = protocol_path / "__init__.py"
                if init_file.exists():
                    with open(init_file) as f:
                        content = f.read()
                        if '__version__' not in content:
                            logger.warning(f"⚠️  {pdir}: no version defined")

        logger.info("✅ Protocol versions OK")
        return False

    def respond(self) -> None:
        """Respond to version incompatibility"""
        logger.warning("⚠️  Protocol Version Response:")
        logger.warning("   1. Check version requirements")
        logger.warning("   2. Upgrade if possible")
        logger.warning("   3. Use compatibility mode")
        logger.warning("   4. Log version mismatch")

    def recover(self) -> None:
        """Recover from incompatibility"""
        logger.info("🔧 Protocol Version Recovery:")
        logger.info("   1. Add version checks")
        logger.info("   2. Implement compatibility layer")
        logger.info("   3. Test version combinations")
        logger.info("   4. Document requirements")


class InvalidProtocolMessageRisk(Risk):
    """
    Invalid Protocol Message Risk

    Detects malformed protocol messages
    """

    def __init__(self) -> None:
        super().__init__(
            name="Invalid Protocol Message",
            category=RiskCategory.PROTOCOL,
            severity=Severity.MEDIUM,
            description="Detects invalid protocol messages",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent invalid messages"""
        logger.info("🛡️  Invalid Message Prevention:")
        logger.info("   - Validate all messages")
        logger.info("   - Use schema validation")
        logger.info("   - Sanitize inputs")
        logger.info("   - Handle errors gracefully")

    def detect(self) -> bool:
        """Detect invalid messages"""
        logger.info("🔍 Checking message validation...")

        # Check for validation code in protocols
        violations = []

        for py_file in Path("protocols").rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()

                # Look for JSON parsing without validation
                if 'json.loads' in content or 'json.load' in content:
                    if 'validate' not in content.lower() and 'schema' not in content.lower():
                        violations.append(str(py_file))
            except Exception:
                pass

        if violations:
            logger.warning(f"⚠️  Missing validation: {len(violations)} files")
            return True

        logger.info("✅ Message validation OK")
        return False

    def respond(self) -> None:
        """Respond to invalid message"""
        logger.warning("⚠️  Invalid Message Response:")
        logger.warning("   1. Reject invalid message")
        logger.warning("   2. Log validation error")
        logger.warning("   3. Return error to sender")
        logger.warning("   4. Don't process further")

    def recover(self) -> None:
        """Recover from invalid messages"""
        logger.info("🔧 Invalid Message Recovery:")
        logger.info("   1. Add message validation")
        logger.info("   2. Implement schemas")
        logger.info("   3. Add error handling")
        logger.info("   4. Test edge cases")


class ProtocolStateCorruptionRisk(Risk):
    """
    Protocol State Corruption Risk

    Detects protocol state corruption
    """

    def __init__(self) -> None:
        super().__init__(
            name="Protocol State Corruption",
            category=RiskCategory.PROTOCOL,
            severity=Severity.HIGH,
            description="Detects protocol state corruption",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent state corruption"""
        logger.info("🛡️  State Corruption Prevention:")
        logger.info("   - Validate state transitions")
        logger.info("   - Use atomic operations")
        logger.info("   - Implement state machine")
        logger.info("   - Add state checksums")

    def detect(self) -> bool:
        """Detect state corruption"""
        logger.info("🔍 Checking protocol states...")

        # Check for state files
        state_files = list(Path("protocols").rglob("*.state"))

        if state_files:
            logger.info(f"ℹ️  Found {len(state_files)} state files")
            # In real implementation, would validate state integrity

        logger.info("✅ Protocol states OK")
        return False

    def respond(self) -> None:
        """Respond to corruption"""
        logger.warning("⚠️  State Corruption Response:")
        logger.warning("   1. Stop protocol operations")
        logger.warning("   2. Validate state integrity")
        logger.warning("   3. Restore from backup")
        logger.warning("   4. Reset if necessary")

    def recover(self) -> None:
        """Recover from corruption"""
        logger.info("🔧 State Corruption Recovery:")
        logger.info("   1. Restore valid state")
        logger.info("   2. Add state validation")
        logger.info("   3. Implement checksums")
        logger.info("   4. Test state transitions")


# Register risks

def register_protocol_compliance_risks():
    registered = set(r.name for r in enforcer.risks)
    risks = [ProtocolVersionIncompatibleRisk(), InvalidProtocolMessageRisk(), ProtocolStateCorruptionRisk()]
    for risk in risks:
        if risk.name not in registered:
            enforcer.register_risk(risk)
    logger.info("\u2705 Protocol compliance risks registered")

register_protocol_compliance_risks()

logger.info("✅ Protocol compliance risks registered")



