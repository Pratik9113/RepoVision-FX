# github_integration.py - FIXED VERSION

from github import Github
import subprocess
from pathlib import Path
from datetime import datetime
import os


class GitHubPRCreator:
    def __init__(self, token: str, repo_name: str):
        self.token = token
        self.repo_name = repo_name
        # Use token with authentication
        self.github = Github(token)
        self.repo = self.github.get_repo(repo_name)

    def create_branch_and_pr(
        self,
        sandbox_path: str,
        edited_files: list,
        root_cause_analysis: dict,
        base_branch: str = "main"
    ):
        branch_name = f"RepoVision-FX-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        try:
            # 1️⃣ Check if git repo exists
            if not (Path(sandbox_path) / ".git").exists():
                raise Exception("Not a git repository")

            # 2️⃣ Configure git user (important!)
            subprocess.run(
                ["git", "config", "user.email", "agent@repovisionfx.com"],
                cwd=sandbox_path, check=True
            )
            subprocess.run(
                ["git", "config", "user.name", "RepoVision-FX Agent"],
                cwd=sandbox_path, check=True
            )

            # 3️⃣ Fetch latest from remote
            subprocess.run(["git", "fetch", "origin"], cwd=sandbox_path, check=True)

            # 4️⃣ Checkout base branch
            subprocess.run(
                ["git", "checkout", base_branch],
                cwd=sandbox_path, check=True
            )
            
            # 5️⃣ Pull latest changes
            print(f"🔄 Pulling latest from origin/{base_branch}...")
            try:
                subprocess.run(
                    ["git", "pull", "origin", base_branch, "--allow-unrelated-histories"],
                    cwd=sandbox_path, 
                    capture_output=True,
                    text=True,
                    check=True
                )
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Git pull notice: {e.stderr.strip()}")
                # If pull fails, we still try to proceed with what we have

            # 6️⃣ Create new local branch
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=sandbox_path, check=True
            )

            # 7️⃣ Apply edits
            for file in edited_files:
                full_path = Path(sandbox_path) / file["file"]
                # Create directory if it doesn't exist
                full_path.parent.mkdir(parents=True, exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(file["edited_content"])
                print(f"✅ Updated: {file['file']}")

            # 8️⃣ Commit changes
            subprocess.run(["git", "add", "."], cwd=sandbox_path, check=True)
            
            # Check if there are changes to commit
            status = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=sandbox_path, capture_output=True, text=True
            )
            
            if status.stdout.strip():
                env_msg = f"\n\nEnvironment Update:\n{root_cause_analysis.get('env_fix')}" if root_cause_analysis.get('env_fix') else ""
                commit_msg = f"🤖 Auto-fix: {root_cause_analysis.get('root_cause', 'Incident')}{env_msg}"
                subprocess.run(
                    ["git", "commit", "-m", commit_msg],
                    cwd=sandbox_path, check=True
                )
                print("✅ Changes committed")
            else:
                print("⚠️ No changes to commit")
                return {"status": "no_changes", "branch_name": branch_name}

            # 9️⃣ Set remote URL with token (FIXED)
            # Use HTTPS URL with token embedded
            remote_url = f"https://{self.token}@github.com/{self.repo_name}.git"
            subprocess.run(
                ["git", "remote", "set-url", "origin", remote_url],
                cwd=sandbox_path, check=True
            )

            # 🔟 Push branch (FIXED - with force flag if needed)
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name, "--force"],
                cwd=sandbox_path, capture_output=True, text=True
            )
            
            if push_result.returncode != 0:
                print(f"⚠️ Push failed: {push_result.stderr}")
                # Try with different authentication
                subprocess.run(
                    ["git", "push", "-u", "origin", branch_name],
                    cwd=sandbox_path, check=True
                )

            print(f"✅ Branch pushed: {branch_name}")

            # 1️⃣1️⃣ Create Pull Request
            pr_title = f"🤖 Auto-fix: {root_cause_analysis.get('root_cause', 'Incident')[:50]}"
            pr_body = self._build_pr_body(root_cause_analysis)
            
            pr = self.repo.create_pull(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=base_branch
            )
            print(f"✅ PR created: {pr.html_url}")

            return {
                "pr_url": pr.html_url,
                "branch_name": branch_name,
                "status": "created"
            }

        except subprocess.CalledProcessError as e:
            print(f"❌ Git command failed: {e.cmd}")
            print(f"   Error: {e.stderr}")
            raise
        except Exception as e:
            print(f"❌ PR creation failed: {e}")
            raise

    def _build_pr_body(self, analysis):
        """Build PR description with markdown"""
        env_section = ""
        if analysis.get('env_fix'):
            env_section = f"\n### ⚙️ Environment Update\n**Action Required:** {analysis.get('env_fix')}\n"

        return f"""## 🤖 Autonomous Incident Resolution

### 🐛 Root Cause
**{analysis.get('root_cause', 'Not specified')}**
{env_section}
### 🔧 Changes Applied
{analysis.get('summary', 'See commit diff for details')}

### 🚨 Severity
**{analysis.get('severity', 'unknown')}** / **Confidence: {analysis.get('confidence', 'N/A')}**

### 📋 Affected Components
{self._format_list(analysis.get('affected_components', []))}

### 📁 Critical Files
{self._format_critical_files(analysis.get('critical_files', []))}

### ✅ Recommended Actions
{self._format_recommendations(analysis.get('recommended_fixes', []))}

---
🤖 *Generated by Autonomous Engineering Agent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""

    def _format_list(self, items):
        if not items:
            return "- None"
        return "\n".join([f"- {item}" for item in items])

    def _format_critical_files(self, files):
        if not files:
            return "- None"
        result = []
        for f in files:
            if isinstance(f, dict):
                lines = f.get('lines', [])
                line_str = f" (lines: {', '.join(map(str, lines))})" if lines else ""
                result.append(f"- `{f.get('file', 'unknown')}`{line_str}: {f.get('reason', '')}")
        return "\n".join(result)

    def _format_recommendations(self, fixes):
        if not fixes:
            return "- No specific recommendations"
        result = []
        for fix in fixes:
            if isinstance(fix, dict):
                result.append(f"- **Step {fix.get('step', '?')}:** {fix.get('action', fix.get('description', ''))}")
        return "\n".join(result)