"""
AUTUS Slack/Discord Webhook 통합
================================

업데이트 알림 및 Human Escalation 전송

기능:
- Slack Incoming Webhook
- Discord Webhook
- 자동 알림 전송
- Deep Link 포함

사용법:
```python
from backend.langgraph import WebhookNotifier

notifier = WebhookNotifier(
    slack_url="https://hooks.slack.com/services/xxx",
    discord_url="https://discord.com/api/webhooks/xxx",
)

# 알림 전송
notifier.send_update_complete(success=True, report="...")

# Human Escalation
notifier.send_escalation(reason="Inertia Debt 급증", session_id="abc123")
```
"""

import json
import logging
import urllib.request
import urllib.parse
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import os

logger = logging.getLogger(__name__)


@dataclass
class WebhookConfig:
    """Webhook 설정"""
    slack_url: str = ""
    discord_url: str = ""
    base_url: str = "http://localhost:3000"  # 딥링크용
    enabled: bool = True
    
    def __post_init__(self):
        self.slack_url = self.slack_url or os.getenv("AUTUS_SLACK_WEBHOOK", "")
        self.discord_url = self.discord_url or os.getenv("AUTUS_DISCORD_WEBHOOK", "")
        self.base_url = self.base_url or os.getenv("AUTUS_BASE_URL", "http://localhost:3000")


