"""
SUMMARY:
Coordinates entire incident resolution pipeline.
    # STEP 1: Clone/Update Repository
    # STEP 2: List available files in sandbox
    # STEP 3: Extract incident signals
    # STEP 4: Search file CONTENTS
    # STEP 5: Search for specific functions
    # STEP 6: Root Cause Analysis
    # STEP 7: Plan and Apply Edits
    # STEP 8: Create GitHub PR
"""

from app.services.repository_manager import clone_or_update_repo, get_repo_files
from app.agents.incident_agent import extract_signals
from app.services.search_service import search_files, search_by_function_name
from app.services.edit_planner import build_edit_plan, apply_edit_plan
from app.services.semantic_rerank import semantic_rerank_files
from app.services.code_graph import (
    build_ast_index,
    build_dependency_graph,
    summarize_dependency_neighborhood,
)
from app.integration.github_pr_integration import GitHubPRCreator
from app.integration.slack_service import get_slack_service
from dotenv import load_dotenv
from groq import Groq
import os
import json
import threading

# Global state to prevent concurrent runs on the same repo
_active_repos = set()
_repo_lock = threading.Lock()

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")

def get_groq_client():
    """Initialize Groq client with error handling"""
    if not GROQ_API_KEY:
        print("WARNING: GROQ_API_KEY not set in environment variables")
        return None
    
    try:
        return Groq(api_key=GROQ_API_KEY, timeout=30)
    except Exception as e:
        print(f"WARNING: Failed to initialize Groq client: {e}")
        return None

groq_client = get_groq_client()


def _send_slack_update(slack_channel: str, step: str, message: str):
    try:
        slack = get_slack_service()
        if slack:
            slack.send_incident_update(slack_channel, step, message)
    except Exception:
        # Never fail the pipeline due to Slack
        pass


