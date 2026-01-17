"""
AUTUS Auto-Setup Wizard
=======================

AUTUS가 스스로 전체 환경을 구성하는 마법사

이 클래스는 모든 설정을 자동으로 실행합니다:
1. Supabase 테이블 생성
2. RLS 정책 적용
3. n8n 연결 확인 및 워크플로우 배포
4. 환경변수 검증
5. 연결 테스트
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
import os

from .supabase_setup import SupabaseSetup
from .n8n_setup import N8nSetup


class WizardStep(BaseModel):
    """위자드 단계"""
    id: str
    name: str
    description: str
    status: str = "pending"  # pending, running, completed, failed, skipped
    progress: int = 0
    message: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class WizardResult(BaseModel):
    """위자드 실행 결과"""
    success: bool
    steps: List[WizardStep]
    total_time_ms: int
    score: int  # AUTUS 점수
    next_steps: List[str]


class AutoSetupWizard:
    """
    AUTUS 자동 설정 위자드
    
    Usage:
        wizard = AutoSetupWizard()
        result = await wizard.run()
        
        # 또는 단계별 실행
        await wizard.step_supabase()
        await wizard.step_n8n()
        await wizard.step_verify()
    """
    
    STEPS = [
        WizardStep(
            id="env_check",
            name="Environment Check",
            description="환경변수 확인"
        ),
        WizardStep(
            id="supabase_tables",
            name="Supabase Tables",
            description="데이터베이스 테이블 생성"
        ),
        WizardStep(
            id="supabase_rls",
            name="Supabase RLS",
            description="보안 정책 적용"
        ),
        WizardStep(
            id="supabase_seed",
            name="Seed Data",
            description="샘플 데이터 삽입"
        ),
        WizardStep(
            id="n8n_check",
            name="n8n Connection",
            description="워크플로우 엔진 연결"
        ),
        WizardStep(
            id="n8n_workflows",
            name="n8n Workflows",
            description="기본 워크플로우 배포"
        ),
        WizardStep(
            id="verify",
            name="Verification",
            description="전체 시스템 검증"
        )
    ]
    
    def __init__(self):
        self.supabase = SupabaseSetup()
        self.n8n = N8nSetup()
        self.steps = [step.model_copy() for step in self.STEPS]
        self._callbacks: List[callable] = []
    
    def on_progress(self, callback: callable):
        """진행 상태 콜백 등록"""
        self._callbacks.append(callback)
    
    def _update_step(self, step_id: str, **kwargs):
        """단계 업데이트"""
        for step in self.steps:
            if step.id == step_id:
                for key, value in kwargs.items():
                    setattr(step, key, value)
                break
        
        # 콜백 호출
        for callback in self._callbacks:
            try:
                callback(self.steps)
            except:
                pass
    
    def _get_step(self, step_id: str) -> WizardStep:
        """단계 조회"""
        for step in self.steps:
            if step.id == step_id:
                return step
        return None
    
    # ═══════════════════════════════════════════════════════════════
    # Individual Steps
    # ═══════════════════════════════════════════════════════════════
    
    async def step_env_check(self) -> bool:
        """환경변수 확인"""
        self._update_step("env_check", status="running", started_at=datetime.now())
        
        required_vars = [
            ("SUPABASE_URL", os.getenv("SUPABASE_URL")),
            ("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_SERVICE_KEY")),
        ]
        
        optional_vars = [
            ("N8N_BASE_URL", os.getenv("N8N_BASE_URL", "http://localhost:5678")),
            ("GEMINI_API_KEY", os.getenv("GEMINI_API_KEY")),
        ]
        
        missing = [name for name, value in required_vars if not value]
        
        if missing:
            self._update_step(
                "env_check",
                status="failed",
                message=f"Missing: {', '.join(missing)}",
                completed_at=datetime.now()
            )
            return False
        
        self._update_step(
            "env_check",
            status="completed",
            progress=100,
            message="All required variables set",
            completed_at=datetime.now()
        )
        return True
    
    async def step_supabase_tables(self) -> bool:
        """Supabase 테이블 생성"""
        self._update_step("supabase_tables", status="running", started_at=datetime.now())
        
        try:
            result = await self.supabase.create_tables()
            
            if result.status == "completed":
                self._update_step(
                    "supabase_tables",
                    status="completed",
                    progress=100,
                    message=result.message,
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "supabase_tables",
                    status="failed",
                    message=result.message,
                    completed_at=datetime.now()
                )
                return False
        except Exception as e:
            self._update_step(
                "supabase_tables",
                status="failed",
                message=str(e),
                completed_at=datetime.now()
            )
            return False
    
    async def step_supabase_rls(self) -> bool:
        """RLS 정책 적용"""
        self._update_step("supabase_rls", status="running", started_at=datetime.now())
        
        try:
            result = await self.supabase.apply_rls()
            
            if result.status == "completed":
                self._update_step(
                    "supabase_rls",
                    status="completed",
                    progress=100,
                    message=result.message,
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "supabase_rls",
                    status="failed",
                    message=result.message,
                    completed_at=datetime.now()
                )
                return False
        except Exception as e:
            self._update_step(
                "supabase_rls",
                status="failed",
                message=str(e),
                completed_at=datetime.now()
            )
            return False
    
    async def step_seed_data(self) -> bool:
        """샘플 데이터 삽입"""
        self._update_step("supabase_seed", status="running", started_at=datetime.now())
        
        try:
            result = await self.supabase.seed_templates()
            
            if result.status == "completed":
                self._update_step(
                    "supabase_seed",
                    status="completed",
                    progress=100,
                    message=result.message,
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "supabase_seed",
                    status="failed",
                    message=result.message,
                    completed_at=datetime.now()
                )
                return False
        except Exception as e:
            self._update_step(
                "supabase_seed",
                status="failed",
                message=str(e),
                completed_at=datetime.now()
            )
            return False
    
    async def step_n8n_check(self) -> bool:
        """n8n 연결 확인"""
        self._update_step("n8n_check", status="running", started_at=datetime.now())
        
        try:
            health = await self.n8n.check_health()
            
            if health.get("status") == "running":
                self._update_step(
                    "n8n_check",
                    status="completed",
                    progress=100,
                    message=f"Connected to {health['url']}",
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "n8n_check",
                    status="skipped",
                    message="n8n not running (optional)",
                    completed_at=datetime.now()
                )
                return True  # Optional이므로 true 반환
        except Exception as e:
            self._update_step(
                "n8n_check",
                status="skipped",
                message=f"n8n not available: {e}",
                completed_at=datetime.now()
            )
            return True
    
    async def step_n8n_workflows(self) -> bool:
        """n8n 워크플로우 배포"""
        n8n_step = self._get_step("n8n_check")
        
        if n8n_step.status != "completed":
            self._update_step(
                "n8n_workflows",
                status="skipped",
                message="n8n not connected",
                completed_at=datetime.now()
            )
            return True
        
        self._update_step("n8n_workflows", status="running", started_at=datetime.now())
        
        try:
            result = await self.n8n.deploy_autus_workflows()
            
            if result.get("deployed", 0) > 0:
                self._update_step(
                    "n8n_workflows",
                    status="completed",
                    progress=100,
                    message=f"Deployed {result['deployed']}/{result['total']} workflows",
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "n8n_workflows",
                    status="failed",
                    message="No workflows deployed",
                    completed_at=datetime.now()
                )
                return False
        except Exception as e:
            self._update_step(
                "n8n_workflows",
                status="failed",
                message=str(e),
                completed_at=datetime.now()
            )
            return False
    
    async def step_verify(self) -> bool:
        """전체 검증"""
        self._update_step("verify", status="running", started_at=datetime.now())
        
        try:
            result = await self.supabase.verify_setup()
            
            if result.status == "completed":
                self._update_step(
                    "verify",
                    status="completed",
                    progress=100,
                    message="All systems verified",
                    completed_at=datetime.now()
                )
                return True
            else:
                self._update_step(
                    "verify",
                    status="failed",
                    message=result.message,
                    completed_at=datetime.now()
                )
                return False
        except Exception as e:
            self._update_step(
                "verify",
                status="failed",
                message=str(e),
                completed_at=datetime.now()
            )
            return False
    
    # ═══════════════════════════════════════════════════════════════
    # Full Wizard
    # ═══════════════════════════════════════════════════════════════
    
    async def run(self) -> WizardResult:
        """
        전체 자동 설정 실행
        
        AUTUS가 스스로 환경을 구성합니다.
        """
        start_time = datetime.now()
        
        # Step 1: Environment Check
        if not await self.step_env_check():
            return self._build_result(start_time, False)
        
        # Step 2: Supabase Tables
        if not await self.step_supabase_tables():
            return self._build_result(start_time, False)
        
        # Step 3: RLS
        if not await self.step_supabase_rls():
            return self._build_result(start_time, False)
        
        # Step 4: Seed Data
        if not await self.step_seed_data():
            return self._build_result(start_time, False)
        
        # Step 5: n8n Check (optional)
        await self.step_n8n_check()
        
        # Step 6: n8n Workflows (optional)
        await self.step_n8n_workflows()
        
        # Step 7: Verify
        success = await self.step_verify()
        
        return self._build_result(start_time, success)
    
    def _build_result(self, start_time: datetime, success: bool) -> WizardResult:
        """결과 빌드"""
        total_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # 점수 계산
        completed = len([s for s in self.steps if s.status == "completed"])
        skipped = len([s for s in self.steps if s.status == "skipped"])
        total = len(self.steps)
        
        score = int(((completed + skipped * 0.5) / total) * 100)
        
        # 다음 단계 제안
        next_steps = []
        
        if self._get_step("n8n_check").status == "skipped":
            next_steps.append("Run 'docker-compose up -d' to start n8n")
        
        if self._get_step("supabase_tables").status == "completed":
            next_steps.append("Open AUTUS Production Dashboard")
        
        if not os.getenv("GEMINI_API_KEY"):
            next_steps.append("Set GEMINI_API_KEY for AI suggestions")
        
        if not os.getenv("MS_CLIENT_ID"):
            next_steps.append("Configure Microsoft 365 integration")
        
        return WizardResult(
            success=success,
            steps=self.steps,
            total_time_ms=total_time,
            score=score,
            next_steps=next_steps
        )
    
    async def close(self):
        """리소스 정리"""
        await self.supabase.close()
        await self.n8n.close()


# ═══════════════════════════════════════════════════════════════
# CLI Interface
# ═══════════════════════════════════════════════════════════════

async def run_wizard():
    """CLI에서 위자드 실행"""
    print("=" * 60)
    print("🧠 AUTUS Auto-Setup Wizard")
    print("=" * 60)
    print()
    
    wizard = AutoSetupWizard()
    
    def on_progress(steps):
        for step in steps:
            status_icon = {
                "pending": "⏳",
                "running": "🔄",
                "completed": "✅",
                "failed": "❌",
                "skipped": "⏭️"
            }.get(step.status, "?")
            print(f"  {status_icon} {step.name}: {step.message or step.status}")
    
    wizard.on_progress(on_progress)
    
    print("Starting auto-setup...")
    print()
    
    result = await wizard.run()
    
    print()
    print("=" * 60)
    print(f"Result: {'✅ SUCCESS' if result.success else '❌ FAILED'}")
    print(f"Score: {result.score}/100")
    print(f"Time: {result.total_time_ms}ms")
    print()
    
    if result.next_steps:
        print("Next Steps:")
        for step in result.next_steps:
            print(f"  → {step}")
    
    await wizard.close()


if __name__ == "__main__":
    asyncio.run(run_wizard())
