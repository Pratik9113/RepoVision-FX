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
    "intentional_crash_comment": r"(intentional.*crash|force.*crash|debug.*crash)"
}


## Bracket error in the files
BRACKETS = {"{": "}", "(": ")", "[": "]"}

## structural scan for each file so that it give youo an error before calling llm for each file 
def structural_scan(file_path: Path) -> Dict[str, Any]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return {"has_issue": False, "issues": []}

    issues = []

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

    if content.count("'") % 2 != 0:
        issues.append("unmatched_single_quote")
    if content.count('"') % 2 != 0:
        issues.append("unmatched_double_quote")

    for name, pattern in GENERIC_PATTERNS.items():
        if re.search(pattern, content, re.MULTILINE):
            issues.append(name)

    return {
        "has_issue": len(issues) > 0,
        "issues": list(set(issues))
    }




def search_files(signals: Dict[str, Any], sandbox_path: str) -> List[Dict[str, Any]]:

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

            if file.endswith(("package-lock.json", "yarn.lock")):
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

            if structural_result["has_issue"]:
                final_score += 40

            if final_score >= 5:
                candidate_files.append({
                    "file": str(rel_path),
                    "score": final_score,
                    "matches": matches["details"],
                    "context_lines": matches["context"],
                    "structural_issues": structural_result["issues"]
                })
                files_matched += 1

    candidate_files.sort(key=lambda x: x["score"], reverse=True)

    print(f"\n📊 Scanned: {files_scanned} files")
    print(f"✅ Matched: {files_matched} files")

    return candidate_files[:10]



def is_relevant_file(filename: str) -> bool:
    relevant_extensions = {
        '.py', '.js', '.ts', '.java', '.go', '.rb',
        '.php', '.cpp', '.c', '.h', '.cs',
        '.json', '.yaml', '.yml', '.toml', '.ini',
        '.md', '.txt',
        '.html', '.css', '.jsx', '.tsx',
        '.sql', '.conf'
    }

    if '.' not in filename:
        return filename.lower() in {'dockerfile', 'makefile', 'procfile'}

    ext = "." + filename.split('.')[-1].lower()
    return ext in relevant_extensions



def search_file_content(
    file_path: Path,
    keywords: List[str],
    error_patterns: List[str],
    service_names: List[str],
    function_names: List[str]
) -> Dict[str, Any]:

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

            # Keyword scoring
            for kw in keywords:
                if kw and kw.lower() in line_lower:
                    line_score += 5

            # Error patterns
            for err in error_patterns:
                if err and err.lower() in line_lower:
                    line_score += 25

            # Service names
            for service in service_names:
                if service and service.lower() in line_lower:
                    line_score += 8

            # Function names
            for func in function_names:
                if func and func.lower() in line_lower:
                    line_score += 15

            if line_score > 0:
                score += line_score
                if i not in seen_lines:
                    matches.append((i + 1, line.strip()))
                    seen_lines.add(i)

        context_lines = [
            {"line_number": lineno, "text": text}
            for lineno, text in matches[:5]
        ]

        return {
            "score": score,
            "details": matches[:10],
            "context": context_lines
        }

    except Exception:
        return {"score": 0, "details": [], "context": []}



## EPITOME --- this function yet to use for uopgradation pls check it --
def get_most_affected_file(
    candidate_files: List[Dict[str, Any]]
) -> Tuple[Optional[str], float, List]:

    if not candidate_files:
        return None, 0.0, []

    top = candidate_files[0]

    if len(candidate_files) > 1:
        second_score = candidate_files[1]["score"]
        dominance = top["score"] / max(second_score, 1)
    else:
        dominance = 2

    confidence = min(1.0, dominance / 2)

    return top["file"], round(confidence, 2), top.get("context_lines", [])