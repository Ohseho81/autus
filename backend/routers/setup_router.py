"""
AUTUS Setup API Router
======================

AUTUS 자동 설정 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from setup.supabase_setup import SupabaseSetup
    from setup.n8n_setup import N8nSetup
    from setup.auto_wizard import AutoSetupWizard
    from setup.microsoft_setup import MicrosoftSetup, generate_outlook_trigger_workflow, generate_calendar_trigger_workflow
except ImportError:
    # Fallback for different import contexts
    from backend.setup.supabase_setup import SupabaseSetup
    from backend.setup.n8n_setup import N8nSetup
    from backend.setup.auto_wizard import AutoSetupWizard
    from backend.setup.microsoft_setup import MicrosoftSetup, generate_outlook_trigger_workflow, generate_calendar_trigger_workflow


router = APIRouter(prefix="/setup", tags=["Setup"])


# ═══════════════════════════════════════════════════════════════
# Response Models
# ═══════════════════════════════════════════════════════════════

class StepStatus(BaseModel):
    id: str
    name: str
    status: str
    message: str
    progress: int = 0


class SetupResponse(BaseModel):
    success: bool
    message: str
    steps: List[StepStatus] = []
    score: int = 0
    next_steps: List[str] = []


class SQLResponse(BaseModel):
    success: bool
    sql: str
    description: str


# ═══════════════════════════════════════════════════════════════
# Auto Setup Endpoints
# ═══════════════════════════════════════════════════════════════

@router.post("/auto", response_model=SetupResponse)
async def run_auto_setup():
    """
    🚀 AUTUS 자동 설정 실행
    
    AUTUS가 스스로:
    1. Supabase 테이블 생성
    2. RLS 정책 적용
    3. 샘플 데이터 삽입
    4. n8n 연결 확인
    5. 전체 검증
    """
    wizard = AutoSetupWizard()
    
    try:
        result = await wizard.run()
        
        return SetupResponse(
            success=result.success,
            message="AUTUS 자동 설정 완료!" if result.success else "일부 단계 실패",
            steps=[
                StepStatus(
                    id=s.id,
                    name=s.name,
                    status=s.status,
                    message=s.message,
                    progress=s.progress
                )
                for s in result.steps
            ],
            score=result.score,
            next_steps=result.next_steps
        )
    finally:
        await wizard.close()


@router.post("/supabase/tables", response_model=SetupResponse)
async def create_supabase_tables():
    """Supabase 테이블만 생성"""
    setup = SupabaseSetup()
    
    try:
        result = await setup.create_tables()
        
        return SetupResponse(
            success=result.status == "completed",
            message=result.message,
            steps=[StepStatus(
                id=result.id,
                name=result.name,
                status=result.status,
                message=result.message
            )]
        )
    finally:
        await setup.close()


@router.post("/supabase/rls", response_model=SetupResponse)
async def apply_supabase_rls():
    """RLS 정책만 적용"""
    setup = SupabaseSetup()
    
    try:
        result = await setup.apply_rls()
        
        return SetupResponse(
            success=result.status == "completed",
            message=result.message,
            steps=[StepStatus(
                id=result.id,
                name=result.name,
                status=result.status,
                message=result.message
            )]
        )
    finally:
        await setup.close()


@router.get("/progress")
async def get_setup_progress():
    """설정 진행 상태 조회"""
    setup = SupabaseSetup()
    
    try:
        return await setup.get_progress()
    finally:
        await setup.close()


# ═══════════════════════════════════════════════════════════════
# SQL Generation Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/sql/tables", response_model=SQLResponse)
async def get_tables_sql():
    """테이블 생성 SQL 조회"""
    return SQLResponse(
        success=True,
        sql=SupabaseSetup.SQL_TABLES.format(timestamp=datetime.now().isoformat()),
        description="AUTUS 테이블 생성 SQL (Supabase SQL Editor에서 실행)"
    )


@router.get("/sql/rls", response_model=SQLResponse)
async def get_rls_sql():
    """RLS 정책 SQL 조회"""
    return SQLResponse(
        success=True,
        sql=SupabaseSetup.SQL_RLS.format(timestamp=datetime.now().isoformat()),
        description="AUTUS RLS 보안 정책 SQL"
    )


@router.get("/sql/seed", response_model=SQLResponse)
async def get_seed_sql():
    """샘플 데이터 SQL 조회"""
    return SQLResponse(
        success=True,
        sql=SupabaseSetup.SQL_SEED_TEMPLATES.format(timestamp=datetime.now().isoformat()),
        description="AUTUS 샘플 템플릿 데이터"
    )


# ═══════════════════════════════════════════════════════════════
# n8n Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/n8n/health")
async def check_n8n_health():
    """n8n 상태 확인"""
    setup = N8nSetup()
    
    try:
        return await setup.check_health()
    finally:
        await setup.close()


@router.get("/n8n/docker-compose")
async def get_docker_compose():
    """Docker Compose 파일 내용"""
    setup = N8nSetup()
    return {
        "content": setup.generate_docker_compose(),
        "filename": "docker-compose.yml",
        "command": "docker-compose up -d"
    }


@router.post("/n8n/deploy-workflows")
async def deploy_n8n_workflows():
    """n8n 기본 워크플로우 배포"""
    setup = N8nSetup()
    
    try:
        return await setup.deploy_autus_workflows()
    finally:
        await setup.close()


# ═══════════════════════════════════════════════════════════════
# Microsoft Graph Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/microsoft/auth-url")
async def get_microsoft_auth_url(state: str = None):
    """Microsoft OAuth2 인증 URL"""
    setup = MicrosoftSetup()
    return {
        "auth_url": setup.get_auth_url(state),
        "redirect_uri": setup.redirect_uri,
        "scopes": setup.SCOPES
    }


@router.post("/microsoft/exchange")
async def exchange_microsoft_code(code: str):
    """Authorization code → Access token"""
    setup = MicrosoftSetup()
    try:
        result = await setup.exchange_code(code)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await setup.close()


@router.post("/microsoft/subscribe")
async def create_microsoft_subscription(
    resource: str = "inbox",
    notification_url: str = None
):
    """Microsoft Graph Subscription 생성"""
    setup = MicrosoftSetup()
    try:
        result = await setup.create_subscription(
            resource=resource,
            notification_url=notification_url or "http://localhost:5678/webhook/outlook-trigger"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await setup.close()


@router.get("/microsoft/workflows")
async def get_microsoft_workflows():
    """Microsoft Graph 트리거 n8n 워크플로우 템플릿"""
    return {
        "workflows": [
            {
                "name": "Outlook Trigger",
                "description": "Outlook 이메일 → Gemini → Supabase",
                "workflow": generate_outlook_trigger_workflow()
            },
            {
                "name": "Calendar Trigger", 
                "description": "Calendar 이벤트 → Supabase",
                "workflow": generate_calendar_trigger_workflow()
            }
        ]
    }


# ═══════════════════════════════════════════════════════════════
# Verification Endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/verify")
async def verify_setup():
    """전체 설정 검증"""
    setup = SupabaseSetup()
    
    try:
        result = await setup.verify_setup()
        
        return {
            "success": result.status == "completed",
            "message": result.message,
            "verified_at": datetime.now().isoformat()
        }
    finally:
        await setup.close()


@router.get("/status")
async def get_system_status():
    """시스템 전체 상태"""
    supabase = SupabaseSetup()
    n8n = N8nSetup()
    
    try:
        supabase_progress = await supabase.get_progress()
        n8n_health = await n8n.check_health()
        
        return {
            "supabase": {
                "connected": not supabase_progress.get("error"),
                "progress": supabase_progress
            },
            "n8n": n8n_health,
            "timestamp": datetime.now().isoformat()
        }
    finally:
        await supabase.close()
        await n8n.close()
