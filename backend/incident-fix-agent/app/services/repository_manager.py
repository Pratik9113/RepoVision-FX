"""
SUMMARY:
Manages repository cloning and caching in sandbox.
- Clone repo if not exists
- Pull latest if already exists
- Return local sandbox path
"""

import os
import hashlib
import shutil
from git import Repo
from pathlib import Path

SANDBOX_BASE_PATH = Path(__file__).parent.parent.parent / "sandbox" / "cloned_repos"


def get_repo_hash(repo_url: str) -> str:
    """Generate unique hash for repo URL"""
    return hashlib.md5(repo_url.encode()).hexdigest()[:12]


def get_sandbox_path(repo_url: str) -> Path:
    """Get sandbox folder path for a repo"""
    repo_hash = get_repo_hash(repo_url)
    repo_name = repo_url.split("/")[-1].replace(".git", "")
    sandbox_path = SANDBOX_BASE_PATH / f"{repo_name}_{repo_hash}"
    return sandbox_path


def clone_or_update_repo(repo_url: str) -> dict:
    """
    Clone repo to sandbox or update if exists.
    
    Args:
        repo_url: GitHub repo URL
        
    Returns:
        {
            "status": "cloned" | "updated" | "error",
            "sandbox_path": "/path/to/cloned/repo",
            "message": "Description of action"
        }
    """
    try:
        # Ensure sandbox exists
        SANDBOX_BASE_PATH.mkdir(parents=True, exist_ok=True)
        
        sandbox_path = get_sandbox_path(repo_url)
        
        if sandbox_path.exists():
            # Repo already exists - pull latest
            print(f"📦 Repo exists at {sandbox_path}. Pulling latest...")
            repo = Repo(str(sandbox_path))
            repo.remotes.origin.pull()
            
            return {
                "status": "updated",
                "sandbox_path": str(sandbox_path),
                "message": f"✅ Updated repo from {repo_url}"
            }
        else:
            # Clone fresh
            print(f"🔄 Cloning {repo_url} to {sandbox_path}...")
            Repo.clone_from(repo_url, str(sandbox_path))
            
            return {
                "status": "cloned",
                "sandbox_path": str(sandbox_path),
                "message": f"✅ Cloned repo to {sandbox_path}"
            }
            
    except Exception as e:
        error_msg = f"❌ Error handling repo: {str(e)}"
        return {
            "status": "error",
            "sandbox_path": None,
            "message": error_msg
        }



def get_repo_files(sandbox_path: str) -> list:
    """
    Get clean list of repo files (excluding unnecessary files/folders)
    """
    all_files = []
    sandbox = Path(sandbox_path)

    # Folders to ignore
    ignore_dirs = {
        ".git",
        "node_modules",
        "__pycache__",
        "dist",
        "build",
        ".idea",
        ".vscode",
        ".next",
        "coverage",
        "target",
        "bin",
        "obj"
    }

    # File extensions to ignore
    ignore_extensions = {
        ".log",
        ".lock",
        ".tmp",
        ".env"
    }

    for root, dirs, files in os.walk(sandbox):

        # Remove unwanted directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith(".")]

        for file in files:
            if file.startswith("."):
                continue

            if Path(file).suffix in ignore_extensions:
                continue

            full_path = Path(root) / file
            rel_path = full_path.relative_to(sandbox)

            all_files.append(str(rel_path))

    return all_files



def cleanup_sandbox(sandbox_path: str) -> bool:
    """Remove cloned repo from sandbox"""
    try:
        shutil.rmtree(sandbox_path)
        return True
    except Exception as e:
        print(f"Error cleaning up: {e}")
        return False
