"""
Salesforce API Connector
========================

REST API + SOQL 쿼리
- Leads / Opportunities
- Accounts / Contacts
- Cases (Support Tickets)

Phase 1 목표: CRM 데이터 미래예측 통합
"""

import asyncio
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import os


class SalesforceToken(BaseModel):
    access_token: str
    instance_url: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"


class SalesforceLead(BaseModel):
    id: str
    name: str
    company: str
    email: Optional[str]
    status: str
    source: Optional[str]
    created_date: datetime
    lead_score: Optional[float] = None


class SalesforceOpportunity(BaseModel):
    id: str
    name: str
    account_name: str
    amount: float
    stage: str
    probability: float
    close_date: datetime
    owner_name: str


class SalesforceCase(BaseModel):
    id: str
    case_number: str
    subject: str
    status: str
    priority: str
    account_name: Optional[str]
    created_date: datetime


class SalesforceConnector:
    """
    Salesforce REST API 커넥터
    
    Usage:
        connector = SalesforceConnector(
            client_id="...",
            client_secret="...",
            instance_url="https://yourorg.salesforce.com"
        )
        
        # OAuth2 인증
        auth_url = connector.get_auth_url(redirect_uri="...")
        token = await connector.exchange_code(code, redirect_uri)
        
        # 데이터 수집
        leads = await connector.get_leads()
        opps = await connector.get_opportunities()
    """
    
    API_VERSION = "v59.0"
    
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
        instance_url: str = None
    ):
        self.client_id = client_id or os.getenv("SF_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("SF_CLIENT_SECRET")
        self.instance_url = instance_url or os.getenv("SF_INSTANCE_URL", "https://login.salesforce.com")
        self.token: Optional[SalesforceToken] = None
        self._client = httpx.AsyncClient(timeout=30.0)
    
    # ═══════════════════════════════════════════════════════════════
    # OAuth2 Authentication
    # ═══════════════════════════════════════════════════════════════
    
    def get_auth_url(self, redirect_uri: str) -> str:
        """OAuth2 인증 URL 생성"""
        base = f"{self.instance_url}/services/oauth2/authorize"
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "api refresh_token"
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base}?{query}"
    
    async def exchange_code(self, code: str, redirect_uri: str) -> SalesforceToken:
        """Authorization code → Access token"""
        url = f"{self.instance_url}/services/oauth2/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        result = response.json()
        
        self.token = SalesforceToken(
            access_token=result["access_token"],
            instance_url=result["instance_url"],
            refresh_token=result.get("refresh_token"),
            token_type=result.get("token_type", "Bearer")
        )
        return self.token
    
    async def refresh_token(self) -> SalesforceToken:
        """토큰 갱신"""
        if not self.token or not self.token.refresh_token:
            raise ValueError("No refresh token available")
        
        url = f"{self.instance_url}/services/oauth2/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.token.refresh_token
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        result = response.json()
        
        self.token = SalesforceToken(
            access_token=result["access_token"],
            instance_url=result["instance_url"],
            refresh_token=self.token.refresh_token,
            token_type=result.get("token_type", "Bearer")
        )
        return self.token
    
    def _headers(self) -> Dict[str, str]:
        """API 요청 헤더"""
        return {
            "Authorization": f"Bearer {self.token.access_token}",
            "Content-Type": "application/json"
        }
    
    @property
    def _api_base(self) -> str:
        return f"{self.token.instance_url}/services/data/{self.API_VERSION}"
    
    # ═══════════════════════════════════════════════════════════════
    # SOQL Query
    # ═══════════════════════════════════════════════════════════════
    
    async def query(self, soql: str) -> List[Dict[str, Any]]:
        """SOQL 쿼리 실행"""
        if not self.token:
            raise ValueError("Not authenticated")
        
        url = f"{self._api_base}/query"
        params = {"q": soql}
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        return response.json().get("records", [])
    
    # ═══════════════════════════════════════════════════════════════
    # Leads
    # ═══════════════════════════════════════════════════════════════
    
    async def get_leads(
        self,
        limit: int = 50,
        status: str = None
    ) -> List[SalesforceLead]:
        """리드 조회 → AUTUS Sales Capture"""
        soql = f"""
            SELECT Id, Name, Company, Email, Status, LeadSource, CreatedDate
            FROM Lead
            {"WHERE Status = '" + status + "'" if status else ""}
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        records = await self.query(soql)
        
        return [
            SalesforceLead(
                id=r["Id"],
                name=r.get("Name", ""),
                company=r.get("Company", ""),
                email=r.get("Email"),
                status=r.get("Status", ""),
                source=r.get("LeadSource"),
                created_date=datetime.fromisoformat(r["CreatedDate"].replace("Z", "+00:00"))
            )
            for r in records
        ]
    
    # ═══════════════════════════════════════════════════════════════
    # Opportunities
    # ═══════════════════════════════════════════════════════════════
    
    async def get_opportunities(
        self,
        limit: int = 50,
        stage: str = None
    ) -> List[SalesforceOpportunity]:
        """영업 기회 조회 → AUTUS Pipeline Capture"""
        soql = f"""
            SELECT Id, Name, Account.Name, Amount, StageName, Probability, CloseDate, Owner.Name
            FROM Opportunity
            {"WHERE StageName = '" + stage + "'" if stage else ""}
            ORDER BY CloseDate ASC
            LIMIT {limit}
        """
        
        records = await self.query(soql)
        
        return [
            SalesforceOpportunity(
                id=r["Id"],
                name=r.get("Name", ""),
                account_name=r.get("Account", {}).get("Name", ""),
                amount=r.get("Amount", 0) or 0,
                stage=r.get("StageName", ""),
                probability=r.get("Probability", 0) or 0,
                close_date=datetime.fromisoformat(r["CloseDate"]) if r.get("CloseDate") else datetime.now(),
                owner_name=r.get("Owner", {}).get("Name", "")
            )
            for r in records
        ]
    
    # ═══════════════════════════════════════════════════════════════
    # Cases (Support)
    # ═══════════════════════════════════════════════════════════════
    
    async def get_cases(
        self,
        limit: int = 50,
        status: str = None
    ) -> List[SalesforceCase]:
        """지원 케이스 조회 → AUTUS Support Capture"""
        soql = f"""
            SELECT Id, CaseNumber, Subject, Status, Priority, Account.Name, CreatedDate
            FROM Case
            {"WHERE Status = '" + status + "'" if status else ""}
            ORDER BY CreatedDate DESC
            LIMIT {limit}
        """
        
        records = await self.query(soql)
        
        return [
            SalesforceCase(
                id=r["Id"],
                case_number=r.get("CaseNumber", ""),
                subject=r.get("Subject", ""),
                status=r.get("Status", ""),
                priority=r.get("Priority", ""),
                account_name=r.get("Account", {}).get("Name") if r.get("Account") else None,
                created_date=datetime.fromisoformat(r["CreatedDate"].replace("Z", "+00:00"))
            )
            for r in records
        ]
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration
    # ═══════════════════════════════════════════════════════════════
    
    async def capture_all_tasks(self) -> List[Dict[str, Any]]:
        """Salesforce 전체 데이터 → AUTUS Task Nodes"""
        tasks = []
        
        # 1. Hot Leads
        try:
            leads = await self.get_leads(limit=10, status="Open - Not Contacted")
            for lead in leads:
                tasks.append({
                    "source": "salesforce",
                    "type": "lead",
                    "icon": "👤",
                    "name": f"Lead: {lead.name}",
                    "meta": f"{lead.company} | {lead.status}",
                    "timestamp": lead.created_date.isoformat(),
                    "priority": "high",
                    "original_id": lead.id,
                    "ai_hint": "lead_scoring"  # AI 분석 힌트
                })
        except Exception as e:
            print(f"Leads capture error: {e}")
        
        # 2. Open Opportunities
        try:
            opps = await self.get_opportunities(limit=10)
            for opp in opps:
                priority = "high" if opp.probability >= 70 else "normal"
                tasks.append({
                    "source": "salesforce",
                    "type": "opportunity",
                    "icon": "💰",
                    "name": f"Opp: {opp.name}",
                    "meta": f"${opp.amount:,.0f} | {opp.probability}%",
                    "timestamp": opp.close_date.isoformat(),
                    "priority": priority,
                    "original_id": opp.id,
                    "ai_hint": "deal_prediction"
                })
        except Exception as e:
            print(f"Opportunities capture error: {e}")
        
        # 3. Open Cases
        try:
            cases = await self.get_cases(limit=10, status="New")
            for case in cases:
                priority = "high" if case.priority == "High" else "normal"
                tasks.append({
                    "source": "salesforce",
                    "type": "case",
                    "icon": "🎫",
                    "name": f"Case #{case.case_number}",
                    "meta": f"{case.subject[:30]} | {case.priority}",
                    "timestamp": case.created_date.isoformat(),
                    "priority": priority,
                    "original_id": case.id,
                    "ai_hint": "ticket_merge"
                })
        except Exception as e:
            print(f"Cases capture error: {e}")
        
        return tasks
    
    async def close(self):
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# AUTUS AI Integration: Churn Prediction
# ═══════════════════════════════════════════════════════════════

def calculate_churn_risk(lead: SalesforceLead) -> Dict[str, Any]:
    """
    리드 이탈 위험도 계산 (AUTUS AI Suggestion용)
    
    Returns:
        {
            "risk_score": 0.0-1.0,
            "suggestion": "Merge/Automate/Eliminate",
            "reason": "..."
        }
    """
    # 간단한 휴리스틱 (실제로는 Gemini 분석)
    days_since_creation = (datetime.now() - lead.created_date).days
    
    if days_since_creation > 30 and lead.status == "Open - Not Contacted":
        return {
            "risk_score": 0.85,
            "suggestion": "Automate",
            "reason": f"Lead dormant for {days_since_creation} days. Auto-nurture recommended.",
            "confidence": 87
        }
    elif lead.status == "Qualified":
        return {
            "risk_score": 0.15,
            "suggestion": "Merge",
            "reason": "High-value lead. Consider merging with similar opportunities.",
            "confidence": 92
        }
    else:
        return {
            "risk_score": 0.5,
            "suggestion": "Monitor",
            "reason": "Standard lead. Continue normal workflow.",
            "confidence": 75
        }
