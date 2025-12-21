import functools
import time

def safe_call(fn, *args, timeout=5.0, **kwargs):
    """예외 발생해도 None 반환, Core에 영향 없음"""
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None

def timed(fn):
    """실행 시간 측정 데코레이터"""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = (time.perf_counter() - start) * 1000
        return result, elapsed
    return wrapper
