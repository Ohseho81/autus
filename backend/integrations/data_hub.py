"""
AUTUS Data Hub v14.0
=====================
모든 연동 서비스에서 데이터 수집 및 통합

수집 데이터:
- 이메일 (Gmail, Outlook)
- 캘린더 (Google Calendar, Outlook Calendar)
- 메시지 (Slack, Discord, Teams)
- 문서 (Google Drive, OneDrive, Notion, Dropbox)
- 코드 (GitHub)
- 고객 (HubSpot, Salesforce, Shopify)
- 결제 (Stripe, Toss)
"""

import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

from integrations.oauth_manager import (
    OAuthManager,
    OAuthProvider,
    OAuthToken,
    get_oauth_manager
)

logger = logging.getLogger(__name__)

# ============================================
# 데이터 타입
# ============================================

class DataType(str, Enum):
    EMAIL = "email"
    CALENDAR = "calendar"
    MESSAGE = "message"
    DOCUMENT = "document"
    TASK = "task"
    CONTACT = "contact"
    TRANSACTION = "transaction"
    CODE = "code"

@dataclass
class UnifiedData:
    """통합 데이터 형식"""
    id: str
    type: DataType
    source: OAuthProvider
    title: str
    content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    raw: Dict[str, Any] = field(default_factory=dict)

# ============================================
# 개별 Collector
# ============================================

class BaseCollector:
    """기본 수집기"""
    
    def __init__(self, token: OAuthToken):
        self.token = token
        self.headers = {
            "Authorization": f"{token.token_type} {token.access_token}",
            "Accept": "application/json"
        }
    
    async def _get(self, url: str, params: Dict = None) -> Dict:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers, params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.error(f"GET {url} failed: {resp.status}")
                    return {}
    
    async def collect(self) -> List[UnifiedData]:
        raise NotImplementedError


class GmailCollector(BaseCollector):
    """Gmail 수집기"""
    
    BASE_URL = "https://gmail.googleapis.com/gmail/v1"
    
    async def collect(self, max_results: int = 50) -> List[UnifiedData]:
        """최근 이메일 수집"""
        # 메시지 목록
        url = f"{self.BASE_URL}/users/me/messages"
        result = await self._get(url, {"maxResults": max_results})
        
        messages = result.get("messages", [])
        data = []
        
        for msg in messages[:20]:  # 상세 조회는 20개만
            detail = await self._get(f"{url}/{msg['id']}")
            if not detail:
                continue
            
            headers = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
            
            data.append(UnifiedData(
                id=msg["id"],
                type=DataType.EMAIL,
                source=OAuthProvider.GOOGLE,
                title=headers.get("Subject", "(제목 없음)"),
                content=detail.get("snippet", ""),
                metadata={
                    "from": headers.get("From", ""),
                    "to": headers.get("To", ""),
                    "date": headers.get("Date", ""),
                    "labels": detail.get("labelIds", [])
                },
                raw=detail
            ))
        
        return data


class GoogleCalendarCollector(BaseCollector):
    """Google Calendar 수집기"""
    
    BASE_URL = "https://www.googleapis.com/calendar/v3"
    
    async def collect(self, days_ahead: int = 30) -> List[UnifiedData]:
        """다가오는 일정 수집"""
        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"
        
        url = f"{self.BASE_URL}/calendars/primary/events"
        result = await self._get(url, {
            "timeMin": time_min,
            "timeMax": time_max,
            "singleEvents": True,
            "orderBy": "startTime"
        })
        
        events = result.get("items", [])
        data = []
        
        for event in events:
            start = event.get("start", {})
            data.append(UnifiedData(
                id=event["id"],
                type=DataType.CALENDAR,
                source=OAuthProvider.GOOGLE,
                title=event.get("summary", "(제목 없음)"),
                content=event.get("description", ""),
                metadata={
                    "start": start.get("dateTime") or start.get("date"),
                    "end": event.get("end", {}).get("dateTime"),
                    "location": event.get("location", ""),
                    "attendees": [a.get("email") for a in event.get("attendees", [])],
                    "status": event.get("status"),
                },
                raw=event
            ))
        
        return data


