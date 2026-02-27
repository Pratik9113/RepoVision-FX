import os
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional


## Declared generic pattern for static searching in the file regarding any error
## EPITOME  ->  here add more generic pattern which cause error in your code 
GENERIC_PATTERNS = {
    "merge_conflict": r"(<<<<<<<|=======|>>>>>>>)",
    "todo_comment": r"(TODO|FIXME|BUG)",
    "hardcoded_secret": r"(api_key|apikey|password|secret|token)\s*[:=]\s*['\"].+['\"]",
    "eval_usage": r"\beval\s*\(",
    "exec_usage": r"\bexec\s*\(",
    "long_line": r".{300,}",
    "trailing_whitespace": r"[ \t]+$",
    "explicit_throw_error": r"\bthrow\s+new\s+Error\s*\(",
    "forced_process_exit": r"\bprocess\.exit\s*\(",
    "intentional_crash_comment": r"(intentional.*crash|force.*crash|debug.*crash)",
    "console_log": r"console\.log\s*\(",  # Added for debugging
    "deprecated_api": r"@deprecated|\bdeprecated\b",  # Added
    "insecure_code": r"(eval|document\.write|innerHTML\s*=)",  # Added
}


## Bracket error in the files
BRACKETS = {"{": "}", "(": ")", "[": "]"}

## structural scan for each file so that it give youo an error before calling llm for each file 
def structural_scan(file_path: Path) -> Dict[str, Any]:
    """
    Scan file for structural issues and generic patterns
    """
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return {"has_issue": False, "issues": []}

    issues = []

    # Check bracket matching
    stack = []
    for char in content:
        if char in BRACKETS:
            stack.append(char)
        elif char in BRACKETS.values():
            if not stack:
                issues.append("unmatched_closing_bracket")
                break
            last = stack.pop()
            if BRACKETS[last] != char:
                issues.append("mismatched_bracket")
                break

    if stack:
        issues.append("unclosed_bracket")

    # Check quotes
    if content.count("'") % 2 != 0:
        issues.append("unmatched_single_quote")
    if content.count('"') % 2 != 0:
        issues.append("unmatched_double_quote")

    # Check generic patterns
    for name, pattern in GENERIC_PATTERNS.items():
        if re.search(pattern, content, re.MULTILINE):
            issues.append(name)

    return {
        "has_issue": len(issues) > 0,
        "issues": list(set(issues))
    }


## EPITOME  ->  here add more generic pattern which cause error in your code 
FUNCTION_PATTERNS = [
    # Python
    r"def\s+{name}\s*\(",

    # JavaScript / TypeScript
    r"function\s+{name}\s*\(",
    r"(const|let|var)\s+{name}\s*=\s*\(",
    r"{name}\s*=\s*\(",
    r"{name}\s*:\s*function\s*\(",

    # Arrow function (JS/TS)
    r"(const|let|var)\s+{name}\s*=\s*.*=>",

    # Java / C# / C++
    r"(public|private|protected|static|\s)+\s*[\w<>\[\]]+\s+{name}\s*\(",

    # Go
    r"func\s+{name}\s*\(",

    # PHP
    r"function\s+{name}\s*\(",

    # Ruby
    r"def\s+{name}\b",

    # Generic fallback - function call
    r"{name}\s*\("
]


def search_by_function_name(
    sandbox_path: str,
    function_names: List[str]
) -> List[Dict[str, Any]]:
    """
    Search for function definitions in the codebase
    """
    if not function_names:
        return []

    matches = []
    sandbox = Path(sandbox_path)

    IGNORE_DIRS = {
        "node_modules", ".git", "__pycache__", "venv",
        "env", "dist", "build", "coverage", ".next",
        "public", "static", "assets", "images",
        "vendor", "bower_components"
    }

    print(f"\n🔍 Searching for function definitions: {', '.join(function_names)}")

    for root, dirs, files in os.walk(sandbox):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

        for file in files:
            file_path = Path(root) / file
            
            # Skip binary and large files
            if not is_relevant_file(file):
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
            except Exception:
                continue

            for func_name in function_names:
                if not func_name:
                    continue

                for pattern_template in FUNCTION_PATTERNS:
                    try:
                        pattern = pattern_template.format(name=re.escape(func_name))
                    except:
                        continue

                    for i, line in enumerate(lines):
                        if re.search(pattern, line, re.IGNORECASE):
                            try:
                                rel_path = file_path.relative_to(sandbox)
                            except ValueError:
                                continue
                                
                            # Extract some context lines for the LLM to understand the function (up to 20 lines)
                            context_lines = "".join(lines[max(0, i-2):i+20])
                            
                            matches.append({
                                "file": str(rel_path),
                                "line": i + 1,
                                "function_name": func_name,
                                "content": context_lines.strip()
                            })
                            
                            # Print found function
                            print(f"  ✅ Found {func_name} in {rel_path}:{i+1}")
                            break  # Found in this pattern, move to next


    print(f"  📊 Found {len(matches)} function definitions")
    return matches


