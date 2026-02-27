"""
SUMMARY:
Entry point of the application.
Defines API endpoint to receive incident and trigger orchestration.
"""

from fastapi import FastAPI
from orchestrator import handle_incident
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Incident Fix Agent", version="1.0")

# 🔧 STATIC CONFIG (for testing)
REPO_URL = "https://github.com/Pratik9113/RAG-Powered-Chatbot-for-News-Websites.git" 
INCIDENT_DESCRIPTION = "Node.js backend application running on http://localhost:5001 fails during startup due to Redis connection issue. "


@app.post("/incident")
def process_incident():
    """
    🚀 FINAL CLEAN FLOW (Static Version)
    
    Uses hardcoded:
        - repo_url: "https://github.com/Pratik9113/RAG-Powered-Chatbot-for-News-Websites.git"
        - description: "Build fails when using dynamic imports..."
    
    System:
        - Clones repo to sandbox (or pulls if exists)
        - Analyzes incident
        - Returns results
    """
    return handle_incident(REPO_URL, INCIDENT_DESCRIPTION)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Incident Fix Agent"}