class SlackCollector(BaseCollector):
    """Slack 수집기"""
    
    BASE_URL = "https://slack.com/api"
    
    async def collect(self, limit: int = 100) -> List[UnifiedData]:
        """최근 메시지 수집"""
        # 채널 목록
        channels_result = await self._get(f"{self.BASE_URL}/conversations.list")
        channels = channels_result.get("channels", [])
        
        data = []
        
        for channel in channels[:5]:  # 5개 채널만
            # 채널 히스토리
            history = await self._get(
                f"{self.BASE_URL}/conversations.history",
                {"channel": channel["id"], "limit": 20}
            )
            
            for msg in history.get("messages", []):
                if msg.get("subtype"):  # 시스템 메시지 제외
                    continue
                
                data.append(UnifiedData(
                    id=msg.get("ts", ""),
                    type=DataType.MESSAGE,
                    source=OAuthProvider.SLACK,
                    title=f"#{channel['name']}",
                    content=msg.get("text", ""),
                    metadata={
                        "channel": channel["name"],
                        "channel_id": channel["id"],
                        "user": msg.get("user"),
                        "reactions": msg.get("reactions", []),
                    },
                    timestamp=datetime.fromtimestamp(float(msg.get("ts", 0))),
                    raw=msg
                ))
        
        return data


class NotionCollector(BaseCollector):
    """Notion 수집기"""
    
    BASE_URL = "https://api.notion.com/v1"
    
    def __init__(self, token: OAuthToken):
        super().__init__(token)
        self.headers["Notion-Version"] = "2022-06-28"
    
    async def collect(self) -> List[UnifiedData]:
        """페이지/데이터베이스 목록"""
        url = f"{self.BASE_URL}/search"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers=self.headers,
                json={"page_size": 50}
            ) as resp:
                if resp.status != 200:
                    return []
                result = await resp.json()
        
        data = []
        
        for item in result.get("results", []):
            if item["object"] == "page":
                title_prop = item.get("properties", {}).get("title", {})
                title_list = title_prop.get("title", [])
                title = title_list[0].get("plain_text", "") if title_list else "(제목 없음)"
                
                data.append(UnifiedData(
                    id=item["id"],
                    type=DataType.DOCUMENT,
                    source=OAuthProvider.NOTION,
                    title=title,
                    metadata={
                        "url": item.get("url"),
                        "created_time": item.get("created_time"),
                        "last_edited_time": item.get("last_edited_time"),
                    },
                    raw=item
                ))
        
        return data


class GitHubCollector(BaseCollector):
    """GitHub 수집기"""
    
    BASE_URL = "https://api.github.com"
    
    async def collect(self) -> List[UnifiedData]:
        """최근 활동 수집"""
        # 사용자 정보
        user = await self._get(f"{self.BASE_URL}/user")
        username = user.get("login", "")
        
        # 이벤트
        events = await self._get(f"{self.BASE_URL}/users/{username}/events")
        
        data = []
        
        for event in events[:30]:
            data.append(UnifiedData(
                id=event["id"],
                type=DataType.CODE,
                source=OAuthProvider.GITHUB,
                title=f"{event['type']} on {event['repo']['name']}",
                metadata={
                    "type": event["type"],
                    "repo": event["repo"]["name"],
                    "actor": event["actor"]["login"],
                },
                timestamp=datetime.fromisoformat(event["created_at"].replace("Z", "+00:00")),
                raw=event
            ))
        
        return data


class StripeCollector(BaseCollector):
    """Stripe 수집기"""
    
    BASE_URL = "https://api.stripe.com/v1"
    
    async def collect(self) -> List[UnifiedData]:
        """결제 내역 수집"""
        result = await self._get(f"{self.BASE_URL}/charges", {"limit": 50})
        
        data = []
        
        for charge in result.get("data", []):
            data.append(UnifiedData(
                id=charge["id"],
                type=DataType.TRANSACTION,
                source=OAuthProvider.STRIPE,
                title=f"결제 {charge['amount']/100:.0f}원",
                content=charge.get("description", ""),
                metadata={
                    "amount": charge["amount"],
                    "currency": charge["currency"],
                    "status": charge["status"],
                    "customer": charge.get("customer"),
                    "receipt_url": charge.get("receipt_url"),
                },
                timestamp=datetime.fromtimestamp(charge["created"]),
                raw=charge
            ))
        
        return data


