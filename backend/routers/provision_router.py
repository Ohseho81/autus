"""
AUTUS Auto-Provision API Router
=================================
외부 서비스 자동 설정 엔드포인트
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

from setup.auto_provisioner import (
    AutoProvisioner,
    ServiceType,
    ServiceCredentials,
    ProvisionResult,
    get_provisioner,
    NetlifyProvisioner,
    RailwayProvisioner,
    SupabaseProvisioner,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/provision", tags=["Auto-Provisioning"])

# ============================================
# Models
# ============================================

class CredentialInput(BaseModel):
    service: str  # supabase, netlify, railway, github
    api_key: str
    api_url: Optional[str] = None
    project_id: Optional[str] = None

class ProvisionRequest(BaseModel):
    github_repo: str = "Ohseho81/autus"
    netlify_site_id: Optional[str] = None
    railway_project_id: Optional[str] = None
    deploy_dir: str = "frontend/deploy"

class DeployRequest(BaseModel):
    site_id: str
    deploy_dir: str = "frontend/deploy"

# ============================================
# Endpoints
# ============================================

@router.get("/status")
async def get_provision_status():
    """
    프로비저닝 상태 확인
    
    어떤 서비스가 연결 가능한지 표시
    """
    provisioner = get_provisioner()
    
    status = {}
    for service in ServiceType:
        connected = service in provisioner.credentials
        status[service.value] = {
            "connected": connected,
            "ready": connected
        }
    
    required = provisioner.get_required_env_vars()
    
    return {
        "services": status,
        "required_env_vars": required,
        "ready_count": sum(1 for s in status.values() if s["connected"]),
        "total_count": len(ServiceType)
    }

@router.post("/credentials")
async def set_credentials(cred: CredentialInput):
    """
    서비스 인증 정보 설정
    
    환경변수 대신 API로 직접 설정
    """
    provisioner = get_provisioner()
    
    try:
        service = ServiceType(cred.service)
    except ValueError:
        raise HTTPException(400, f"Unknown service: {cred.service}")
    
    provisioner.set_credentials(service, ServiceCredentials(
        api_key=cred.api_key,
        api_url=cred.api_url,
        project_id=cred.project_id
    ))
    
    return {
        "success": True,
        "message": f"{service.value} 인증 정보가 설정되었습니다"
    }

@router.post("/all")
async def provision_all(request: ProvisionRequest):
    """
    전체 자동 프로비저닝
    
    1. Supabase 연결 확인
    2. Netlify 배포
    3. Railway 배포
    4. GitHub 웹훅 설정
    """
    provisioner = get_provisioner()
    
    results = await provisioner.provision_all(
        github_repo=request.github_repo,
        netlify_site_id=request.netlify_site_id,
        railway_project_id=request.railway_project_id,
        deploy_dir=request.deploy_dir
    )
    
    return {
        "success": all(r.success for r in results.values()),
        "results": {
            service.value: {
                "success": result.success,
                "message": result.message,
                "url": result.url,
                "data": result.data
            }
            for service, result in results.items()
        }
    }

@router.get("/netlify/sites")
async def list_netlify_sites():
    """Netlify 사이트 목록"""
    provisioner = get_provisioner()
    
    if ServiceType.NETLIFY not in provisioner.credentials:
        raise HTTPException(400, "NETLIFY_ACCESS_TOKEN이 설정되지 않았습니다")
    
    creds = provisioner.credentials[ServiceType.NETLIFY]
    netlify = NetlifyProvisioner(creds.api_key)
    
    sites = await netlify.list_sites()
    
    return {
        "count": len(sites),
        "sites": [
            {
                "id": s["id"],
                "name": s["name"],
                "url": s.get("ssl_url") or s.get("url"),
                "custom_domain": s.get("custom_domain")
            }
            for s in sites
        ]
    }

@router.post("/netlify/deploy")
async def deploy_to_netlify(request: DeployRequest):
    """Netlify 배포"""
    provisioner = get_provisioner()
    
    if ServiceType.NETLIFY not in provisioner.credentials:
        raise HTTPException(400, "NETLIFY_ACCESS_TOKEN이 설정되지 않았습니다")
    
    creds = provisioner.credentials[ServiceType.NETLIFY]
    netlify = NetlifyProvisioner(creds.api_key)
    
    # 절대 경로 변환
    import os
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    deploy_path = os.path.join(base_path, request.deploy_dir)
    
    if not os.path.exists(deploy_path):
        raise HTTPException(400, f"배포 디렉토리가 존재하지 않습니다: {deploy_path}")
    
    result = await netlify.deploy_site(request.site_id, deploy_path)
    
    return {
        "success": result.success,
        "message": result.message,
        "url": result.url,
        "data": result.data
    }

@router.get("/railway/projects")
async def list_railway_projects():
    """Railway 프로젝트 목록"""
    provisioner = get_provisioner()
    
    if ServiceType.RAILWAY not in provisioner.credentials:
        raise HTTPException(400, "RAILWAY_API_TOKEN이 설정되지 않았습니다")
    
    creds = provisioner.credentials[ServiceType.RAILWAY]
    railway = RailwayProvisioner(creds.api_key)
    
    projects = await railway.list_projects()
    
    return {
        "count": len(projects),
        "projects": projects
    }

@router.post("/railway/env")
async def set_railway_env(
    project_id: str,
    service_id: str,
    env_vars: Dict[str, str]
):
    """Railway 환경변수 설정"""
    provisioner = get_provisioner()
    
    if ServiceType.RAILWAY not in provisioner.credentials:
        raise HTTPException(400, "RAILWAY_API_TOKEN이 설정되지 않았습니다")
    
    creds = provisioner.credentials[ServiceType.RAILWAY]
    railway = RailwayProvisioner(creds.api_key)
    
    result = await railway.set_env_vars(project_id, service_id, env_vars)
    
    return {
        "success": result.success,
        "message": result.message
    }

@router.get("/supabase/test")
async def test_supabase():
    """Supabase 연결 테스트"""
    provisioner = get_provisioner()
    
    if ServiceType.SUPABASE not in provisioner.credentials:
        raise HTTPException(400, "SUPABASE_SERVICE_KEY가 설정되지 않았습니다")
    
    creds = provisioner.credentials[ServiceType.SUPABASE]
    supabase = SupabaseProvisioner(creds.api_key, creds.api_url)
    
    result = await supabase.apply_schema("")
    
    return {
        "success": result.success,
        "message": result.message,
        "url": result.url
    }

# ============================================
# One-Click Setup
# ============================================

@router.post("/one-click")
async def one_click_setup(
    supabase_key: Optional[str] = None,
    supabase_url: Optional[str] = None,
    netlify_token: Optional[str] = None,
    railway_token: Optional[str] = None,
    github_token: Optional[str] = None
):
    """
    원클릭 전체 설정
    
    API 키들을 전달하면 모든 서비스를 자동으로 설정합니다.
    """
    provisioner = get_provisioner()
    
    # 인증 정보 설정
    if supabase_key and supabase_url:
        provisioner.set_credentials(ServiceType.SUPABASE, ServiceCredentials(
            api_key=supabase_key,
            api_url=supabase_url
        ))
    
    if netlify_token:
        provisioner.set_credentials(ServiceType.NETLIFY, ServiceCredentials(
            api_key=netlify_token
        ))
    
    if railway_token:
        provisioner.set_credentials(ServiceType.RAILWAY, ServiceCredentials(
            api_key=railway_token
        ))
    
    if github_token:
        provisioner.set_credentials(ServiceType.GITHUB, ServiceCredentials(
            api_key=github_token
        ))
    
    # 전체 프로비저닝 실행
    results = await provisioner.provision_all()
    
    return {
        "success": all(r.success for r in results.values()),
        "message": "원클릭 설정 완료",
        "results": {
            service.value: {
                "success": result.success,
                "message": result.message,
                "url": result.url
            }
            for service, result in results.items()
        }
    }
