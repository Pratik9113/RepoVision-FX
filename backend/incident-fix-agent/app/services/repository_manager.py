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
from git import Repo  # pyright: ignore[reportMissingImports]
from git.exc import GitCommandError, InvalidGitRepositoryError  # pyright: ignore[reportMissingImports]
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
        # Check if repo_url is a local directory (Hackathon mode)
        local_path = Path(repo_url)
        if local_path.is_absolute() and local_path.exists() and local_path.is_dir():
            print(f"Using local directory (Hackathon Mode): {repo_url}")
            return {
                "status": "local",
                "sandbox_path": str(local_path.absolute()),
                "message": f"Using local directory at {repo_url}"
            }

        # Ensure sandbox exists
        SANDBOX_BASE_PATH.mkdir(parents=True, exist_ok=True)
        
        sandbox_path = get_sandbox_path(repo_url)

        if sandbox_path.exists():
            # If folder exists but is not a git repo, clean and reclone
            git_dir = sandbox_path / ".git"
            if not git_dir.exists():
                print(f"Sandbox exists but is not a git repo: {sandbox_path}. Cleaning and recloning...")
                shutil.rmtree(sandbox_path, ignore_errors=True)
                print(f"Cloning {repo_url} to {sandbox_path}...")
                Repo.clone_from(repo_url, str(sandbox_path))
                return {
                    "status": "recloned",
                    "sandbox_path": str(sandbox_path),
                    "message": f"Re-cloned repo to {sandbox_path} (was non-git folder)"
                }

            # Repo already exists - try to pull latest
            print(f"Repo exists at {sandbox_path}. Pulling latest...")
            try:
                repo = Repo(str(sandbox_path))
            except InvalidGitRepositoryError as ge_repo:
                # Folder has .git but is not a valid repo – clean and reclone
                print(f"Invalid git repo in sandbox ({sandbox_path}): {ge_repo}. Cleaning and recloning...")
                shutil.rmtree(sandbox_path, ignore_errors=True)
                print(f"Cloning {repo_url} to {sandbox_path}...")
                Repo.clone_from(repo_url, str(sandbox_path))
                return {
                    "status": "recloned",
                    "sandbox_path": str(sandbox_path),
                    "message": f"Re-cloned repo to {sandbox_path} (invalid git repo fixed)"
                }

            try:
                repo.remotes.origin.pull()
                return {
                    "status": "updated",
                    "sandbox_path": str(sandbox_path),
                    "message": f"Updated repo from {repo_url}"
                }
            except GitCommandError as ge:
                # If pull fails (bad state, branch mismatch, etc.), reclone cleanly
                print(f"git pull failed, recloning sandbox: {ge}")
                shutil.rmtree(sandbox_path, ignore_errors=True)
                print(f"Re-cloning {repo_url} to {sandbox_path}...")
                try:
                    Repo.clone_from(repo_url, str(sandbox_path))
                except GitCommandError as ge_clone:
                    # Handle case where destination dir still exists / not empty
                    if "already exists and is not an empty directory" in str(ge_clone):
                        print("Destination not empty on reclone, force-cleaning and retrying...")
                        shutil.rmtree(sandbox_path, ignore_errors=True)
                        Repo.clone_from(repo_url, str(sandbox_path))
                    else:
                        raise
                return {
                    "status": "recloned",
                    "sandbox_path": str(sandbox_path),
                    "message": f"Re-cloned repo to {sandbox_path} after pull failure"
                }
        else:
            # Clone fresh
            print(f" Cloning {repo_url} to {sandbox_path}...")
            try:
                Repo.clone_from(repo_url, str(sandbox_path))
            except GitCommandError as ge_clone:
                # Handle case where destination dir already exists / not empty
                if "already exists and is not an empty directory" in str(ge_clone):
                    print("Destination not empty on fresh clone, cleaning and retrying...")
                    shutil.rmtree(sandbox_path, ignore_errors=True)
                    Repo.clone_from(repo_url, str(sandbox_path))
                else:
                    raise
            
            return {
                "status": "cloned",
                "sandbox_path": str(sandbox_path),
                "message": f" Cloned repo to {sandbox_path}"
            }
            
    except Exception as e:
        error_msg = f" Error handling repo: {str(e)}"
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
        # Version control
        ".git",
        ".svn",
        ".hg",

        # Node / JS
        "node_modules",
        ".npm",
        ".yarn",
        ".pnpm-store",

        # Python
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".tox",
        ".venv",
        "venv",
        "env",

        # Java
        "target",
        ".gradle",
        "build",

        # .NET
        "bin",
        "obj",
        ".vs",

        # Frontend frameworks
        ".next",
        ".nuxt",
        ".svelte-kit",
        ".angular",
        ".expo",
        ".cache",

        # Build systems
        "dist",
        "out",
        "release",
        "debug",

        # Dev tools
        ".idea",
        ".vscode",
        ".history",

        # Testing
        "coverage",
        "test-results",

        # Docker / infra
        ".docker",
        ".terraform",

        # OS files
        ".DS_Store",
        "Thumbs.db",

        # Misc
        "logs",
        "tmp",
        "temp",
    }
    

    ignore_extensions = {
        # Logs
        ".log",

        # Lock files
        ".lock",

        # Temp files
        ".tmp",
        ".temp",

        # Environment
        ".env",

        # Compiled binaries
        ".exe",
        ".dll",
        ".so",
        ".dylib",
        ".class",
        ".jar",
        ".war",

        # Python compiled
        ".pyc",
        ".pyo",
        ".pyd",

        # Remove documentation will handle later ##EPITOME do it later
        ".md",
        ".rst",
        ".markdown"

        # Archives
        ".zip",
        ".tar",
        ".gz",
        ".rar",
        ".7z",

        # Database
        ".sqlite",
        ".db",

        # Images / media (usually not useful for code analysis)
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".mp4",
        ".mp3",

        # Fonts
        ".ttf",
        ".woff",
        ".woff2",

        # Map / build artifacts
        ".map",
    }

    for root, dirs, files in os.walk(sandbox):

        # Remove unwanted directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith(".")]

        for file in files:
            # Explicitly allow .env and .env.example
            if file.startswith(".") and file not in [".env", ".env.example"]:
                continue

            if Path(file).suffix in ignore_extensions and file not in [".env", ".env.example"]:
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


def delete_cloned_repos_folder() -> bool:
    """Delete the entire cloned_repos folder"""
    try:
        if SANDBOX_BASE_PATH.exists():
            shutil.rmtree(SANDBOX_BASE_PATH)
            print(f"Successfully deleted {SANDBOX_BASE_PATH}")
        return True
    except Exception as e:
        print(f"Error deleting cloned_repos folder: {e}")
        return False