def search_files(signals: Dict[str, Any], sandbox_path: str) -> List[Dict[str, Any]]:
    """
    Main search function - searches file contents with smart scoring
    """
    candidate_files = []
    sandbox = Path(sandbox_path)

    keywords = signals.get("keywords", [])
    error_patterns = signals.get("error_patterns", [])
    service_names = signals.get("services", [])
    function_names = signals.get("functions", [])

    IGNORE_DIRS = {
        "node_modules", ".git", "__pycache__", "venv",
        "env", "dist", "build", "coverage", ".next",
        "public", "static", "assets", "images",
        "vendor", "bower_components"
    }

    print(f"\n🔍 Searching in {sandbox_path}")

    files_scanned = 0
    files_matched = 0

    for root, dirs, files in os.walk(sandbox):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

        for file in files:
            if not is_relevant_file(file):
                continue

            if file.endswith(("package-lock.json", "yarn.lock", "pnpm-lock.yaml")):
                continue

            file_path = Path(root) / file

            try:
                rel_path = file_path.relative_to(sandbox)
            except ValueError:
                continue

            files_scanned += 1

            # 1️⃣ Semantic scoring (dynamic only)
            matches = search_file_content(
                file_path,
                keywords,
                error_patterns,
                service_names,
                function_names
            )

            # 2️⃣ Structural scanning
            structural_result = structural_scan(file_path)

            final_score = matches["score"]

            # Add structural issue bonus
            if structural_result["has_issue"]:
                final_score += 40  # Files with issues are more suspicious

            # File name boost (already in search_file_content, but double-check)
            file_lower = str(rel_path).lower()
            for svc in service_names:
                if svc and svc.lower() in file_lower:
                    final_score += 10

            if final_score >= 5:
                candidate_files.append({
                    "file": str(rel_path),
                    "score": final_score,
                    "matches": matches["details"],
                    "context_lines": matches["context"],
                    "structural_issues": structural_result["issues"]
                })
                files_matched += 1
                
                # Print important matches
                if final_score > 50:
                    print(f"  📄 Found: {rel_path} (score: {final_score})")

    candidate_files.sort(key=lambda x: x["score"], reverse=True)

    print(f"\n📊 Scanned: {files_scanned} files")
    print(f"✅ Matched: {files_matched} files")
    
    if candidate_files:
        print(f"🎯 Top 5 files:")
        for i, f in enumerate(candidate_files[:5]):
            print(f"   {i+1}. {f['file']} (score: {f['score']})")
            if f.get('structural_issues'):
                print(f"      Issues: {', '.join(f['structural_issues'][:3])}")

    return candidate_files[:10]  # Return top 10


def is_relevant_file(filename: str) -> bool:
    """
    Check if file type should be searched
    """
    relevant_extensions = {
        '.py', '.js', '.ts', '.java', '.go', '.rb',
        '.php', '.cpp', '.c', '.h', '.cs',
        '.json', '.yaml', '.yml', '.toml', '.ini',
        '.md', '.txt',
        '.html', '.css', '.jsx', '.tsx',
        '.sql', '.conf', '.env', '.sh', '.bash'
    }

    # Skip minified files
    if '.min.' in filename or '.bundle.' in filename:
        return False

    # Files with no extension
    if '.' not in filename:
        return filename.lower() in {'dockerfile', 'makefile', 'procfile', 'gemfile'}

    ext = "." + filename.split('.')[-1].lower()
    return ext in relevant_extensions


