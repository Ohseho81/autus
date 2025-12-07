"""
Deployment Pipeline API Endpoints

Endpoints for deployment tracking and management:
  POST /api/v1/deployments/start - Start deployment
  POST /api/v1/deployments/{id}/status - Update status
  POST /api/v1/deployments/{id}/health-check - Health check
  GET /api/v1/deployments/{id} - Get deployment info
  GET /api/v1/deployments - Get deployment history
  GET /api/v1/deployments/statistics - Get stats
  POST /api/v1/deployments/{id}/rollback - Rollback
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from api.deployment_pipeline import get_pipeline, DeploymentStatus

router = APIRouter(prefix="/deployments", tags=["Deployments"])


# Request models
class StartDeploymentRequest(BaseModel):
    """Start deployment request"""
    version: str
    commit_hash: str
    environment: str  # dev, staging, production


class UpdateStatusRequest(BaseModel):
    """Update deployment status request"""
    status: str
    error_message: Optional[str] = None


class HealthCheckRequest(BaseModel):
    """Health check request"""
    endpoints_checked: int
    endpoints_healthy: int


class RollbackRequest(BaseModel):
    """Rollback request"""
    reason: Optional[str] = None


# Endpoints

@router.post("/start")
async def start_deployment(request: StartDeploymentRequest) -> dict:
    """Start new deployment"""
    pipeline = get_pipeline()
    
    deployment = pipeline.start_deployment(
        version=request.version,
        commit_hash=request.commit_hash,
        environment=request.environment
    )
    
    return {
        "deployment_id": deployment.id,
        "status": deployment.status.value,
        "version": deployment.version,
        "environment": deployment.environment,
        "started_at": deployment.started_at.isoformat()
    }


@router.post("/{deployment_id}/status")
async def update_deployment_status(
    deployment_id: str,
    request: UpdateStatusRequest
) -> dict:
    """Update deployment status"""
    pipeline = get_pipeline()
    
    try:
        status = DeploymentStatus(request.status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status: {request.status}"
        )
    
    success = pipeline.update_status(
        deployment_id=deployment_id,
        status=status,
        error_message=request.error_message
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Deployment {deployment_id} not found"
        )
    
    deployment_info = pipeline.get_deployment_summary(deployment_id)
    
    return {
        "deployment_id": deployment_id,
        "status": request.status,
        "deployment": deployment_info
    }


@router.post("/{deployment_id}/health-check")
async def health_check(
    deployment_id: str,
    request: HealthCheckRequest
) -> dict:
    """Record health check results"""
    pipeline = get_pipeline()
    
    success = pipeline.health_check(
        deployment_id=deployment_id,
        endpoints_checked=request.endpoints_checked,
        endpoints_healthy=request.endpoints_healthy
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Deployment {deployment_id} not found"
        )
    
    deployment_info = pipeline.get_deployment_summary(deployment_id)
    health_percentage = (
        (request.endpoints_healthy / request.endpoints_checked * 100)
        if request.endpoints_checked > 0
        else 0
    )
    
    return {
        "deployment_id": deployment_id,
        "health_percentage": round(health_percentage, 1),
        "endpoints_checked": request.endpoints_checked,
        "endpoints_healthy": request.endpoints_healthy,
        "deployment": deployment_info
    }


@router.get("/{deployment_id}")
async def get_deployment(deployment_id: str) -> dict:
    """Get deployment information"""
    pipeline = get_pipeline()
    
    deployment_info = pipeline.get_deployment_summary(deployment_id)
    
    if not deployment_info:
        raise HTTPException(
            status_code=404,
            detail=f"Deployment {deployment_id} not found"
        )
    
    return deployment_info


@router.get("")
async def get_deployment_history(
    environment: Optional[str] = None,
    limit: int = 10
) -> dict:
    """Get deployment history"""
    pipeline = get_pipeline()
    
    deployments = pipeline.get_deployment_history(
        environment=environment,
        limit=limit
    )
    
    return {
        "total": len(deployments),
        "environment_filter": environment,
        "limit": limit,
        "deployments": deployments
    }


@router.get("/statistics/summary")
async def get_statistics() -> dict:
    """Get deployment statistics"""
    pipeline = get_pipeline()
    
    stats = pipeline.get_statistics()
    current_status = pipeline.get_current_status()
    
    return {
        "statistics": stats,
        "current_status": current_status
    }


@router.get("/status/current")
async def get_current_status() -> dict:
    """Get current deployment status"""
    pipeline = get_pipeline()
    
    return pipeline.get_current_status()


@router.post("/{deployment_id}/rollback")
async def rollback_deployment(
    deployment_id: str,
    request: Optional[RollbackRequest] = None
) -> dict:
    """Rollback deployment"""
    pipeline = get_pipeline()
    
    reason = request.reason if request else ""
    
    success = pipeline.rollback(
        deployment_id=deployment_id,
        reason=reason
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Deployment {deployment_id} not found"
        )
    
    deployment_info = pipeline.get_deployment_summary(deployment_id)
    
    return {
        "deployment_id": deployment_id,
        "status": "rolled_back",
        "reason": reason,
        "deployment": deployment_info
    }
