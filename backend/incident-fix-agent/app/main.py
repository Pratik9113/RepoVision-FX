"""
SUMMARY:
Hackathon-style API for RepoVisionAI with MongoDB and Auth.
Handles incident listing and targeted resolution for Python/Node services.
"""

import sys
import json
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, HttpUrl, EmailStr
from dotenv import load_dotenv
from jose import JWTError, jwt

# Ensure we can import from app
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from app.orchestrator import handle_incident
from app.services.database import get_db, ping_db
from app.services.auth import verify_password, get_password_hash, create_access_token, ALGORITHM, SECRET_KEY

load_dotenv()

app = FastAPI(title="RepoVisionAI-Hackathon", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_PATH = Path(r"d:\SYRUS_REPOVISIONAI-FX")
INCIDENTS_DIR = Path(r"d:\SYRUS_REPOVISIONAI-FX\backend\incidents")

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# GitHub repos
PYTHON_REPO_URL = "https://github.com/Pratik9113/python-service.git"
NODE_REPO_URL = "https://github.com/Pratik9113/node-service.git"

# -----------------------------
# Models
# -----------------------------
class User(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    username: str
    email: EmailStr
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str

class IncidentRequest(BaseModel):
    repo_url: str
    description: str

    id: Optional[str] = None
    title: Optional[str] = None
    severity: Optional[str] = None
    service: Optional[str] = None
    reported_by: Optional[str] = None
    environment: Optional[str] = None
    timestamp: Optional[str] = None
    steps_to_reproduce: Optional[List[str]] = None
    error_log: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    recent_changes: Optional[str] = None
    tags: Optional[List[str]] = None
    slack_channel: Optional[str] = None

# -----------------------------
# Dependencies
# -----------------------------
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    db = get_db()
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    return user

# -----------------------------
# Auth Routes
# -----------------------------
@app.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: User):
    db = get_db()
    
    # Check if user exists
    if await db.users.find_one({"$or": [{"username": user.username}, {"email": user.email}]}):
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    return {"message": "User created successfully"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = await db.users.find_one({"username": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user["username"]
    }

# -----------------------------
# Incident Routes (MongoDB)
# -----------------------------
@app.get("/incidents")
async def list_incidents():
    db = get_db()
    incidents = []
    
    # Try fetching from MongoDB
    cursor = db.incidents.find({}, {"_id": 0})
    async for document in cursor:
        incidents.append(document)
    
    # If DB is empty, fallback to local files (and migrate them)
    if not incidents:
        if INCIDENTS_DIR.exists():
            for file in INCIDENTS_DIR.glob("*.json"):
                try:
                    with open(file, "r") as f:
                        data = json.load(f)
                    
                    # Normalize for DB
                    incident = {
                        "id": data.get("id"),
                        "title": data.get("title"),
                        "severity": data.get("severity"),
                        "service": data.get("service"),
                        "reported_by": data.get("reported_by"),
                        "environment": data.get("environment"),
                        "timestamp": data.get("timestamp"),
                        "description": data.get("description"),
                        "steps_to_reproduce": data.get("steps_to_reproduce", []),
                        "error_log": data.get("error_log"),
                        "expected_behavior": data.get("expected_behavior"),
                        "actual_behavior": data.get("actual_behavior"),
                        "recent_changes": data.get("recent_changes"),
                        "tags": data.get("tags", [])
                    }
                    incidents.append(incident)
                    # Migrate to DB
                    await db.incidents.update_one({"id": incident["id"]}, {"$set": incident}, upsert=True)
                except Exception as e:
                    print(f"Error loading {file}: {e}")
                    
    return sorted(incidents, key=lambda x: x["id"])

@app.get("/incidents/{incident_id}")
async def get_incident(incident_id: str):
    db = get_db()
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    
    if not incident:
        # Fallback to local file if not in DB
        file_path = INCIDENTS_DIR / f"{incident_id}.json"
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Incident not found")
        with open(file_path, "r") as f:
            incident = json.load(f)

    # Determine repo automatically
    try:
        incident_num = int(incident_id.split("-")[1])
        if incident_num < 100:
            incident["repo_url"] = PYTHON_REPO_URL
        else:
            incident["repo_url"] = NODE_REPO_URL
    except Exception:
        incident["repo_url"] = str(BASE_PATH)

    return incident

@app.post("/incident")
async def process_incident(request: IncidentRequest, current_user: dict = Depends(get_current_user)):
    try:
        incident_data = request.model_dump()
        incident_data["repo_url"] = str(incident_data["repo_url"])
        
        print(f"\nUser {current_user['username']} requested resolution for:")
        print(incident_data)

        result = handle_incident(**incident_data)
        
        # Save resolution in DB if successful
        if result.get("status") == "success":
            db = get_db()
            await db.resolutions.insert_one({
                "incident_id": incident_data.get("id"),
                "resolved_by": current_user["username"],
                "resolved_at": datetime.utcnow(),
                "result": result
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------
# Health check
# -----------------------------
@app.get("/health")
async def health_check():
    db_status = await ping_db()
    return {
        "status": "ok",
        "service": "Hackathon Incident Fix Agent",
        "database": "connected" if db_status else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)