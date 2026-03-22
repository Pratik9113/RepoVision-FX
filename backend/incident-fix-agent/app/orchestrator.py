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
from app.services.search_service import search_files, search_by_function_name, search_file_content
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
import json
import re
import threading
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.services.vector_search import semantic_vector_search

import os



# Global state to prevent concurrent runs on the same repo
_active_repos = set()
_repo_lock = threading.Lock()

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")
HF_TOKEN = os.getenv("HF_TOKEN")

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



def extract_github_repo(repo_url: str) -> Optional[str]:
    """
    Extract 'owner/repo' from various GitHub URL formats.
    Returns None if not a GitHub URL.
    """
    if not repo_url or "github.com" not in repo_url:
        return None
    
    # Remove .git suffix if present
    clean_url = repo_url.replace(".git", "")
    
    # Standard format: https://github.com/owner/repo
    try:
        parts = clean_url.split("github.com/")[-1].split("/")
        if len(parts) >= 2:
            return f"{parts[0]}/{parts[1]}"
    except Exception:
        pass
        
    return None


def handle_incident(
        repo_url: str, 
        description: str, 
        slack_channel: str | None = None,
        **incident_data    
    ):
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
        print("cloning repo")
        repo_result = clone_or_update_repo(repo_url)
        print("cloning done", repo_result)
        if repo_result["status"] == "error":
            return {
                "status": "error",
                "message": repo_result["message"]
            }
        print("working fine")
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

        # # STEP 2.5: Early Environment Configuration Cross-Verification (Target Repo)
        # print(f"\n STEP 2.5: Environment Configuration Validation (Target Repository)")
        # if slack_channel:
        #     _send_slack_update(
        #         slack_channel,
        #         "2.5/8",
        #         "Quick-checking target repo environment configuration…",
        #     )

        # env_validation = cross_verify_env(
        #     sandbox_path=sandbox_path,
        #     description=description,
        #     repo_files=repo_files,
        #     candidate_files=None,
        # )

        # if env_validation and env_validation.get("mismatches_detected"):
        #     print(f"  [!] ENV MISMATCH DETECTED in target repo:")
        #     for detail in env_validation.get("details", []):
        #         print(f"      - {detail}")
        #     print(f"  [!] Root Cause Analysis: {env_validation.get('root_cause_analysis')}")
        #     print(f"  [!] Suggested Fix: {env_validation.get('suggested_fix')}")
        # else:
        #     msg = (
        #         env_validation.get("message", "No exact environment mismatches detected.")
        #         if env_validation
        #         else "No exact environment mismatches detected."
        #     )
        #     print(f"  {msg}")

        # STEP 3: Extract incident signals
        print(f"\n STEP 3: Analyzing Incident Description (Smart Parsing)")
        if slack_channel:
            _send_slack_update(slack_channel, "3/8", "Extracting debugging signals from description…")
        signals = extract_signals(description, repo_files,  **incident_data )

        
        print(f"  • Error Types: {signals.get('error_types', [])}")
        print(f"  • Services: {signals.get('services', [])}")
        print(f"  • Functions: {signals.get('functions', [])}")
        print(f"  • File Paths: {signals.get('file_paths', [])}")
        print(f"  • Keywords: {signals.get('keywords', [])[:10]}")
        print(f"  • root_cause_guess : {signals.get('root_cause_guess', 'Unknown')}")
        print(f"  • line_numbers  : {signals.get('line_numbers', [])}")

        # STEP 4: Hybrid Search (Grep + Vector)
        print(f"\n STEP 4: Hybrid Search (Keyword + Semantic)")
        if slack_channel:
            _send_slack_update(slack_channel, "4/8", "Performing hybrid search (Grep + Vector embeddings)…")
        
        print("display this line ")
        # 4a: Keyword Search (Grep)
        keyword_candidates = search_files(signals, sandbox_path)
        print(f"  • Keyword search found {len(keyword_candidates)} matches")

        print("display this line 2")

        # 4b: Semantic Vector Search
        semantic_candidates = semantic_vector_search(description, sandbox_path, repo_files)
        print(f"  • Vector search found {len(semantic_candidates)} matches")

        # 4c: Final File Scoring Algorithm (Hybrid Merge)
        hybrid_map = {}
        
        # Process Keyword matches
        for cand in keyword_candidates:
            file_path = cand["file"]
            hybrid_map[file_path] = {
                "file": file_path,
                "keyword_score": cand["score"],
                "semantic_score": 0,
                "structural_issues": cand.get("structural_issues", []),
                "matches": cand.get("matches", []),
                "context_lines": cand.get("context_lines", [])
            }

        # Process Semantic matches
        for cand in semantic_candidates:
            file_path = cand["file"]
            if file_path in hybrid_map:
                hybrid_map[file_path]["semantic_score"] = cand["semantic_score"]
            else:
                # If file wasn't caught by keyword search, we still scan it for context
                full_p = os.path.join(sandbox_path, file_path)
                matches_info = search_file_content(Path(full_p), signals.get("keywords", []), signals.get("error_types", []), signals.get("services", []), signals.get("functions", []), signals.get("file_paths", []), signals.get("root_cause_guess", ""), signals.get("line_numbers", []), description)
                
                hybrid_map[file_path] = {
                    "file": file_path,
                    "keyword_score": 0,
                    "semantic_score": cand["semantic_score"],
                    "structural_issues": [],
                    "matches": matches_info["details"],
                    "context_lines": matches_info["context"]
                }

        # Calculate Final Scores
        final_candidates = []
        for file_path, data in hybrid_map.items():
            # Formula: Combine Grep score + Vector Score + Structural Bonus
            k_score = data["keyword_score"]
            s_score = data["semantic_score"]
            structural_bonus = 20 if data["structural_issues"] else 0
            
            # Weighted hybrid score
            final_score = (k_score * 0.7) + (s_score * 0.3) + structural_bonus
            data["score"] = round(final_score, 2)
            final_candidates.append(data)

        # Sort by final hybrid score
        candidate_files = sorted(final_candidates, key=lambda x: x["score"], reverse=True)[:15]
        print(f"✅ Hybrid search completed: {len(candidate_files)} unique candidates identified")

        # 4b: Semantic re-ranking with Groq (Codebase Embedding-style search)
        if groq_client and candidate_files:
            candidate_files = semantic_rerank_files(
                groq_client=groq_client,
                description=description,
                signals=signals,
                candidate_files=candidate_files,
            )
            print("Re-ranked candidate files with Groq semantic signal")

        # STEP 4.7: Dependency Graph Expansion (Plan C)
        print(f"\n STEP 4.7: Dependency Graph Expansion")
        if slack_channel:
            _send_slack_update(slack_channel, "4.7/8", "Expanding search via dependency graph imports…")
            
        try:
            ast_index = build_ast_index(sandbox_path)
            dep_graph = build_dependency_graph(ast_index)
            
            # Identify top 3 confident candidates to expand from
            top_candidates = [f["file"] for f in candidate_files[:3]]
            expanded_files = set()
            
            for file_path in top_candidates:
                # Normalize path for graph lookup
                norm_path = file_path.replace("\\", "/")
                outbound = dep_graph.get(norm_path, set())
                
                for dep in outbound:
                    # Check if this dependency corresponds to any file in our repo
                    # (LLM or simple matching logic to resolve 'app.db' to 'app/db.py')
                    for repo_file in repo_files:
                        repo_file_norm = repo_file.replace("\\", "/")
                        # Simple match: if dep is in path or matches module name
                        if dep.replace(".", "/") in repo_file_norm or repo_file_norm.endswith(dep.replace(".", "/") + ".py"):
                             if repo_file_norm not in [f["file"] for f in candidate_files]:
                                 expanded_files.add(repo_file_norm)

            if expanded_files:
                print(f"  🔗 Found {len(expanded_files)} related files via dependencies: {list(expanded_files)}")
                for new_file in expanded_files:
                    # Scan the new file so it has context for the LLM
                    full_p = os.path.join(sandbox_path, new_file)
                    matches = search_file_content(Path(full_p), signals.get("keywords", []), signals.get("error_types", []), signals.get("services", []), signals.get("functions", []), signals.get("file_paths", []), signals.get("root_cause_guess", ""), signals.get("line_numbers", []))
                    
                    candidate_files.append({
                        "file": new_file,
                        "score": 30, # Moderate score for discovery
                        "matches": matches["details"],
                        "context_lines": matches["context"],
                        "structural_issues": [],
                        "discovery": "Dependency Graph"
                    })
                # Re-sort
                candidate_files.sort(key=lambda x: x["score"], reverse=True)
        except Exception as e:
            print(f"  [!] Dependency expansion failed: {e}")


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

        # Build lightweight AST + dependency graph for impact analysis if not already built
        if 'ast_index' not in locals():
            ast_index = build_ast_index(sandbox_path)
            dep_graph = build_dependency_graph(ast_index)
        top_files = [cf["file"] for cf in candidate_files[:3]] if candidate_files else []
        dep_summary = summarize_dependency_neighborhood(top_files, dep_graph)

        llm_context = prepare_llm_context(candidate_files, function_matches, description)
        llm_context["dependency_impact"] = dep_summary
        llm_context["ast_index_present"] = bool(ast_index.get("files"))
        
        # if env_validation:
        #     llm_context["env_validation"] = env_validation

        if groq_client:
            root_cause_analysis = analyze_root_cause_with_groq(
                candidate_files,
                function_matches,
                signals,
                description,
                llm_context
            )
            llm_context["root_cause_analysis"] = root_cause_analysis

            # Optional: Knowledge / best-practices enrichment based on error patterns
            knowledge_enrichment = enrich_with_knowledge(signals, root_cause_analysis)
            llm_context["knowledge_enrichment"] = knowledge_enrichment
        else:
            print("Groq API not configured, skipping LLM analysis and knowledge enrichment")
            llm_context["root_cause_analysis"] = {"error": "Groq API key not available"}
            llm_context["knowledge_enrichment"] = {
                "status": "skipped",
                "reason": "Groq API key not available",
            }

        # STEP 7: Plan and Apply Edits
        edited_files = []
        edit_plan = None
        print(f"\nSTEP 7: Planning and Generating Recommended Edits")
        if candidate_files and groq_client:
            if slack_channel:
                _send_slack_update(slack_channel, "7/8", "Generating targeted code fixes…")
            llm_context_root_cause_analysis = llm_context.get("root_cause_analysis") or {}
            edit_plan = build_edit_plan(signals, candidate_files, function_matches, llm_context_root_cause_analysis)
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

        # Determine target repo for PR
        target_repo = extract_github_repo(repo_url) or GITHUB_REPO
        
        # Inject environment config fixes into RCA for the PR
        final_rca = llm_context.get("root_cause_analysis") or {}
        # if env_validation and env_validation.get("mismatches_detected"):
        #     env_issue = env_validation.get("root_cause_analysis", "")
        #     env_fix = env_validation.get("suggested_fix", "")
        #     if not final_rca.get("root_cause"):
        #          final_rca["root_cause"] = f"Environment Misconfiguration: {env_issue}"
        #     else:
        #          final_rca["root_cause"] += f"\n\n**Environment Misconfiguration Detected:** {env_issue}"
                 
        #     if final_rca.get("summary"):
        #          final_rca["summary"] += f"\n\n**Suggested Config Fix:** {env_fix}"
        #     else:
        #          final_rca["summary"] = f"**Suggested Config Fix:** {env_fix}"
            
        #     # Explicitly store this for the PR Builder to create a nice markdown section
        #     final_rca["env_fix"] = env_fix
            
        #     # Store in the final implemented result context
        #     llm_context["final_implemented_env_fix"] = env_fix

        if edited_files and target_repo and GITHUB_TOKEN:
            try:
                print(f"TARGET REPO FOR PR: {target_repo}")
                print(f"Files to commit: {len(edited_files)}")
                pr_creator = GitHubPRCreator(GITHUB_TOKEN, target_repo)

                github_result = pr_creator.create_branch_and_pr(
                    sandbox_path=sandbox_path,
                    edited_files=edited_files,
                    root_cause_analysis=final_rca,
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
    
    prompt_template = """
                You are a code debugging expert. Analyze these function definitions in context of an incident.

                INCIDENT DESCRIPTION:
                {{DESCRIPTION}}

                SIGNALS EXTRACTED:
                - Error Types: {{ERROR_TYPES}}
                - Functions: {{FUNCTIONS}}
                - Keywords: {{KEYWORDS}}

                FUNCTION DEFINITIONS FOUND:
                {{FUNCTIONS_TEXT}}

                TASK:
                1. Identify which functions are most relevant to the incident
                2. Explain why each is important
                3. Highlight potential issues or suspicious patterns

                Return ONLY valid JSON:
                {
                "relevant_functions": [
                    {"file": "...", "line": 0, "reason": "...", "risk_level": "high/medium/low"}
                ],
                "suspicious_patterns": ["..."],
                "summary": "..."
                }
            """
    prompt = prompt_template.replace("{{DESCRIPTION}}", str(description))
    prompt = prompt.replace("{{ERROR_TYPES}}", str(signals.get('error_types', [])))
    prompt = prompt.replace("{{FUNCTIONS}}", str(signals.get('functions', [])))
    prompt = prompt.replace("{{KEYWORDS}}", str(signals.get('keywords', [])))
    prompt = prompt.replace("{{FUNCTIONS_TEXT}}", str(functions_text))
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert code analyzer. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
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

    print("Starting debug of root cause analysis...")
    print(f" \n step 1 :- candidate_files", candidate_files)
    print(f" \n step 2 :- function_matches", function_matches)
    print(f" \n step 3 :- signals", signals)
    print(f" \n step 4 :- description", description)
    print(f" \n step 5 :- llm_context", llm_context)
    print(f" \n step 6 LLM content", llm_context['dependency_impact'])

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
    prompt_template = """
                You are a senior software engineer analyzing a critical incident.

                INCIDENT DESCRIPTION:
                {{DESCRIPTION}}

                SIGNALS EXTRACTED BY AI:
                - Error Types: {{ERROR_TYPES}}
                - Functions: {{FUNCTIONS}}
                - File Paths: {{FILE_PATHS}}
                - Keywords: {{KEYWORDS}}
                - Root Cause Guess: {{ROOT_CAUSE_GUESS}}

                RELEVANT FILES & MATCHES:
                {{FILES_TEXT}}

                FUNCTIONS FOUND:
                {{FUNCTIONS_MATCHES}}

                DEPENDENCY IMPACT (from AST/graph analysis):
                {{DEP_IMPACT}}

                TASK - Provide comprehensive root cause analysis:
                1. What is the most likely root cause?
                2. Which files/functions are affected?
                3. What specific lines need investigation?
                4. Recommended steps to fix the issue
                5. Severity level (critical/high/medium/low)

                Return ONLY valid JSON:
                {
                "root_cause": "...",
                "affected_components": ["..."],
                "critical_files": [
                    {"file": "...", "lines": [1, 2, 3], "reason": "..."}
                ],
                "recommended_fixes": [
                    {"step": 1, "action": "...", "file": "...", "description": "..."}
                ],
                "severity": "critical|high|medium|low",
                "confidence": 0.0,
                "summary": "..."
                }
            """
    prompt = prompt_template.replace("{{DESCRIPTION}}", str(description))
    prompt = prompt.replace("{{ERROR_TYPES}}", str(signals.get('error_types', [])))
    prompt = prompt.replace("{{FUNCTIONS}}", str(signals.get('functions', [])))
    prompt = prompt.replace("{{FILE_PATHS}}", str(signals.get('file_paths', [])))
    prompt = prompt.replace("{{KEYWORDS}}", str(signals.get('keywords', [])))
    prompt = prompt.replace("{{ROOT_CAUSE_GUESS}}", str(signals.get('root_cause_guess', 'Unknown')))
    prompt = prompt.replace("{{FILES_TEXT}}", str(files_text))
    prompt = prompt.replace("{{FUNCTIONS_MATCHES}}", json.dumps(function_matches[:5], indent=2))
    prompt = prompt.replace("{{DEP_IMPACT}}", dep_impact_text)
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a senior code analyzer. Provide deep root cause analysis. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
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


def enrich_with_knowledge(signals: dict, root_cause: dict) -> dict:
    """
    Lightweight research / knowledge retrieval layer.

    Given extracted signals + root cause analysis JSON, ask the LLM for:
    - likely framework / technology involved
    - recommended documentation or search keywords
    - known common causes / best practices

    This is intentionally small and JSON-only so callers can safely display it
    in PRs or UIs without extra parsing.
    """
    if not groq_client:
        return {"status": "skipped", "reason": "groq_client_not_available"}

    try:
        prompt_template = """
You are an expert incident responder and software architect.
You are helping another agent fix production incidents.

INCIDENT SIGNALS:
- Error Types: {ERROR_TYPES}
- Services: {SERVICES}
- Functions: {FUNCTIONS}
- File Paths: {FILE_PATHS}
- Keywords: {KEYWORDS}

ROOT CAUSE ANALYSIS (structured JSON from a previous step):
{ROOT_CAUSE_JSON}

TASK:
1. Infer the most likely primary technology or framework(s) involved.
2. Propose 3–7 high-signal documentation topics or search keywords
   the engineer should look up (e.g. "Django database connection pooling").
3. List a few best practices or known pitfalls related to this incident pattern.

Return ONLY valid compact JSON:
{{
  "status": "ok",
  "likely_technologies": ["..."],
  "recommended_search_terms": ["..."],
  "best_practices": ["..."],
  "known_pitfalls": ["..."]
}}
"""
        prompt = prompt_template.format(
            ERROR_TYPES=str(signals.get("error_types", [])),
            SERVICES=str(signals.get("services", [])),
            FUNCTIONS=str(signals.get("functions", [])),
            FILE_PATHS=str(signals.get("file_paths", [])),
            KEYWORDS=str(signals.get("keywords", [])[:15]),
            ROOT_CAUSE_JSON=json.dumps(root_cause or {}, indent=2),
        )

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise assistant for incident response. Return ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )

        if not response or not response.choices:
            return {"status": "failed", "reason": "empty_response"}

        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)

        # Ensure required shape / defaults
        data.setdefault("status", "ok")
        data.setdefault("likely_technologies", [])
        data.setdefault("recommended_search_terms", [])
        data.setdefault("best_practices", [])
        data.setdefault("known_pitfalls", [])
        return data

    except json.JSONDecodeError as e:
        print(f"Knowledge enrichment JSON parsing failed: {e}")
        return {"status": "failed", "reason": f"json_error: {e}"}
    except Exception as e:
        print(f"Knowledge enrichment failed: {type(e).__name__}: {e}")
        return {"status": "failed", "reason": str(e)}


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


    
def cross_verify_env(
    sandbox_path: str,
    description: str,
    repo_files: Optional[List[str]] = None,
    candidate_files: Optional[List[Dict]] = None
) -> Dict:
    """
    Cross-verify environment configuration using .env and .env.example files.

    Design goals:
    - Be **deterministic first** (no LLM) for basic key-level mismatches.
    - Optionally use Groq to enrich the explanation with incident/code context.
    """
    env_content = ""
    env_example_content = ""

    # -----------------------------
    # Collect ENV files
    # -----------------------------
    env_candidates = {".env"}
    env_example_candidates = {".env.example", ".env.sample"}

    try:

        if repo_files:

            for file_path in repo_files:

                basename = os.path.basename(file_path)

                full_path = file_path
                if not os.path.isabs(full_path):
                    full_path = os.path.join(sandbox_path, file_path)

                if not os.path.exists(full_path):
                    continue

                if basename in env_candidates:
                    with open(full_path, "r", encoding="utf-8") as f:
                        env_content += f"\n--- {basename} ---\n{f.read()}\n"

                elif basename in env_example_candidates:
                    with open(full_path, "r", encoding="utf-8") as f:
                        env_example_content += f"\n--- {basename} ---\n{f.read()}\n"

        else:

            env_path = os.path.join(sandbox_path, ".env")
            env_example_path = os.path.join(sandbox_path, ".env.example")

            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    env_content = f.read()

            if os.path.exists(env_example_path):
                with open(env_example_path, "r", encoding="utf-8") as f:
                    env_example_content = f.read()

    except Exception as e:
        print(f"Error reading env files: {e}")

    if not env_content and not env_example_content:
        return {
            "mismatches_detected": False,
            "message": "No .env or .env.example files found.",
            "details": [],
        }

    # -----------------------------
    # Deterministic key-level diff (.env vs .env.example)
    # -----------------------------
    def _parse_env_keys(raw: str) -> set[str]:
        keys: set[str] = set()
        for raw_line in raw.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            name, _ = line.split("=", 1)
            name = name.strip()
            if name:
                keys.add(name)
        return keys

    env_keys = _parse_env_keys(env_content)
    example_keys = _parse_env_keys(env_example_content)

    missing_in_env = sorted(example_keys - env_keys)  # present in example, absent in .env
    extra_in_env = sorted(env_keys - example_keys)    # present in .env, absent in example

    details: List[str] = []
    if missing_in_env:
        details.append(
            "Variables present in .env.example but missing in .env: "
            + ", ".join(missing_in_env)
        )
    if extra_in_env:
        details.append(
            "Variables present in .env but not in .env.example: "
            + ", ".join(extra_in_env)
        )

    # -----------------------------
    # Deterministic code-usage diff (what the app actually expects)
    # -----------------------------
    used_keys: set[str] = set()

    if repo_files:
        # Light-weight scan: only look at likely-small, text-based files.
        for file_path in repo_files:
            if not isinstance(file_path, str):
                continue

            # Only scan common source/config extensions to keep this efficient.
            if not file_path.endswith(
                (".py", ".js", ".ts", ".tsx", ".jsx", ".env", ".ini", ".cfg", ".yml", ".yaml")
            ):
                continue

            full_path = file_path
            if not os.path.isabs(full_path):
                full_path = os.path.join(sandbox_path, file_path)

            if not os.path.exists(full_path):
                continue

            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    text = f.read()
            except Exception:
                continue

            # Python-style environment access
            for pattern in [
                r"os\.getenv\(\s*['\"]([A-Z0-9_]+)['\"]\s*\)",
                r"os\.environ\[\s*['\"]([A-Z0-9_]+)['\"]\s*\]",
            ]:
                for match in re.findall(pattern, text):
                    used_keys.add(match)

            # JavaScript/TypeScript-style access (process.env.MY_VAR)
            for match in re.findall(r"process\.env\.([A-Z0-9_]+)", text):
                used_keys.add(match)

    missing_for_code = sorted(used_keys - env_keys)  # used in code, not defined in .env

    if missing_for_code:
        details.append(
            "Variables referenced in code but missing in .env: "
            + ", ".join(missing_for_code)
        )

    # Base deterministic result – even if Groq is unavailable we still get value.
    deterministic_result: Dict[str, Any] = {
        "mismatches_detected": bool(missing_in_env or extra_in_env or missing_for_code),
        "root_cause_analysis": "",
        "suggested_fix": "",
        "details": details,
    }

    if not groq_client:
        # No LLM – return deterministic comparison only.
        if deterministic_result["mismatches_detected"]:
            deterministic_result["root_cause_analysis"] = (
                "Environment keys differ between .env and .env.example."
            )
            deterministic_result["suggested_fix"] = (
                "You have an env mismatch: align the keys in .env with .env.example "
                "and ensure all required variables are defined."
            )
        else:
            deterministic_result["message"] = "No key-level env mismatches detected."
        return deterministic_result

    # -----------------------------
    # Build Codebase Context
    # -----------------------------
    codebase_context = "No codebase text available."
    if candidate_files:
        codebase_context = "\n".join([
            f"\n File: {cf.get('file', 'Unknown')}:\n" + "\n".join([
                f"  Line {m.get('line', '?')}: {m.get('content', '')}"
                for m in cf.get('matches', [])[:20]
            ])
            for cf in candidate_files[:10]
        ])

    # -----------------------------
    # LLM Prompt (optional explanatory layer)
    # -----------------------------
    prompt = f"""
You are an expert system performing Environment Configuration Cross-Verification.

INCIDENT DESCRIPTION:
{description}

CODEBASE USAGE (where the app actually reads environment variables):
{codebase_context}

.env content:
{env_content if env_content else "None"}

.env.example content:
{env_example_content if env_example_content else "None"}

TASK:

1. Determine if the incident is caused by environment variable misconfiguration.
2. CRITICAL: Look strictly at the CODEBASE USAGE. If the codebase explicitly expects a specific variable, check if that EXACT variable exists as spelled in the `.env` file. Do not rely solely on `.env.example`; the codebase is the ultimate source of truth. You MUST find **ALL** typos, misspellings, or mismatches across the entire file! Do not stop at the first one!
3. Detect variables that contradict the incident description.

RULES:
- If everything looks correct → mismatches_detected = false
- If mismatch exists → explain briefly
- suggested_fix must follow format:

"You have an env mismatch: <short explanation>"

Return ONLY strict JSON.

Example:
{{
  "mismatches_detected": false,
  "root_cause_analysis": "",
  "suggested_fix": "",
  "details": []
}}
"""

    # -----------------------------
    # Call LLM
    # -----------------------------
    try:

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a debugging expert. Return ONLY JSON."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            timeout=30
        )

        if not response or not response.choices:
            return deterministic_result

        content = response.choices[0].message.content.strip()

        # Clean markdown wrappers
        content = content.replace("```json", "").replace("```", "").strip()

        llm_result = json.loads(content)

        # Merge deterministic structural info with LLM explanation, letting
        # deterministic key diff stay the source of truth for `mismatches_detected`.
        llm_result.setdefault("details", [])
        if details:
            # Prepend deterministic details so they are always visible.
            llm_result["details"] = details + llm_result.get("details", [])

        llm_result["mismatches_detected"] = deterministic_result["mismatches_detected"]

        if not llm_result.get("root_cause_analysis") and deterministic_result["mismatches_detected"]:
            llm_result["root_cause_analysis"] = (
                "Environment key mismatch detected between .env and .env.example."
            )
        if not llm_result.get("suggested_fix") and deterministic_result["mismatches_detected"]:
            llm_result["suggested_fix"] = (
                "You have an env mismatch: align .env keys with .env.example and "
                "ensure all required variables are defined and correctly spelled."
            )

        if not llm_result["mismatches_detected"] and not llm_result.get("message"):
            llm_result["message"] = "No key-level env mismatches detected."

        return llm_result

    except json.JSONDecodeError:
        print("Failed to parse JSON from LLM response.")
        return deterministic_result

    except Exception as e:
        print(f"Env verification failed: {e}")
        return deterministic_result