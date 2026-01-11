"""
═══════════════════════════════════════════════════════════════════════════════
📝 AUTUS Logging System (표준화된 로깅)
═══════════════════════════════════════════════════════════════════════════════

구조화된 로깅 시스템
- JSON 형식 로그 (프로덕션)
- 색상 콘솔 로그 (개발)
- 로그 레벨별 필터링
- 컨텍스트 정보 자동 추가
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps
import time


# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")  # text or json
IS_PRODUCTION = os.getenv("ENV", "development") == "production"


# ═══════════════════════════════════════════════════════════════════════════════
# ANSI 색상 코드
# ═══════════════════════════════════════════════════════════════════════════════

class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    
    # 로그 레벨별 색상
    DEBUG = "\033[36m"      # Cyan
    INFO = "\033[32m"       # Green
    WARNING = "\033[33m"    # Yellow
    ERROR = "\033[31m"      # Red
    CRITICAL = "\033[35m"   # Magenta
    
    # 기타
    TIMESTAMP = "\033[90m"  # Gray
    NAME = "\033[34m"       # Blue


# ═══════════════════════════════════════════════════════════════════════════════
# JSON 포매터 (프로덕션)
# ═══════════════════════════════════════════════════════════════════════════════

class JSONFormatter(logging.Formatter):
    """JSON 형식 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # 위치 정보
        if record.pathname:
            log_data["location"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }
        
        # 예외 정보
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 추가 필드 (extra)
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "exc_info", "exc_text", "thread", "threadName",
                "message", "asctime",
            }:
                try:
                    json.dumps(value)  # JSON 직렬화 가능 여부 확인
                    log_data[key] = value
                except (TypeError, ValueError):
                    log_data[key] = str(value)
        
        return json.dumps(log_data, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════
# 색상 콘솔 포매터 (개발)
# ═══════════════════════════════════════════════════════════════════════════════

class ColoredFormatter(logging.Formatter):
    """색상 콘솔 로그 포매터"""
    
    LEVEL_COLORS = {
        "DEBUG": Colors.DEBUG,
        "INFO": Colors.INFO,
        "WARNING": Colors.WARNING,
        "ERROR": Colors.ERROR,
        "CRITICAL": Colors.CRITICAL,
    }
    
    def format(self, record: logging.LogRecord) -> str:
        # 타임스탬프
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        # 로그 레벨 색상
        level_color = self.LEVEL_COLORS.get(record.levelname, "")
        level = f"{level_color}{record.levelname:8}{Colors.RESET}"
        
        # 로거 이름
        name = f"{Colors.NAME}{record.name}{Colors.RESET}"
        
        # 메시지
        message = record.getMessage()
        
        # 기본 포맷
        output = f"{Colors.TIMESTAMP}{timestamp}{Colors.RESET} {level} {name}: {message}"
        
        # extra 필드 추가
        extras = []
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "exc_info", "exc_text", "thread", "threadName",
                "message", "asctime",
            }:
                extras.append(f"{Colors.DIM}{key}={value}{Colors.RESET}")
        
        if extras:
            output += f" [{', '.join(extras)}]"
        
        # 예외 정보
        if record.exc_info:
            output += f"\n{Colors.ERROR}{self.formatException(record.exc_info)}{Colors.RESET}"
        
        return output


# ═══════════════════════════════════════════════════════════════════════════════
# 로거 설정
# ═══════════════════════════════════════════════════════════════════════════════

def setup_logging(
    level: str = LOG_LEVEL,
    log_format: str = LOG_FORMAT,
    log_file: Optional[str] = None,
) -> None:
    """로깅 시스템 설정"""
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level, logging.INFO))
    
    # 기존 핸들러 제거
    root_logger.handlers.clear()
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level, logging.INFO))
    
    # 포매터 선택
    if log_format == "json" or IS_PRODUCTION:
        formatter = JSONFormatter()
    else:
        formatter = ColoredFormatter()
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # 파일 핸들러 (선택적)
    if log_file:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(JSONFormatter())  # 파일은 항상 JSON
        root_logger.addHandler(file_handler)
    
    # 외부 라이브러리 로그 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# ═══════════════════════════════════════════════════════════════════════════════
# 로거 팩토리
# ═══════════════════════════════════════════════════════════════════════════════

def get_logger(name: str) -> logging.Logger:
    """모듈별 로거 생성"""
    return logging.getLogger(f"autus.{name}")


# ═══════════════════════════════════════════════════════════════════════════════
# 로깅 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════

def log_execution(
    logger: Optional[logging.Logger] = None,
    level: int = logging.DEBUG,
    include_args: bool = True,
    include_result: bool = False,
):
    """함수 실행 로깅 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            
            # 시작 로그
            start_time = time.time()
            log_msg = f"Calling {func.__name__}"
            
            if include_args and (args or kwargs):
                log_msg += f" with args={args}, kwargs={kwargs}"
            
            _logger.log(level, log_msg)
            
            try:
                result = await func(*args, **kwargs)
                
                # 완료 로그
                elapsed = (time.time() - start_time) * 1000
                complete_msg = f"{func.__name__} completed in {elapsed:.2f}ms"
                
                if include_result:
                    complete_msg += f" with result={result}"
                
                _logger.log(level, complete_msg)
                
                return result
            except Exception as e:
                # 에러 로그
                elapsed = (time.time() - start_time) * 1000
                _logger.error(
                    f"{func.__name__} failed after {elapsed:.2f}ms: {e}",
                    exc_info=True,
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            
            start_time = time.time()
            log_msg = f"Calling {func.__name__}"
            
            if include_args and (args or kwargs):
                log_msg += f" with args={args}, kwargs={kwargs}"
            
            _logger.log(level, log_msg)
            
            try:
                result = func(*args, **kwargs)
                
                elapsed = (time.time() - start_time) * 1000
                complete_msg = f"{func.__name__} completed in {elapsed:.2f}ms"
                
                if include_result:
                    complete_msg += f" with result={result}"
                
                _logger.log(level, complete_msg)
                
                return result
            except Exception as e:
                elapsed = (time.time() - start_time) * 1000
                _logger.error(
                    f"{func.__name__} failed after {elapsed:.2f}ms: {e}",
                    exc_info=True,
                )
                raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
# 컨텍스트 로거
# ═══════════════════════════════════════════════════════════════════════════════

class ContextLogger:
    """컨텍스트 정보를 포함하는 로거"""
    
    def __init__(self, name: str, **context):
        self._logger = get_logger(name)
        self._context = context
    
    def _log(self, level: int, message: str, **kwargs):
        extra = {**self._context, **kwargs}
        self._logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log(logging.CRITICAL, message, **kwargs)
    
    def with_context(self, **new_context) -> "ContextLogger":
        """새 컨텍스트로 로거 확장"""
        return ContextLogger(
            self._logger.name.replace("autus.", ""),
            **{**self._context, **new_context},
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

# 기본 로거들
api_logger = get_logger("api")
engine_logger = get_logger("engine")
db_logger = get_logger("db")
webhook_logger = get_logger("webhook")


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "setup_logging",
    "get_logger",
    "log_execution",
    "ContextLogger",
    "JSONFormatter",
    "ColoredFormatter",
    # 편의 로거
    "api_logger",
    "engine_logger",
    "db_logger",
    "webhook_logger",
]
