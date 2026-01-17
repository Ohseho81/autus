"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS OAuth 데이터 수집기
═══════════════════════════════════════════════════════════════════════════════

OAuth 기반 데이터 수집기:
  - GmailCollector: Gmail 이메일 수집 → TIME_D, TIME_E, NET_A, NET_D, WORK_D
  - CalendarCollector: Google Calendar 수집 → TIME_A, TIME_D, TIME_E, WORK_A, NET_A
  - SlackCollector: Slack 메시지 수집 → NET_A, NET_D, NET_E, TEAM_A, TEAM_D

사용법:
    from collectors import GmailCollector
    
    collector = GmailCollector(
        client_id="...",
        client_secret="...",
        redirect_uri="http://localhost:8000/api/oauth/callback/gmail"
    )
    
    # OAuth URL 생성
    auth_url = collector.get_authorization_url(state="random-state")
    
    # 토큰 교환
    tokens = await collector.exchange_code(code="received-code")
    
    # 데이터 수집
    result = await collector.collect(since=datetime.now() - timedelta(days=7))
    
    print(result.node_mappings)  # {'TIME_D': 0.12, 'NET_A': 0.28, ...}
    print(result.slot_mappings)  # {'candidates': [...], 'total_contacts': 50}
    
    await collector.close()
"""

from .gmail_collector import (
    BaseCollector,
    GmailCollector,
    DataSourceType,
    SyncStatus,
    OAuthTokens,
    CollectedData,
    NodeContribution,
)

from .calendar_collector import (
    CalendarCollector,
    CalendarAnalyzer,
)

from .slack_collector import (
    SlackCollector,
    SlackRealtimeListener,
)

__all__ = [
    # 기본 클래스
    "BaseCollector",
    "DataSourceType",
    "SyncStatus",
    "OAuthTokens",
    "CollectedData",
    "NodeContribution",
    
    # 수집기
    "GmailCollector",
    "CalendarCollector",
    "SlackCollector",
    
    # 유틸리티
    "CalendarAnalyzer",
    "SlackRealtimeListener",
]
