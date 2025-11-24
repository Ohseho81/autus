"""
성능 기준 강제

Performance Budget을 체크하고 위반 시 경고합니다.
"""
import logging
import time
from functools import wraps
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar('T')


class PerformanceBudgetExceeded(Exception):
    """성능 예산 초과 예외"""
    pass


class PerformanceBudget:
    """성능 예산"""

    # API 응답 시간 (ms)
    API_P50 = 50
    API_P99 = 200

    # DB 쿼리 시간 (ms)
    DB_QUERY_MAX = 10

    # Pack 실행 시간 (초)
    PACK_EXECUTION_MAX = 300  # 5분

    # 메모리 사용 (MB)
    MEMORY_MAX = 500

    # 디스크 사용 (MB)
    DISK_MAX = 1000

    @classmethod
    def check_api_response_time(cls, duration_ms: float):
        """API 응답 시간 체크"""
        if duration_ms > cls.API_P99:
            logger.warning(f"⚠️ API slow: {duration_ms:.1f}ms > {cls.API_P99}ms")
        elif duration_ms > cls.API_P50:
            logger.debug(f"API response: {duration_ms:.1f}ms")

    @classmethod
    def check_db_query_time(cls, duration_ms: float):
        """DB 쿼리 시간 체크"""
        if duration_ms > cls.DB_QUERY_MAX:
            logger.warning(f"⚠️ DB slow: {duration_ms:.1f}ms > {cls.DB_QUERY_MAX}ms")

    @classmethod
    def check_pack_execution_time(cls, duration_seconds: float):
        """Pack 실행 시간 체크"""
        if duration_seconds > cls.PACK_EXECUTION_MAX:
            raise PerformanceBudgetExceeded(
                f"Pack execution exceeded: {duration_seconds:.1f}s > {cls.PACK_EXECUTION_MAX}s"
            )

    @classmethod
    def check_memory_usage(cls):
        """메모리 사용 체크"""
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024

            if memory_mb > cls.MEMORY_MAX:
                logger.warning(f"⚠️ Memory high: {memory_mb:.1f}MB > {cls.MEMORY_MAX}MB")
                return memory_mb
            return memory_mb
        except ImportError:
            logger.debug("psutil not available, skipping memory check")
            return None
        except Exception as e:
            logger.error(f"Memory check error: {e}")
            return None

    @classmethod
    def check_disk_usage(cls, path: str = "."):
        """디스크 사용 체크"""
        try:
            import shutil
            from pathlib import Path

            stat = shutil.disk_usage(Path(path))
            free_mb = stat.free / 1024 / 1024

            if free_mb < cls.DISK_MAX:
                logger.warning(f"⚠️ Disk space low: {free_mb:.1f}MB free < {cls.DISK_MAX}MB")
                return free_mb
            return free_mb
        except Exception as e:
            logger.error(f"Disk check error: {e}")
            return None


def monitor_performance(func: Callable[..., T]) -> Callable[..., T]:
    """
    함수 성능 모니터링 데코레이터

    Example:
        @monitor_performance
        def my_api_call():
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        start_time = time.time()

        try:
            result = func(*args, **kwargs)

            duration_ms = (time.time() - start_time) * 1000
            PerformanceBudget.check_api_response_time(duration_ms)

            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Function {func.__name__} failed after {duration_ms:.1f}ms: {e}")
            raise

    return wrapper


def monitor_db_query(func: Callable[..., T]) -> Callable[..., T]:
    """
    DB 쿼리 성능 모니터링 데코레이터

    Example:
        @monitor_db_query
        def get_preference(key):
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        start_time = time.time()

        try:
            result = func(*args, **kwargs)

            duration_ms = (time.time() - start_time) * 1000
            PerformanceBudget.check_db_query_time(duration_ms)

            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"DB query {func.__name__} failed after {duration_ms:.1f}ms: {e}")
            raise

    return wrapper

