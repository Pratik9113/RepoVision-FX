"""
SUMMARY:
Entry point of the application.
Defines API endpoint to receive incident and trigger orchestration.
"""

import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure repo root (parent of app/) is on sys.path.
# This allows running:
# - from repo root:   uvicorn app.main:app --reload
# - from app folder:  uvicorn main:app --reload
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from app.orchestrator import handle_incident  # noqa: E402

load_dotenv()

app = FastAPI(title="Incident Fix Agent", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IncidentRequest(BaseModel):
    repo_url: str
    description: str
    slack_channel: Optional[str] = None


@app.post("/incident")
def process_incident(request: IncidentRequest):
    try:
        return handle_incident(
            repo_url=request.repo_url,
            description=request.description,
            slack_channel=request.slack_channel,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Incident Fix Agent"}