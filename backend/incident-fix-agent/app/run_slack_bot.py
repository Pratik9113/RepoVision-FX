#!/usr/bin/env python
# run_slack_bot.py - Standalone Slack bot runner

import os
import sys
from pathlib import Path

# Add project root (parent of app/) to import path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from app.integration.slack_service import start_slack_bot

if __name__ == "__main__":
    # Load environment
    load_dotenv()
    
    print("\n" + "="*60)
    print("🚀 RepoVisionFX Slack Bot Runner")
    print("="*60)
    
    # Check tokens
    bot_token = os.getenv("SLACK_BOT_TOKEN")
    app_token = os.getenv("SLACK_APP_TOKEN")
    channel = os.getenv("SLACK_CHANNEL")
    
    if not bot_token or not app_token:
        print("❌ Missing Slack tokens in .env!")
        print("\nRequired variables:")
        print("  SLACK_BOT_TOKEN=xoxb-...")
        print("  SLACK_APP_TOKEN=xapp-...")
        print("  SLACK_SIGNING_SECRET=...")
        print("  SLACK_CHANNEL=C...")
        sys.exit(1)
    
    print(f"✅ Bot Token: {bot_token[:10]}...")
    print(f"✅ App Token: {app_token[:10]}...")
    print(f"✅ Channel ID: {channel}")
    
    # Start bot (Socket Mode must run in main thread)
    bot = start_slack_bot()
    if not bot:
        print("\n❌ Failed to start Slack bot")
        sys.exit(1)