# ============================================
# Data Hub (통합)
# ============================================

class DataHub:
    """
    AUTUS 통합 데이터 허브
    
    모든 연동 서비스에서 데이터를 수집하고 통합 형식으로 제공
    """
    
    COLLECTORS = {
        OAuthProvider.GOOGLE: [GmailCollector, GoogleCalendarCollector],
        OAuthProvider.SLACK: [SlackCollector],
        OAuthProvider.NOTION: [NotionCollector],
        OAuthProvider.GITHUB: [GitHubCollector],
        OAuthProvider.STRIPE: [StripeCollector],
    }
    
    def __init__(self, oauth_manager: OAuthManager):
        self.oauth = oauth_manager
        self.cache: Dict[str, List[UnifiedData]] = {}  # user_id -> data
        self.last_sync: Dict[str, datetime] = {}
    
    async def collect_all(self, user_id: str) -> List[UnifiedData]:
        """모든 연동 서비스에서 데이터 수집"""
        providers = self.oauth.get_connected_providers(user_id)
        
        all_data = []
        tasks = []
        
        for provider in providers:
            if provider in self.COLLECTORS:
                token = await self.oauth.get_token(user_id, provider)
                if token:
                    for collector_class in self.COLLECTORS[provider]:
                        collector = collector_class(token)
                        tasks.append(collector.collect())
        
        # 병렬 수집
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_data.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Collection error: {result}")
        
        # 캐시 저장
        self.cache[user_id] = all_data
        self.last_sync[user_id] = datetime.utcnow()
        
        return all_data
    
    async def collect_by_provider(
        self, 
        user_id: str, 
        provider: OAuthProvider
    ) -> List[UnifiedData]:
        """특정 서비스에서만 데이터 수집"""
        token = await self.oauth.get_token(user_id, provider)
        if not token:
            return []
        
        if provider not in self.COLLECTORS:
            return []
        
        all_data = []
        
        for collector_class in self.COLLECTORS[provider]:
            collector = collector_class(token)
            try:
                data = await collector.collect()
                all_data.extend(data)
            except Exception as e:
                logger.error(f"Collection error for {provider}: {e}")
        
        return all_data
    
    async def collect_by_type(
        self, 
        user_id: str, 
        data_type: DataType
    ) -> List[UnifiedData]:
        """특정 타입의 데이터만 수집"""
        all_data = await self.collect_all(user_id)
        return [d for d in all_data if d.type == data_type]
    
    def get_cached(self, user_id: str) -> List[UnifiedData]:
        """캐시된 데이터 반환"""
        return self.cache.get(user_id, [])
    
    def search(
        self, 
        user_id: str, 
        query: str,
        data_type: DataType = None
    ) -> List[UnifiedData]:
        """데이터 검색"""
        data = self.cache.get(user_id, [])
        
        if data_type:
            data = [d for d in data if d.type == data_type]
        
        query_lower = query.lower()
        return [
            d for d in data 
            if query_lower in d.title.lower() or query_lower in d.content.lower()
        ]
    
    def get_summary(self, user_id: str) -> Dict[str, Any]:
        """데이터 요약"""
        data = self.cache.get(user_id, [])
        
        by_type = {}
        by_source = {}
        
        for d in data:
            by_type[d.type.value] = by_type.get(d.type.value, 0) + 1
            by_source[d.source.value] = by_source.get(d.source.value, 0) + 1
        
        return {
            "total": len(data),
            "by_type": by_type,
            "by_source": by_source,
            "last_sync": self.last_sync.get(user_id),
        }


# ============================================
# Singleton
# ============================================

_data_hub: Optional[DataHub] = None

def get_data_hub() -> DataHub:
    global _data_hub
    if _data_hub is None:
        oauth = get_oauth_manager()
        _data_hub = DataHub(oauth)
    return _data_hub
