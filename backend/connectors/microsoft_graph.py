"""
Microsoft Graph API Connector
=============================

OAuth2 인증 + Graph API 호출
- Outlook (메일/캘린더)
- Teams (메시지/채널)
- SharePoint (파일/리스트)
- OneDrive (파일)

Phase 1 목표: AUTUS 캔버스에 M365 데이터 실시간 드롭
"""

import asyncio
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import os


class GraphToken(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: datetime
    scope: str


class OutlookEmail(BaseModel):
    id: str
    subject: str
    from_address: str
    received_at: datetime
    body_preview: str
    importance: str
    has_attachments: bool


class TeamsMessage(BaseModel):
    id: str
    channel_id: str
    content: str
    from_user: str
    created_at: datetime


class CalendarEvent(BaseModel):
    id: str
    subject: str
    start: datetime
    end: datetime
    location: Optional[str]
    attendees: List[str]
    is_online: bool


class SharePointFile(BaseModel):
    id: str
    name: str
    web_url: str
    size: int
    modified_at: datetime
    modified_by: str


class MicrosoftGraphConnector:
    """
    Microsoft Graph API 커넥터
    
    Usage:
        connector = MicrosoftGraphConnector(
            client_id="...",
            client_secret="...",
            tenant_id="..."
        )
        
        # OAuth2 인증
        auth_url = connector.get_auth_url(redirect_uri="...")
        token = await connector.exchange_code(code, redirect_uri)
        
        # 데이터 수집
        emails = await connector.get_recent_emails()
        events = await connector.get_calendar_events()
        messages = await connector.get_teams_messages()
    """
    
    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    AUTH_BASE_URL = "https://login.microsoftonline.com"
    
    # Required scopes for AUTUS
    SCOPES = [
        "Mail.Read",
        "Calendars.Read",
        "Chat.Read",
        "ChannelMessage.Read.All",
        "Files.Read.All",
        "User.Read",
        "offline_access"
    ]
    
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
        tenant_id: str = None
    ):
        self.client_id = client_id or os.getenv("MS_CLIENT_ID")
        self.client_secret = client_secret or os.getenv("MS_CLIENT_SECRET")
        self.tenant_id = tenant_id or os.getenv("MS_TENANT_ID", "common")
        self.token: Optional[GraphToken] = None
        self._client = httpx.AsyncClient(timeout=30.0)
    
    # ═══════════════════════════════════════════════════════════════
    # OAuth2 Authentication
    # ═══════════════════════════════════════════════════════════════
    
    def get_auth_url(self, redirect_uri: str, state: str = None) -> str:
        """OAuth2 인증 URL 생성"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "response_mode": "query",
            "scope": " ".join(self.SCOPES),
            "state": state or "autus_auth"
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTH_BASE_URL}/{self.tenant_id}/oauth2/v2.0/authorize?{query}"
    
    async def exchange_code(self, code: str, redirect_uri: str) -> GraphToken:
        """Authorization code → Access token 교환"""
        url = f"{self.AUTH_BASE_URL}/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": " ".join(self.SCOPES)
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        result = response.json()
        
        self.token = GraphToken(
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token", ""),
            expires_at=datetime.now() + timedelta(seconds=result["expires_in"]),
            scope=result.get("scope", "")
        )
        return self.token
    
    async def refresh_token(self) -> GraphToken:
        """토큰 갱신"""
        if not self.token or not self.token.refresh_token:
            raise ValueError("No refresh token available")
        
        url = f"{self.AUTH_BASE_URL}/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.token.refresh_token,
            "grant_type": "refresh_token",
            "scope": " ".join(self.SCOPES)
        }
        
        response = await self._client.post(url, data=data)
        response.raise_for_status()
        result = response.json()
        
        self.token = GraphToken(
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token", self.token.refresh_token),
            expires_at=datetime.now() + timedelta(seconds=result["expires_in"]),
            scope=result.get("scope", "")
        )
        return self.token
    
    async def _ensure_valid_token(self):
        """토큰 유효성 확인 및 갱신"""
        if not self.token:
            raise ValueError("Not authenticated. Call exchange_code first.")
        
        if datetime.now() >= self.token.expires_at - timedelta(minutes=5):
            await self.refresh_token()
    
    def _headers(self) -> Dict[str, str]:
        """API 요청 헤더"""
        return {
            "Authorization": f"Bearer {self.token.access_token}",
            "Content-Type": "application/json"
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Outlook Mail
    # ═══════════════════════════════════════════════════════════════
    
    async def get_recent_emails(
        self,
        limit: int = 20,
        unread_only: bool = False
    ) -> List[OutlookEmail]:
        """최근 이메일 조회 → AUTUS Task Capture"""
        await self._ensure_valid_token()
        
        url = f"{self.GRAPH_BASE_URL}/me/messages"
        params = {
            "$top": limit,
            "$orderby": "receivedDateTime desc",
            "$select": "id,subject,from,receivedDateTime,bodyPreview,importance,hasAttachments"
        }
        
        if unread_only:
            params["$filter"] = "isRead eq false"
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        emails = []
        for item in response.json().get("value", []):
            emails.append(OutlookEmail(
                id=item["id"],
                subject=item.get("subject", "(No Subject)"),
                from_address=item.get("from", {}).get("emailAddress", {}).get("address", ""),
                received_at=datetime.fromisoformat(item["receivedDateTime"].replace("Z", "+00:00")),
                body_preview=item.get("bodyPreview", ""),
                importance=item.get("importance", "normal"),
                has_attachments=item.get("hasAttachments", False)
            ))
        
        return emails
    
    # ═══════════════════════════════════════════════════════════════
    # Calendar
    # ═══════════════════════════════════════════════════════════════
    
    async def get_calendar_events(
        self,
        days_ahead: int = 7,
        limit: int = 50
    ) -> List[CalendarEvent]:
        """캘린더 이벤트 조회 → AUTUS Meeting Capture"""
        await self._ensure_valid_token()
        
        start = datetime.now().isoformat() + "Z"
        end = (datetime.now() + timedelta(days=days_ahead)).isoformat() + "Z"
        
        url = f"{self.GRAPH_BASE_URL}/me/calendarView"
        params = {
            "startDateTime": start,
            "endDateTime": end,
            "$top": limit,
            "$orderby": "start/dateTime",
            "$select": "id,subject,start,end,location,attendees,isOnlineMeeting"
        }
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        events = []
        for item in response.json().get("value", []):
            events.append(CalendarEvent(
                id=item["id"],
                subject=item.get("subject", "(No Title)"),
                start=datetime.fromisoformat(item["start"]["dateTime"]),
                end=datetime.fromisoformat(item["end"]["dateTime"]),
                location=item.get("location", {}).get("displayName"),
                attendees=[a.get("emailAddress", {}).get("address", "") for a in item.get("attendees", [])],
                is_online=item.get("isOnlineMeeting", False)
            ))
        
        return events
    
    # ═══════════════════════════════════════════════════════════════
    # Teams Messages
    # ═══════════════════════════════════════════════════════════════
    
    async def get_teams_chats(self) -> List[Dict[str, Any]]:
        """Teams 채팅 목록"""
        await self._ensure_valid_token()
        
        url = f"{self.GRAPH_BASE_URL}/me/chats"
        response = await self._client.get(url, headers=self._headers())
        response.raise_for_status()
        
        return response.json().get("value", [])
    
    async def get_teams_messages(
        self,
        chat_id: str,
        limit: int = 20
    ) -> List[TeamsMessage]:
        """특정 채팅의 메시지 → AUTUS Task Capture"""
        await self._ensure_valid_token()
        
        url = f"{self.GRAPH_BASE_URL}/me/chats/{chat_id}/messages"
        params = {"$top": limit}
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        messages = []
        for item in response.json().get("value", []):
            messages.append(TeamsMessage(
                id=item["id"],
                channel_id=chat_id,
                content=item.get("body", {}).get("content", ""),
                from_user=item.get("from", {}).get("user", {}).get("displayName", ""),
                created_at=datetime.fromisoformat(item["createdDateTime"].replace("Z", "+00:00"))
            ))
        
        return messages
    
    # ═══════════════════════════════════════════════════════════════
    # SharePoint / OneDrive
    # ═══════════════════════════════════════════════════════════════
    
    async def get_recent_files(self, limit: int = 20) -> List[SharePointFile]:
        """최근 파일 → AUTUS Document Capture"""
        await self._ensure_valid_token()
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/recent"
        params = {"$top": limit}
        
        response = await self._client.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        
        files = []
        for item in response.json().get("value", []):
            files.append(SharePointFile(
                id=item["id"],
                name=item.get("name", ""),
                web_url=item.get("webUrl", ""),
                size=item.get("size", 0),
                modified_at=datetime.fromisoformat(item["lastModifiedDateTime"].replace("Z", "+00:00")),
                modified_by=item.get("lastModifiedBy", {}).get("user", {}).get("displayName", "")
            ))
        
        return files
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration: Convert to Task Nodes
    # ═══════════════════════════════════════════════════════════════
    
    async def capture_all_tasks(self) -> List[Dict[str, Any]]:
        """
        M365 전체 데이터 → AUTUS Task Nodes 변환
        
        Returns:
            List of task nodes for AUTUS canvas
        """
        tasks = []
        
        # 1. Emails → Tasks
        try:
            emails = await self.get_recent_emails(limit=10, unread_only=True)
            for email in emails:
                tasks.append({
                    "source": "outlook",
                    "type": "email",
                    "icon": "📧",
                    "name": email.subject[:50],
                    "meta": f"From: {email.from_address}",
                    "timestamp": email.received_at.isoformat(),
                    "priority": "high" if email.importance == "high" else "normal",
                    "original_id": email.id
                })
        except Exception as e:
            print(f"Email capture error: {e}")
        
        # 2. Calendar → Tasks
        try:
            events = await self.get_calendar_events(days_ahead=3)
            for event in events:
                tasks.append({
                    "source": "calendar",
                    "type": "meeting",
                    "icon": "📅",
                    "name": event.subject[:50],
                    "meta": f"At: {event.start.strftime('%m/%d %H:%M')}",
                    "timestamp": event.start.isoformat(),
                    "priority": "normal",
                    "original_id": event.id
                })
        except Exception as e:
            print(f"Calendar capture error: {e}")
        
        # 3. Files → Tasks
        try:
            files = await self.get_recent_files(limit=5)
            for file in files:
                tasks.append({
                    "source": "sharepoint",
                    "type": "document",
                    "icon": "📄",
                    "name": file.name[:50],
                    "meta": f"Modified: {file.modified_at.strftime('%m/%d')}",
                    "timestamp": file.modified_at.isoformat(),
                    "priority": "low",
                    "original_id": file.id
                })
        except Exception as e:
            print(f"Files capture error: {e}")
        
        return tasks
    
    async def close(self):
        """클라이언트 종료"""
        await self._client.aclose()


# ═══════════════════════════════════════════════════════════════
# AUTUS Task Converter (M365 → Canvas Node)
# ═══════════════════════════════════════════════════════════════

def convert_to_autus_node(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    M365 Task → AUTUS Canvas Node 변환
    
    AUTUS 캔버스에서 사용하는 노드 형식으로 변환
    """
    automation_score = {
        "email": 45,
        "meeting": 30,
        "document": 60
    }.get(task.get("type"), 40)
    
    return {
        "id": f"m365_{task['original_id'][:8]}",
        "nodeType": task["type"],
        "icon": task["icon"],
        "name": task["name"],
        "source": task["source"],
        "automation": automation_score,
        "k_value": 2.5,  # Default K-index
        "captured_at": task["timestamp"],
        "status": "pending",
        "suggestions": []  # Will be filled by Gemini AI
    }
