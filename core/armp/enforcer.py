"""
ARMP Enforcement System

모든 리스크 정책을 자동으로 강제합니다.
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Callable
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class Severity(Enum):
    """리스크 심각도"""
    CRITICAL = "critical"  # S1
    HIGH = "high"          # S2
    MEDIUM = "medium"      # S3
    LOW = "low"            # S4


class RiskCategory(Enum):
    """리스크 카테고리"""
    ENVIRONMENT = "environment"
    DATA = "data"
    API = "api"
    CODE = "code"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COLLABORATION = "collaboration"
    OPERATIONS = "operations"


@dataclass
class Risk:
    """리스크 정의"""
    name: str
    category: RiskCategory
    severity: Severity
    description: str
    prevention: Callable[[], None]
    detection: Callable[[], bool]
    response: Callable[[], None]
    recovery: Callable[[], None]


class ConstitutionViolationError(Exception):
    """Constitution 위반 예외"""
    pass


class ARMPEnforcer:
    """ARMP 강제 시스템"""
    
    def __init__(self):
        self.risks: List[Risk] = []
        self.incidents = []
        self.safe_mode = False
        
    def register_risk(self, risk: Risk):
        """리스크 등록"""
        self.risks.append(risk)
        logger.info(f"Risk registered: {risk.name} ({risk.severity.value})")
    
    def prevent_all(self):
        """모든 예방 조치 실행"""
        logger.info("Executing all prevention measures...")
        for risk in self.risks:
            try:
                risk.prevention()
                logger.debug(f"Prevention executed: {risk.name}")
            except Exception as e:
                logger.error(f"Prevention failed for {risk.name}: {e}")
    
    def detect_violations(self) -> List[Risk]:
        """위반 감지"""
        violations = []
        
        for risk in self.risks:
            try:
                if risk.detection():
                    violations.append(risk)
                    logger.warning(f"⚠️ Risk detected: {risk.name}")
            except Exception as e:
                logger.error(f"Detection failed for {risk.name}: {e}")
        
        return violations
    
    def respond_to(self, risk: Risk):
        """리스크 대응"""
        try:
            # 1. 즉시 대응
            risk.response()
            
            # 2. 인시던트 기록
            incident = {
                "risk": risk.name,
                "category": risk.category.value,
                "severity": risk.severity.value,
                "description": risk.description,
                "timestamp": datetime.now().isoformat()
            }
            self.incidents.append(incident)
            
            # 3. 심각도별 처리
            if risk.severity == Severity.CRITICAL:
                self._handle_critical(risk)
            
            logger.info(f"Response completed for {risk.name}")
            
        except Exception as e:
            logger.critical(f"Response failed for {risk.name}: {e}")
            raise
    
    def recover_from(self, risk: Risk):
        """복구"""
        try:
            risk.recovery()
            logger.info(f"Recovery completed for {risk.name}")
        except Exception as e:
            logger.critical(f"Recovery failed for {risk.name}: {e}")
            raise
    
    def _handle_critical(self, risk: Risk):
        """Critical 리스크 특별 처리"""
        # 1. 즉시 알림
        self._send_alert(risk)
        
        # 2. 안전 모드 전환
        self._enter_safe_mode()
        
        # 3. 자동 백업
        self._create_emergency_backup()
    
    def _send_alert(self, risk: Risk):
        """알림 전송"""
        logger.critical(f"🚨 CRITICAL ALERT: {risk.name}")
        logger.critical(f"   Category: {risk.category.value}")
        logger.critical(f"   Description: {risk.description}")
        # TODO: Slack/Email/SMS 등으로 알림
    
    def _enter_safe_mode(self):
        """안전 모드"""
        if not self.safe_mode:
            logger.warning("Entering safe mode...")
            self.safe_mode = True
            # Core 기능만 유지
    
    def exit_safe_mode(self):
        """안전 모드 해제"""
        if self.safe_mode:
            logger.info("Exiting safe mode...")
            self.safe_mode = False
    
    def _create_emergency_backup(self):
        """긴급 백업"""
        logger.info("Creating emergency backup...")
        # TODO: 현재 상태 백업
        try:
            from protocols.memory.recovery import RecoveryManager
            from pathlib import Path
            RecoveryManager.create_checkpoint(Path(".autus/memory/memory.db"))
        except Exception as e:
            logger.error(f"Emergency backup failed: {e}")
    
    def get_status(self) -> dict:
        """현재 상태 반환"""
        return {
            "total_risks": len(self.risks),
            "incidents_count": len(self.incidents),
            "safe_mode": self.safe_mode,
            "recent_incidents": self.incidents[-10:] if self.incidents else []
        }


# 전역 Enforcer
enforcer = ARMPEnforcer()