class WebhookNotifier:
    """Webhook 알림 발송자"""
    
    def __init__(self, config: Optional[WebhookConfig] = None, **kwargs):
        """
        Args:
            config: Webhook 설정
            **kwargs: slack_url, discord_url 등 직접 전달 가능
        """
        if config:
            self.config = config
        else:
            self.config = WebhookConfig(
                slack_url=kwargs.get("slack_url", ""),
                discord_url=kwargs.get("discord_url", ""),
                base_url=kwargs.get("base_url", "http://localhost:3000"),
            )
    
    def _send_slack(self, payload: dict) -> bool:
        """Slack Webhook 전송"""
        if not self.config.slack_url:
            logger.debug("Slack URL이 설정되지 않았습니다.")
            return False
        
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.config.slack_url,
                data=data,
                headers={"Content-Type": "application/json"},
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status == 200
                
        except Exception as e:
            logger.error(f"Slack 전송 실패: {e}")
            return False
    
    def _send_discord(self, payload: dict) -> bool:
        """Discord Webhook 전송"""
        if not self.config.discord_url:
            logger.debug("Discord URL이 설정되지 않았습니다.")
            return False
        
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.config.discord_url,
                data=data,
                headers={"Content-Type": "application/json"},
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status in [200, 204]
                
        except Exception as e:
            logger.error(f"Discord 전송 실패: {e}")
            return False
    
    def send_update_start(self, session_id: str):
        """업데이트 시작 알림"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Slack
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🔄 AUTUS 월 1회 최신화 시작"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*세션 ID:*\n{session_id}"},
                        {"type": "mrkdwn", "text": f"*시작 시간:*\n{timestamp}"},
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "진행 상황 보기"},
                            "url": f"{self.config.base_url}/admin/update/{session_id}",
                        }
                    ]
                }
            ]
        }
        self._send_slack(slack_payload)
        
        # Discord
        discord_payload = {
            "embeds": [
                {
                    "title": "🔄 AUTUS 월 1회 최신화 시작",
                    "color": 3447003,  # Blue
                    "fields": [
                        {"name": "세션 ID", "value": session_id, "inline": True},
                        {"name": "시작 시간", "value": timestamp, "inline": True},
                    ],
                    "footer": {"text": "AUTUS Monitoring"},
                }
            ]
        }
        self._send_discord(discord_payload)
    
    def send_update_complete(
        self,
        success: bool,
        session_id: str = "",
        report: str = "",
        packages_updated: int = 0,
        duration_seconds: float = 0,
    ):
        """업데이트 완료 알림"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status = "✅ 성공" if success else "❌ 실패"
        color = 3066993 if success else 15158332  # Green or Red
        
        # Slack
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": f"{status} - AUTUS 월 1회 최신화 완료"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*업데이트 패키지:*\n{packages_updated}개"},
                        {"type": "mrkdwn", "text": f"*소요 시간:*\n{duration_seconds:.1f}초"},
                        {"type": "mrkdwn", "text": f"*완료 시간:*\n{timestamp}"},
                    ]
                },
            ]
        }
        
        if report:
            slack_payload["blocks"].append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"```{report[:500]}```"}
            })
        
        self._send_slack(slack_payload)
        
        # Discord
        discord_payload = {
            "embeds": [
                {
                    "title": f"{status} - AUTUS 월 1회 최신화 완료",
                    "color": color,
                    "fields": [
                        {"name": "업데이트 패키지", "value": f"{packages_updated}개", "inline": True},
                        {"name": "소요 시간", "value": f"{duration_seconds:.1f}초", "inline": True},
                        {"name": "완료 시간", "value": timestamp, "inline": True},
                    ],
                    "description": f"```{report[:500]}```" if report else None,
                    "footer": {"text": "AUTUS Monitoring"},
                }
            ]
        }
        self._send_discord(discord_payload)
    
    def send_escalation(
        self,
        reason: str,
        session_id: str = "",
        details: Optional[dict] = None,
    ):
        """Human Escalation 알림"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        deep_link = f"{self.config.base_url}/admin/update/{session_id}"
        
        # Slack (긴급 알림)
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🚨 AUTUS Human Escalation 필요"}
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"*이유:*\n{reason}"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*세션 ID:*\n{session_id}"},
                        {"type": "mrkdwn", "text": f"*발생 시간:*\n{timestamp}"},
                    ]
                },
            ]
        }
        
        if details:
            detail_text = "\n".join(f"• {k}: {v}" for k, v in details.items())
            slack_payload["blocks"].append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*상세 정보:*\n{detail_text}"}
            })
        
        slack_payload["blocks"].append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "🔍 대화 재개"},
                    "style": "danger",
                    "url": deep_link,
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "✅ 승인"},
                    "url": f"{deep_link}?action=approve",
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "🔙 롤백"},
                    "url": f"{deep_link}?action=rollback",
                },
            ]
        })
        
        self._send_slack(slack_payload)
        
        # Discord
        discord_payload = {
            "content": "@everyone",  # 멘션
            "embeds": [
                {
                    "title": "🚨 AUTUS Human Escalation 필요",
                    "color": 15158332,  # Red
                    "description": f"**이유:** {reason}",
                    "fields": [
                        {"name": "세션 ID", "value": session_id, "inline": True},
                        {"name": "발생 시간", "value": timestamp, "inline": True},
                    ],
                    "footer": {"text": "즉각적인 조치가 필요합니다"},
                }
            ],
            "components": [
                {
                    "type": 1,
                    "components": [
                        {
                            "type": 2,
                            "style": 5,  # Link
                            "label": "🔍 대화 재개",
                            "url": deep_link,
                        }
                    ]
                }
            ]
        }
        self._send_discord(discord_payload)
        
        logger.warning(f"🚨 Human Escalation 알림 전송: {reason}")
    
    def send_drift_alert(
        self,
        model: str,
        cosine_similarity: float,
        perplexity_delta: float,
    ):
        """Behavior Drift 알림"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Slack
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "⚠️ AUTUS Behavior Drift 감지"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*모델:*\n{model}"},
                        {"type": "mrkdwn", "text": f"*Cosine Similarity:*\n{cosine_similarity:.4f}"},
                        {"type": "mrkdwn", "text": f"*Perplexity 변화:*\n+{perplexity_delta:.1f}%"},
                        {"type": "mrkdwn", "text": f"*감지 시간:*\n{timestamp}"},
                    ]
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "모델 출력이 이전 버전과 다릅니다. 검토가 필요합니다."}
                },
            ]
        }
        self._send_slack(slack_payload)
        
        # Discord
        discord_payload = {
            "embeds": [
                {
                    "title": "⚠️ AUTUS Behavior Drift 감지",
                    "color": 16776960,  # Yellow
                    "fields": [
                        {"name": "모델", "value": model, "inline": True},
                        {"name": "Cosine Similarity", "value": f"{cosine_similarity:.4f}", "inline": True},
                        {"name": "Perplexity 변화", "value": f"+{perplexity_delta:.1f}%", "inline": True},
                    ],
                    "description": "모델 출력이 이전 버전과 다릅니다. 검토가 필요합니다.",
                    "footer": {"text": f"감지 시간: {timestamp}"},
                }
            ]
        }
        self._send_discord(discord_payload)
    
    def send_rollback_alert(
        self,
        reason: str,
        rolled_back_packages: list,
    ):
        """자동 롤백 알림"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        packages_str = ", ".join(rolled_back_packages)
        
        # Slack
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🔙 AUTUS 자동 롤백 실행"}
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"*이유:*\n{reason}"}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*롤백 패키지:*\n{packages_str}"},
                        {"type": "mrkdwn", "text": f"*실행 시간:*\n{timestamp}"},
                    ]
                },
            ]
        }
        self._send_slack(slack_payload)
        
        # Discord
        discord_payload = {
            "embeds": [
                {
                    "title": "🔙 AUTUS 자동 롤백 실행",
                    "color": 15105570,  # Orange
                    "description": f"**이유:** {reason}",
                    "fields": [
                        {"name": "롤백 패키지", "value": packages_str, "inline": False},
                        {"name": "실행 시간", "value": timestamp, "inline": True},
                    ],
                    "footer": {"text": "시스템이 이전 안정 버전으로 복원되었습니다"},
                }
            ]
        }
        self._send_discord(discord_payload)


# 전역 알림자 인스턴스
_notifier: Optional[WebhookNotifier] = None


def get_notifier() -> WebhookNotifier:
    """전역 알림자 반환"""
    global _notifier
    if _notifier is None:
        _notifier = WebhookNotifier()
    return _notifier


def send_escalation(reason: str, session_id: str = "", details: Optional[dict] = None):
    """Human Escalation 알림 (편의 함수)"""
    get_notifier().send_escalation(reason, session_id, details)
