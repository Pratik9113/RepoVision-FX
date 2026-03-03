# 📖 RepoVisionFX - Run Manual

Follow these steps to correctly run the backend API and the Slack bot.

## 🛠 Prerequisites

1.  **Python 3.10+** installed.
2.  **Environment Variables**: Ensure your `.env` file in `backend/incident-fix-agent/` contains:
    ```env
    GROQ_API_KEY=your_key_here
    GITHUB_TOKEN=your_gh_token_here
    GITHUB_REPO=Owner/RepoName
    
    # Slack Credentials
    SLACK_BOT_TOKEN=xoxb-...
    SLACK_APP_TOKEN=xapp-...
    SLACK_SIGNING_SECRET=...
    SLACK_CHANNEL=C... (Target channel ID)
    ```

---

## 🚀 1. Running the Backend API (FastAPI)

This server handles the incident analysis logic and is used by the frontend and Slack bot.

1.  Open a terminal and navigate to the project directory.
2.  Go to the agent folder:
    ```powershell
    cd backend/incident-fix-agent
    ```
3.  Install dependencies:
    ```powershell
    pip install -r requirements.txt
    ```
4.  Run the API:
    ```powershell
    uvicorn main:app --reload --port 8000
    ```
    *Keep this terminal open.*

---

## 🤖 2. Running the Slack Bot

The Slack bot runs as a separate process and connects to Slack via Socket Mode.

1.  Open a **NEW** terminal.
2.  Navigate to the agent folder:
    ```powershell
    cd backend/incident-fix-agent
    ```
3.  Run the bot runner script:
    ```powershell
    python app/run_slack_bot.py
    ```
4.  If successful, you will see: `🤖 Starting Slack Bot (Socket Mode)…`

---

## 💬 3. How to Trigger the Agent from Slack

Once both the **API** and **Bot** are running:

### A. Using the Slash Command
Run this in any channel where the bot is invited:
```
/repovision-fix Website is showing 500 errors on the login page
```
*Note: You must define `/repovision-fix` in your Slack App Dashboard under "Slash Commands".*

### B. Mentioning the Bot
```
@RepoVisionFX fix the bug where users can't reset password
```

### C. Direct Trigger Keywords
In the dedicated `SLACK_CHANNEL` defined in `.env`, the bot listens for keywords like `fix this`, `incident`, `bug`, `500`.
```
Someone fix this bug in the checkout flow!
```

---

## 🧪 4. Testing the Flow (Internal)

To test if the backend is working correctly without using Slack, run:
```powershell
python test_flow.py
```
This will send a dummy incident to your local API and print the results.

---

## ⚠️ Common Issues & Fixes

*   **"Missing Slack tokens"**: Verify your `.env` file is in `backend/incident-fix-agent/` and contains the correct keys.
*   **"Socket Mode Error"**: Ensure "Socket Mode" is enabled in your Slack App settings.
*   **"Command not working"**: After adding Slash Commands in Slack, you must **reinstall** the app to your workspace.
*   **"Ignoring message"**: If you defined `SLACK_CHANNEL` in `.env`, the bot will only respond to general messages in THAT channel. Mentions and Slash commands work everywhere.
