"""
SUMMARY:
Coordinates entire incident resolution pipeline.
1. Clone/update repo from GitHub
2. Extract structured signals (smart parsing)
3. Search file CONTENTS with signals
4. Return exact files + line numbers
5. Send to LLM for root cause analysis
"""

from services.repository_manager import clone_or_update_repo, get_repo_files
from agents.incident_agent import extract_signals
from services.search_service import search_files, search_by_function_name
from utils.file_utils import read_file
import json
from groq import Groq
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_groq_client():
    """Initialize Groq client with error handling"""
    if not GROQ_API_KEY:
        print("⚠️ WARNING: GROQ_API_KEY not set in environment variables")
        return None
    
    try:
        return Groq(api_key=GROQ_API_KEY, timeout=30)
    except Exception as e:
        print(f"⚠️ WARNING: Failed to initialize Groq client: {e}")
        return None

groq_client = get_groq_client()


def handle_incident(repo_url: str, description: str):
    """
    🚀 IMPROVED INCIDENT ANALYSIS FLOW
    
    Args:
        repo_url: GitHub repository URL
        description: Incident description
        
    Returns:
        Structured analysis with exact file locations and line numbers
    """
    
    # STEP 1: Clone/Update Repository
    print(f"\n▶ STEP 1: Handling Repository")
    repo_result = clone_or_update_repo(repo_url)
    
    if repo_result["status"] == "error":
        return {
            "status": "error",
            "message": repo_result["message"]
        }
    
    sandbox_path = repo_result["sandbox_path"]
    print(repo_result["message"])
    
    # STEP 2: List available files in sandbox   -- done 
    print(f"\n  STEP 2: Scanning Repository Files")
    repo_files = get_repo_files(sandbox_path)
        # Print all files
    for i, file in enumerate(repo_files, start=1):
        print(f"{i}. {file}") 
    print(f"📋 Found {len(repo_files)} files in sandbox")
    




    # STEP 3: Extract incident signals   -- done 
    print(f"\n STEP 3: Analyzing Incident Description (Smart Parsing)")
    signals = extract_signals(description, repo_files)
    
    print(f"  • Error Types: {signals.get('error_types', [])}")
    print(f"  • Functions: {signals.get('functions', [])}")
    print(f"  • File Paths: {signals.get('file_paths', [])}")
    print(f"  • Line Numbers: {signals.get('line_numbers', [])}")
    print(f"  • Keywords: {signals.get('keywords', [])[:10]}")

    
    # STEP 4: Search file CONTENTS
    print(f"\n▶️ STEP 4: Searching File Contents in Sandbox")
    candidate_files = search_files(signals, sandbox_path)
    print(f"🎯 Found {len(candidate_files)} files with matching content")

    # STEP 5: Search for specific functions (ONLY if we have function names)
    function_matches = []
    if signals.get("functions"):
        print(f"\n▶️ STEP 5: Searching for Function Definitions")
        function_matches = search_by_function_name(sandbox_path, signals.get("functions", []))
        print(f"🔧 Found {len(function_matches)} function definitions")
    else:
        print(f"\n▶️ STEP 5: No function names in query - skipping")
    
    # Analyze function matches with Groq
    if function_matches and groq_client:
        print(f"🤖 Analyzing function definitions with Groq...")
        function_analysis = analyze_functions_with_groq(
            function_matches,
            signals,
            description
        )
        print(f"✅ Function analysis: {function_analysis.get('summary', 'Analysis complete')}")
    else:
        function_analysis = {"functions": function_matches, "summary": "No analysis available"}
    




    # STEP 6: Prepare context for LLM and perform root cause analysis
    print(f"\n▶️ STEP 6: Preparing Analysis Context & Analyzing Root Cause")
    llm_context = prepare_llm_context(candidate_files, function_matches, description)
    
    # Use Groq for root cause analysis
    if groq_client:
        print(f"🧠 Running Groq root cause analysis...")
        root_cause_analysis = analyze_root_cause_with_groq(
            candidate_files,
            function_matches,
            signals,
            description,
            llm_context
        )
        llm_context["root_cause_analysis"] = root_cause_analysis
    else:
        print("⚠️ Groq API not configured, skipping LLM analysis")
        llm_context["root_cause_analysis"] = {"error": "Groq API key not available"}

    # STEP 7: Get content of related files, generate edits, and prepare for frontend
    edited_files = []
    if candidate_files and groq_client:
        print(f"\n▶️ STEP 7: Reading critical files & generating suggested edits")
        critical_paths = get_critical_file_paths(candidate_files, llm_context.get("root_cause_analysis") or {})
        edited_files = generate_edits_for_files(
            sandbox_path, critical_paths, llm_context.get("root_cause_analysis") or {}, description
        )
        print(f"📝 Generated edits for {len(edited_files)} files")

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
        "total_files": len(repo_files),
        "total_matches": len(candidate_files),
        "message": "✅ Root cause analysis complete"
    }


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

🐛 INCIDENT DESCRIPTION:
{description}

📊 SIGNALS EXTRACTED:
- Error Types: {signals.get('error_types', [])}
- Functions: {signals.get('functions', [])}
- Keywords: {signals.get('keywords', [])}

🔍 FUNCTION DEFINITIONS FOUND:
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
            print("⚠️ Groq returned empty response for function analysis")
            return {"functions": function_matches, "summary": "Analysis unavailable"}
        
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
        return analysis
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing failed in function analysis: {e}")
        return {"functions": function_matches, "error": "JSON parsing failed"}
    except Exception as e:
        print(f"⚠️ Function analysis failed: {type(e).__name__}: {e}")
        return {"functions": function_matches, "error": str(e)}


