"""
AUTUS 자동 롤백 트리거
======================

업데이트 후 메트릭 악화 시 자동 롤백

조건:
1. Inertia Debt: 이전 3개월 rolling average 대비 +0.08 이상
2. ΔṠ: 급격한 증가 (> 0.15)
3. 에러율: +5% 이상 증가
4. 지연 시간: p95 +20% 이상 증가

롤백 절차:
1. 이상 감지
2. 알림 발송
3. 이전 버전으로 pip install
4. 서비스 재시작
5. 메트릭 확인
"""

import logging
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

logger = logging.getLogger(__name__)


class RollbackReason(Enum):
    """롤백 사유"""
    INERTIA_DEBT_SPIKE = "inertia_debt_spike"
    DELTA_S_DOT_SPIKE = "delta_s_dot_spike"
    ERROR_RATE_INCREASE = "error_rate_increase"
    LATENCY_INCREASE = "latency_increase"
    STABILITY_DROP = "stability_drop"
    MANUAL = "manual"


@dataclass
class MetricSnapshot:
    """메트릭 스냅샷"""
    timestamp: datetime
    inertia_debt: float = 0.0
    delta_s_dot: float = 0.0
    stability_score: float = 1.0
    error_rate: float = 0.0
    latency_p95_ms: float = 0.0


@dataclass
class RollbackDecision:
    """롤백 결정"""
    should_rollback: bool = False
    reason: Optional[RollbackReason] = None
    details: str = ""
    affected_packages: list = field(default_factory=list)


@dataclass
class RollbackResult:
    """롤백 결과"""
    success: bool = False
    rolled_back_packages: list = field(default_factory=list)
    failed_packages: list = field(default_factory=list)
    message: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


# 임계값 설정
class RollbackThresholds:
    """롤백 임계값"""
    INERTIA_DEBT_DELTA = 0.08        # Rolling average 대비 +0.08
    DELTA_S_DOT_SPIKE = 0.15         # 급격한 증가
    ERROR_RATE_INCREASE = 0.05       # +5%
    LATENCY_INCREASE_PERCENT = 0.20  # +20%
    STABILITY_DROP = 0.10            # -0.10


