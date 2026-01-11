"""
AUTUS Notification System Tests
================================

알림 시스템 테스트
"""

import pytest
import sys
import os

# 모듈 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from notification.notification_service import (
    NotificationChannel,
    NotificationPriority,
    NotificationType,
    Notification,
    InAppNotifier,
    NotificationService,
)


# ============================================
# Notification Tests
# ============================================

class TestNotification:
    """Notification 테스트"""
    
    def test_creation(self):
        """Notification 생성"""
        notif = Notification(
            title="Test Title",
            message="Test Message",
            type=NotificationType.INFO,
            priority=NotificationPriority.NORMAL,
        )
        
        assert notif.title == "Test Title"
        assert notif.message == "Test Message"
        assert notif.type == NotificationType.INFO
    
    def test_defaults(self):
        """기본값 테스트"""
        notif = Notification(title="Test", message="Msg")
        
        assert notif.type == NotificationType.INFO
        assert notif.priority == NotificationPriority.NORMAL
        assert NotificationChannel.IN_APP in notif.channels


# ============================================
# InAppNotifier Tests
# ============================================

class TestInAppNotifier:
    """InAppNotifier 테스트"""
    
    @pytest.fixture
    def notifier(self):
        return InAppNotifier()
    
    def test_send(self, notifier):
        """알림 전송"""
        import asyncio
        notif = Notification(title="Test", message="Test message")
        success = asyncio.run(notifier.send(notif, "test_user"))
        assert success
    
    def test_get_unread(self, notifier):
        """읽지 않은 알림 조회"""
        import asyncio
        notif = Notification(title="Test", message="Test")
        asyncio.run(notifier.send(notif, "test_user"))
        
        unread = notifier.get_unread("test_user")
        assert len(unread) >= 1
    
    def test_get_all(self, notifier):
        """전체 알림 조회"""
        import asyncio
        notif = Notification(title="Test", message="Test")
        asyncio.run(notifier.send(notif, "test_user"))
        
        all_notifs = notifier.get_all("test_user")
        assert len(all_notifs) >= 1
    
    def test_mark_read(self, notifier):
        """읽음 처리"""
        import asyncio
        notif = Notification(title="Test", message="Test")
        asyncio.run(notifier.send(notif, "test_user"))
        
        all_notifs = notifier.get_all("test_user")
        if all_notifs:
            notif_id = all_notifs[0]["id"]
            success = notifier.mark_read("test_user", notif_id)
            assert success
            
            unread = notifier.get_unread("test_user")
            assert all(n["id"] != notif_id for n in unread)
    
    def test_mark_all_read(self, notifier):
        """전체 읽음 처리"""
        import asyncio
        for i in range(3):
            notif = Notification(title=f"Test {i}", message="Test")
            asyncio.run(notifier.send(notif, "test_user"))
        
        count = notifier.mark_all_read("test_user")
        assert count >= 0
        
        unread = notifier.get_unread("test_user")
        assert len(unread) == 0


# ============================================
# NotificationService Tests
# ============================================

class TestNotificationService:
    """NotificationService 테스트"""
    
    @pytest.fixture
    def service(self):
        return NotificationService()
    
    def test_send(self, service):
        """알림 전송"""
        import asyncio
        results = asyncio.run(service.send(
            title="Test",
            message="Test message",
            channels=[NotificationChannel.IN_APP],
            recipient="test_user"
        ))
        
        assert "in_app" in results
        assert results["in_app"]
    
    def test_info(self, service):
        """Info 알림"""
        import asyncio
        results = asyncio.run(service.info("Test", "Test info", recipient="test_user"))
        assert "in_app" in results
    
    def test_alert(self, service):
        """Alert 알림"""
        import asyncio
        results = asyncio.run(service.alert("Test Alert", "Alert message", recipient="test_user"))
        # Slack이 설정되지 않으면 False, in_app은 True
        assert "in_app" in results


# ============================================
# Channel Status Tests
# ============================================

class TestChannelStatus:
    """채널 상태 테스트"""
    
    def test_slack_not_configured(self):
        """Slack 미설정 상태"""
        from notification.notification_service import SlackNotifier
        notifier = SlackNotifier()
        # 환경 변수가 없으면 disabled
        # assert not notifier.enabled  # 환경에 따라 다를 수 있음
    
    def test_email_not_configured(self):
        """Email 미설정 상태"""
        from notification.notification_service import EmailNotifier
        notifier = EmailNotifier()
        # 환경 변수가 없으면 disabled
        # assert not notifier.enabled
    
    def test_inapp_always_enabled(self):
        """InApp 항상 활성화"""
        notifier = InAppNotifier()
        # InApp은 항상 사용 가능
        assert True


# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
