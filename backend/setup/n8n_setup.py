"""
n8n Auto-Setup
==============

AUTUS가 n8n 워크플로우를 자동으로 생성

Features:
- Docker Compose 파일 생성
- 기본 워크플로우 템플릿 배포
- 연결 상태 확인
"""

import asyncio
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
import os
import json


class N8nWorkflow(BaseModel):
    """n8n 워크플로우"""
    id: Optional[str] = None
    name: str
    nodes: List[Dict[str, Any]]
    connections: Dict[str, Any]
    active: bool = False


class N8nSetup:
    """
    n8n 자동 설정
    
    AUTUS가 워크플로우 자동화 엔진을 구성합니다.
    """
    
    # ═══════════════════════════════════════════════════════════════
    # Docker Compose Template
    # ═══════════════════════════════════════════════════════════════
    
    DOCKER_COMPOSE = """# AUTUS n8n Docker Compose
# Generated: {timestamp}
# Run: docker-compose up -d

version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: autus-n8n
    restart: unless-stopped
    ports:
      - "${{N8N_PORT:-5678}}:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${{N8N_USER:-admin}}
      - N8N_BASIC_AUTH_PASSWORD=${{N8N_PASSWORD:-autus_secure}}
      - N8N_HOST=${{N8N_HOST:-localhost}}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://${{N8N_HOST:-localhost}}:5678/
      - GENERIC_TIMEZONE=Asia/Seoul
      - TZ=Asia/Seoul
      # AUTUS Integration
      - SUPABASE_URL=${{SUPABASE_URL}}
      - SUPABASE_ANON_KEY=${{SUPABASE_ANON_KEY}}
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - autus-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    container_name: autus-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - autus-network

volumes:
  n8n_data:
  redis_data:

networks:
  autus-network:
    driver: bridge
"""

    # ═══════════════════════════════════════════════════════════════
    # Workflow Templates
    # ═══════════════════════════════════════════════════════════════
    
    WORKFLOW_GMAIL_TO_SUPABASE = {
        "name": "AUTUS: Gmail → Supabase Task",
        "nodes": [
            {
                "parameters": {
                    "pollTimes": {"item": [{"mode": "everyMinute"}]},
                    "filters": {"readStatus": "unread"}
                },
                "id": "gmail-trigger",
                "name": "Gmail Trigger",
                "type": "n8n-nodes-base.gmailTrigger",
                "typeVersion": 1,
                "position": [250, 300]
            },
            {
                "parameters": {
                    "operation": "insert",
                    "tableId": "tasks",
                    "fieldsUi": {
                        "fieldValues": [
                            {"fieldName": "title", "fieldValue": "={{ $json.subject }}"},
                            {"fieldName": "source", "fieldValue": "Gmail"},
                            {"fieldName": "status", "fieldValue": "captured"},
                            {"fieldName": "data", "fieldValue": "={{ JSON.stringify({ from: $json.from, snippet: $json.snippet }) }}"}
                        ]
                    }
                },
                "id": "supabase-insert",
                "name": "Supabase Insert",
                "type": "n8n-nodes-base.supabase",
                "typeVersion": 1,
                "position": [500, 300],
                "credentials": {"supabaseApi": {"id": "1", "name": "Supabase"}}
            }
        ],
        "connections": {
            "Gmail Trigger": {"main": [[{"node": "Supabase Insert", "type": "main", "index": 0}]]}
        }
    }
    
    WORKFLOW_AUTUS_WEBHOOK = {
        "name": "AUTUS: Universal Webhook Handler",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "autus-capture",
                    "responseMode": "responseNode"
                },
                "id": "webhook",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [250, 300]
            },
            {
                "parameters": {
                    "conditions": {
                        "string": [{"value1": "={{ $json.source }}", "operation": "isNotEmpty"}]
                    }
                },
                "id": "if-valid",
                "name": "If Valid",
                "type": "n8n-nodes-base.if",
                "typeVersion": 1,
                "position": [450, 300]
            },
            {
                "parameters": {
                    "operation": "insert",
                    "tableId": "tasks",
                    "fieldsUi": {
                        "fieldValues": [
                            {"fieldName": "title", "fieldValue": "={{ $json.title || 'Captured Task' }}"},
                            {"fieldName": "source", "fieldValue": "={{ $json.source }}"},
                            {"fieldName": "status", "fieldValue": "captured"},
                            {"fieldName": "data", "fieldValue": "={{ JSON.stringify($json) }}"}
                        ]
                    }
                },
                "id": "supabase-insert",
                "name": "Supabase Insert",
                "type": "n8n-nodes-base.supabase",
                "typeVersion": 1,
                "position": [700, 250]
            },
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ { success: true, task_id: $json.id } }}"
                },
                "id": "respond",
                "name": "Respond",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1,
                "position": [900, 250]
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "If Valid", "type": "main", "index": 0}]]},
            "If Valid": {"main": [
                [{"node": "Supabase Insert", "type": "main", "index": 0}],
                []
            ]},
            "Supabase Insert": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]}
        }
    }
    
    def __init__(
        self,
        n8n_url: str = None,
        api_key: str = None
    ):
        self.n8n_url = n8n_url or os.getenv("N8N_BASE_URL", "http://localhost:5678")
        self.api_key = api_key or os.getenv("N8N_API_KEY")
        self._client = httpx.AsyncClient(timeout=30.0)
    
    def _headers(self) -> Dict[str, str]:
        """API 헤더"""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-N8N-API-KEY"] = self.api_key
        return headers
    
    # ═══════════════════════════════════════════════════════════════
    # Health Check
    # ═══════════════════════════════════════════════════════════════
    
    async def check_health(self) -> Dict[str, Any]:
        """n8n 상태 확인"""
        try:
            response = await self._client.get(f"{self.n8n_url}/healthz", timeout=5.0)
            return {
                "status": "running" if response.status_code == 200 else "error",
                "url": self.n8n_url,
                "response_time_ms": response.elapsed.total_seconds() * 1000
            }
        except httpx.ConnectError:
            return {"status": "not_running", "url": self.n8n_url, "error": "Connection refused"}
        except Exception as e:
            return {"status": "error", "url": self.n8n_url, "error": str(e)}
    
    # ═══════════════════════════════════════════════════════════════
    # Workflow Management
    # ═══════════════════════════════════════════════════════════════
    
    async def list_workflows(self) -> List[Dict[str, Any]]:
        """워크플로우 목록 조회"""
        try:
            response = await self._client.get(
                f"{self.n8n_url}/api/v1/workflows",
                headers=self._headers()
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except Exception as e:
            return [{"error": str(e)}]
    
    async def create_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """워크플로우 생성"""
        try:
            response = await self._client.post(
                f"{self.n8n_url}/api/v1/workflows",
                headers=self._headers(),
                json=workflow
            )
            response.raise_for_status()
            return {"success": True, "workflow": response.json()}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def activate_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """워크플로우 활성화"""
        try:
            response = await self._client.patch(
                f"{self.n8n_url}/api/v1/workflows/{workflow_id}",
                headers=self._headers(),
                json={"active": True}
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ═══════════════════════════════════════════════════════════════
    # Auto Setup
    # ═══════════════════════════════════════════════════════════════
    
    async def deploy_autus_workflows(self) -> Dict[str, Any]:
        """AUTUS 기본 워크플로우 배포"""
        results = []
        
        workflows = [
            self.WORKFLOW_GMAIL_TO_SUPABASE,
            self.WORKFLOW_AUTUS_WEBHOOK
        ]
        
        for wf in workflows:
            result = await self.create_workflow(wf)
            results.append({
                "name": wf["name"],
                "success": result.get("success", False),
                "id": result.get("workflow", {}).get("id") if result.get("success") else None,
                "error": result.get("error")
            })
        
        return {
            "deployed": len([r for r in results if r["success"]]),
            "total": len(workflows),
            "workflows": results
        }
    
    def generate_docker_compose(self) -> str:
        """Docker Compose 파일 내용 생성"""
        return self.DOCKER_COMPOSE.format(timestamp=datetime.now().isoformat())
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# n8n Workflow Generator (Gemini 연동용)
# ═══════════════════════════════════════════════════════════════

def generate_n8n_workflow(
    name: str,
    trigger_type: str,
    action_type: str,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    n8n 워크플로우 JSON 생성
    
    Args:
        name: 워크플로우 이름
        trigger_type: "webhook", "gmail", "schedule", "manual"
        action_type: "supabase_insert", "http_request", "slack_send"
        config: 추가 설정
    
    Returns:
        n8n 워크플로우 JSON
    """
    nodes = []
    connections = {}
    
    # Trigger Node
    if trigger_type == "webhook":
        nodes.append({
            "parameters": {
                "httpMethod": "POST",
                "path": config.get("path", "autus-trigger"),
                "responseMode": "responseNode"
            },
            "id": "trigger",
            "name": "Webhook Trigger",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [250, 300]
        })
    elif trigger_type == "schedule":
        nodes.append({
            "parameters": {
                "rule": {"interval": [{"field": "minutes", "minutesInterval": config.get("interval", 5)}]}
            },
            "id": "trigger",
            "name": "Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1,
            "position": [250, 300]
        })
    
    # Action Node
    if action_type == "supabase_insert":
        nodes.append({
            "parameters": {
                "operation": "insert",
                "tableId": config.get("table", "tasks"),
                "fieldsUi": {"fieldValues": config.get("fields", [])}
            },
            "id": "action",
            "name": "Supabase Insert",
            "type": "n8n-nodes-base.supabase",
            "typeVersion": 1,
            "position": [500, 300]
        })
    
    # Connections
    if len(nodes) >= 2:
        connections[nodes[0]["name"]] = {
            "main": [[{"node": nodes[1]["name"], "type": "main", "index": 0}]]
        }
    
    return {
        "name": name,
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {}
    }
