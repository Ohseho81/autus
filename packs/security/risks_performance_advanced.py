"""
from __future__ import annotations

ARMP - Advanced Performance Risks

High-impact performance risks
"""

from packs.security.enforcer import Risk, Severity, RiskCategory, enforcer
import logging

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

logger = logging.getLogger(__name__)


class MemoryLeakRisk(Risk):
    """
    Memory Leak Detected Risk

    Detects potential memory leaks
    """

    def __init__(self) -> None:
        super().__init__(
            name="Memory Leak Detected",
            category=RiskCategory.PERFORMANCE,
            severity=Severity.HIGH,
            description="Detects memory leak patterns",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )
        self.memory_threshold_mb = 1000  # 1GB

    def prevent(self) -> None:
        """Prevent memory leaks"""
        logger.info("🛡️  Memory Leak Prevention:")
        logger.info("   - Profile memory usage")
        logger.info("   - Use context managers")
        logger.info("   - Close resources properly")
        logger.info("   - Avoid circular references")

    def detect(self) -> bool:
        """Detect memory leaks"""
        logger.info("🔍 Checking memory usage...")

        if not PSUTIL_AVAILABLE:
            logger.warning("⚠️  psutil not available, skipping memory check")
            return False

        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024

        if memory_mb > self.memory_threshold_mb:
            logger.error(f"❌ Memory usage high: {memory_mb:.0f}MB")
            return True

        logger.info(f"✅ Memory usage OK: {memory_mb:.0f}MB")
        return False

    def respond(self) -> None:
        """Respond to memory leak"""
        logger.warning("⚠️  Memory Leak Response:")
        logger.warning("   1. Profile memory usage")
        logger.warning("   2. Identify leak source")
        logger.warning("   3. Force garbage collection")
        logger.warning("   4. Consider restart")

    def recover(self) -> None:
        """Recover from memory leak"""
        logger.info("🔧 Memory Leak Recovery:")
        logger.info("   1. Fix leak source")
        logger.info("   2. Add memory monitoring")
        logger.info("   3. Implement memory limits")
        logger.info("   4. Add leak detection tests")


class DiskSpaceRisk(Risk):
    """
    Disk Space Critical Risk

    Monitors disk space availability
    """

    def __init__(self) -> None:
        super().__init__(
            name="Disk Space Critical",
            category=RiskCategory.PERFORMANCE,
            severity=Severity.HIGH,
            description="Monitors disk space",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )
        self.critical_threshold_percent = 90

    def prevent(self) -> None:
        """Prevent disk space issues"""
        logger.info("🛡️  Disk Space Prevention:")
        logger.info("   - Monitor disk usage")
        logger.info("   - Clean up old files")
        logger.info("   - Compress logs")
        logger.info("   - Set up alerts")

    def detect(self) -> bool:
        """Detect low disk space"""
        logger.info("🔍 Checking disk space...")

        if not PSUTIL_AVAILABLE:
            logger.warning("⚠️  psutil not available, skipping disk check")
            return False

        disk = psutil.disk_usage('/')
        usage_percent = disk.percent

        if usage_percent >= self.critical_threshold_percent:
            logger.error(f"❌ Disk space critical: {usage_percent}% used")
            return True

        logger.info(f"✅ Disk space OK: {usage_percent}% used")
        return False

    def respond(self) -> None:
        """Respond to low disk space"""
        logger.warning("⚠️  Disk Space Response:")
        logger.warning("   1. Stop non-critical writes")
        logger.warning("   2. Clean up temp files")
        logger.warning("   3. Archive old logs")
        logger.warning("   4. Alert administrators")

    def recover(self) -> None:
        """Recover from disk space issue"""
        logger.info("🔧 Disk Space Recovery:")
        logger.info("   1. Free up space")
        logger.info("   2. Add disk monitoring")
        logger.info("   3. Implement cleanup policies")
        logger.info("   4. Resume normal operations")


# Register risks

def register_performance_advanced_risks():
    registered = set(r.name for r in enforcer.risks)
    risks = [MemoryLeakRisk(), DiskSpaceRisk()]
    for risk in risks:
        if risk.name not in registered:
            enforcer.register_risk(risk)
    logger.info("✅ Advanced performance risks registered")

register_performance_advanced_risks()