def search_file_content(
    file_path: Path,
    keywords: List[str],
    error_patterns: List[str],
    service_names: List[str],
    function_names: List[str]
) -> Dict[str, Any]:
    """
    Search a single file's content for matches with smart scoring
    """
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        score = 0
        matches = []
        seen_lines = set()

        file_lower = str(file_path).lower()

        # File name boosting (dynamic)
        important_terms = keywords + service_names + function_names
        for term in important_terms:
            if term and term.lower() in file_lower:
                score += 12

        # Line scanning
        for i, line in enumerate(lines):
            line_lower = line.lower()
            line_score = 0
            matched_terms = []

            # Keyword scoring
            for kw in keywords:
                if kw and kw.lower() in line_lower:
                    # Common words get lower score
                    if kw.lower() in ['server', 'client', 'data', 'get', 'set', 'error']:
                        line_score += 3
                    else:
                        line_score += 5
                    matched_terms.append(kw)

            # Error patterns - HIGHEST priority
            for err in error_patterns:
                if err and err.lower() in line_lower:
                    # Check context for more points
                    if 'try:' in line_lower or 'catch' in line_lower or 'except' in line_lower:
                        line_score += 35  # Error handling
                    elif 'return' in line_lower and ('error' in line_lower or 'null' in line_lower):
                        line_score += 30  # Returning error
                    else:
                        line_score += 25  # Just mentioning error
                    matched_terms.append(f"ERROR:{err}")

            # Service names
            for service in service_names:
                if service and service.lower() in line_lower:
                    line_score += 15
                    matched_terms.append(f"SERVICE:{service}")

            # Function names
            for func in function_names:
                if func and func.lower() in line_lower:
                    # Check if it's a function definition
                    if is_function_definition_line(line, func):
                        line_score += 50  # EXACT function definition
                    elif f"{func}(" in line_lower:
                        line_score += 30  # Function call
                    else:
                        line_score += 15  # Just mention
                    matched_terms.append(f"FUNCTION:{func}")

            if line_score > 0:
                score += line_score
                if i not in seen_lines:
                    matches.append((i + 1, line.strip(), matched_terms))
                    seen_lines.add(i)

        # Create context lines for display
        context_lines = []
        for lineno, text, terms in matches[:5]:
            context_lines.append({
                "line_number": lineno,
                "text": text[:100] + "..." if len(text) > 100 else text,
                "matched_terms": terms[:3]  # Show top 3 matched terms
            })

        return {
            "score": score,
            "details": [{"line": m[0], "content": m[1], "signal": ", ".join(m[2])} for m in matches[:10]],
            "context": context_lines
        }

    except Exception as e:
        # Silent fail for unreadable files
        return {"score": 0, "details": [], "context": []}


def is_function_definition_line(line: str, function_name: str) -> bool:
    """
    Check if a line contains a function definition
    """
    line = line.strip()
    func_lower = function_name.lower()
    line_lower = line.lower()

    # Python
    if f"def {func_lower}(" in line_lower:
        return True

    # JavaScript/TypeScript
    if f"function {func_lower}(" in line_lower:
        return True
    if (f"const {func_lower} =" in line_lower or 
        f"let {func_lower} =" in line_lower) and "=>" in line_lower:
        return True

    # Java/C#/C++
    keywords = ["public ", "private ", "protected ", "static ", "void ", "int ", "string "]
    if f" {func_lower}(" in line_lower and any(k in line_lower for k in keywords):
        return True

    # Go
    if f"func {func_lower}(" in line_lower:
        return True

    # Ruby
    if f"def {func_lower}" in line_lower:
        return True

    return False


def get_most_affected_file(
    candidate_files: List[Dict[str, Any]]
) -> Tuple[Optional[str], float, List]:
    """
    Get the file most likely to be the problem
    
    Returns:
        Tuple of (file_path, confidence, context_lines)
    """
    if not candidate_files:
        return None, 0.0, []

    top = candidate_files[0]

    # Calculate confidence based on score dominance
    if len(candidate_files) > 1:
        second_score = candidate_files[1]["score"]
        dominance = top["score"] / max(second_score, 1)
    else:
        dominance = 2.0  # Only one file found

    # Normalize confidence (max 1.0)
    confidence = min(1.0, dominance / 2.0)
    
    # Boost confidence if file has structural issues
    if top.get("structural_issues"):
        confidence = min(1.0, confidence * 1.2)

    return top["file"], round(confidence, 2), top.get("context_lines", [])


# Optional: Helper function to parse signals if LLM not available
def parse_signals_from_text(text: str) -> Dict[str, Any]:
    """
    Simple parser for when LLM is not available
    """
    text_lower = text.lower()
    words = text_lower.split()
    
    # Extract potential error patterns (numbers like 500, 404)
    error_patterns = [w for w in words if w.isdigit() and len(w) == 3]
    if 'error' in text_lower:
        error_patterns.append('error')
    
    # Extract potential service names
    services = []
    for w in words:
        if 'api' in w or 'service' in w:
            services.append(w)
    
    # Keywords are all significant words
    keywords = [w for w in words if len(w) > 3][:10]
    
    return {
        "keywords": keywords,
        "error_patterns": error_patterns,
        "services": services,
        "functions": []  # Can't detect functions without LLM
    }