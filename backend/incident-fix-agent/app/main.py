"""
SUMMARY:
Entry point of the application.
Defines API endpoint to receive incident and trigger orchestration.
"""

from fastapi import FastAPI
from orchestrator import handle_incident

app = FastAPI()

@app.post("/incident")
def process_incident(payload: dict):
    return handle_incident(payload["description"])