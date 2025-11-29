"""
from __future__ import annotations

ARMP - Data Integrity Risks

High-impact risks related to data management
"""

from packs.security.enforcer import Risk, Severity, RiskCategory, enforcer
import logging
from pathlib import Path
import shutil
import json

logger = logging.getLogger(__name__)


class BackupFailureRisk(Risk):
    """
    Backup Failure Risk

    Detects backup system failures
    """

    def __init__(self) -> None:
        super().__init__(
            name="Backup Failure",
            category=RiskCategory.DATA,
            severity=Severity.HIGH,
            description="Detects backup system failures",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent backup failures"""
        logger.info("🛡️  Backup Failure Prevention:")
        logger.info("   - Regular automated backups")
        logger.info("   - Verify backup integrity")
        logger.info("   - Multiple backup locations")
        logger.info("   - Test restore procedures")

    def detect(self) -> bool:
        """Detect backup issues"""
        logger.info("🔍 Checking backup system...")

        # Check if backup directory exists
        backup_dir = Path(".autus/backups")

        if not backup_dir.exists():
            logger.warning("⚠️  Backup directory doesn't exist")
            return True

        # Check for recent backups (last 24 hours)
        from datetime import datetime, timedelta
        recent_backups = []

        if backup_dir.exists():
            for backup_file in backup_dir.glob("*"):
                if backup_file.is_file():
                    mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
                    if datetime.now() - mtime < timedelta(days=1):
                        recent_backups.append(backup_file)

        if not recent_backups:
            logger.warning("⚠️  No recent backups found")
            return True

        logger.info(f"✅ {len(recent_backups)} recent backup(s) found")
        return False

    def respond(self) -> None:
        """Respond to backup failure"""
        logger.warning("⚠️  Backup Failure Response:")
        logger.warning("   1. Create manual backup immediately")
        logger.warning("   2. Check backup system logs")
        logger.warning("   3. Fix backup automation")
        logger.warning("   4. Verify disk space")

    def recover(self) -> None:
        """Recover from backup failure"""
        logger.info("🔧 Backup System Recovery:")
        logger.info("   1. Restart backup service")
        logger.info("   2. Verify all backup locations")
        logger.info("   3. Test backup/restore")
        logger.info("   4. Schedule next backup")


class DataMigrationRisk(Risk):
    """
    Data Migration Error Risk

    Detects data migration issues
    """

    def __init__(self) -> None:
        super().__init__(
            name="Data Migration Error",
            category=RiskCategory.DATA,
            severity=Severity.HIGH,
            description="Detects data migration errors",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent migration errors"""
        logger.info("🛡️  Data Migration Prevention:")
        logger.info("   - Backup before migration")
        logger.info("   - Test migrations on copy")
        logger.info("   - Use transaction rollback")
        logger.info("   - Validate after migration")

    def detect(self) -> bool:
        """Detect migration issues"""
        logger.info("🔍 Checking data migration status...")

        # Check for migration locks or errors
        migration_dir = Path("protocols/memory")

        # Look for .migration_lock or error indicators
        if (migration_dir / ".migration_lock").exists():
            logger.error("❌ Migration lock file found")
            return True

        logger.info("✅ No migration issues detected")
        return False

    def respond(self) -> None:
        """Respond to migration error"""
        logger.warning("⚠️  Migration Error Response:")
        logger.warning("   1. Stop migration immediately")
        logger.warning("   2. Check data integrity")
        logger.warning("   3. Restore from backup if needed")
        logger.warning("   4. Review migration logs")

    def recover(self) -> None:
        """Recover from migration error"""
        logger.info("🔧 Migration Recovery:")
        logger.info("   1. Rollback failed migration")
        logger.info("   2. Verify data consistency")
        logger.info("   3. Fix migration script")
        logger.info("   4. Retry migration")


class TransactionRollbackRisk(Risk):
    """
    Transaction Rollback Failure Risk

    Detects database transaction rollback failures
    """

    def __init__(self) -> None:
        super().__init__(
            name="Transaction Rollback Failure",
            category=RiskCategory.DATA,
            severity=Severity.HIGH,
            description="Detects transaction rollback failures",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent rollback failures"""
        logger.info("🛡️  Transaction Rollback Prevention:")
        logger.info("   - Use proper transaction management")
        logger.info("   - Implement savepoints")
        logger.info("   - Handle exceptions properly")
        logger.info("   - Test rollback scenarios")

    def detect(self) -> bool:
        """Detect rollback issues"""
        logger.info("🔍 Checking transaction handling...")

        violations = []

        # Check for proper exception handling in transactions
        for py_file in Path("protocols").rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()

                # Look for begin/commit without try/except
                if 'begin()' in content or 'commit()' in content:
                    if 'try:' not in content or 'rollback()' not in content:
                        violations.append(str(py_file))
            except Exception:
                pass

        if violations:
            logger.warning(f"⚠️  Missing rollback handling: {violations}")
            return True

        logger.info("✅ Transaction handling OK")
        return False

    def respond(self) -> None:
        """Respond to rollback failure"""
        logger.warning("⚠️  Rollback Failure Response:")
        logger.warning("   1. Check database state")
        logger.warning("   2. Manual rollback if needed")
        logger.warning("   3. Fix transaction code")
        logger.warning("   4. Add proper error handling")

    def recover(self) -> None:
        """Recover from rollback failure"""
        logger.info("🔧 Transaction Recovery:")
        logger.info("   1. Restore consistent state")
        logger.info("   2. Add savepoints")
        logger.info("   3. Improve error handling")
        logger.info("   4. Test transaction scenarios")


# Register risks

def register_data_integrity_risks():
    registered = set(r.name for r in enforcer.risks)
    risks = [BackupFailureRisk(), DataMigrationRisk(), TransactionRollbackRisk()]
    for risk in risks:
        if risk.name not in registered:
            enforcer.register_risk(risk)
    logger.info("✅ Data integrity risks registered")



