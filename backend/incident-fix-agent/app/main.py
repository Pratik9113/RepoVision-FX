"""
SUMMARY:
Hackathon-style API for RepoVisionAI.
Handles incident listing and targeted resolution for Python/Node services.
"""

import sys
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure we can import from app
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from app.orchestrator import handle_incident

load_dotenv()

app = FastAPI(title="RepoVisionAI-Hackathon", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants for project paths
BASE_PATH = Path(r"d:\test_repovisionai_fx\shopstack-platform")
INCIDENTS_DIR = Path(r"d:\test_repovisionai_fx\backend\incidents")

# GitHub Repo URLs for Mission Control
PYTHON_REPO_URL = "https://github.com/Pratik9113/python-service.git"
NODE_REPO_URL = "https://github.com/Pratik9113/node-service.git"

class IncidentRequest(BaseModel):
    repo_url: str
    description: str
    slack_channel: Optional[str] = None

@app.get("/incidents")
def list_incidents():
    incidents = []
    if INCIDENTS_DIR.exists():
        for file in INCIDENTS_DIR.glob("*.json"):
            try:
                with open(file, "r") as f:
                    data = json.load(f)
                    incidents.append({
                        "id": data.get("id"),
                        "title": data.get("title"),
                        "severity": data.get("severity"),
                        "service": data.get("service"),
                        "tags": data.get("tags", [])
                    })
            except Exception as e:
                print(f"Error loading {file}: {e}")
    
    # Sort by ID: INC-001, INC-002... then INC-101...
    return sorted(incidents, key=lambda x: x["id"])

@app.get("/incidents/{incident_id}")
def get_incident(incident_id: str):
    file_path = INCIDENTS_DIR / f"{incident_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Incident not found")
    
    with open(file_path, "r") as f:
        data = json.load(f)
        
    # Inject the correct repo URL based on the incident ID
    # INC-001 to INC-008 -> python-service
    # INC-101 to INC-108 -> node-service
    try:
        incident_num = int(incident_id.split("-")[1])
        if incident_num < 100:
            data["repo_url"] = PYTHON_REPO_URL
        else:
            data["repo_url"] = NODE_REPO_URL
    except (IndexError, ValueError):
        # Fallback if ID format is weird
        data["repo_url"] = str(BASE_PATH)
        
    return data

@app.post("/incident")
def process_incident(request: IncidentRequest):
    try:
        # Use simple string replacement for local paths if needed by orchestrator
        # The orchestrator uses repository_manager.clone_or_update_repo
        return handle_incident(
            repo_url=request.repo_url,
            description=request.description,
            slack_channel=request.slack_channel,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Hackathon Incident Fix Agent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
