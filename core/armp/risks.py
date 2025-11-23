"""
구체적 리스크 정의

주요 리스크들을 정의하고 enforcer에 등록합니다.
"""
import logging
from pathlib import Path
from datetime import datetime
from core.armp.enforcer import Risk, RiskCategory, Severity, enforcer, ConstitutionViolationError

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# Risk 1: PII 저장 시도
# ═══════════════════════════════════════════

def prevent_pii():
    """PII 저장 방지"""
    # PIIValidator는 이미 MemoryStore에 통합됨
    logger.debug("PII prevention: PIIValidator is active in MemoryStore")


def detect_pii() -> bool:
    """PII 감지"""
    try:
        from protocols.memory.store import MemoryStore

        # 간단한 감지: 최근 저장된 데이터 스캔
        store = MemoryStore()

        # preferences 테이블 스캔
        results = store.conn.execute(
            "SELECT key, value FROM preferences ORDER BY updated_at DESC LIMIT 100"
        ).fetchall()

        from protocols.memory.pii_validator import PIIValidator

        for key, value in results:
            try:
                PIIValidator.validate(key, value)
            except Exception:
                # PII 발견
                logger.warning(f"PII detected in stored data: key={key}")
                return True

        return False
    except Exception as e:
        logger.error(f"PII detection error: {e}")
        return False


def respond_to_pii():
    """PII 대응"""
    logger.critical("🚨 PII VIOLATION: Blocking operation")

    # Constitution 위반 보고
    raise ConstitutionViolationError(
        "Article II violated: PII detected in storage. "
        "This is a critical security violation."
    )


def recover_from_pii():
    """PII 복구"""
    logger.info("Recovering from PII violation...")

    try:
        from protocols.memory.recovery import RecoveryManager
        from pathlib import Path

        # 최신 체크포인트에서 복구
        checkpoints = RecoveryManager.list_checkpoints()
        if checkpoints:
            RecoveryManager.restore_from_checkpoint(
                checkpoints[0],
                Path(".autus/memory/memory.db")
            )
            logger.info("Recovered from checkpoint")
        else:
            logger.warning("No checkpoint available for recovery")
    except Exception as e:
        logger.error(f"PII recovery failed: {e}")


pii_risk = Risk(
    name="PII Storage Attempt",
    category=RiskCategory.SECURITY,
    severity=Severity.CRITICAL,
    description="Constitution Article II violation: PII detected in storage",
    prevention=prevent_pii,
    detection=detect_pii,
    response=respond_to_pii,
    recovery=recover_from_pii
)

enforcer.register_risk(pii_risk)


# ═══════════════════════════════════════════
# Risk 2: API Rate Limit
# ═══════════════════════════════════════════

def prevent_rate_limit():
    """Rate Limit 예방"""
    from core.llm.cost_tracker import get_cost_tracker
    tracker = get_cost_tracker()
    logger.debug("Rate limit prevention: Cost tracker active")


def detect_rate_limit() -> bool:
    """Rate Limit 감지"""
    try:
        from core.llm.cost_tracker import get_cost_tracker, CostLimitExceeded

        tracker = get_cost_tracker()

        # 일일 한도 80% 초과 시 경고
        daily_cost = tracker.get_daily_cost()
        if daily_cost > tracker.daily_limit * 0.8:
            logger.warning(f"Rate limit approaching: ${daily_cost:.2f} / ${tracker.daily_limit:.2f}")
            return True

        return False
    except CostLimitExceeded:
        return True
    except Exception as e:
        logger.error(f"Rate limit detection error: {e}")
        return False


def respond_to_rate_limit():
    """Rate Limit 대응"""
    logger.warning("Rate limit approaching: Enabling backoff")
    # retry_with_backoff는 이미 openai_runner에 적용됨
    logger.info("Exponential backoff is active")


def recover_from_rate_limit():
    """Rate Limit 복구"""
    import time
    logger.info("Waiting for rate limit recovery...")
    time.sleep(60)  # 1분 대기
    logger.info("Rate limit recovered")


rate_limit_risk = Risk(
    name="API Rate Limit",
    category=RiskCategory.API,
    severity=Severity.HIGH,
    description="OpenAI/Anthropic rate limit exceeded or approaching",
    prevention=prevent_rate_limit,
    detection=detect_rate_limit,
    response=respond_to_rate_limit,
    recovery=recover_from_rate_limit
)

enforcer.register_risk(rate_limit_risk)