class AutoRollbackEngine:
    """자동 롤백 엔진"""
    
    def __init__(self, dry_run: bool = True):
        """
        Args:
            dry_run: 실제 롤백 없이 시뮬레이션
        """
        self.dry_run = dry_run
        self._metric_history: list[MetricSnapshot] = []
        self._package_versions: dict[str, list[str]] = {}  # package -> [versions]
        self._current_versions: dict[str, str] = {}
    
    def record_metric(self, snapshot: MetricSnapshot):
        """메트릭 기록"""
        self._metric_history.append(snapshot)
        
        # 3개월 이상된 데이터 삭제
        cutoff = datetime.now() - timedelta(days=90)
        self._metric_history = [m for m in self._metric_history if m.timestamp > cutoff]
    
    def get_rolling_average(self, days: int = 90) -> Optional[MetricSnapshot]:
        """Rolling Average 계산"""
        cutoff = datetime.now() - timedelta(days=days)
        recent = [m for m in self._metric_history if m.timestamp > cutoff]
        
        if not recent:
            return None
        
        return MetricSnapshot(
            timestamp=datetime.now(),
            inertia_debt=sum(m.inertia_debt for m in recent) / len(recent),
            delta_s_dot=sum(m.delta_s_dot for m in recent) / len(recent),
            stability_score=sum(m.stability_score for m in recent) / len(recent),
            error_rate=sum(m.error_rate for m in recent) / len(recent),
            latency_p95_ms=sum(m.latency_p95_ms for m in recent) / len(recent),
        )
    
    def check_rollback_needed(
        self,
        current: MetricSnapshot,
        baseline: Optional[MetricSnapshot] = None,
    ) -> RollbackDecision:
        """
        롤백 필요 여부 확인
        
        Args:
            current: 현재 메트릭
            baseline: 기준 메트릭 (None이면 rolling average)
            
        Returns:
            RollbackDecision: 롤백 결정
        """
        if baseline is None:
            baseline = self.get_rolling_average()
        
        if baseline is None:
            # 기록 없으면 롤백 불필요
            return RollbackDecision(should_rollback=False, details="메트릭 기록 없음")
        
        decision = RollbackDecision()
        
        # 1. Inertia Debt 체크
        inertia_delta = current.inertia_debt - baseline.inertia_debt
        if inertia_delta >= RollbackThresholds.INERTIA_DEBT_DELTA:
            decision.should_rollback = True
            decision.reason = RollbackReason.INERTIA_DEBT_SPIKE
            decision.details = f"Inertia Debt +{inertia_delta:.3f} (기준: +{RollbackThresholds.INERTIA_DEBT_DELTA})"
            logger.warning(f"🚨 Inertia Debt 급증: {baseline.inertia_debt:.3f} → {current.inertia_debt:.3f}")
            return decision
        
        # 2. ΔṠ 체크
        delta_s_increase = current.delta_s_dot - baseline.delta_s_dot
        if delta_s_increase >= RollbackThresholds.DELTA_S_DOT_SPIKE:
            decision.should_rollback = True
            decision.reason = RollbackReason.DELTA_S_DOT_SPIKE
            decision.details = f"ΔṠ +{delta_s_increase:.3f} (기준: +{RollbackThresholds.DELTA_S_DOT_SPIKE})"
            logger.warning(f"🚨 ΔṠ 급증: {baseline.delta_s_dot:.3f} → {current.delta_s_dot:.3f}")
            return decision
        
        # 3. 에러율 체크
        error_increase = current.error_rate - baseline.error_rate
        if error_increase >= RollbackThresholds.ERROR_RATE_INCREASE:
            decision.should_rollback = True
            decision.reason = RollbackReason.ERROR_RATE_INCREASE
            decision.details = f"에러율 +{error_increase*100:.1f}% (기준: +{RollbackThresholds.ERROR_RATE_INCREASE*100}%)"
            logger.warning(f"🚨 에러율 증가: {baseline.error_rate*100:.1f}% → {current.error_rate*100:.1f}%")
            return decision
        
        # 4. 지연 시간 체크
        if baseline.latency_p95_ms > 0:
            latency_increase = (current.latency_p95_ms - baseline.latency_p95_ms) / baseline.latency_p95_ms
            if latency_increase >= RollbackThresholds.LATENCY_INCREASE_PERCENT:
                decision.should_rollback = True
                decision.reason = RollbackReason.LATENCY_INCREASE
                decision.details = f"지연 +{latency_increase*100:.1f}% (기준: +{RollbackThresholds.LATENCY_INCREASE_PERCENT*100}%)"
                logger.warning(f"🚨 지연 증가: {baseline.latency_p95_ms:.0f}ms → {current.latency_p95_ms:.0f}ms")
                return decision
        
        # 5. 안정성 체크
        stability_drop = baseline.stability_score - current.stability_score
        if stability_drop >= RollbackThresholds.STABILITY_DROP:
            decision.should_rollback = True
            decision.reason = RollbackReason.STABILITY_DROP
            decision.details = f"안정성 -{stability_drop:.3f} (기준: -{RollbackThresholds.STABILITY_DROP})"
            logger.warning(f"🚨 안정성 하락: {baseline.stability_score:.3f} → {current.stability_score:.3f}")
            return decision
        
        decision.details = "모든 메트릭 정상"
        return decision
    
    def record_package_version(self, package: str, version: str):
        """패키지 버전 기록"""
        if package not in self._package_versions:
            self._package_versions[package] = []
        
        # 최대 10개 버전 유지
        versions = self._package_versions[package]
        if version not in versions:
            versions.append(version)
            if len(versions) > 10:
                versions.pop(0)
        
        self._current_versions[package] = version
    
    def get_previous_version(self, package: str) -> Optional[str]:
        """이전 버전 반환"""
        versions = self._package_versions.get(package, [])
        current = self._current_versions.get(package)
        
        if not versions or not current:
            return None
        
        try:
            idx = versions.index(current)
            if idx > 0:
                return versions[idx - 1]
        except ValueError:
            pass
        
        return versions[-2] if len(versions) >= 2 else None
    
    def rollback_package(self, package: str, target_version: Optional[str] = None) -> bool:
        """
        패키지 롤백
        
        Args:
            package: 패키지 이름
            target_version: 대상 버전 (None이면 이전 버전)
            
        Returns:
            bool: 성공 여부
        """
        if target_version is None:
            target_version = self.get_previous_version(package)
        
        if not target_version:
            logger.error(f"롤백할 버전 없음: {package}")
            return False
        
        if self.dry_run:
            logger.info(f"[DRY RUN] 롤백: {package} → {target_version}")
            return True
        
        try:
            cmd = ["pip", "install", f"{package}=={target_version}"]
            subprocess.run(cmd, capture_output=True, check=True, timeout=120)
            
            logger.info(f"✅ 롤백 완료: {package} → {target_version}")
            self._current_versions[package] = target_version
            return True
            
        except Exception as e:
            logger.error(f"❌ 롤백 실패 ({package}): {e}")
            return False
    
    def execute_rollback(
        self,
        packages: list[str],
        reason: RollbackReason,
    ) -> RollbackResult:
        """
        롤백 실행
        
        Args:
            packages: 롤백할 패키지 목록
            reason: 롤백 사유
            
        Returns:
            RollbackResult: 롤백 결과
        """
        logger.warning(f"🔙 자동 롤백 시작: {reason.value}")
        
        result = RollbackResult()
        
        for package in packages:
            if self.rollback_package(package):
                result.rolled_back_packages.append(package)
            else:
                result.failed_packages.append(package)
        
        result.success = len(result.failed_packages) == 0
        result.message = (
            f"롤백 완료: {len(result.rolled_back_packages)}개 성공, {len(result.failed_packages)}개 실패"
        )
        
        # 알림 발송
        try:
            from .webhooks import get_notifier
            notifier = get_notifier()
            notifier.send_rollback_alert(
                reason=reason.value,
                rolled_back_packages=result.rolled_back_packages,
            )
        except Exception as e:
            logger.warning(f"알림 발송 실패: {e}")
        
        return result


