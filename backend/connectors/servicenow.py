"""
ServiceNow API Connector
========================

REST Table API
- Incidents
- Change Requests
- Service Requests
- CMDB

Phase 1 목표: IT 팀 워크플로우 자동화
"""

import asyncio
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import os
import base64


class ServiceNowIncident(BaseModel):
    sys_id: str
    number: str
    short_description: str
    description: Optional[str]
    state: str
    priority: str
    urgency: str
    impact: str
    assigned_to: Optional[str]
    caller: Optional[str]
    category: Optional[str]
    opened_at: datetime
    resolved_at: Optional[datetime] = None


class ServiceNowChange(BaseModel):
    sys_id: str
    number: str
    short_description: str
    state: str
    type: str
    risk: str
    impact: str
    requested_by: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]


class ServiceNowConnector:
    """
    ServiceNow REST API 커넥터
    
    Usage:
        connector = ServiceNowConnector(
            instance="yourinstance",
            username="admin",
            password="..."
        )
        
        # 데이터 수집
        incidents = await connector.get_incidents()
        changes = await connector.get_change_requests()
    """
    
    def __init__(
        self,
        instance: str = None,
        username: str = None,
        password: str = None,
        oauth_token: str = None
    ):
        self.instance = instance or os.getenv("SNOW_INSTANCE")
        self.username = username or os.getenv("SNOW_USERNAME")
        self.password = password or os.getenv("SNOW_PASSWORD")
        self.oauth_token = oauth_token or os.getenv("SNOW_OAUTH_TOKEN")
        self._client = httpx.AsyncClient(timeout=30.0)
    
    @property
    def _base_url(self) -> str:
        return f"https://{self.instance}.service-now.com/api/now"
    
    def _headers(self) -> Dict[str, str]:
        """API 요청 헤더"""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        if self.oauth_token:
            headers["Authorization"] = f"Bearer {self.oauth_token}"
        else:
            # Basic Auth
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            headers["Authorization"] = f"Basic {credentials}"
        
        return headers
    
    # ═══════════════════════════════════════════════════════════════
    # Table API
    # ═══════════════════════════════════════════════════════════════
    
    async def _get_records(
        self,
        table: str,
        query: str = None,
        fields: List[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Generic table query"""
        url = f"{self._base_url}/table/{table}"
        params = {
            "sysparm_limit": limit,
            "sysparm_display_value": "true"
        }
        
        if query:
            params["sysparm_query"] = query
        
        if fields:
            params["sysparm_fields"] = ",".join(fields)
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        return response.json().get("result", [])
    
    # ═══════════════════════════════════════════════════════════════
    # Incidents
    # ═══════════════════════════════════════════════════════════════
    
    async def get_incidents(
        self,
        state: str = None,
        priority: str = None,
        limit: int = 50
    ) -> List[ServiceNowIncident]:
        """인시던트 조회 → AUTUS IT Capture"""
        query_parts = ["active=true"]
        
        if state:
            query_parts.append(f"state={state}")
        if priority:
            query_parts.append(f"priority={priority}")
        
        query = "^".join(query_parts) + "^ORDERBYDESCopened_at"
        
        records = await self._get_records(
            table="incident",
            query=query,
            fields=[
                "sys_id", "number", "short_description", "description",
                "state", "priority", "urgency", "impact",
                "assigned_to", "caller_id", "category", "opened_at", "resolved_at"
            ],
            limit=limit
        )
        
        incidents = []
        for r in records:
            incidents.append(ServiceNowIncident(
                sys_id=r["sys_id"],
                number=r.get("number", ""),
                short_description=r.get("short_description", ""),
                description=r.get("description"),
                state=r.get("state", ""),
                priority=r.get("priority", ""),
                urgency=r.get("urgency", ""),
                impact=r.get("impact", ""),
                assigned_to=r.get("assigned_to"),
                caller=r.get("caller_id"),
                category=r.get("category"),
                opened_at=datetime.fromisoformat(r["opened_at"].replace(" ", "T")) if r.get("opened_at") else datetime.now(),
                resolved_at=datetime.fromisoformat(r["resolved_at"].replace(" ", "T")) if r.get("resolved_at") else None
            ))
        
        return incidents
    
    # ═══════════════════════════════════════════════════════════════
    # Change Requests
    # ═══════════════════════════════════════════════════════════════
    
    async def get_change_requests(
        self,
        state: str = None,
        limit: int = 50
    ) -> List[ServiceNowChange]:
        """변경 요청 조회 → AUTUS Change Capture"""
        query_parts = ["active=true"]
        
        if state:
            query_parts.append(f"state={state}")
        
        query = "^".join(query_parts) + "^ORDERBYDESCsys_created_on"
        
        records = await self._get_records(
            table="change_request",
            query=query,
            fields=[
                "sys_id", "number", "short_description", "state",
                "type", "risk", "impact", "requested_by",
                "start_date", "end_date"
            ],
            limit=limit
        )
        
        changes = []
        for r in records:
            changes.append(ServiceNowChange(
                sys_id=r["sys_id"],
                number=r.get("number", ""),
                short_description=r.get("short_description", ""),
                state=r.get("state", ""),
                type=r.get("type", ""),
                risk=r.get("risk", ""),
                impact=r.get("impact", ""),
                requested_by=r.get("requested_by"),
                start_date=datetime.fromisoformat(r["start_date"].replace(" ", "T")) if r.get("start_date") else None,
                end_date=datetime.fromisoformat(r["end_date"].replace(" ", "T")) if r.get("end_date") else None
            ))
        
        return changes
    
    # ═══════════════════════════════════════════════════════════════
    # CMDB (Configuration Items)
    # ═══════════════════════════════════════════════════════════════
    
    async def get_cmdb_servers(self, limit: int = 50) -> List[Dict[str, Any]]:
        """서버 목록 조회"""
        return await self._get_records(
            table="cmdb_ci_server",
            query="operational_status=1",
            fields=["sys_id", "name", "ip_address", "os", "environment"],
            limit=limit
        )
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration
    # ═══════════════════════════════════════════════════════════════
    
    async def capture_all_tasks(self) -> List[Dict[str, Any]]:
        """ServiceNow 전체 데이터 → AUTUS Task Nodes"""
        tasks = []
        
        # 1. Open Incidents
        try:
            incidents = await self.get_incidents(limit=15)
            for inc in incidents:
                priority = "high" if inc.priority in ["1", "2", "1 - Critical", "2 - High"] else "normal"
                tasks.append({
                    "source": "servicenow",
                    "type": "incident",
                    "icon": "🚨",
                    "name": f"INC: {inc.short_description[:40]}",
                    "meta": f"#{inc.number} | P{inc.priority[0] if inc.priority else '?'}",
                    "timestamp": inc.opened_at.isoformat(),
                    "priority": priority,
                    "original_id": inc.sys_id,
                    "ai_hint": "ticket_merge" if inc.category else "automate"
                })
        except Exception as e:
            print(f"Incidents capture error: {e}")
        
        # 2. Change Requests
        try:
            changes = await self.get_change_requests(limit=10)
            for chg in changes:
                risk_priority = "high" if chg.risk in ["1", "2", "High"] else "normal"
                tasks.append({
                    "source": "servicenow",
                    "type": "change",
                    "icon": "🔄",
                    "name": f"CHG: {chg.short_description[:40]}",
                    "meta": f"#{chg.number} | {chg.type}",
                    "timestamp": chg.start_date.isoformat() if chg.start_date else datetime.now().isoformat(),
                    "priority": risk_priority,
                    "original_id": chg.sys_id,
                    "ai_hint": "schedule_optimize"
                })
        except Exception as e:
            print(f"Changes capture error: {e}")
        
        return tasks
    
    # ═══════════════════════════════════════════════════════════════
    # Incident Analysis (AUTUS AI)
    # ═══════════════════════════════════════════════════════════════
    
    def analyze_incident_for_merge(
        self,
        incident: ServiceNowIncident,
        all_incidents: List[ServiceNowIncident]
    ) -> Dict[str, Any]:
        """
        유사 인시던트 분석 → Merge 제안
        
        Returns:
            {
                "merge_candidates": [...],
                "suggestion": "Merge",
                "confidence": 92,
                "reason": "..."
            }
        """
        # 간단한 유사도 분석 (실제로는 Gemini)
        similar = []
        for other in all_incidents:
            if other.sys_id == incident.sys_id:
                continue
            
            # 제목 유사도 (단순 키워드 매칭)
            words1 = set(incident.short_description.lower().split())
            words2 = set(other.short_description.lower().split())
            overlap = len(words1 & words2) / max(len(words1 | words2), 1)
            
            if overlap > 0.5 and incident.category == other.category:
                similar.append({
                    "number": other.number,
                    "similarity": overlap,
                    "category": other.category
                })
        
        if similar:
            return {
                "merge_candidates": similar[:3],
                "suggestion": "Merge",
                "confidence": min(95, 70 + len(similar) * 10),
                "reason": f"Found {len(similar)} similar incidents in category '{incident.category}'. Merging could reduce resolution time by 40%."
            }
        else:
            return {
                "merge_candidates": [],
                "suggestion": "None",
                "confidence": 50,
                "reason": "No similar incidents found."
            }
    
    async def close(self):
        await self._client.aclose()
