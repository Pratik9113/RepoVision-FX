"""
Backward-compatible re-export.

Canonical Slack implementation is in `integration/slack_pr_integration.py`.
"""

from app.integration.slack_pr_integration import (  # noqa: F401
    SlackPRIntegration as SlackService,
    get_slack_service,
    start_slack_bot,
)

