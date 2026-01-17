"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS OAuth 수집기 테스트
═══════════════════════════════════════════════════════════════════════════════
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 수집기 import
try:
    from collectors import (
        BaseCollector,
        GmailCollector,
        CalendarCollector,
        SlackCollector,
        DataSourceType,
        OAuthTokens,
        CollectedData,
        NodeContribution,
    )
except ImportError as e:
    pytestmark = pytest.mark.skip(reason=f"Collectors not available: {e}")


class TestOAuthTokens:
    """OAuth 토큰 테스트"""
    
    def test_token_creation(self):
        """토큰 생성 테스트"""
        tokens = OAuthTokens(
            access_token="test-access-token",
            refresh_token="test-refresh-token",
            expires_at=datetime.now() + timedelta(hours=1),
        )
        
        assert tokens.access_token == "test-access-token"
        assert tokens.refresh_token == "test-refresh-token"
        assert not tokens.is_expired()
    
    def test_token_expired(self):
        """토큰 만료 테스트"""
        tokens = OAuthTokens(
            access_token="test-access-token",
            expires_at=datetime.now() - timedelta(hours=1),  # 과거
        )
        
        assert tokens.is_expired()
    
    def test_token_no_expiry(self):
        """만료 없는 토큰 테스트"""
        tokens = OAuthTokens(
            access_token="test-access-token",
            expires_at=None,
        )
        
        assert not tokens.is_expired()


class TestGmailCollector:
    """Gmail 수집기 테스트"""
    
    def test_collector_properties(self):
        """수집기 속성 테스트"""
        collector = GmailCollector(
            client_id="test-client-id",
            client_secret="test-client-secret",
            redirect_uri="http://localhost:8000/callback/gmail",
        )
        
        assert collector.source_type == DataSourceType.GMAIL
        assert "gmail.googleapis.com" in collector.auth_url or "google" in collector.auth_url.lower()
        assert "gmail" in " ".join(collector.scopes).lower()
    
    def test_authorization_url(self):
        """인증 URL 생성 테스트"""
        collector = GmailCollector(
            client_id="test-client-id",
            client_secret="test-client-secret",
            redirect_uri="http://localhost:8000/callback/gmail",
        )
        
        auth_url = collector.get_authorization_url(state="test-state")
        
        assert "test-client-id" in auth_url
        assert "test-state" in auth_url
        assert "redirect_uri" in auth_url.lower() or "redirect" in auth_url.lower()
    
    def test_map_to_nodes_empty(self):
        """빈 데이터 노드 매핑 테스트"""
        collector = GmailCollector(
            client_id="test",
            client_secret="test",
            redirect_uri="http://localhost/callback",
        )
        
        contributions = collector.map_to_nodes([])
        
        assert contributions == []
    
    def test_map_to_nodes(self):
        """노드 매핑 테스트"""
        collector = GmailCollector(
            client_id="test",
            client_secret="test",
            redirect_uri="http://localhost/callback",
        )
        
        # 테스트 데이터
        test_emails = [
            {
                "id": "msg1",
                "label_ids": ["INBOX", "UNREAD"],
                "from": "sender@example.com",
                "to": "me@example.com",
                "internal_date": 1000000000,
            },
            {
                "id": "msg2",
                "label_ids": ["SENT"],
                "from": "me@example.com",
                "to": "recipient@example.com",
                "internal_date": 1000001000,
            },
        ]
        
        contributions = collector.map_to_nodes(test_emails)
        
        assert len(contributions) > 0
        
        # NodeContribution 형식 확인
        for contrib in contributions:
            assert isinstance(contrib, NodeContribution)
            assert contrib.node_id in ["TIME_D", "TIME_E", "NET_A", "NET_D", "WORK_D"]
            assert -1 <= contrib.value <= 1
            assert 0 <= contrib.weight <= 1
            assert contrib.source == "gmail"
    
    def test_map_to_slots(self):
        """슬롯 매핑 테스트"""
        collector = GmailCollector(
            client_id="test",
            client_secret="test",
            redirect_uri="http://localhost/callback",
        )
        
        test_emails = [
            {
                "id": "msg1",
                "from": "John Doe <john@company.com>",
                "to": "me@example.com",
                "internal_date": 1000000000000,
            },
            {
                "id": "msg2",
                "from": "jane@gmail.com",
                "to": "me@example.com",
                "internal_date": 1000001000000,
            },
        ]
        
        slots = collector.map_to_slots(test_emails)
        
        assert "candidates" in slots
        assert "total_contacts" in slots
        assert isinstance(slots["candidates"], list)


