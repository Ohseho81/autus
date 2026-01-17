"""
Microsoft Graph Auto-Setup
==========================

AUTUS가 Microsoft 365를 자동으로 연결

Features:
- OAuth2 인증 플로우
- Graph API Subscription 자동 생성
- Webhook 처리
"""

import asyncio
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import secrets


class GraphSubscription(BaseModel):
    """Graph API Subscription"""
    id: Optional[str] = None
    change_type: str = "created,updated"
    notification_url: str
    resource: str
    expiration_datetime: datetime
    client_state: str


class MicrosoftSetup:
    """
    Microsoft Graph 자동 설정
    
    AUTUS가 Outlook/Teams/Calendar를 자동으로 연결합니다.
    """
    
    AUTH_URL = "https://login.microsoftonline.com"
    GRAPH_URL = "https://graph.microsoft.com/v1.0"
    
    # AUTUS가 필요한 권한
    SCOPES = [
        "Mail.Read",
        "Calendars.Read",
        "Chat.Read",
        "User.Read",
        "offline_access"
    ]
    
    # 지원하는 리소스
    RESOURCES = {
        "inbox": "me/mailFolders('Inbox')/messages",
        "calendar": "me/events",
        "chats": "me/chats/getAllMessages"
    }
    
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
        tenant_id: str = None,
        redirect_uri: str = None
    ):
        self.client_id = client_id or os.getenv("MS_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("MS_CLIENT_SECRET")
        self.tenant_id = tenant_id or os.getenv("MS_TENANT_ID", "common")
        self.redirect_uri = redirect_uri or os.getenv("MS_REDIRECT_URI", "http://localhost:3003/callback")
        self._client = httpx.AsyncClient(timeout=30.0)
        self._access_token: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════
    # OAuth2 Flow
    # ═══════════════════════════════════════════════════════════════
    
    def get_auth_url(self, state: str = None) -> str:
        """OAuth2 인증 URL 생성"""
        state = state or secrets.token_urlsafe(16)
        
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": " ".join(self.SCOPES),
            "state": state
        }
        
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTH_URL}/{self.tenant_id}/oauth2/v2.0/authorize?{query}"
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """Authorization code → Access token"""
        url = f"{self.AUTH_URL}/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "scope": " ".join(self.SCOPES)
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        
        result = response.json()
        self._access_token = result["access_token"]
        
        return {
            "access_token": result["access_token"],
            "refresh_token": result.get("refresh_token"),
            "expires_in": result["expires_in"],
            "scope": result.get("scope", "")
        }
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신"""
        url = f"{self.AUTH_URL}/{self.tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": " ".join(self.SCOPES)
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        
        result = response.json()
        self._access_token = result["access_token"]
        
        return result
    
    def _headers(self) -> Dict[str, str]:
        """API 헤더"""
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json"
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Graph API Subscriptions
    # ═══════════════════════════════════════════════════════════════
    
    async def create_subscription(
        self,
        resource: str,
        notification_url: str,
        expiration_hours: int = 72
    ) -> Dict[str, Any]:
        """
        Graph API Subscription 생성
        
        Args:
            resource: "inbox", "calendar", "chats" 또는 직접 resource 경로
            notification_url: n8n webhook URL
            expiration_hours: 만료 시간 (최대 72시간)
        """
        if not self._access_token:
            raise ValueError("Not authenticated. Call exchange_code first.")
        
        # 리소스 매핑
        resource_path = self.RESOURCES.get(resource, resource)
        
        # Client state (보안용)
        client_state = secrets.token_urlsafe(32)
        
        # 만료 시간 (최대 3일)
        expiration = datetime.utcnow() + timedelta(hours=min(expiration_hours, 72))
        
        subscription = {
            "changeType": "created,updated",
            "notificationUrl": notification_url,
            "resource": resource_path,
            "expirationDateTime": expiration.isoformat() + "Z",
            "clientState": client_state
        }
        
        url = f"{self.GRAPH_URL}/subscriptions"
        
        response = await self._client.post(
            url,
            headers=self._headers(),
            json=subscription
        )
        response.raise_for_status()
        
        result = response.json()
        
        return {
            "success": True,
            "subscription_id": result["id"],
            "resource": resource,
            "notification_url": notification_url,
            "expiration": result["expirationDateTime"],
            "client_state": client_state
        }
    
    async def list_subscriptions(self) -> List[Dict[str, Any]]:
        """기존 Subscription 목록"""
        if not self._access_token:
            return []
        
        url = f"{self.GRAPH_URL}/subscriptions"
        
        try:
            response = await self._client.get(url, headers=self._headers())
            response.raise_for_status()
            return response.json().get("value", [])
        except:
            return []
    
    async def renew_subscription(self, subscription_id: str, hours: int = 72) -> Dict[str, Any]:
        """Subscription 갱신"""
        if not self._access_token:
            raise ValueError("Not authenticated")
        
        expiration = datetime.utcnow() + timedelta(hours=min(hours, 72))
        
        url = f"{self.GRAPH_URL}/subscriptions/{subscription_id}"
        
        response = await self._client.patch(
            url,
            headers=self._headers(),
            json={"expirationDateTime": expiration.isoformat() + "Z"}
        )
        response.raise_for_status()
        
        return {"success": True, "new_expiration": expiration.isoformat()}
    
    async def delete_subscription(self, subscription_id: str) -> bool:
        """Subscription 삭제"""
        if not self._access_token:
            return False
        
        url = f"{self.GRAPH_URL}/subscriptions/{subscription_id}"
        
        try:
            response = await self._client.delete(url, headers=self._headers())
            return response.status_code in [200, 204]
        except:
            return False
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration
    # ═══════════════════════════════════════════════════════════════
    
    async def setup_autus_triggers(self, n8n_webhook_base: str) -> Dict[str, Any]:
        """
        AUTUS 트리거 자동 설정
        
        Inbox + Calendar 모두 연결
        """
        results = []
        
        for resource_name, resource_path in [
            ("inbox", "me/mailFolders('Inbox')/messages"),
            ("calendar", "me/events")
        ]:
            webhook_url = f"{n8n_webhook_base}/{resource_name}"
            
            try:
                result = await self.create_subscription(
                    resource=resource_path,
                    notification_url=webhook_url
                )
                results.append({
                    "resource": resource_name,
                    "success": True,
                    "subscription_id": result["subscription_id"]
                })
            except Exception as e:
                results.append({
                    "resource": resource_name,
                    "success": False,
                    "error": str(e)
                })
        
        success_count = len([r for r in results if r["success"]])
        
        return {
            "total": len(results),
            "success": success_count,
            "results": results
        }
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# n8n Workflow Generator for Microsoft Graph
# ═══════════════════════════════════════════════════════════════

def generate_outlook_trigger_workflow(
    webhook_path: str = "outlook-trigger"
) -> Dict[str, Any]:
    """
    Outlook 트리거 n8n 워크플로우 생성
    
    AUTUS Dev Console에서 자동 배포용
    """
    return {
        "name": "AUTUS: Outlook → Gemini → Supabase",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": webhook_path,
                    "responseMode": "responseNode"
                },
                "id": "webhook",
                "name": "Outlook Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [250, 300]
            },
            {
                "parameters": {
                    "conditions": {
                        "string": [{"value1": "={{ $json.validationToken }}", "operation": "isNotEmpty"}]
                    }
                },
                "id": "check-validation",
                "name": "Is Validation?",
                "type": "n8n-nodes-base.if",
                "typeVersion": 1,
                "position": [450, 300]
            },
            {
                "parameters": {
                    "respondWith": "text",
                    "responseBody": "={{ $json.validationToken }}"
                },
                "id": "respond-validation",
                "name": "Respond Validation",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1,
                "position": [650, 200]
            },
            {
                "parameters": {
                    "model": "models/gemini-1.5-flash",
                    "prompt": """Analyze this Outlook notification:
