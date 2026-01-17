# ═══════════════════════════════════════════════════════════════════════════════
#
#                     AUTUS OAuth 데이터 수집기
#                     
#                     Part 1: 기본 클래스 + Gmail 수집기
#
# ═══════════════════════════════════════════════════════════════════════════════

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import aiohttp
import json
import base64
import hashlib
from urllib.parse import urlencode, parse_qs

# ═══════════════════════════════════════════════════════════════════════════════
# 공통 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

class DataSourceType(str, Enum):
    GMAIL = "gmail"
    CALENDAR = "calendar"
    SLACK = "slack"
    GITHUB = "github"
    NOTION = "notion"
    
class SyncStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    IN_PROGRESS = "IN_PROGRESS"


@dataclass
class OAuthTokens:
    """OAuth 토큰 저장"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    token_type: str = "Bearer"
    scope: Optional[str] = None
    
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.now() >= self.expires_at - timedelta(minutes=5)


@dataclass
class CollectedData:
    """수집된 데이터"""
    source: DataSourceType
    raw_data: Dict[str, Any]
    node_mappings: Dict[str, float]  # node_id -> value contribution
    slot_mappings: Dict[str, Any]    # slot_id -> relation data
    collected_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NodeContribution:
    """노드 기여도"""
    node_id: str
    value: float          # -1 ~ +1
    weight: float         # 0 ~ 1
    source: str
    raw_metric: Any
    confidence: float = 0.8


# ═══════════════════════════════════════════════════════════════════════════════
# 기본 수집기 클래스
# ═══════════════════════════════════════════════════════════════════════════════

class BaseCollector(ABC):
    """모든 OAuth 수집기의 기본 클래스"""
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        tokens: Optional[OAuthTokens] = None
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.tokens = tokens
        self._session: Optional[aiohttp.ClientSession] = None
    
    @property
    @abstractmethod
    def source_type(self) -> DataSourceType:
        """수집기 타입"""
        pass
    
    @property
    @abstractmethod
    def auth_url(self) -> str:
        """OAuth 인증 URL"""
        pass
    
    @property
    @abstractmethod
    def token_url(self) -> str:
        """토큰 교환 URL"""
        pass
    
    @property
    @abstractmethod
    def scopes(self) -> List[str]:
        """필요한 OAuth 스코프"""
        pass
    
    @abstractmethod
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """원본 데이터 수집"""
        pass
    
    @abstractmethod
    def map_to_nodes(self, data: List[Dict[str, Any]]) -> List[NodeContribution]:
        """48노드로 매핑"""
        pass
    
    @abstractmethod
    def map_to_slots(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """144슬롯으로 매핑"""
        pass
    
    # ─────────────────────────────────────────────────────────────────────────
    # OAuth 플로우
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """OAuth 인증 URL 생성"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "response_type": "code",
            "access_type": "offline",  # refresh_token 받기
            "prompt": "consent",
        }
        if state:
            params["state"] = state
        
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> OAuthTokens:
        """인증 코드 → 토큰 교환"""
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "redirect_uri": self.redirect_uri,
                "grant_type": "authorization_code",
            }
            
            async with session.post(self.token_url, data=data) as response:
                if response.status != 200:
                    error = await response.text()
                    raise Exception(f"Token exchange failed: {error}")
                
                result = await response.json()
                
                expires_at = None
                if "expires_in" in result:
                    expires_at = datetime.now() + timedelta(seconds=result["expires_in"])
                
                self.tokens = OAuthTokens(
                    access_token=result["access_token"],
                    refresh_token=result.get("refresh_token"),
                    expires_at=expires_at,
                    token_type=result.get("token_type", "Bearer"),
                    scope=result.get("scope"),
                )
                
                return self.tokens
    
    async def refresh_access_token(self) -> OAuthTokens:
        """토큰 갱신"""
        if not self.tokens or not self.tokens.refresh_token:
            raise Exception("No refresh token available")
        
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.tokens.refresh_token,
                "grant_type": "refresh_token",
            }
            
            async with session.post(self.token_url, data=data) as response:
                if response.status != 200:
                    error = await response.text()
                    raise Exception(f"Token refresh failed: {error}")
                
                result = await response.json()
                
                expires_at = None
                if "expires_in" in result:
                    expires_at = datetime.now() + timedelta(seconds=result["expires_in"])
                
                self.tokens = OAuthTokens(
                    access_token=result["access_token"],
                    refresh_token=result.get("refresh_token", self.tokens.refresh_token),
                    expires_at=expires_at,
                    token_type=result.get("token_type", "Bearer"),
                    scope=result.get("scope"),
                )
                
                return self.tokens
    
    async def ensure_valid_token(self) -> str:
        """유효한 토큰 보장"""
        if not self.tokens:
            raise Exception("Not authenticated")
        
        if self.tokens.is_expired():
            await self.refresh_access_token()
        
        return self.tokens.access_token
    
    # ─────────────────────────────────────────────────────────────────────────
    # HTTP 헬퍼
    # ─────────────────────────────────────────────────────────────────────────
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if not self._session or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def _api_request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Dict[str, Any]:
        """인증된 API 요청"""
        token = await self.ensure_valid_token()
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        
        session = await self._get_session()
        async with session.request(method, url, headers=headers, **kwargs) as response:
            if response.status == 401:
                # 토큰 만료 → 갱신 후 재시도
                await self.refresh_access_token()
                token = self.tokens.access_token
                headers["Authorization"] = f"Bearer {token}"
                async with session.request(method, url, headers=headers, **kwargs) as retry_response:
                    retry_response.raise_for_status()
                    return await retry_response.json()
            
            response.raise_for_status()
            return await response.json()
    
    # ─────────────────────────────────────────────────────────────────────────
    # 수집 실행
    # ─────────────────────────────────────────────────────────────────────────
    
    async def collect(self, since: Optional[datetime] = None) -> CollectedData:
        """전체 수집 프로세스 실행"""
        # 1. 원본 데이터 수집
        raw_data = await self.fetch_data(since)
        
        # 2. 노드 매핑
        node_contributions = self.map_to_nodes(raw_data)
        node_mappings = {}
        for contrib in node_contributions:
            if contrib.node_id not in node_mappings:
                node_mappings[contrib.node_id] = 0
            node_mappings[contrib.node_id] += contrib.value * contrib.weight
        
        # 3. 슬롯 매핑
        slot_mappings = self.map_to_slots(raw_data)
        
        return CollectedData(
            source=self.source_type,
            raw_data={"items": raw_data, "count": len(raw_data)},
            node_mappings=node_mappings,
            slot_mappings=slot_mappings,
            metadata={
                "since": since.isoformat() if since else None,
                "collected_count": len(raw_data),
            }
        )
    
    async def close(self):
        """세션 정리"""
        if self._session and not self._session.closed:
            await self._session.close()