class TestCalendarCollector:
    """Calendar 수집기 테스트"""
    
    def test_collector_properties(self):
        """수집기 속성 테스트"""
        collector = CalendarCollector(
            client_id="test-client-id",
            client_secret="test-client-secret",
            redirect_uri="http://localhost:8000/callback/calendar",
        )
        
        assert collector.source_type == DataSourceType.CALENDAR
        assert "calendar" in " ".join(collector.scopes).lower()
    
    def test_map_to_nodes(self):
        """노드 매핑 테스트"""
        collector = CalendarCollector(
            client_id="test",
            client_secret="test",
            redirect_uri="http://localhost/callback",
        )
        
        # 테스트 이벤트 데이터
        test_events = [
            {
                "id": "event1",
                "summary": "Team Meeting",
                "start": {"dateTime": "2026-01-10T09:00:00Z"},
                "end": {"dateTime": "2026-01-10T10:00:00Z"},
                "attendees": [
                    {"email": "alice@company.com", "responseStatus": "accepted"},
                    {"email": "bob@company.com", "responseStatus": "tentative"},
                ],
            },
            {
                "id": "event2",
                "summary": "Focus Time",
                "start": {"dateTime": "2026-01-10T14:00:00Z"},
                "end": {"dateTime": "2026-01-10T16:00:00Z"},
                "attendees": [],
            },
        ]
        
        contributions = collector.map_to_nodes(test_events)
        
        assert len(contributions) > 0
        
        # 예상 노드 확인
        node_ids = [c.node_id for c in contributions]
        assert "TIME_A" in node_ids or "TIME_D" in node_ids or "TIME_E" in node_ids


class TestSlackCollector:
    """Slack 수집기 테스트"""
    
    def test_collector_properties(self):
        """수집기 속성 테스트"""
        collector = SlackCollector(
            client_id="test-client-id",
            client_secret="test-client-secret",
            redirect_uri="http://localhost:8000/callback/slack",
        )
        
        assert collector.source_type == DataSourceType.SLACK
        assert "channels" in " ".join(collector.scopes).lower() or "history" in " ".join(collector.scopes).lower()
    
    def test_authorization_url(self):
        """Slack 인증 URL 생성 테스트"""
        collector = SlackCollector(
            client_id="test-client-id",
            client_secret="test-client-secret",
            redirect_uri="http://localhost:8000/callback/slack",
        )
        
        auth_url = collector.get_authorization_url(state="test-state")
        
        assert "slack.com" in auth_url
        assert "test-client-id" in auth_url
    
    def test_map_to_nodes(self):
        """노드 매핑 테스트"""
        collector = SlackCollector(
            client_id="test",
            client_secret="test",
            redirect_uri="http://localhost/callback",
        )
        collector._user_id = "U123456"
        
        # 테스트 Slack 데이터
        test_data = [{
            "messages": [
                {
                    "user": "U123456",
                    "text": "Hello team!",
                    "ts": "1704700000.000000",
                    "channel_id": "C001",
                },
                {
                    "user": "U789012",
                    "text": "Hi there!",
                    "ts": "1704701000.000000",
                    "channel_id": "C001",
                },
            ],
            "users": {
                "U123456": {"id": "U123456", "name": "me", "is_bot": False},
                "U789012": {"id": "U789012", "name": "colleague", "is_bot": False},
            },
            "channels": [
                {"id": "C001", "name": "general"},
            ],
        }]
        
        contributions = collector.map_to_nodes(test_data)
        
        assert len(contributions) > 0
        
        # 예상 노드 확인
        node_ids = [c.node_id for c in contributions]
        assert any(n in node_ids for n in ["NET_A", "NET_D", "TEAM_A"])


class TestDataSourceType:
    """데이터 소스 타입 테스트"""
    
    def test_enum_values(self):
        """Enum 값 테스트"""
        assert DataSourceType.GMAIL.value == "gmail"
        assert DataSourceType.CALENDAR.value == "calendar"
        assert DataSourceType.SLACK.value == "slack"
        assert DataSourceType.GITHUB.value == "github"
        assert DataSourceType.NOTION.value == "notion"


# 단위 테스트 실행
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
