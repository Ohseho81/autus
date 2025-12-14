"""Slack Notifier - RED Alert (LOCKED v1.0)"""
import os
import json
import urllib.request

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")

def send_alert(status: str, entropy: float, failure_in: int, bottleneck: str):
    """Send Slack alert when system is at risk."""
    if not SLACK_WEBHOOK_URL:
        print("SLACK_WEBHOOK_URL not configured")
        return False
    
    color = "#ff4444" if status == "RED" else "#ffaa00" if status == "YELLOW" else "#00ff88"
    
    payload = {
        "attachments": [{
            "color": color,
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": f"⚠️ AUTUS ALERT: {status}", "emoji": True}
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Status:*\n{status}"},
                        {"type": "mrkdwn", "text": f"*Entropy:*\n{entropy:.3f}"},
                        {"type": "mrkdwn", "text": f"*Failure In:*\n{failure_in} ticks"},
                        {"type": "mrkdwn", "text": f"*Bottleneck:*\n{bottleneck}"}
                    ]
                },
                {
                    "type": "actions",
                    "elements": [{
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Open Dashboard"},
                        "url": "https://solar.autus-ai.com/frontend/index.html#/instrument"
                    }]
                }
            ]
        }]
    }
    
    try:
        req = urllib.request.Request(
            SLACK_WEBHOOK_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"Slack error: {e}")
        return False

def should_alert(status: str, last_alert_status: str) -> bool:
    """Determine if alert should be sent."""
    if status == "RED" and last_alert_status != "RED":
        return True
    if status == "YELLOW" and last_alert_status == "GREEN":
        return True
    return False
