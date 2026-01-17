"""
Zapier/Make Bridge
==================

AUTUS를 1,000+ 앱 에코시스템에 연결
- Webhook 수신/발신
- n8n 하이브리드 연동
- Universal API Gateway

Phase 1 목표: "메타 레이어"로서 기존 자동화 도구 통합
"""

import asyncio
import httpx
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException
import hashlib
import hmac
import json
import os


class WebhookEvent(BaseModel):
    source: str  # zapier, make, n8n, custom
    event_type: str
    payload: Dict[str, Any]
    timestamp: datetime
    signature: Optional[str] = None


class OutboundAction(BaseModel):
    target: str  # zapier, make, n8n
    action: str
    data: Dict[str, Any]
    webhook_url: str


class ZapierBridge:
    """
    Zapier/Make/n8n 브릿지
    
    AUTUS가 "메타 레이어"로 기능하도록 지원
    - Inbound: 외부 자동화 도구 → AUTUS
    - Outbound: AUTUS → 외부 자동화 도구
    
    Usage:
        bridge = ZapierBridge(secret="...")
        
        # Inbound webhook 처리
        event = await bridge.process_webhook(request)
        tasks = bridge.convert_to_tasks(event)
        
        # Outbound action 실행
        await bridge.trigger_zapier(zap_webhook_url, data)
        await bridge.trigger_n8n(n8n_webhook_url, data)
    """
    
    def __init__(
        self,
        secret: str = None,
        n8n_base_url: str = None
    ):
        self.secret = secret or os.getenv("AUTUS_WEBHOOK_SECRET", "autus_secret_key")
        self.n8n_base_url = n8n_base_url or os.getenv("N8N_BASE_URL", "http://localhost:5678")
        self._client = httpx.AsyncClient(timeout=30.0)
        self._handlers: Dict[str, Callable] = {}
    
    # ═══════════════════════════════════════════════════════════════
    # Signature Verification
    # ═══════════════════════════════════════════════════════════════
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Webhook 서명 검증"""
        expected = hmac.new(
            self.secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)
    
    # ═══════════════════════════════════════════════════════════════
    # Inbound Webhooks (외부 → AUTUS)
    # ═══════════════════════════════════════════════════════════════
    
    async def process_webhook(self, request: Request) -> WebhookEvent:
        """
        외부 webhook 수신 및 처리
        
        Supported sources:
        - Zapier (catch hook)
        - Make (webhook)
        - n8n (webhook trigger)
        - Custom (any HTTP POST)
        """
        body = await request.body()
        
        # Source 감지
        source = self._detect_source(request.headers, body)
        
        # Payload 파싱
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = {"raw": body.decode()}
        
        # Event type 추출
        event_type = payload.get("event_type") or payload.get("type") or "generic"
        
        return WebhookEvent(
            source=source,
            event_type=event_type,
            payload=payload,
            timestamp=datetime.now(),
            signature=request.headers.get("X-Autus-Signature")
        )
    
    def _detect_source(self, headers: Dict, body: bytes) -> str:
        """Webhook 소스 감지"""
        user_agent = headers.get("user-agent", "").lower()
        
        if "zapier" in user_agent:
            return "zapier"
        elif "make" in user_agent or "integromat" in user_agent:
            return "make"
        elif "n8n" in user_agent:
            return "n8n"
        elif headers.get("X-Autus-Source"):
            return headers.get("X-Autus-Source")
        else:
            return "custom"
    
    def convert_to_tasks(self, event: WebhookEvent) -> List[Dict[str, Any]]:
        """
        WebhookEvent → AUTUS Task Nodes 변환
        
        각 소스별 payload 형식에 맞게 변환
        """
        tasks = []
        payload = event.payload
        
        if event.source == "zapier":
            # Zapier Catch Hook 형식
            tasks.append({
                "source": "zapier",
                "type": payload.get("object_type", "zap_event"),
                "icon": "⚡",
                "name": payload.get("name", f"Zapier: {event.event_type}"),
                "meta": f"Zap triggered at {event.timestamp.strftime('%H:%M')}",
                "timestamp": event.timestamp.isoformat(),
                "priority": "normal",
                "original_id": payload.get("id", str(hash(str(payload)))),
                "raw_data": payload
            })
        
        elif event.source == "make":
            # Make (Integromat) Webhook 형식
            tasks.append({
                "source": "make",
                "type": payload.get("type", "make_event"),
                "icon": "🔮",
                "name": payload.get("title", f"Make: {event.event_type}"),
                "meta": f"Scenario executed at {event.timestamp.strftime('%H:%M')}",
                "timestamp": event.timestamp.isoformat(),
                "priority": "normal",
                "original_id": payload.get("execution_id", str(hash(str(payload)))),
                "raw_data": payload
            })
        
        elif event.source == "n8n":
            # n8n Webhook 형식
            tasks.append({
                "source": "n8n",
                "type": payload.get("workflowName", "n8n_event"),
                "icon": "🔗",
                "name": payload.get("name", f"n8n: {event.event_type}"),
                "meta": f"Workflow: {payload.get('workflowName', 'Unknown')}",
                "timestamp": event.timestamp.isoformat(),
                "priority": "normal",
                "original_id": payload.get("executionId", str(hash(str(payload)))),
                "raw_data": payload
            })
        
        else:
            # Generic webhook
            tasks.append({
                "source": event.source,
                "type": event.event_type,
                "icon": "📥",
                "name": payload.get("name", f"Webhook: {event.event_type}"),
                "meta": f"Received at {event.timestamp.strftime('%H:%M')}",
                "timestamp": event.timestamp.isoformat(),
                "priority": "normal",
                "original_id": str(hash(str(payload))),
                "raw_data": payload
            })
        
        return tasks
    
    # ═══════════════════════════════════════════════════════════════
    # Outbound Triggers (AUTUS → 외부)
    # ═══════════════════════════════════════════════════════════════
    
    async def trigger_zapier(
        self,
        webhook_url: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Zapier Webhook 트리거
        
        Usage:
            await bridge.trigger_zapier(
                "https://hooks.zapier.com/...",
                {"task_id": "123", "action": "merge_complete"}
            )
        """
        response = await self._client.post(webhook_url, json=data)
        response.raise_for_status()
        
        return {
            "success": True,
            "target": "zapier",
            "status_code": response.status_code,
            "response": response.text
        }
    
    async def trigger_make(
        self,
        webhook_url: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make (Integromat) Webhook 트리거"""
        response = await self._client.post(webhook_url, json=data)
        response.raise_for_status()
        
        return {
            "success": True,
            "target": "make",
            "status_code": response.status_code,
            "response": response.text
        }
    
    async def trigger_n8n(
        self,
        workflow_id: str = None,
        webhook_path: str = None,
        data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        n8n Workflow 트리거
        
        두 가지 방식:
        1. Webhook trigger: webhook_path 사용
        2. API trigger: workflow_id 사용
        """
        if webhook_path:
            url = f"{self.n8n_base_url}/webhook/{webhook_path}"
            response = await self._client.post(url, json=data or {})
        elif workflow_id:
            url = f"{self.n8n_base_url}/api/v1/workflows/{workflow_id}/execute"
            response = await self._client.post(url, json={"data": data or {}})
        else:
            raise ValueError("Either webhook_path or workflow_id required")
        
        response.raise_for_status()
        
        return {
            "success": True,
            "target": "n8n",
            "status_code": response.status_code,
            "response": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
        }
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Action Dispatcher
    # ═══════════════════════════════════════════════════════════════
    
    async def dispatch_action(self, action: OutboundAction) -> Dict[str, Any]:
        """
        AUTUS 액션을 외부 시스템으로 디스패치
        
        Usage:
            action = OutboundAction(
                target="n8n",
                action="merge_tasks",
                data={"task_ids": [1, 2, 3]},
                webhook_url="http://..."
            )
            result = await bridge.dispatch_action(action)
        """
        if action.target == "zapier":
            return await self.trigger_zapier(action.webhook_url, {
                "action": action.action,
                "data": action.data,
                "timestamp": datetime.now().isoformat()
            })
        
        elif action.target == "make":
            return await self.trigger_make(action.webhook_url, {
                "action": action.action,
                "data": action.data,
                "timestamp": datetime.now().isoformat()
            })
        
        elif action.target == "n8n":
            return await self.trigger_n8n(
                webhook_path=action.webhook_url.split("/webhook/")[-1] if "/webhook/" in action.webhook_url else None,
                data={
                    "action": action.action,
                    "data": action.data,
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        else:
            # Generic HTTP POST
            response = await self._client.post(action.webhook_url, json={
                "action": action.action,
                "data": action.data,
                "timestamp": datetime.now().isoformat()
            })
            response.raise_for_status()
            return {
                "success": True,
                "target": action.target,
                "status_code": response.status_code
            }
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# FastAPI Router for Webhook Endpoints
# ═══════════════════════════════════════════════════════════════

def create_webhook_router(bridge: ZapierBridge) -> APIRouter:
    """
    AUTUS Webhook 엔드포인트 라우터 생성
    
    Endpoints:
    - POST /webhooks/inbound - 범용 인바운드 webhook
    - POST /webhooks/zapier  - Zapier 전용
    - POST /webhooks/make    - Make 전용
    - POST /webhooks/n8n     - n8n 전용
    """
    router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
    
    @router.post("/inbound")
    async def inbound_webhook(request: Request):
        """범용 인바운드 webhook"""
        try:
            event = await bridge.process_webhook(request)
            tasks = bridge.convert_to_tasks(event)
            
            return {
                "success": True,
                "source": event.source,
                "event_type": event.event_type,
                "tasks_created": len(tasks),
                "tasks": tasks
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @router.post("/zapier")
    async def zapier_webhook(request: Request):
        """Zapier Catch Hook 전용"""
        try:
            event = await bridge.process_webhook(request)
            event.source = "zapier"  # Force source
            tasks = bridge.convert_to_tasks(event)
            
            return {
                "success": True,
                "tasks": tasks
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @router.post("/make")
    async def make_webhook(request: Request):
        """Make (Integromat) 전용"""
        try:
            event = await bridge.process_webhook(request)
            event.source = "make"
            tasks = bridge.convert_to_tasks(event)
            
            return {
                "success": True,
                "tasks": tasks
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @router.post("/n8n")
    async def n8n_webhook(request: Request):
        """n8n Workflow 전용"""
        try:
            event = await bridge.process_webhook(request)
            event.source = "n8n"
            tasks = bridge.convert_to_tasks(event)
            
            return {
                "success": True,
                "tasks": tasks
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    return router