# ═══════════════════════════════════════════════════════════════════════════════
# Gmail 수집기
# ═══════════════════════════════════════════════════════════════════════════════

class GmailCollector(BaseCollector):
    """
    Gmail 데이터 수집기
    
    수집 데이터:
        - 이메일 메타데이터 (발신자, 수신자, 시간, 라벨)
        - 응답 시간 통계
        - 스레드 활동
    
    노드 매핑:
        - TIME_D: 이메일 응답 시간
        - TIME_E: 이메일 처리 효율
        - NET_A: 연락처 네트워크
        - NET_D: 네트워크 활동 변화
        - WORK_D: 업무 이메일 활동
    
    슬롯 매핑:
        - 발신자/수신자 → COLLEAGUE, CLIENT, PARTNER 등
    """
    
    GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"
    
    @property
    def source_type(self) -> DataSourceType:
        return DataSourceType.GMAIL
    
    @property
    def auth_url(self) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth"
    
    @property
    def token_url(self) -> str:
        return "https://oauth2.googleapis.com/token"
    
    @property
    def scopes(self) -> List[str]:
        return [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.metadata",
        ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Gmail 이메일 수집"""
        messages = []
        
        # 쿼리 구성
        query_parts = []
        if since:
            # Gmail은 epoch seconds 사용
            query_parts.append(f"after:{int(since.timestamp())}")
        
        query = " ".join(query_parts) if query_parts else None
        
        # 메시지 목록 가져오기 (페이지네이션)
        page_token = None
        max_results = 100
        total_fetched = 0
        max_total = 500  # 최대 500개
        
        while total_fetched < max_total:
            params = {"maxResults": min(max_results, max_total - total_fetched)}
            if query:
                params["q"] = query
            if page_token:
                params["pageToken"] = page_token
            
            url = f"{self.GMAIL_API_BASE}/users/me/messages"
            result = await self._api_request("GET", url, params=params)
            
            message_ids = result.get("messages", [])
            if not message_ids:
                break
            
            # 각 메시지 상세 가져오기 (배치로 최적화 가능)
            for msg_ref in message_ids:
                msg_detail = await self._get_message_detail(msg_ref["id"])
                if msg_detail:
                    messages.append(msg_detail)
            
            total_fetched += len(message_ids)
            page_token = result.get("nextPageToken")
            
            if not page_token:
                break
        
        return messages
    
    async def _get_message_detail(self, message_id: str) -> Optional[Dict[str, Any]]:
        """개별 메시지 상세 조회"""
        url = f"{self.GMAIL_API_BASE}/users/me/messages/{message_id}"
        params = {"format": "metadata", "metadataHeaders": ["From", "To", "Subject", "Date"]}
        
        try:
            result = await self._api_request("GET", url, params=params)
            
            # 헤더 파싱
            headers = {}
            for header in result.get("payload", {}).get("headers", []):
                headers[header["name"].lower()] = header["value"]
            
            return {
                "id": result["id"],
                "thread_id": result["threadId"],
                "label_ids": result.get("labelIds", []),
                "snippet": result.get("snippet", ""),
                "internal_date": int(result.get("internalDate", 0)),
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", ""),
                "date": headers.get("date", ""),
                "size_estimate": result.get("sizeEstimate", 0),
            }
        except Exception as e:
            print(f"Failed to fetch message {message_id}: {e}")
            return None
    
    async def get_threads(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """스레드 목록 조회 (응답 시간 계산용)"""
        threads = []
        
        query = f"after:{int(since.timestamp())}" if since else None
        
        params = {"maxResults": 50}
        if query:
            params["q"] = query
        
        url = f"{self.GMAIL_API_BASE}/users/me/threads"
        result = await self._api_request("GET", url, params=params)
        
        for thread_ref in result.get("threads", []):
            thread_detail = await self._get_thread_detail(thread_ref["id"])
            if thread_detail:
                threads.append(thread_detail)
        
        return threads
    
    async def _get_thread_detail(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """스레드 상세 조회"""
        url = f"{self.GMAIL_API_BASE}/users/me/threads/{thread_id}"
        params = {"format": "metadata"}
        
        try:
            result = await self._api_request("GET", url, params=params)
            
            messages = result.get("messages", [])
            
            return {
                "id": result["id"],
                "message_count": len(messages),
                "messages": [
                    {
                        "id": m["id"],
                        "internal_date": int(m.get("internalDate", 0)),
                        "label_ids": m.get("labelIds", []),
                    }
                    for m in messages
                ]
            }
        except:
            return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_nodes(self, data: List[Dict[str, Any]]) -> List[NodeContribution]:
        """이메일 데이터 → 48노드 매핑"""
        contributions = []
        
        if not data:
            return contributions
        
        # 1. 이메일 수량 분석
        total_emails = len(data)
        
        # 라벨별 분류
        inbox_count = sum(1 for m in data if "INBOX" in m.get("label_ids", []))
        sent_count = sum(1 for m in data if "SENT" in m.get("label_ids", []))
        unread_count = sum(1 for m in data if "UNREAD" in m.get("label_ids", []))
        
        # 2. 응답 시간 계산 (단순화)
        # 실제로는 스레드 분석 필요
        avg_response_hours = 4.0  # 기본값
        
        # 3. 네트워크 분석
        unique_contacts = set()
        for m in data:
            from_addr = self._extract_email(m.get("from", ""))
            to_addrs = self._extract_emails(m.get("to", ""))
            if from_addr:
                unique_contacts.add(from_addr)
            unique_contacts.update(to_addrs)
        
        network_size = len(unique_contacts)
        
        # 4. 노드 기여도 계산
        
        # TIME_D: 이메일 활동량 변화 (많으면 +, 적으면 -)
        # 기준: 하루 20개 = 정상
        daily_avg = total_emails / 7  # 주간 데이터 가정
        time_d_value = min(1.0, max(-1.0, (daily_avg - 20) / 30))
        contributions.append(NodeContribution(
            node_id="TIME_D",
            value=time_d_value,
            weight=0.3,
            source="gmail",
            raw_metric={"daily_avg": daily_avg},
            confidence=0.7
        ))
        
        # TIME_E: 이메일 처리 효율 (읽지 않은 비율이 낮으면 +)
        unread_ratio = unread_count / max(inbox_count, 1)
        time_e_value = 1.0 - (unread_ratio * 2)  # 0% 미읽음 = +1, 50% 미읽음 = 0
        contributions.append(NodeContribution(
            node_id="TIME_E",
            value=max(-1.0, min(1.0, time_e_value)),
            weight=0.25,
            source="gmail",
            raw_metric={"unread_ratio": unread_ratio},
            confidence=0.75
        ))
        
        # NET_A: 네트워크 크기 (연락처 수)
        # 기준: 50명 = 0, 100명 = +0.5, 200명 = +1
        net_a_value = min(1.0, (network_size - 50) / 150)
        contributions.append(NodeContribution(
            node_id="NET_A",
            value=net_a_value,
            weight=0.2,
            source="gmail",
            raw_metric={"unique_contacts": network_size},
            confidence=0.8
        ))
        
        # NET_D: 네트워크 활동 (발신 비율)
        sent_ratio = sent_count / max(total_emails, 1)
        # 30% 발신 = 균형 = 0, 50% = +0.5, 10% = -0.5
        net_d_value = (sent_ratio - 0.3) * 2.5
        contributions.append(NodeContribution(
            node_id="NET_D",
            value=max(-1.0, min(1.0, net_d_value)),
            weight=0.2,
            source="gmail",
            raw_metric={"sent_ratio": sent_ratio},
            confidence=0.7
        ))
        
        # WORK_D: 업무 이메일 활동
        # CATEGORY_PROMOTIONS, CATEGORY_SOCIAL 제외한 비율
        work_labels = {"INBOX", "SENT", "IMPORTANT", "STARRED"}
        work_count = sum(
            1 for m in data 
            if any(l in work_labels for l in m.get("label_ids", []))
            and "CATEGORY_PROMOTIONS" not in m.get("label_ids", [])
            and "CATEGORY_SOCIAL" not in m.get("label_ids", [])
        )
        work_ratio = work_count / max(total_emails, 1)
        work_d_value = (work_ratio - 0.5) * 2  # 50% = 0, 100% = +1
        contributions.append(NodeContribution(
            node_id="WORK_D",
            value=max(-1.0, min(1.0, work_d_value)),
            weight=0.25,
            source="gmail",
            raw_metric={"work_ratio": work_ratio},
            confidence=0.65
        ))
        
        return contributions
    
    # ─────────────────────────────────────────────────────────────────────────
    # 슬롯 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_slots(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """이메일 데이터 → 144슬롯 매핑"""
        # 연락처별 상호작용 집계
        contact_interactions: Dict[str, Dict] = {}
        
        for m in data:
            from_addr = self._extract_email(m.get("from", ""))
            to_addrs = self._extract_emails(m.get("to", ""))
            timestamp = m.get("internal_date", 0)
            
            # 발신자 집계
            if from_addr:
                if from_addr not in contact_interactions:
                    contact_interactions[from_addr] = {
                        "email": from_addr,
                        "name": self._extract_name(m.get("from", "")),
                        "received_count": 0,
                        "sent_count": 0,
                        "last_interaction": 0,
                    }
                contact_interactions[from_addr]["received_count"] += 1
                contact_interactions[from_addr]["last_interaction"] = max(
                    contact_interactions[from_addr]["last_interaction"],
                    timestamp
                )
            
            # 수신자 집계
            for addr in to_addrs:
                if addr not in contact_interactions:
                    contact_interactions[addr] = {
                        "email": addr,
                        "name": "",
                        "received_count": 0,
                        "sent_count": 0,
                        "last_interaction": 0,
                    }
                contact_interactions[addr]["sent_count"] += 1
                contact_interactions[addr]["last_interaction"] = max(
                    contact_interactions[addr]["last_interaction"],
                    timestamp
                )
        
        # 상호작용 점수 계산 및 정렬
        for email, data in contact_interactions.items():
            total = data["received_count"] + data["sent_count"]
            # 양방향 비율 (균형잡힌 관계가 높은 점수)
            if total > 0:
                balance = 1 - abs(data["received_count"] - data["sent_count"]) / total
            else:
                balance = 0
            data["interaction_score"] = total * (0.5 + balance * 0.5)
            data["total_interactions"] = total
        
        # 상위 연락처 추출 (슬롯 후보)
        sorted_contacts = sorted(
            contact_interactions.values(),
            key=lambda x: x["interaction_score"],
            reverse=True
        )[:50]  # 상위 50명
        
        # 관계 유형 추론 (도메인 기반 휴리스틱)
        slot_candidates = []
        for contact in sorted_contacts:
            email = contact["email"]
            relation_type = self._infer_relation_type(email)
            
            # I-score 계산 (상호작용 기반)
            i_score = min(1.0, contact["interaction_score"] / 100)
            
            slot_candidates.append({
                "email": email,
                "name": contact.get("name", ""),
                "relation_type": relation_type,
                "i_score": i_score,
                "interaction_count": contact["total_interactions"],
                "last_interaction": datetime.fromtimestamp(
                    contact["last_interaction"] / 1000
                ).isoformat() if contact["last_interaction"] else None,
            })
        
        return {
            "candidates": slot_candidates,
            "total_contacts": len(contact_interactions),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 헬퍼 메서드
    # ─────────────────────────────────────────────────────────────────────────
    
    def _extract_email(self, header: str) -> Optional[str]:
        """이메일 주소 추출: 'Name <email@domain.com>' → 'email@domain.com'"""
        if "<" in header and ">" in header:
            start = header.index("<") + 1
            end = header.index(">")
            return header[start:end].lower().strip()
        elif "@" in header:
            return header.lower().strip()
        return None
    
    def _extract_emails(self, header: str) -> List[str]:
        """여러 이메일 주소 추출"""
        emails = []
        for part in header.split(","):
            email = self._extract_email(part.strip())
            if email:
                emails.append(email)
        return emails
    
    def _extract_name(self, header: str) -> str:
        """이름 추출: 'Name <email@domain.com>' → 'Name'"""
        if "<" in header:
            return header[:header.index("<")].strip().strip('"')
        return ""
    
    def _infer_relation_type(self, email: str) -> str:
        """이메일 도메인으로 관계 유형 추론"""
        domain = email.split("@")[-1].lower() if "@" in email else ""
        
        # 회사 도메인 (설정 가능)
        company_domains = ["mycompany.com", "company.co.kr"]
        
        if domain in company_domains:
            return "COLLEAGUE"
        elif domain in ["gmail.com", "yahoo.com", "hotmail.com", "naver.com", "daum.net"]:
            return "ACQUAINTANCE"  # 개인 이메일
        elif domain.endswith(".edu") or domain.endswith(".ac.kr"):
            return "COMMUNITY"  # 학교
        elif domain.endswith(".gov") or domain.endswith(".go.kr"):
            return "OTHER"  # 정부
        else:
            return "CLIENT"  # 기업 도메인은 일단 고객으로


# ═══════════════════════════════════════════════════════════════════════════════
# Gmail 수집기 사용 예시
# ═══════════════════════════════════════════════════════════════════════════════

"""
# 1. 초기화
collector = GmailCollector(
    client_id="your-client-id",
    client_secret="your-client-secret",
    redirect_uri="http://localhost:8000/auth/callback/gmail"
)

# 2. OAuth URL 생성 (프론트엔드에서 리다이렉트)
auth_url = collector.get_authorization_url(state="random-state")
# → 사용자가 Google 로그인 → 콜백으로 code 받음

# 3. 토큰 교환 (콜백에서)
tokens = await collector.exchange_code(code="received-code")

# 4. 데이터 수집
since = datetime.now() - timedelta(days=7)
collected = await collector.collect(since=since)

print(f"Collected {collected.metadata['collected_count']} emails")
print(f"Node mappings: {collected.node_mappings}")
print(f"Slot candidates: {len(collected.slot_mappings['candidates'])}")

# 5. 정리
await collector.close()
"""