def analyze_root_cause_with_groq(candidate_files: list, function_matches: list, signals: dict, description: str, llm_context: dict) -> dict:
    """
    Use Groq LLM to perform deep root cause analysis based on all collected signals.
    """
    if not groq_client:
        return {"error": "Groq client not available", "status": "failed"}
    
    # Prepare file context (top 5 files)
    files_text = "\n".join([
        f"\n📄 {cf['file']}:\n" + "\n".join([
            f"  Line {m['line']} ({m['signal']}): {m['content']}"
            for m in cf['matches'][:5]
        ])
        for cf in candidate_files[:5]
    ])
    
    prompt = f"""
    You are a senior software engineer analyzing a critical incident.

    🐛 INCIDENT DESCRIPTION:
    {description}

    📊 SIGNALS EXTRACTED BY AI:
    - Error Types: {signals.get('error_types', [])}
    - Functions: {signals.get('functions', [])}
    - File Paths: {signals.get('file_paths', [])}
    - Keywords: {signals.get('keywords', [])}
    - Root Cause Guess: {signals.get('root_cause_guess', 'Unknown')}

    🔍 RELEVANT FILES & MATCHES:
    {files_text}

    📦 FUNCTIONS FOUND:
    {json.dumps(function_matches[:5], indent=2)}

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
            print("⚠️ Groq returned empty response for root cause analysis")
            return {"error": "Empty response", "status": "failed"}
        
        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(content)
        
        print(f"\n🎯 ROOT CAUSE: {analysis.get('root_cause', 'Unknown')}")
        print(f"🔴 SEVERITY: {analysis.get('severity', 'Unknown')}")
        print(f"📋 SUMMARY: {analysis.get('summary', '')}")
        
        return analysis
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing failed in root cause analysis: {e}")
        return {"error": f"JSON parsing failed: {e}", "status": "failed"}
    except Exception as e:
        print(f"⚠️ Root cause analysis failed: {type(e).__name__}: {e}")
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


def get_critical_file_paths(candidate_files: list, root_cause_analysis: dict) -> list:
    """
    Get 3-4 most relevant file paths for editing.
    Prefer critical_files from root cause analysis, else top candidate_files by score.
    """
    paths = []
    # Prefer LLM's critical_files if present
    critical = root_cause_analysis.get("critical_files") or []
    for cf in critical[:4]:
        f = cf.get("file") if isinstance(cf, dict) else None
        if f and f not in paths:
            paths.append(f)
    # Fill up to 4 with top candidate_files
    for cf in candidate_files:
        if len(paths) >= 4:
            break
        f = cf.get("file")
        if f and f not in paths:
            paths.append(f)
    return paths[:4]


def read_file_content(sandbox_path: str, relative_path: str) -> str | None:
    """Read full file content from sandbox. Returns None if unreadable."""
    try:
        full_path = Path(sandbox_path) / relative_path
        if not full_path.is_file():
            return None
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None


def generate_edits_for_files(
    sandbox_path: str,
    file_paths: list,
    root_cause_analysis: dict,
    description: str,
) -> list:
    """
    For each critical file: read content, ask LLM for edited version, return list of
    { file, original_content, edited_content, affected_lines, change_summary } for frontend.
    """
    if not groq_client or not file_paths:
        return []

    edited_list = []
    root_cause = root_cause_analysis.get("root_cause") or "Unknown"
    recommended = root_cause_analysis.get("recommended_fixes") or []
    recommended_text = "\n".join([
        f"- {r.get('action', r.get('description', ''))} (file: {r.get('file', '')})"
        for r in recommended[:5] if isinstance(r, dict)
    ]) if recommended else "None specified"

    for rel_path in file_paths:
        content = read_file_content(sandbox_path, rel_path)
        if not content or len(content) > 50000:
            continue

        prompt = f"""You are a senior engineer applying a fix for an incident.
            INCIDENT:
            {description[:2000]}

            ROOT CAUSE:
            {root_cause}

            RECOMMENDED FIXES:
            {recommended_text}

            FILE TO FIX (path: {rel_path}):
            ``` 
            {content}
            ```

            TASK: Produce the FULL corrected file content. Apply only the minimal changes needed to fix the issue. Preserve formatting and unrelated code. Return ONLY the file content inside a code block (no explanation outside). Use this format:
            ``` 
            <full file content here>
            ```
        """

        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You output only the corrected file content inside a single code block. No other text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                timeout=60
            )
            if not response or not response.choices:
                continue
            raw = response.choices[0].message.content.strip()
            edited_content = raw
            # Extract content from ``` ... ``` (take first code block body)
            if "```" in raw:
                parts = raw.split("```")
                if len(parts) >= 2:
                    block = parts[1].strip()
                    if not block.lower().startswith("json"):
                        edited_content = block
                    elif len(parts) >= 3:
                        edited_content = parts[2].strip()

            # Simple affected lines: where content differs
            orig_lines = content.splitlines()
            edit_lines = edited_content.splitlines()
            affected_lines = []
            for i, (a, b) in enumerate(zip(orig_lines, edit_lines)):
                if a != b:
                    affected_lines.append(i + 1)
            if len(edit_lines) != len(orig_lines):
                for j in range(min(len(orig_lines), len(edit_lines)), max(len(orig_lines), len(edit_lines))):
                    affected_lines.append(j + 1)

            edited_list.append({
                "file": rel_path,
                "original_content": content,
                "edited_content": edited_content,
                "affected_lines": list(sorted(set(affected_lines)))[:50],
                "change_summary": root_cause[:300]
            })
        except Exception as e:
            print(f"⚠️ Edit generation failed for {rel_path}: {e}")
            continue

    return edited_list

