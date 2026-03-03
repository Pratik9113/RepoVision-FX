import os
import threading
import traceback
from typing import Optional, Tuple

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from dotenv import load_dotenv

load_dotenv()


def _parse_repo_and_incident(text: str) -> Tuple[Optional[str], str]:
    """
    Allow command formats:
    - /repovision-fix <incident text>
    - /repovision-fix <repo_url> <incident text>
    """
    text = (text or "").strip()
    if not text:
        return None, ""

    parts = text.split()
    if parts and (parts[0].startswith("http://") or parts[0].startswith("https://")):
        repo_url = parts[0]
        incident_text = " ".join(parts[1:]).strip()
        return repo_url, incident_text

    return None, text


class SlackPRIntegration:
    """
    Slack integration for Incident Fix Agent.

    Responsibilities:
    - receive incidents from Slack (slash command, mentions, optionally a dedicated channel)
    - trigger the incident pipeline (orchestrator)
    - stream progress updates back to Slack
    - post final outcome including PR URL (if created) and edit summary
    """

    def __init__(self):
        self.bot_token = os.getenv("SLACK_BOT_TOKEN")
        self.app_token = os.getenv("SLACK_APP_TOKEN")
        self.signing_secret = os.getenv("SLACK_SIGNING_SECRET")
        self.channel_id = os.getenv("SLACK_CHANNEL")

        if not all([self.bot_token, self.app_token, self.signing_secret]):
            print("⚠️ Slack credentials missing in .env (SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET)")
            self.app = None
            self.handler = None
            self.is_running = False
            return

        self.app = App(token=self.bot_token, signing_secret=self.signing_secret)
        self.handler = None
        self.is_running = False

        self._setup_handlers()
        print("✅ Slack PR integration initialized")

    def _setup_handlers(self):
        @self.app.command("/repovision-fix")
        def handle_fix_command(ack, say, command):
            ack()

            raw_text = command.get("text", "")
            user_id = command.get("user_id")
            channel_id = command.get("channel_id")

            repo_url_from_cmd, incident_text = _parse_repo_and_incident(raw_text)

            if not incident_text:
                say(
                    "❌ Please describe the incident.\n"
                    "Example:\n"
                    "`/repovision-fix payments-api returning 500s`\n"
                    "Or with repo:\n"
                    "`/repovision-fix https://github.com/org/repo.git payments-api returning 500s`"
                )
                return

            say(f"🔍 Analyzing: *{incident_text}*\n👤 Requested by <@{user_id}>")

            thread = threading.Thread(
                target=self._process_incident,
                args=(incident_text, channel_id, user_id, repo_url_from_cmd),
            )
            thread.daemon = True
            thread.start()

        @self.app.event("app_mention")
        def handle_mention(event, say):
            text = event.get("text", "")
            user = event.get("user")
            channel = event.get("channel")

            if ">" in text:
                text = text.split(">", 1)[-1].strip()

            repo_url_from_msg, incident_text = _parse_repo_and_incident(text)
            if not incident_text:
                say("❌ Please describe the incident after mentioning me.")
                return

            say(f"🔄 Processing: {incident_text}")

            thread = threading.Thread(
                target=self._process_incident,
                args=(incident_text, channel, user, repo_url_from_msg),
            )
            thread.daemon = True
            thread.start()

        @self.app.event("message")
        def handle_message(event, say):
            # ignore bot messages
            if event.get("bot_id"):
                return

            # only respond in a dedicated channel (optional)
            if self.channel_id and event.get("channel") != self.channel_id:
                # Still check if we were mentioned, which is handled by handle_mention
                return

            text = event.get("text", "")
            if not text:
                return

            # More flexible detection - if it's a dedicated channel, maybe any reasonably long message is an incident
            triggers = ["fix", "incident", "bug", "error", "crash", "500", "down", "fail", "issue", "problem", "broken"]
            
            # If in the dedicated channel, we're more aggressive. If not, only triggers.
            is_incident = any(t in text.lower() for t in triggers)
            
            # If it sounds like a report or request
            if not is_incident and len(text.split()) > 3:
                # Check for "how to", "why is", etc. which might be questions but processed as incidents
                problem_keywords = ["not working", "fails to", "cannot find", "unable to", "stuck on"]
                if any(pk in text.lower() for pk in problem_keywords):
                    is_incident = True

            if not is_incident:
                return

            user = event.get("user")
            channel = event.get("channel")

            say(f"🚀 *RepoVisionFX Agent* has detected an issue report!\n🔍 Analyzing: \"_{text}_\"")

            thread = threading.Thread(target=self._process_incident, args=(text, channel, user, None))
            thread.daemon = True
            thread.start()

    def _process_incident(self, incident_text: str, channel: str, user: str, repo_url_override: Optional[str]):
        try:
            repo_url = repo_url_override or os.getenv("GITHUB_REPO_URL") or os.getenv("DEFAULT_REPO_URL")
            
            # Fallback for GITHUB_REPO if no URL is provided
            if not repo_url and os.getenv("GITHUB_REPO"):
                slug = os.getenv("GITHUB_REPO").strip()
                if "/" in slug:
                    repo_url = f"https://github.com/{(slug)}.git"
                    print(f"ℹ️ Auto-constructed repo URL from GITHUB_REPO: {repo_url}")

            if not repo_url:
                print(f"⚠️ Missing repo URL for incident: {incident_text}")
                self.send_message(
                    channel,
                    "❌ *Missing repository URL.*\n"
                    "Please set `GITHUB_REPO_URL` in `.env` OR pass it in the command:\n"
                    "`/repovision-fix https://github.com/org/repo.git <incident>`",
                )
                return

            self.send_message(channel, f"🛠️ *Starting Autonomous Fix Pipeline*\n📦 Repo: `{repo_url}`\n📝 Task: {incident_text}")

            from app.orchestrator import handle_incident

            result = handle_incident(repo_url=repo_url, description=incident_text, slack_channel=channel)

            if result.get("status") == "success":
                self._send_success_message(channel, result, user)
            else:
                self.send_message(channel, f"❌ Failed: {result.get('message', 'Unknown error')}")

        except Exception as e:
            self.send_message(channel, f"⚠️ Error: {str(e)}\n```{traceback.format_exc()}```")

    def _send_success_message(self, channel: str, result: dict, user: str):
        llm_context = result.get("llm_context") or {}
        rca = llm_context.get("root_cause_analysis") or {}

        root_cause = rca.get("root_cause") or "Unknown"
        severity = rca.get("severity") or "unknown"
        confidence = rca.get("confidence")

        edited_files = result.get("edited_files") or []
        github = result.get("github_integration") or {}
        pr_url = github.get("pr_url")

        msg = []
        msg.append("✅ Incident analysis complete")
        msg.append(f"*Root cause:* {root_cause}")
        msg.append(f"*Severity:* {severity}")
        if confidence is not None:
            msg.append(f"*Confidence:* {confidence}")

        if edited_files:
            msg.append("\n*Suggested edits:*")
            for f in edited_files[:4]:
                file_path = f.get("file", "unknown")
                lines = f.get("affected_lines") or []
                if lines:
                    msg.append(f"• `{file_path}` (lines: {', '.join('L'+str(x) for x in lines[:8])})")
                else:
                    msg.append(f"• `{file_path}`")
        else:
            plan = result.get("edit_plan") or {}
            reason = plan.get("reason")
            if reason:
                msg.append(f"\nℹ️ No auto-edits applied: {reason}")

        if pr_url:
            msg.append(f"\n🔗 PR: {pr_url}")

        msg.append(f"\n👤 Requested by <@{user}>")
        self.send_message(channel, "\n".join(msg))

    def send_message(self, channel: str, text: str):
        if not self.app:
            return
        try:
            self.app.client.chat_postMessage(channel=channel, text=text)
        except Exception as e:
            print(f"⚠️ Failed to send Slack message: {e}")

    def send_incident_update(self, channel: str, step: str, message: str):
        self.send_message(channel, f"• {step}: {message}")

    def start(self):
        if not self.app:
            print("❌ Cannot start Slack bot - missing credentials")
            return
        print("🤖 Starting Slack Bot (Socket Mode)…")
        self.is_running = True
        self.handler = SocketModeHandler(self.app, self.app_token)
        self.handler.start()

    def stop(self):
        if self.handler:
            self.handler.close()
        self.is_running = False
        print("🛑 Slack bot stopped")


_slack_instance: Optional[SlackPRIntegration] = None


def get_slack_service() -> Optional[SlackPRIntegration]:
    global _slack_instance
    if _slack_instance is None:
        _slack_instance = SlackPRIntegration()
    return _slack_instance


def start_slack_bot() -> Optional[SlackPRIntegration]:
    service = get_slack_service()
    if not service or not service.app:
        print("❌ Slack not configured - check .env file")
        return None

    # IMPORTANT: SocketModeHandler installs signal handlers, which must run
    # in the main thread. Do not start Socket Mode in a background thread.
    service.start()
    return service

