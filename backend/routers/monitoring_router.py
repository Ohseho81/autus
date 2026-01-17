"""
AUTUS 모니터링 API 라우터
========================

모니터링 관련 API 엔드포인트

엔드포인트:
- GET /monitoring/health: 시스템 헬스 체크
- GET /monitoring/metrics: Prometheus 형식 메트릭
- POST /monitoring/diagnose: 자기 진단 실행
- POST /alerts/webhook: Alertmanager 웹훅 수신
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


# ─────────────────────────────────────────────────────────────────────────────
# 모델
# ─────────────────────────────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "7.0.0"
    components: dict = {}


class DiagnoseRequest(BaseModel):
    stability_score: float = 0.0
    inertia_debt: float = 0.0
    delta_s_dot: float = 0.0
    safety_triggers: int = 0
    error_rate: float = 0.0
    avg_latency_ms: float = 0.0
    module_count: int = 0
    use_llm: bool = False


class DiagnoseResponse(BaseModel):
    status: str
    timestamp: str
    issues: list[str] = []
    warnings: list[str] = []
    summary: str = ""
    recommended_actions: list[str] = []
    duration_ms: float = 0.0


class AlertWebhookPayload(BaseModel):
    receiver: str = ""
    status: str = ""
    alerts: list[dict] = []
    groupLabels: dict = {}
    commonLabels: dict = {}
    commonAnnotations: dict = {}
    externalURL: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# 헬스 체크
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse)
async def health_check():
    """시스템 헬스 체크"""
    # 컴포넌트 상태 확인
    components = {
        "api": "healthy",
        "monitoring": "healthy",
    }
    
    # Neo4j 연결 확인 (선택적)
    try:
        from backend.autus_final.neo4j_client import Neo4jClient
        client = Neo4jClient()
        if client.is_connected():
            components["neo4j"] = "healthy"
        else:
            components["neo4j"] = "unavailable"
        client.close()
    except Exception:
        components["neo4j"] = "not_configured"
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        components=components,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Prometheus 메트릭
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus 형식 메트릭 반환"""
    try:
        from backend.monitoring import get_metrics
        from backend.monitoring.prometheus_exporter import get_metrics_text
        
        metrics_text = get_metrics_text()
        
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            content=metrics_text,
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )
    except Exception as e:
        logger.error(f"메트릭 반환 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 자기 진단
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/diagnose", response_model=DiagnoseResponse)
async def run_diagnosis(request: DiagnoseRequest):
    """자기 진단 실행"""
    try:
        from backend.monitoring import SelfDiagnoseAgent
        
        # 메트릭 딕셔너리 생성
        metrics = {
            "stability_score": request.stability_score,
            "inertia_debt": request.inertia_debt,
            "delta_s_dot": request.delta_s_dot,
            "safety_triggers": request.safety_triggers,
            "error_rate": request.error_rate,
            "avg_latency_ms": request.avg_latency_ms,
            "module_count": request.module_count,
        }
        
        # 진단 실행
        agent = SelfDiagnoseAgent(use_llm=request.use_llm)
        result = await agent.run(metrics)
        
        return DiagnoseResponse(
            status=result.status.value,
            timestamp=result.timestamp.isoformat(),
            issues=result.issues,
            warnings=result.warnings,
            summary=result.summary,
            recommended_actions=[a.value for a in result.recommended_actions],
            duration_ms=result.duration_ms,
        )
        
    except Exception as e:
        logger.error(f"진단 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Alertmanager 웹훅
# ─────────────────────────────────────────────────────────────────────────────
alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])


@alerts_router.post("/webhook")
async def alert_webhook(payload: AlertWebhookPayload, background_tasks: BackgroundTasks):
    """Alertmanager 웹훅 수신 (기본)"""
    logger.info(f"Alert 수신: {payload.status} - {len(payload.alerts)}개")
    
    # 백그라운드에서 처리
    background_tasks.add_task(_process_alerts, payload, "default")
    
    return {"status": "received", "alert_count": len(payload.alerts)}


@alerts_router.post("/critical")
async def alert_critical(payload: AlertWebhookPayload, background_tasks: BackgroundTasks):
    """Critical 알림 수신"""
    logger.warning(f"🚨 Critical Alert: {len(payload.alerts)}개")
    
    background_tasks.add_task(_process_alerts, payload, "critical")
    
    return {"status": "received", "severity": "critical", "alert_count": len(payload.alerts)}


@alerts_router.post("/warning")
async def alert_warning(payload: AlertWebhookPayload, background_tasks: BackgroundTasks):
    """Warning 알림 수신"""
    logger.info(f"⚠️ Warning Alert: {len(payload.alerts)}개")
    
    background_tasks.add_task(_process_alerts, payload, "warning")
    
    return {"status": "received", "severity": "warning", "alert_count": len(payload.alerts)}


@alerts_router.post("/info")
async def alert_info(payload: AlertWebhookPayload, background_tasks: BackgroundTasks):
    """Info 알림 수신"""
    logger.debug(f"ℹ️ Info Alert: {len(payload.alerts)}개")
    
    return {"status": "received", "severity": "info", "alert_count": len(payload.alerts)}


async def _process_alerts(payload: AlertWebhookPayload, severity: str):
    """알림 처리 (백그라운드)"""
    for alert in payload.alerts:
        alert_name = alert.get("labels", {}).get("alertname", "unknown")
        status = alert.get("status", "unknown")
        summary = alert.get("annotations", {}).get("summary", "")
        
        logger.info(f"[{severity.upper()}] {alert_name}: {status} - {summary}")
        
        # Sentry에 기록 (Critical인 경우)
        if severity == "critical":
            try:
                from backend.monitoring import capture_message
                capture_message(
                    f"Prometheus Alert: {alert_name}",
                    level="error",
                    tags={
                        "alertname": alert_name,
                        "severity": severity,
                    },
                    extras=alert,
                )
            except Exception:
                pass
