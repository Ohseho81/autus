# ═══════════════════════════════════════════════════════════════════════════════
#
#                     AUTUS OAuth 데이터 수집기
#                     
#                     Part 3: Slack 수집기
#
# ═══════════════════════════════════════════════════════════════════════════════

from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timedelta
from collections import defaultdict

from .gmail_collector import (
    BaseCollector, 
    DataSourceType, 
    NodeContribution,
    OAuthTokens
)


class SlackCollector(BaseCollector):
    """
    Slack 데이터 수집기
    
    수집 데이터:
        - 채널 목록 및 활동
        - 메시지 (DM, 채널)
        - 리액션
        - 멘션
        - 사용자 프로필
    
    노드 매핑:
        - NET_A: 팀 네트워크 크기
        - NET_D: 커뮤니케이션 활동 변화
        - NET_E: 커뮤니케이션 효율
        - TEAM_A: 팀 협업 수준
        - TEAM_D: 팀 활동 변화
        - WORK_D: 업무 관련 소통
    
    슬롯 매핑:
        - 채널 멤버, DM 상대 → COLLEAGUE, PARTNER, TEAM
    """
    
    SLACK_API_BASE = "https://slack.com/api"
    
    @property
    def source_type(self) -> DataSourceType:
        return DataSourceType.SLACK
    
    @property
    def auth_url(self) -> str:
        return "https://slack.com/oauth/v2/authorize"
    
    @property
    def token_url(self) -> str:
        return "https://slack.com/api/oauth.v2.access"
    
    @property
    def scopes(self) -> List[str]:
        return [
            "channels:history",
            "channels:read",
            "groups:history",
            "groups:read",
            "im:history",
            "im:read",
            "mpim:history",
            "mpim:read",
            "reactions:read",
            "users:read",
            "users:read.email",
            "team:read",
        ]
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """Slack OAuth URL (형식이 약간 다름)"""
        from urllib.parse import urlencode
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(self.scopes),  # Slack은 쉼표로 구분
        }
        if state:
            params["state"] = state
        
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def exchange_code(self, code: str) -> OAuthTokens:
        """Slack 토큰 교환 (형식이 다름)"""
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "redirect_uri": self.redirect_uri,
            }
            
            async with session.post(self.token_url, data=data) as response:
                result = await response.json()
                
                if not result.get("ok"):
                    raise Exception(f"Slack auth failed: {result.get('error')}")
                
                # Slack은 authed_user.access_token 또는 access_token
                access_token = result.get("access_token")
                if not access_token:
                    authed_user = result.get("authed_user", {})
                    access_token = authed_user.get("access_token")
                
                self.tokens = OAuthTokens(
                    access_token=access_token,
                    refresh_token=result.get("refresh_token"),
                    token_type="Bearer",
                    scope=result.get("scope"),
                )
                
                # 팀 정보 저장
                self._team_id = result.get("team", {}).get("id")
                self._user_id = result.get("authed_user", {}).get("id")
                
                return self.tokens
    
    async def _slack_api(self, method: str, **params) -> Dict[str, Any]:
        """Slack API 호출"""
        token = await self.ensure_valid_token()
        
        session = await self._get_session()
        url = f"{self.SLACK_API_BASE}/{method}"
        headers = {"Authorization": f"Bearer {token}"}
        
        async with session.get(url, headers=headers, params=params) as response:
            result = await response.json()
            
            if not result.get("ok"):
                error = result.get("error", "Unknown error")
                if error == "token_expired":
                    await self.refresh_access_token()
                    return await self._slack_api(method, **params)
                raise Exception(f"Slack API error: {error}")
            
            return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    async def fetch_data(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Slack 데이터 수집"""
        data = {
            "channels": [],
            "messages": [],
            "users": {},
            "reactions": [],
        }
        
        # 기본: 최근 7일
        if not since:
            since = datetime.now() - timedelta(days=7)
        
        oldest = str(since.timestamp())
        
        # 1. 사용자 목록
        users = await self._get_users()
        data["users"] = {u["id"]: u for u in users}
        
        # 2. 채널 목록
        channels = await self._get_channels()
        data["channels"] = channels
        
        # 3. 각 채널의 메시지
        for channel in channels[:20]:  # 상위 20개 채널만
            try:
                messages = await self._get_channel_messages(
                    channel["id"], 
                    oldest=oldest,
                    limit=100
                )
                
                for msg in messages:
                    msg["channel_id"] = channel["id"]
                    msg["channel_name"] = channel.get("name", "")
                    data["messages"].append(msg)
            except Exception as e:
                print(f"Failed to get messages for {channel['id']}: {e}")
        
        # 4. DM 채널
        dm_channels = await self._get_dm_channels()
        for dm in dm_channels[:10]:  # 상위 10개 DM만
            try:
                messages = await self._get_channel_messages(
                    dm["id"],
                    oldest=oldest,
                    limit=50
                )
                
                for msg in messages:
                    msg["channel_id"] = dm["id"]
                    msg["channel_type"] = "dm"
                    msg["dm_user"] = dm.get("user")
                    data["messages"].append(msg)
            except Exception as e:
                print(f"Failed to get DM messages: {e}")
        
        return [data]  # 단일 객체로 반환
    
    async def _get_users(self) -> List[Dict[str, Any]]:
        """사용자 목록"""
        result = await self._slack_api("users.list", limit=200)
        return result.get("members", [])
    
    async def _get_channels(self) -> List[Dict[str, Any]]:
        """채널 목록"""
        result = await self._slack_api(
            "conversations.list",
            types="public_channel,private_channel",
            limit=100
        )
        return result.get("channels", [])
    
    async def _get_dm_channels(self) -> List[Dict[str, Any]]:
        """DM 채널 목록"""
        result = await self._slack_api(
            "conversations.list",
            types="im",
            limit=50
        )
        return result.get("channels", [])
    
    async def _get_channel_messages(
        self, 
        channel_id: str, 
        oldest: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """채널 메시지 조회"""
        params = {"channel": channel_id, "limit": limit}
        if oldest:
            params["oldest"] = oldest
        
        result = await self._slack_api("conversations.history", **params)
        return result.get("messages", [])
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_nodes(self, data: List[Dict[str, Any]]) -> List[NodeContribution]:
        """Slack 데이터 → 48노드 매핑"""
        contributions = []
        
        if not data or not data[0]:
            return contributions
        
        slack_data = data[0]
        messages = slack_data.get("messages", [])
        users = slack_data.get("users", {})
        channels = slack_data.get("channels", [])
        
        if not messages:
            return contributions
        
        # 분석
        my_user_id = getattr(self, "_user_id", None)
        
        # 메시지 분류
        sent_count = sum(1 for m in messages if m.get("user") == my_user_id)
        received_count = len(messages) - sent_count
        total_messages = len(messages)
        
        # 참여 채널 수
        active_channels = set(m.get("channel_id") for m in messages)
        
        # 멘션 분석
        mention_count = sum(
            1 for m in messages 
            if my_user_id and f"<@{my_user_id}>" in m.get("text", "")
        )
        
        # 리액션 분석
        reaction_given = sum(
            len(m.get("reactions", [])) 
            for m in messages 
            if m.get("user") == my_user_id
        )
        reaction_received = sum(
            sum(r.get("count", 0) for r in m.get("reactions", []))
            for m in messages
            if m.get("user") == my_user_id
        )
        
        # 응답 시간 분석 (스레드 기반)
        thread_messages = [m for m in messages if m.get("thread_ts")]
        
        # 상호작용 사용자 수
        interacted_users = set()
        for m in messages:
            user = m.get("user")
            if user and user != my_user_id:
                interacted_users.add(user)
        
        # 1. NET_A: 팀 네트워크 크기
        team_size = len([u for u in users.values() if not u.get("is_bot")])
        active_ratio = len(interacted_users) / max(team_size, 1)
        net_a_value = min(1.0, active_ratio * 2)  # 50% 활성 = +1
        
        contributions.append(NodeContribution(
            node_id="NET_A",
            value=net_a_value,
            weight=0.25,
            source="slack",
            raw_metric={
                "team_size": team_size,
                "interacted_users": len(interacted_users),
                "active_ratio": active_ratio
            },
            confidence=0.8
        ))
        
        # 2. NET_D: 커뮤니케이션 활동 변화
        # 일평균 메시지 수 기준 (기준: 20개/일)
        days = 7  # 수집 기간
        daily_messages = total_messages / days
        net_d_value = min(1.0, max(-1.0, (daily_messages - 20) / 30))
        
        contributions.append(NodeContribution(
            node_id="NET_D",
            value=net_d_value,
            weight=0.2,
            source="slack",
            raw_metric={"daily_messages": daily_messages},
            confidence=0.75
        ))
        
        # 3. NET_E: 커뮤니케이션 효율 (보내기/받기 균형)
        if total_messages > 0:
            balance = 1 - abs(sent_count - received_count) / total_messages
        else:
            balance = 0.5
        net_e_value = balance * 2 - 1  # 0.5 균형 = 0
        
        contributions.append(NodeContribution(
            node_id="NET_E",
            value=net_e_value,
            weight=0.2,
            source="slack",
            raw_metric={
                "sent": sent_count,
                "received": received_count,
                "balance": balance
            },
            confidence=0.7
        ))
        
        # 4. TEAM_A: 팀 협업 수준 (채널 참여도)
        total_channels = len(channels)
        channel_participation = len(active_channels) / max(total_channels, 1)
        team_a_value = min(1.0, channel_participation * 2)
        
        contributions.append(NodeContribution(
            node_id="TEAM_A",
            value=team_a_value,
            weight=0.25,
            source="slack",
            raw_metric={
                "active_channels": len(active_channels),
                "total_channels": total_channels
            },
            confidence=0.75
        ))
        
        # 5. TEAM_D: 팀 활동 변화 (멘션 기반)
        # 멘션 많으면 중요한 사람 = +
        mention_ratio = mention_count / max(total_messages, 1)
        team_d_value = min(1.0, mention_ratio * 10)  # 10% 멘션 = +1
        
        contributions.append(NodeContribution(
            node_id="TEAM_D",
            value=team_d_value,
            weight=0.2,
            source="slack",
            raw_metric={"mention_ratio": mention_ratio},
            confidence=0.65
        ))
        
        # 6. WORK_D: 업무 관련 소통 (리액션 참여)
        reaction_activity = (reaction_given + reaction_received) / max(total_messages, 1)
        work_d_value = min(1.0, reaction_activity * 5)  # 20% 리액션 = +1
        
        contributions.append(NodeContribution(
            node_id="WORK_D",
            value=work_d_value,
            weight=0.15,
            source="slack",
            raw_metric={
                "reaction_given": reaction_given,
                "reaction_received": reaction_received
            },
            confidence=0.6
        ))
        
        return contributions
    
    # ─────────────────────────────────────────────────────────────────────────
    # 슬롯 매핑
    # ─────────────────────────────────────────────────────────────────────────
    
    def map_to_slots(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Slack 데이터 → 144슬롯 매핑"""
        if not data or not data[0]:
            return {"candidates": [], "total_users": 0}
        
        slack_data = data[0]
        messages = slack_data.get("messages", [])
        users = slack_data.get("users", {})
        
        my_user_id = getattr(self, "_user_id", None)
        
        # 사용자별 상호작용 집계
        user_interactions: Dict[str, Dict] = {}
        
        for msg in messages:
            user_id = msg.get("user")
            if not user_id or user_id == my_user_id:
                continue
            
            if user_id not in user_interactions:
                user_info = users.get(user_id, {})
                user_interactions[user_id] = {
                    "user_id": user_id,
                    "name": user_info.get("real_name", user_info.get("name", "")),
                    "email": user_info.get("profile", {}).get("email", ""),
                    "is_bot": user_info.get("is_bot", False),
                    "message_count": 0,
                    "mention_count": 0,
                    "reaction_count": 0,
                    "last_interaction": None,
                    "channels": set(),
                }
            
            user_interactions[user_id]["message_count"] += 1
            
            # 채널 추적
            channel_id = msg.get("channel_id")
            if channel_id:
                user_interactions[user_id]["channels"].add(channel_id)
            
            # 멘션 체크
            text = msg.get("text", "")
            if my_user_id and f"<@{my_user_id}>" in text:
                user_interactions[user_id]["mention_count"] += 1
            
            # 리액션 체크
            for reaction in msg.get("reactions", []):
                if my_user_id in reaction.get("users", []):
                    user_interactions[user_id]["reaction_count"] += 1
            
            # 마지막 상호작용
            ts = msg.get("ts")
            if ts:
                try:
                    msg_time = datetime.fromtimestamp(float(ts))
                    if not user_interactions[user_id]["last_interaction"]:
                        user_interactions[user_id]["last_interaction"] = msg_time
                    else:
                        user_interactions[user_id]["last_interaction"] = max(
                            user_interactions[user_id]["last_interaction"],
                            msg_time
                        )
                except:
                    pass
        
        # 점수 계산
        for user_id, data in user_interactions.items():
            # 봇 제외
            if data["is_bot"]:
                data["interaction_score"] = 0
                continue
            
            # 점수 = 메시지 + 멘션×3 + 리액션×2 + 채널수×5
            data["interaction_score"] = (
                data["message_count"] +
                data["mention_count"] * 3 +
                data["reaction_count"] * 2 +
                len(data["channels"]) * 5
            )
            data["channels"] = list(data["channels"])  # set → list
        
        # 정렬 (봇 제외)
        sorted_users = sorted(
            [u for u in user_interactions.values() if not u["is_bot"]],
            key=lambda x: x["interaction_score"],
            reverse=True
        )[:50]
        
        # 슬롯 후보 생성
        slot_candidates = []
        for user in sorted_users:
            # 관계 유형 추론
            relation_type = self._infer_relation_type(user)
            
            # I-score
            i_score = min(1.0, user["interaction_score"] / 100)
            
            slot_candidates.append({
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user.get("email", ""),
                "relation_type": relation_type,
                "i_score": i_score,
                "interaction_count": user["message_count"],
                "mention_count": user["mention_count"],
                "shared_channels": len(user["channels"]),
                "last_interaction": user["last_interaction"].isoformat() if user["last_interaction"] else None,
            })
        
        return {
            "candidates": slot_candidates,
            "total_users": len(user_interactions),
        }
    
    def _infer_relation_type(self, user_data: Dict) -> str:
        """사용자 데이터로 관계 유형 추론"""
        # 공유 채널 수 기반
        shared_channels = len(user_data.get("channels", []))
        mention_count = user_data.get("mention_count", 0)
        
        if shared_channels >= 5:
            return "COLLEAGUE"  # 많은 채널 공유 = 동료
        elif mention_count >= 3:
            return "PARTNER"  # 자주 멘션 = 파트너
        elif shared_channels >= 2:
            return "TEAM"  # 약간의 채널 공유 = 팀
        else:
            return "ACQUAINTANCE"  # 기타


# ═══════════════════════════════════════════════════════════════════════════════
# Slack 실시간 이벤트 (Socket Mode)
# ═══════════════════════════════════════════════════════════════════════════════

class SlackRealtimeListener:
    """
    Slack Socket Mode를 통한 실시간 이벤트 수신
    
    사용 시 app_token (xapp-) 필요
    """
    
    def __init__(self, app_token: str, bot_token: str):
        self.app_token = app_token
        self.bot_token = bot_token
        self._handlers: Dict[str, List[callable]] = defaultdict(list)
    
    def on(self, event_type: str):
        """이벤트 핸들러 데코레이터"""
        def decorator(func):
            self._handlers[event_type].append(func)
            return func
        return decorator
    
    async def start(self):
        """실시간 연결 시작"""
        # slack_sdk의 SocketModeClient 사용 필요
        # from slack_sdk.socket_mode.aiohttp import SocketModeClient
        # from slack_sdk.socket_mode.response import SocketModeResponse
        # from slack_sdk.socket_mode.request import SocketModeRequest
        
        # client = SocketModeClient(
        #     app_token=self.app_token,
        #     web_client=WebClient(token=self.bot_token)
        # )
        
        # @client.socket_mode_request_listeners.append
        # async def handle(client: SocketModeClient, req: SocketModeRequest):
        #     if req.type == "events_api":
        #         event = req.payload.get("event", {})
        #         event_type = event.get("type")
        #         
        #         for handler in self._handlers.get(event_type, []):
        #             await handler(event)
        #         
        #         await client.send_socket_mode_response(
        #             SocketModeResponse(envelope_id=req.envelope_id)
        #         )
        
        # await client.connect()
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예시
# ═══════════════════════════════════════════════════════════════════════════════

"""
# 1. 초기화
collector = SlackCollector(
    client_id="your-client-id",
    client_secret="your-client-secret",
    redirect_uri="http://localhost:8000/auth/callback/slack"
)

# 2. OAuth URL 생성
auth_url = collector.get_authorization_url(state="random-state")
# → 사용자가 Slack 로그인 → 콜백으로 code 받음

# 3. 토큰 교환
tokens = await collector.exchange_code(code="received-code")

# 4. 데이터 수집
since = datetime.now() - timedelta(days=7)
collected = await collector.collect(since=since)

print(f"Node mappings: {collected.node_mappings}")
print(f"Slot candidates: {len(collected.slot_mappings['candidates'])}")

# 5. 실시간 이벤트 (선택)
# listener = SlackRealtimeListener(app_token="xapp-...", bot_token="xoxb-...")
# 
# @listener.on("message")
# async def on_message(event):
#     print(f"New message: {event['text']}")
# 
# await listener.start()

# 6. 정리
await collector.close()
"""
