"""
SUMMARY:
Coordinates entire incident resolution pipeline.
Calls agents and services step-by-step.
"""

from agents.incident_agent import extract_signals
from services.search_service import search_files

def handle_incident(description):
    signals = extract_signals(description)
    files = search_files(signals["keywords"])

    return {
        "signals": signals,
        "candidate_files": files
    }