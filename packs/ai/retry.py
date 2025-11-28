"""
LLM API 재시도 로직 (Rate Limit & Network Resilience)

Exponential backoff를 사용한 재시도 메커니즘
"""
import time
import functools
from typing import Callable, TypeVar, Any
from openai import RateLimitError, APIError
from anthropic import RateLimitError as AnthropicRateLimitError

T = TypeVar('T')


class RateLimitExceeded(Exception):
    """Rate limit 초과 예외"""
    pass


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0
):
    """
    Exponential backoff 재시도 데코레이터

    Args:
        max_retries: 최대 재시도 횟수
        base_delay: 초기 지연 시간 (초)
        max_delay: 최대 지연 시간 (초)
        exponential_base: 지수 증가 베이스

    Example:
        @retry_with_backoff(max_retries=5, base_delay=60)
        def call_openai(prompt):
            return client.chat.completions.create(...)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)

                except (RateLimitError, AnthropicRateLimitError) as e:
                    last_exception = e

                    if attempt == max_retries - 1:
                        raise RateLimitExceeded(
                            f"Rate limit exceeded after {max_retries} retries: {e}"
                        )

                    # Exponential backoff
                    delay = min(
                        base_delay * (exponential_base ** attempt),
                        max_delay
                    )

                    print(f"⚠️ Rate limit hit. Retrying in {delay:.1f}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)

                except APIError as e:
                    # API 에러는 재시도 (429, 500, 502, 503, 504)
                    if e.status_code in [429, 500, 502, 503, 504]:
                        last_exception = e

                        if attempt == max_retries - 1:
                            raise

                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )
                        print(f"⚠️ API error {e.status_code}. Retrying in {delay:.1f}s...")
                        time.sleep(delay)
                    else:
                        # 재시도 불가능한 에러
                        raise

                except Exception as e:
                    # 예상치 못한 에러는 즉시 실패
                    raise

            # 모든 재시도 실패
            if last_exception:
                raise last_exception

        return wrapper
    return decorator


def create_resilient_session():
    """
    재시도 로직이 있는 HTTP 세션 생성

    Note: requests 라이브러리 사용 시
    """
    try:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        session = requests.Session()

        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session
    except ImportError:
        # requests가 없으면 None 반환
        return None



