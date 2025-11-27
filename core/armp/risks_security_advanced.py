"""
ARMP - Advanced Security Risks

Critical security risks beyond basic PII and code injection
"""

from core.armp.enforcer import Risk, Severity, RiskCategory, enforcer
import re
import ast
from pathlib import Path
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class SQLInjectionRisk(Risk):
    """
    SQL Injection Attack Risk

    Detects potential SQL injection vulnerabilities
    """

    def __init__(self):
        super().__init__(
            name="SQL Injection Attack",
            category=RiskCategory.SECURITY,
            severity=Severity.CRITICAL,
            description="Detects SQL injection vulnerabilities in code",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent SQL injection"""
        logger.info("🛡️  SQL Injection Prevention:")
        logger.info("   - Use parameterized queries")
        logger.info("   - Avoid string concatenation in SQL")
        logger.info("   - Use ORM (SQLAlchemy, etc)")
        logger.info("   - Validate all user inputs")

    def detect(self) -> bool:
        """Detect SQL injection patterns"""
        logger.info("🔍 Scanning for SQL injection patterns...")

        violations = []

        # Scan all Python files
        for py_file in Path("protocols").rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()

                # Dangerous patterns
                patterns = [
                    r'execute\s*\(\s*["\'].*%s.*["\']',  # String formatting in execute
                    r'execute\s*\(\s*.*\+.*\)',  # String concatenation
                    r'execute\s*\(\s*f["\']',  # F-string in execute
                ]

                for pattern in patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        violations.append(str(py_file))
                        break

            except Exception as e:
                pass

        if violations:
            logger.error(f"❌ SQL injection risks found in: {violations}")
            return True

        logger.info("✅ No SQL injection patterns detected")
        return False

    def respond(self) -> None:
        """Respond to SQL injection risk"""
        logger.warning("⚠️  SQL Injection Risk Response:")
        logger.warning("   1. Review flagged code immediately")
        logger.warning("   2. Replace with parameterized queries")
        logger.warning("   3. Add input validation")
        logger.warning("   4. Run security audit")

    def recover(self) -> None:
        """Recover from SQL injection"""
        logger.info("🔧 SQL Injection Recovery:")
        logger.info("   1. Patch vulnerable code")
        logger.info("   2. Review all database queries")
        logger.info("   3. Add automated tests")
        logger.info("   4. Update security guidelines")


class MaliciousPackageRisk(Risk):
    """
    Malicious Package Import Risk

    Detects imports of potentially dangerous packages
    """

    def __init__(self):
        super().__init__(
            name="Malicious Package Import",
            category=RiskCategory.SECURITY,
            severity=Severity.CRITICAL,
            description="Detects imports of dangerous packages",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

        # Known dangerous packages (examples)
        self.dangerous_packages = [
            'pickle',  # Can execute arbitrary code
            'marshal',  # Similar to pickle
            'shelve',  # Uses pickle
        ]

        # Suspicious patterns
        self.suspicious_packages = [
            'ctypes',  # Can call C functions
            'subprocess',  # Already covered but reinforcing
        ]

    def prevent(self) -> None:
        """Prevent malicious package imports"""
        logger.info("🛡️  Malicious Package Prevention:")
        logger.info("   - Whitelist safe packages")
        logger.info("   - Review all imports")
        logger.info("   - Use virtual environments")
        logger.info("   - Check package signatures")

    def detect(self) -> bool:
        """Detect dangerous package imports"""
        logger.info("🔍 Scanning for dangerous package imports...")

        violations = []

        for py_file in Path("protocols").rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    tree = ast.parse(f.read())

                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            if alias.name in self.dangerous_packages:
                                violations.append({
                                    'file': str(py_file),
                                    'package': alias.name,
                                    'line': node.lineno
                                })

                    elif isinstance(node, ast.ImportFrom):
                        if node.module in self.dangerous_packages:
                            violations.append({
                                'file': str(py_file),
                                'package': node.module,
                                'line': node.lineno
                            })

            except Exception as e:
                pass

        if violations:
            logger.error("❌ Dangerous package imports found:")
            for v in violations:
                logger.error(f"   {v['file']}:{v['line']} - {v['package']}")
            return True

        logger.info("✅ No dangerous package imports detected")
        return False

    def respond(self) -> None:
        """Respond to malicious package risk"""
        logger.warning("⚠️  Malicious Package Response:")
        logger.warning("   1. Review all flagged imports")
        logger.warning("   2. Replace with safe alternatives")
        logger.warning("   3. Add to blacklist")
        logger.warning("   4. Audit dependencies")

    def recover(self) -> None:
        """Recover from malicious package"""
        logger.info("🔧 Malicious Package Recovery:")
        logger.info("   1. Remove dangerous imports")
        logger.info("   2. Update requirements.txt")
        logger.info("   3. Re-test all functionality")
        logger.info("   4. Document safe alternatives")


class CredentialExposureRisk(Risk):
    """
    Credential Exposure Risk

    Detects hardcoded credentials in code
    """

    def __init__(self):
        super().__init__(
            name="Credential Exposure",
            category=RiskCategory.SECURITY,
            severity=Severity.CRITICAL,
            description="Detects hardcoded credentials",
            prevention=self.prevent,
            detection=self.detect,
            response=self.respond,
            recovery=self.recover
        )

    def prevent(self) -> None:
        """Prevent credential exposure"""
        logger.info("🛡️  Credential Exposure Prevention:")
        logger.info("   - Use environment variables")
        logger.info("   - Never commit credentials")
        logger.info("   - Use secrets management")
        logger.info("   - Rotate credentials regularly")

    def detect(self) -> bool:
        """Detect hardcoded credentials"""
        logger.info("🔍 Scanning for hardcoded credentials...")

        violations = []

        # Patterns for credentials
        patterns = [
            r'password\s*=\s*["\'][^"\']{3,}["\']',
            r'api[_-]?key\s*=\s*["\'][^"\']{10,}["\']',
            r'secret\s*=\s*["\'][^"\']{10,}["\']',
            r'token\s*=\s*["\'][^"\']{10,}["\']',
            r'auth\s*=\s*["\'][^"\']{10,}["\']',
        ]

        for py_file in Path("protocols").rglob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    content = f.read()

                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        # Skip if it's clearly a placeholder
                        value = match.group()
                        if any(placeholder in value.lower() for placeholder in
                               ['your_', 'example', 'test', 'dummy', 'placeholder', 'xxx']):
                            continue

                        violations.append({
                            'file': str(py_file),
                            'pattern': pattern,
                            'match': value[:50]  # First 50 chars
                        })

            except Exception as e:
                pass

        if violations:
            logger.error("❌ Potential credential exposure found:")
            for v in violations:
                logger.error(f"   {v['file']}: {v['match']}")
            return True

        logger.info("✅ No hardcoded credentials detected")
        return False

    def respond(self) -> None:
        """Respond to credential exposure"""
        logger.warning("⚠️  Credential Exposure Response:")
        logger.warning("   1. Remove hardcoded credentials IMMEDIATELY")
        logger.warning("   2. Rotate exposed credentials")
        logger.warning("   3. Move to environment variables")
        logger.warning("   4. Review git history")

    def recover(self) -> None:
        """Recover from credential exposure"""
        logger.info("🔧 Credential Exposure Recovery:")
        logger.info("   1. Revoke all exposed credentials")
        logger.info("   2. Generate new credentials")
        logger.info("   3. Update secrets management")
        logger.info("   4. Add pre-commit hooks")



def register_security_advanced_risks():
    """Advanced security risks 등록 (중복 방지)"""
    registered = set(r.name for r in enforcer.risks)
    risks = [
        SQLInjectionRisk(),
        MaliciousPackageRisk(),
        CredentialExposureRisk(),
    ]
    for risk in risks:
        if risk.name not in registered:
            enforcer.register_risk(risk)
    logger.info("✅ Advanced security risks registered")



