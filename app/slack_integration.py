"""Slack Integration for AUTUS State Engine"""
import os
import json
import urllib.request

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
last_alert_status = "GREEN"

def send_slack_alert(status: str, entropy: float, failure_in, bottleneck: str):
    global last_alert_status
    
    if not SLACK_WEBHOOK_URL:
        return False
    
    # Only alert on status change to worse
    if status == "GREEN":
        last_alert_status = "GREEN"
        return False
    
    if status == last_alert_status:
        return False
    
    color = "#ff4444" if status == "RED" else "#ffaa00"
    emoji = "🚨" if status == "RED" else "⚠️"
    
    payload = {
        "attachments": [{
            "color": color,
            "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": f"{emoji} AUTUS: {status}"}},
                {"type": "section", "fields": [
                    {"type": "mrkdwn", "text": f"*Entropy:* {entropy:.3f}"},
                    {"type": "mrkdwn", "text": f"*Failure In:* {failure_in or 'N/A'} ticks"},
                    {"type": "mrkdwn", "text": f"*Bottleneck:* {bottleneck}"},
                    {"type": "mrkdwn", "text": f"*Action:* EXECUTE required"}
                ]},
                {"type": "actions", "elements": [
                    {"type": "button", "text": {"type": "plain_text", "text": "🔗 Open Dashboard"}, "url": "https://solar.autus-ai.com/frontend/index.html#/instrument", "style": "danger" if status == "RED" else "primary"}
                ]}
            ]
        }]
    }
    
    try:
        req = urllib.request.Request(SLACK_WEBHOOK_URL, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=5)
        last_alert_status = status
        return True
    except:
        return False
