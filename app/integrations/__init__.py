# AUTUS Integrations

# Slack
from .slack import (
    notify_action_executed,
    notify_system_alert,
    notify_system_red,
    test_slack_connection,
    SLACK_ENABLED,
)

# GitHub
from .github import (
    create_audit_issue,
    create_system_red_issue,
    create_daily_summary_issue,
    test_github_connection,
    GITHUB_ENABLED,
)

__all__ = [
    # Slack
    'notify_action_executed',
    'notify_system_alert', 
    'notify_system_red',
    'test_slack_connection',
    'SLACK_ENABLED',
    # GitHub
    'create_audit_issue',
    'create_system_red_issue',
    'create_daily_summary_issue',
    'test_github_connection',
    'GITHUB_ENABLED',
]