# 전역 엔진
_engine: Optional[AutoRollbackEngine] = None


def get_rollback_engine(dry_run: bool = True) -> AutoRollbackEngine:
    """전역 롤백 엔진 반환"""
    global _engine
    if _engine is None:
        _engine = AutoRollbackEngine(dry_run=dry_run)
    return _engine


def check_and_rollback(
    inertia_debt: float,
    delta_s_dot: float,
    stability_score: float,
    error_rate: float = 0.0,
    latency_p95_ms: float = 0.0,
    packages: Optional[list[str]] = None,
) -> Optional[RollbackResult]:
    """
    메트릭 확인 및 필요시 롤백 (편의 함수)
    
    Returns:
        RollbackResult: 롤백 결과 (롤백하지 않으면 None)
    """
    engine = get_rollback_engine()
    
    current = MetricSnapshot(
        timestamp=datetime.now(),
        inertia_debt=inertia_debt,
        delta_s_dot=delta_s_dot,
        stability_score=stability_score,
        error_rate=error_rate,
        latency_p95_ms=latency_p95_ms,
    )
    
    decision = engine.check_rollback_needed(current)
    
    if decision.should_rollback:
        target_packages = packages or ["langgraph", "langchain", "crewai"]
        return engine.execute_rollback(target_packages, decision.reason)
    
    # 메트릭 기록
    engine.record_metric(current)
    return None