def handle_incident(repo_url: str, description: str, slack_channel: str = None):
    """
    IMPROVED INCIDENT ANALYSIS FLOW
    
    Args:
        repo_url: GitHub repository URL
        description: Incident description
        
    Returns:
        Structured analysis with exact file locations and line numbers
    """
    
    # CONCURRENCY GUARD: Check if this repo is already being processed
    with _repo_lock:
        if repo_url in _active_repos:
            msg = f"Pipeline already running for repo: {repo_url}. Please wait for it to complete."
            print(msg)
            if slack_channel:
                from app.integration.slack_service import get_slack_service
                slack = get_slack_service()
                if slack:
                    slack.send_message(slack_channel, msg)
            return {
                "status": "ignored",
                "message": msg
            }
        _active_repos.add(repo_url)

    try:
        # STEP 1: Clone/Update Repository
        print(f"\n STEP 1: Handling Repository")
        if slack_channel:
            _send_slack_update(slack_channel, "1/8", "Cloning/updating repository…")
        repo_result = clone_or_update_repo(repo_url)
        
        if repo_result["status"] == "error":
            return {
                "status": "error",
                "message": repo_result["message"]
            }
        
        sandbox_path = repo_result["sandbox_path"]
        print(repo_result["message"])
        




        # STEP 2: List available files in sandbox
        print(f"\n STEP 2: Scanning Repository Files")
        if slack_channel:
            _send_slack_update(slack_channel, "2/8", "Scanning and indexing repository files…")
        repo_files = get_repo_files(sandbox_path)
        
        # Print all files
        for i, file in enumerate(repo_files, start=1):
            print(f"{i}. {file}") 
        print(f"Found {len(repo_files)} files in sandbox")




        # STEP 3: Extract incident signals
        print(f"\n STEP 3: Analyzing Incident Description (Smart Parsing)")
        if slack_channel:
            _send_slack_update(slack_channel, "3/8", "Extracting debugging signals from description…")
        signals = extract_signals(description, repo_files)
        
        print(f"  • Error Types: {signals.get('error_types', [])}")
        print(f"  • Services: {signals.get('services', [])}")
        print(f"  • Functions: {signals.get('functions', [])}")
        print(f"  • File Paths: {signals.get('file_paths', [])}")
        print(f"  • Keywords: {signals.get('keywords', [])[:10]}")
        print(f"  • root_cause_guess : {signals.get('root_cause_guess', 'Unknown')}")
        print(f"  • line_numbers  : {signals.get('line_numbers', [])}")



        # STEP 4: Search file CONTENTS
        print(f"\n STEP 4: Searching File Contents in Sandbox")
        if slack_channel:
            _send_slack_update(slack_channel, "4/8", "Searching codebase for matches and patterns…")
        candidate_files = search_files(signals, sandbox_path)
        print(f"Found {len(candidate_files)} files with matching content")

        # 4b: Semantic re-ranking with Groq (Codebase Embedding-style search)
        if groq_client and candidate_files:
            candidate_files = semantic_rerank_files(
                groq_client=groq_client,
                description=description,
                signals=signals,
                candidate_files=candidate_files,
            )
            print("Re-ranked candidate files with Groq semantic signal")

        # STEP 5: Search for specific functions
        function_matches = []
        print(f"\n STEP 5: Searching for Function Definitions")
        if signals.get("functions"):
            if slack_channel:
                _send_slack_update(slack_channel, "5/8", "Finding function definitions and structures…")
            function_matches = search_by_function_name(sandbox_path, signals.get("functions", []))
            print(f"Found {len(function_matches)} function definitions")
        else:
            if slack_channel:
                _send_slack_update(slack_channel, "5/8", "No function names extracted - skipping lookup")
            print(f" No function names in query - skipping")
        
        # Analyze function matches with Groq
        if function_matches and groq_client:
            print(f"Analyzing function definitions with Groq...")
            function_analysis = analyze_functions_with_groq(
                function_matches,
                signals,
                description
            )
            print(f"Function analysis: {function_analysis.get('summary', 'Analysis complete')}")
        else:
            function_analysis = {"functions": function_matches, "summary": "No analysis available"}






        # STEP 6: Root Cause Analysis
        print(f"\n STEP 6: Performing Root Cause Analysis")
        if slack_channel:
            _send_slack_update(slack_channel, "6/8", "Running AI deep analysis for root cause…")

        # Build lightweight AST + dependency graph for impact analysis
        ast_index = build_ast_index(sandbox_path)
        dep_graph = build_dependency_graph(ast_index)
        top_files = [cf["file"] for cf in candidate_files[:3]] if candidate_files else []
        dep_summary = summarize_dependency_neighborhood(top_files, dep_graph)

        llm_context = prepare_llm_context(candidate_files, function_matches, description)
        llm_context["dependency_impact"] = dep_summary
        llm_context["ast_index_present"] = bool(ast_index.get("files"))

        if groq_client:
            root_cause_analysis = analyze_root_cause_with_groq(
                candidate_files,
                function_matches,
                signals,
                description,
                llm_context
            )
            llm_context["root_cause_analysis"] = root_cause_analysis
        else:
            print("Groq API not configured, skipping LLM analysis")
            llm_context["root_cause_analysis"] = {"error": "Groq API key not available"}







        # STEP 7: Plan and Apply Edits
        edited_files = []
        edit_plan = None
        print(f"\nSTEP 7: Planning and Generating Recommended Edits")
        if candidate_files and groq_client:
            if slack_channel:
                _send_slack_update(slack_channel, "7/8", "Generating targeted code fixes…")
            edit_plan = build_edit_plan(signals, candidate_files, function_matches)
            selected = edit_plan.get("selected_files") or []

            if selected:
                print(f"Selected {len(selected)} high-confidence files for auto-edit")
                edited_files = apply_edit_plan(
                    plan=edit_plan,
                    sandbox_path=sandbox_path,
                    description=description,
                    root_cause_analysis=llm_context.get("root_cause_analysis") or {},
                    groq_client=groq_client,
                    signals=signals,
                )
                print(f"Generated edits for {len(edited_files)} files")
            else:
                print(f" No files selected for auto-edit: {edit_plan.get('reason')}")







        # STEP 8: Create GitHub PR
        github_result = None
        print(f"\n STEP 8: Creating GitHub Pull Request")
        if slack_channel:
            _send_slack_update(slack_channel, "8/8", "Finalizing and pushing changes to GitHub…")

        if edited_files and GITHUB_REPO and GITHUB_TOKEN:
            try:
                print(f"Repo: {GITHUB_REPO}")
                print(f"Files to commit: {len(edited_files)}")
                pr_creator = GitHubPRCreator(GITHUB_TOKEN, GITHUB_REPO)

                github_result = pr_creator.create_branch_and_pr(
                    sandbox_path=sandbox_path,
                    edited_files=edited_files,
                    root_cause_analysis=llm_context.get("root_cause_analysis") or {},
                )

                if github_result and github_result.get("pr_url"):
                    print(f"PR Created: {github_result.get('pr_url')}")
                else:
                    print(f"PR creation returned: {github_result}")

            except Exception as e:
                print(f"GitHub PR creation failed: {e}")
                import traceback

                traceback.print_exc()
                github_result = {
                    "status": "failed",
                    "error": str(e),
                }
        else:
            missing = []
            if not edited_files:
                missing.append("edited_files")
            if not GITHUB_REPO:
                missing.append("GITHUB_REPO")
            if not GITHUB_TOKEN:
                missing.append("GITHUB_TOKEN")
            print(f"Skipping GitHub PR - missing: {', '.join(missing)}")

        return {
            "status": "success",
            "repo_status": repo_result["status"],
            "sandbox_path": sandbox_path,
            "signals": signals,
            "candidate_files": candidate_files,
            "function_matches": function_matches,
            "function_analysis": function_analysis,
            "llm_context": llm_context,
            "edited_files": edited_files,
            "edit_plan": edit_plan,
            "total_files": len(repo_files),
            "total_matches": len(candidate_files),
            "message": "Root cause analysis complete",
            "github_integration": github_result,
        }
    finally:
        # Always release the repo from active set
        with _repo_lock:
            if repo_url in _active_repos:
                _active_repos.remove(repo_url)

