#!/usr/bin/env python3
"""
Quick test script to validate the incident analysis flow.
Static config mode - no parameters needed.
"""

import requests
import json

API_URL = "http://localhost:8000"

def test_incident_analysis():
    """Test the clean flow with static config"""
    
    print("\n🚀 Testing Incident Analysis Flow (Static Config)")
    print("=" * 50)
    print("📤 Calling: POST /incident")
    print("=" * 50)
    
    try:
        # No JSON body needed - using static config
        response = requests.post(f"{API_URL}/incident")
        result = response.json()
        
        print(f"\n✅ Response (Status: {response.status_code}):")
        print(json.dumps(result, indent=2))
        
        if result.get("status") == "success":
            print("\n📊 Summary:")
            print(f"  • Repo Status: {result['repo_status']}")
            print(f"  • Sandbox Path: {result['sandbox_path']}")
            print(f"  • Total Files: {result['total_files']}")
            print(f"  • Candidate Files: {len(result['candidate_files'])}")
            print(f"  • Keywords Found: {result['signals'].get('keywords')}")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to API")
        print("   Make sure backend is running: uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Error: {e}")


def startup_commands():
    """Print startup commands"""
    print("\n📋 Startup Commands:")
    print("=" * 50)
    print("1. Install dependencies:")
    print("   pip install -r requirements.txt")
    print("\n2. Start the backend:")
    print("   cd backend/incident-fix-agent/app")
    print("   uvicorn main:app --reload --port 8000")
    print("\n3. Test the flow (in another terminal):")
    print("   python test_flow.py")
    print("=" * 50)


if __name__ == "__main__":
    startup_commands()
    test_incident_analysis()

