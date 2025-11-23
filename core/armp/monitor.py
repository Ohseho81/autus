"""
ARMP 자동 모니터링 시스템

실시간으로 리스크를 감지하고 대응합니다.
"""
import threading
import time
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ARMPMonitor:
    """실시간 리스크 모니터링"""

    def __init__(self, enforcer):
        self.enforcer = enforcer
        self.running = False
        self.thread = None
        self.start_time = None
        self.check_count = 0
        self.violation_count = 0

    def start(self):
        """모니터링 시작"""
        if self.running:
            logger.warning("Monitor is already running")
            return

        self.running = True
        self.start_time = datetime.now()
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()
        logger.info("ARMP Monitor started")

    def stop(self):
        """모니터링 중지"""
        if not self.running:
            return

        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("ARMP Monitor stopped")

    def _monitor_loop(self):
        """모니터링 루프"""
        logger.info("Monitor loop started")

        while self.running:
            try:
                # 1. 모든 리스크 감지
                violations = self.enforcer.detect_violations()
                self.check_count += 1

                # 2. 위반 대응
                if violations:
                    self.violation_count += len(violations)
                    logger.warning(f"Detected {len(violations)} violation(s)")

                    for risk in violations:
                        try:
                            self.enforcer.respond_to(risk)
                            self.enforcer.recover_from(risk)
                        except Exception as e:
                            logger.error(f"Failed to handle {risk.name}: {e}")

                # 3. 메트릭 수집
                self._collect_metrics()

                # 4. 대기 (1분마다)
                time.sleep(60)

            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                time.sleep(10)  # 에러 시 짧은 대기 후 재시도

    def _collect_metrics(self):
        """메트릭 수집"""
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "total_risks": len(self.enforcer.risks),
                "incidents_count": len(self.enforcer.incidents),
                "check_count": self.check_count,
                "violation_count": self.violation_count,
                "uptime_seconds": (datetime.now() - self.start_time).total_seconds() if self.start_time else 0,
                "safe_mode": self.enforcer.safe_mode
            }

            # 로그로 출력 (나중에 Prometheus/Grafana로 전송 가능)
            if self.check_count % 10 == 0:  # 10분마다
                logger.info(f"ARMP Metrics: {metrics}")

        except Exception as e:
            logger.error(f"Metrics collection error: {e}")

    def _get_uptime(self) -> float:
        """업타임 반환 (초)"""
        if self.start_time:
            return (datetime.now() - self.start_time).total_seconds()
        return 0.0

    def get_status(self) -> dict:
        """모니터 상태 반환"""
        return {
            "running": self.running,
            "uptime_seconds": self._get_uptime(),
            "check_count": self.check_count,
            "violation_count": self.violation_count,
            "last_check": datetime.now().isoformat() if self.running else None
        }


# 전역 Monitor
from core.armp.enforcer import enforcer
monitor = ARMPMonitor(enforcer)