Resource: {{ $json.resource }}
Change Type: {{ $json.changeType }}

Suggest AUTUS actions (Merge/Eliminate/Automate) with:
- confidence: 0-100
- reason: 2-3 sentences
- simulation: { time: "+X%", errors: "-Y%", cost: "-$Z" }

Output JSON array."""
                },
                "id": "gemini",
                "name": "Gemini Analysis",
                "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
                "typeVersion": 1,
                "position": [650, 400]
            },
            {
                "parameters": {
                    "operation": "insert",
                    "tableId": "tasks",
                    "fieldsUi": {
                        "fieldValues": [
                            {"fieldName": "title", "fieldValue": "={{ 'Outlook: ' + $json.resource.split('/').pop() }}"},
                            {"fieldName": "source", "fieldValue": "Outlook"},
                            {"fieldName": "status", "fieldValue": "captured"},
                            {"fieldName": "data", "fieldValue": "={{ JSON.stringify($json) }}"}
                        ]
                    }
                },
                "id": "supabase",
                "name": "Supabase Insert",
                "type": "n8n-nodes-base.supabase",
                "typeVersion": 1,
                "position": [850, 400]
            },
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ { success: true } }}"
                },
                "id": "respond-success",
                "name": "Respond Success",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1,
                "position": [1050, 400]
            }
        ],
        "connections": {
            "Outlook Webhook": {"main": [[{"node": "Is Validation?", "type": "main", "index": 0}]]},
            "Is Validation?": {"main": [
                [{"node": "Respond Validation", "type": "main", "index": 0}],
                [{"node": "Gemini Analysis", "type": "main", "index": 0}]
            ]},
            "Gemini Analysis": {"main": [[{"node": "Supabase Insert", "type": "main", "index": 0}]]},
            "Supabase Insert": {"main": [[{"node": "Respond Success", "type": "main", "index": 0}]]}
        },
        "settings": {},
        "active": False
    }


def generate_calendar_trigger_workflow(
    webhook_path: str = "calendar-trigger"
) -> Dict[str, Any]:
    """Calendar 트리거 n8n 워크플로우"""
    return {
        "name": "AUTUS: Calendar → Gemini → Supabase",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": webhook_path,
                    "responseMode": "responseNode"
                },
                "id": "webhook",
                "name": "Calendar Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [250, 300]
            },
            {
                "parameters": {
                    "operation": "insert",
                    "tableId": "tasks",
                    "fieldsUi": {
                        "fieldValues": [
                            {"fieldName": "title", "fieldValue": "={{ 'Meeting: ' + ($json.value?.[0]?.resourceData?.subject || 'New Event') }}"},
                            {"fieldName": "source", "fieldValue": "Calendar"},
                            {"fieldName": "status", "fieldValue": "captured"},
                            {"fieldName": "data", "fieldValue": "={{ JSON.stringify($json) }}"}
                        ]
                    }
                },
                "id": "supabase",
                "name": "Supabase Insert",
                "type": "n8n-nodes-base.supabase",
                "typeVersion": 1,
                "position": [500, 300]
            },
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ { success: true } }}"
                },
                "id": "respond",
                "name": "Respond",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1,
                "position": [750, 300]
            }
        ],
        "connections": {
            "Calendar Webhook": {"main": [[{"node": "Supabase Insert", "type": "main", "index": 0}]]},
            "Supabase Insert": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]}
        },
        "settings": {},
        "active": False
    }