def analyze_functions_with_groq(function_matches: list, signals: dict, description: str) -> dict:
    """
    Use Groq LLM to analyze function definitions and their relevance to the incident.
    """
    if not groq_client or not function_matches:
        return {"functions": function_matches, "summary": "No analysis"}
    
    functions_text = "\n".join([
        f"File: {fm.get('file')}\nLine {fm.get('line')}: {fm.get('content')}"
        for fm in function_matches[:10]
    ])
    
    prompt = f"""
                You are a code debugging expert. Analyze these function definitions in context of an incident.

                INCIDENT DESCRIPTION:
                {description}

                SIGNALS EXTRACTED:
                - Error Types: {signals.get('error_types', [])}
                - Functions: {signals.get('functions', [])}
                - Keywords: {signals.get('keywords', [])}

                FUNCTION DEFINITIONS FOUND:
                {functions_text}

                TASK:
                1. Identify which functions are most relevant to the incident
                2. Explain why each is important
                3. Highlight potential issues or suspicious patterns

                Return ONLY valid JSON:
                {{
                "relevant_functions": [
                    {{"file": "...", "line": 0, "reason": "...", "risk_level": "high/medium/low"}}
                ],
                "suspicious_patterns": ["..."],
                "summary": "..."
                }}
            """
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert code analyzer. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            timeout=30
        )
        
        if not response or not response.choices:
            print("Groq returned empty response for function analysis")
            return {"functions": function_matches, "summary": "Analysis unavailable"}
        
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
        return analysis
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed in function analysis: {e}")
        return {"functions": function_matches, "error": "JSON parsing failed"}
    except Exception as e:
        print(f"Function analysis failed: {type(e).__name__}: {e}")
        return {"functions": function_matches, "error": str(e)}


def analyze_root_cause_with_groq(candidate_files: list, function_matches: list, signals: dict, description: str, llm_context: dict) -> dict:
    """
    Use Groq LLM to perform deep root cause analysis based on all collected signals.
    """
    if not groq_client:
        return {"error": "Groq client not available", "status": "failed"}
    
    # Prepare file context (top 5 files)
    files_text = "\n".join([
        f"\n {cf['file']}:\n" + "\n".join([
            f"  Line {m['line']} ({m['signal']}): {m['content']}"
            for m in cf['matches'][:5]
        ])
        for cf in candidate_files[:5]
    ])

    # Optional dependency impact summary from AST/graph
    dep_impact = llm_context.get("dependency_impact") if isinstance(llm_context, dict) else None
    dep_impact_text = json.dumps(dep_impact, indent=2) if dep_impact else "None"
    prompt = f"""
                You are a senior software engineer analyzing a critical incident.

                INCIDENT DESCRIPTION:
                {description}

                SIGNALS EXTRACTED BY AI:
                - Error Types: {signals.get('error_types', [])}
                - Functions: {signals.get('functions', [])}
                - File Paths: {signals.get('file_paths', [])}
                - Keywords: {signals.get('keywords', [])}
                - Root Cause Guess: {signals.get('root_cause_guess', 'Unknown')}

                RELEVANT FILES & MATCHES:
                {files_text}

                FUNCTIONS FOUND:
                {json.dumps(function_matches[:5], indent=2)}

                DEPENDENCY IMPACT (from AST/graph analysis):
                {dep_impact_text}

                TASK - Provide comprehensive root cause analysis:
                1. What is the most likely root cause?
                2. Which files/functions are affected?
                3. What specific lines need investigation?
                4. Recommended steps to fix the issue
                5. Severity level (critical/high/medium/low)

                Return ONLY valid JSON:
                {{
                "root_cause": "...",
                "affected_components": ["..."],
                "critical_files": [
                    {{"file": "...", "lines": [1, 2, 3], "reason": "..."}}
                ],
                "recommended_fixes": [
                    {{"step": 1, "action": "...", "file": "...", "description": "..."}}
                ],
                "severity": "critical|high|medium|low",
                "confidence": 0.0,
                "summary": "..."
                }}
            """
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a senior code analyzer. Provide deep root cause analysis. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            timeout=30
        )
        
        if not response or not response.choices:
            print("Groq returned empty response for root cause analysis")
            return {"error": "Empty response", "status": "failed"}
        
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
        
        print(f"\n ROOT CAUSE: {analysis.get('root_cause', 'Unknown')}")
        print(f"SEVERITY: {analysis.get('severity', 'Unknown')}")
        print(f"SUMMARY: {analysis.get('summary', '')}")
        
        return analysis
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed in root cause analysis: {e}")
        return {"error": f"JSON parsing failed: {e}", "status": "failed"}
    except Exception as e:
        print(f"Root cause analysis failed: {type(e).__name__}: {e}")
        return {"error": str(e), "status": "failed"}


def prepare_llm_context(candidate_files: list, function_matches: list, description: str) -> dict:
    """
    Prepare context for LLM analysis.
    Include top files and their content snippets.
    """
    
    context = {
        "incident_description": description,
        "files_with_matches": candidate_files[:10],
        "function_definitions": function_matches[:5],
        "summary": f"Found {len(candidate_files)} files with potential issues"
    }
    
    return context


