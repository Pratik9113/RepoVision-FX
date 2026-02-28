"""
SUMMARY:
Entry point of the application.
Defines API endpoint to receive incident and trigger orchestration.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from orchestrator import handle_incident
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Incident Fix Agent", version="1.0")

# Allow frontend (e.g. Vite on :5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IncidentRequest(BaseModel):
    repo_url: str
    description: str

@app.post("/incident")
def process_incident(request: IncidentRequest):
    """
    Receives incident details from frontend and triggers analysis.
    """
    try:
        result = handle_incident(request.repo_url, request.description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Incident Fix Agent"}