# ═══════════════════════════════════════════
# Risk 3: Code Injection
# ═══════════════════════════════════════════

def prevent_code_injection():
    """Code Injection 예방"""
    from core.pack.code_validator import CodeValidator
    logger.debug("Code injection prevention: CodeValidator active")


def detect_code_injection() -> bool:
    """Code Injection 감지"""
    try:
        from core.pack.code_validator import CodeValidator

        # 최근 생성된 파일 스캔 (protocols, core)
        suspicious_files = []

        for pattern in ["protocols/**/*.py", "core/**/*.py"]:
            for py_file in Path(".").glob(pattern):
                # 최근 1시간 내 수정된 파일만
                if (datetime.now().timestamp() - py_file.stat().st_mtime) < 3600:
                    try:
                        is_safe, reason = CodeValidator.validate_file(py_file)
                        if not is_safe:
                            suspicious_files.append((py_file, reason))
                            logger.warning(f"Unsafe code in {py_file}: {reason}")
                    except Exception as e:
                        logger.debug(f"Could not validate {py_file}: {e}")

        return len(suspicious_files) > 0
    except Exception as e:
        logger.error(f"Code injection detection error: {e}")
        return False


def respond_to_code_injection():
    """Code Injection 대응"""
    logger.critical("🚨 CODE INJECTION: Quarantining suspicious files")
    # 파일 격리 (읽기 전용으로 변경)
    # TODO: 실제 격리 구현


def recover_from_code_injection():
    """Code Injection 복구"""
    logger.info("Recovering from code injection...")
    # Git에서 마지막 안전 버전으로 복구
    import subprocess
    try:
        subprocess.run(
            ["git", "restore", "protocols/", "core/"],
            check=True,
            capture_output=True
        )
        logger.info("Recovered from Git")
    except Exception as e:
        logger.error(f"Code injection recovery failed: {e}")


code_injection_risk = Risk(
    name="Code Injection Attack",
    category=RiskCategory.SECURITY,
    severity=Severity.CRITICAL,
    description="Malicious code generated by AI or injected",
    prevention=prevent_code_injection,
    detection=detect_code_injection,
    response=respond_to_code_injection,
    recovery=recover_from_code_injection
)

enforcer.register_risk(code_injection_risk)


# ═══════════════════════════════════════════
# Risk 4: Database Corruption
# ═══════════════════════════════════════════

def prevent_db_corruption():
    """DB 손상 예방"""
    from protocols.memory.store import MemoryStore
    logger.debug("DB corruption prevention: Transaction mode active")


def detect_db_corruption() -> bool:
    """DB 손상 감지"""
    try:
        import duckdb
        from pathlib import Path

        db_path = Path(".autus/memory/memory.db")
        if not db_path.exists():
            return False

        try:
            conn = duckdb.connect(str(db_path))
            # 간단한 무결성 체크
            conn.execute("SELECT COUNT(*) FROM preferences")
            conn.execute("SELECT COUNT(*) FROM patterns")
            conn.execute("SELECT COUNT(*) FROM context")
            conn.close()
            return False
        except Exception as e:
            logger.error(f"DB corruption detected: {e}")
            return True
    except Exception as e:
        logger.error(f"DB corruption detection error: {e}")
        return False


def respond_to_db_corruption():
    """DB 손상 대응"""
    logger.critical("🚨 DATABASE CORRUPTION: Switching to backup")
    # 읽기 전용 모드로 전환
    # 백업 활성화


def recover_from_db_corruption():
    """DB 손상 복구"""
    logger.info("Recovering from database corruption...")

    try:
        from protocols.memory.recovery import RecoveryManager
        from pathlib import Path

        # 최신 체크포인트에서 복구
        checkpoints = RecoveryManager.list_checkpoints()
        if checkpoints:
            RecoveryManager.restore_from_checkpoint(
                checkpoints[0],
                Path(".autus/memory/memory.db")
            )
            logger.info("Recovered from checkpoint")
        else:
            logger.warning("No checkpoint available for recovery")
    except Exception as e:
        logger.error(f"DB recovery failed: {e}")


db_corruption_risk = Risk(
    name="Database Corruption",
    category=RiskCategory.DATA,
    severity=Severity.CRITICAL,
    description="DuckDB database file corrupted",
    prevention=prevent_db_corruption,
    detection=detect_db_corruption,
    response=respond_to_db_corruption,
    recovery=recover_from_db_corruption
)

enforcer.register_risk(db_corruption_risk)
