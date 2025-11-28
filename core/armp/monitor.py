"""
ARMP Monitor

실시간 리스크 모니터링 시스템
"""

from __future__ import annotations

import threading
import time
from datetime import datetime
from typing import Optional, Dict, Any
from core.utils.logging import get_logger

logger = get_logger(__name__)


class ARMPMonitor:
    def is_running(self) -> bool:
        """모니터가 실행 중인지 반환"""
        return self.running

    def get_metrics(self) -> Dict[str, Any]:
        """현재 모니터링 메트릭 반환"""
        return {
            "uptime_seconds": self._get_uptime(),
            "check_count": self.check_count,
            "violation_count": self.violation_count,
            "running": self.running,
            "check_interval": self.check_interval,
            "timestamp": datetime.now().isoformat(),
            "risks_checked": getattr(self.enforcer, 'risks', []),
            "violations_found": getattr(self.enforcer, 'incidents', [])
        }
    """실시간 리스크 모니터링"""

    def __init__(self, enforcer: Any) -> None:
        self.enforcer = enforcer
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.check_interval: int = 60  # 1분마다 (legacy)
        self._interval: Optional[int] = None  # If set, overrides check_interval for test control
        self.start_time: Optional[datetime] = None
        self.check_count: int = 0
        self.violation_count: int = 0

    @property
    def interval(self) -> int:
        return self._interval if self._interval is not None else self.check_interval

    @interval.setter
    def interval(self, value: int) -> None:
        self._interval = value

    def start(self) -> None:
        """모니터링 시작"""
        if self.running:
            logger.warning("Monitor already running")
            return

        self.running = True
        self.start_time = datetime.now()
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info("✅ ARMP Monitor started")

    def stop(self) -> None:
        """모니터링 중지"""
        self.running: bool = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        self._interval: Optional[int] = None  # Reset interval after stop for test isolation
        logger.info("⏹️  ARMP Monitor stopped")

    def _monitor_loop(self) -> None:
        """모니터링 루프"""
        logger.info("🔍 Monitor loop starting...")

        while self.running:
            try:
                # 1. 모든 리스크 감지
                violations = self.enforcer.detect_violations()
                self.check_count += 1

                # 2. 위반 발견 시 대응
                if violations:
                    self.violation_count += len(violations)
                    logger.warning(f"⚠️  {len(violations)} violations detected")

                    for risk in violations:
                        try:
                            self.enforcer.respond_to(risk)
                            self.enforcer.recover_from(risk)
                        except Exception as e:
                            logger.error(f"Failed to handle {risk.name}: {e}")

                # 3. 메트릭 수집
                self._collect_metrics()

                # 4. 대기 (always use self.interval property)
                time.sleep(self.interval)

            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                time.sleep(10)  # 에러 시 짧은 대기 후 재시도

    def _collect_metrics(self) -> None:
        """메트릭 수집"""
        try:
            metrics: Dict[str, Any] = {
                "timestamp": datetime.now().isoformat(),
                "total_risks": len(self.enforcer.risks),
                "incidents_count": len(self.enforcer.incidents),
                "check_count": self.check_count,
                "violation_count": self.violation_count,
                "uptime_seconds": self._get_uptime(),
                "safe_mode": self.enforcer.safe_mode
            }

            # 10분마다 로그 출력
            if self.check_count % 10 == 0:
                logger.info(f"📊 ARMP Metrics: {metrics}")

        except Exception as e:
            logger.error(f"Metrics collection error: {e}")

    def _get_uptime(self) -> float:
        """업타임 반환 (초)"""
        if self.start_time:
            return (datetime.now() - self.start_time).total_seconds()
        return 0.0

    def get_status(self) -> Dict[str, Any]:
        """모니터 상태 반환"""
        return {
            "running": self.running,
            "uptime_seconds": self._get_uptime(),
            "check_count": self.check_count,
            "violation_count": self.violation_count,
            "check_interval": self.check_interval,
            "last_check": datetime.now().isoformat() if self.running else None
        }


# 전역 Monitor
from core.armp.enforcer import enforcer
monitor = ARMPMonitor(enforcer)
