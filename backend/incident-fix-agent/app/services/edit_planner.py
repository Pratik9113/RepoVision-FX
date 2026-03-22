"""
SUMMARY:
Plan and apply safe, high-confidence code edits based on incident signals and search results.
"""

from typing import List, Dict, Any, Optional
from pathlib import Path


HIGH_CONF_THRESHOLD = 45.0
MEDIUM_CONF_THRESHOLD = 30.0
MAX_FILES_TO_EDIT = 4


def _read_file_content(full_path: Path) -> Optional[str]:
    """Read full file content. Returns None if unreadable."""
    try:
        if not full_path.is_file():
            return None
        return full_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None


def _extract_code_block(raw: str) -> str:
    """
    Extract file content from an LLM response.
    Keeps the body of the first non-JSON ``` code block, or the raw text if no block.
    """
    raw = (raw or "").strip()
    if "```" not in raw:
        return raw

    parts = raw.split("```")
    # parts: [before, maybe lang+code, maybe more...]
    for block in parts[1:]:
        cleaned = block.strip()
        if not cleaned:
            continue
        lines = cleaned.splitlines()
        if not lines:
            continue
        first = lines[0].strip().lower()
        # Skip language tags like "json", "javascript", etc.
        if first in {"json", "javascript", "typescript", "python", "ts", "js"}:
            body = "\n".join(lines[1:]).strip()
            if body:
                return body
            continue
        return cleaned

    return raw


def _get_affected_lines(original: str, edited: str) -> List[int]:
    """
    Return the list of line numbers that differ between original and edited content.
    """
    orig_lines = (original or "").splitlines()
    edit_lines = (edited or "").splitlines()
    affected: List[int] = []

    for i, (a, b) in enumerate(zip(orig_lines, edit_lines)):
        if a != b:
            affected.append(i + 1)

    if len(edit_lines) != len(orig_lines):
        for j in range(min(len(orig_lines), len(edit_lines)), max(len(orig_lines), len(edit_lines))):
            affected.append(j + 1)

    return sorted(set(affected))[:50]


def _compute_file_confidence(
    candidate_file: Dict[str, Any],
    signals: Dict[str, Any],
    function_matches: List[Dict[str, Any]],
) -> float:
    """
    Compute a confidence score that this file is safe & relevant to auto-edit.
    Based on:
    - search_files score
    - whether file path matches signaled file_paths
    - whether functions appear here
    - structural issues
    """
    score = float(candidate_file.get("score", 0.0))
    file_path = str(candidate_file.get("file", "")).lower()

    # Boost if explicit file_paths from signals match
    for fp in signals.get("file_paths", []) or []:
        if fp and fp.lower() in file_path:
            score += 35.0

    # Boost if signaled functions appear in this file
    functions = set((signals.get("functions") or []))
    for fm in function_matches or []:
        if fm.get("file") == candidate_file.get("file") and fm.get("function_name") in functions:
            score += 15.0
    
    line_numbers = signals.get("line_numbers") or []

    for m in candidate_file.get("matches", []):
        if m.get("line") in line_numbers:
            score += 20

    # Slight penalty if only generic keywords, no structural issues and low base score
    structural_issues = candidate_file.get("structural_issues") or []
    if not structural_issues and score < 20:
        score *= 0.7

    return score


def build_edit_plan(
    signals: Dict[str, Any],
    candidate_files: List[Dict[str, Any]],
    function_matches: List[Dict[str, Any]],
    llm_context_root_cause_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Decide which files (if any) should be auto-edited.

    Returns:
    {
        "selected_files": [ { "file", "confidence", "focus_lines" } ],
        "all_candidates": [...],
        "reason": "..."
    }
    """

    if not candidate_files:
        return {
            "selected_files": [],
            "all_candidates": [],
            "reason": "No candidate files found for this incident.",
        }

    # Extract root cause files from LLM analysis
    llm_files = set()
    if llm_context_root_cause_analysis:
        critical = llm_context_root_cause_analysis.get("critical_files", [])
        for c in critical:
            f = c.get("file")
            if f:
                llm_files.add(str(Path(f).as_posix()).lower())

    annotated: List[Dict[str, Any]] = []

    for cf in candidate_files:

        file_path = str(Path(cf.get("file", "")).as_posix()).lower()
        conf = _compute_file_confidence(cf, signals, function_matches)

        # Boost confidence if LLM root cause mentions this file
        if file_path in llm_files:
            conf += 25

        matches = cf.get("matches") or []

        focus_lines = sorted(
            {
                m.get("line") or m.get("line_number")
                for m in matches
                if isinstance(m, dict) and m.get("line") or m.get("line_number")
            }
        )[:20]

        if conf >= HIGH_CONF_THRESHOLD:
            level = "high"
        elif conf >= MEDIUM_CONF_THRESHOLD:
            level = "medium"
        else:
            level = "low"

        annotated.append(
            {
                "file": cf.get("file"),
                "score": cf.get("score"),
                "confidence": round(conf, 2),
                "level": level,
                "focus_lines": focus_lines,
                "structural_issues": cf.get("structural_issues") or [],
            }
        )

    # Sort candidates by confidence
    annotated.sort(key=lambda x: x["confidence"], reverse=True)

    high = [a for a in annotated if a["level"] == "high"]

    selected: List[Dict[str, Any]] = []

    if high:

        max_conf = max(h["confidence"] for h in high)

        # Only files close to top confidence
        near_top = [h for h in high if h["confidence"] >= max_conf - 10]

        file_path_signals = [fp.lower() for fp in (signals.get("file_paths") or [])]
        func_signals = set(signals.get("functions") or [])

        strong: List[Dict[str, Any]] = []

        for h in near_top:

            path = (h["file"] or "").lower()

            has_fp = any(fp and fp in path for fp in file_path_signals)

            has_func = any(
                fm and str(Path(fm.get("file","")).as_posix()).lower() == path
                and fm.get("function_name") in func_signals
                for fm in (function_matches or [])
            )

            llm_match = path in llm_files

            if has_fp or has_func or llm_match:
                strong.append(h)

        candidates = strong if strong else near_top

        selected = candidates[:MAX_FILES_TO_EDIT]

    if not selected:

        top = annotated[0]

        reason = (
            "No high-confidence files to auto-edit. "
            f"Top candidate {top['file']} has confidence {top['confidence']}. "
            "Showing analysis only to avoid risky automatic changes."
        )

    else:

        reason = f"Selected {len(selected)} high-confidence files for targeted auto-edit."

    return {
        "selected_files": selected,
        "all_candidates": annotated,
        "reason": reason,
    }



## EPITOME pLS - correct the apply_edit_plan pipeline
def apply_edit_plan(
    plan: Dict[str, Any],
    sandbox_path: str,
    description: str,
    root_cause_analysis: Dict[str, Any],
    groq_client,
    signals: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Execute the edit plan using LLM.
    Only edits files selected by planner.
    """

    selected = plan.get("selected_files") or []
    if not groq_client or not selected:
        return []

    edited_list: List[Dict[str, Any]] = []

    root_cause = root_cause_analysis.get("root_cause") or "Unknown"
    recommended = root_cause_analysis.get("recommended_fixes") or []

    error_types = signals.get("error_types") or []
    keywords = signals.get("keywords") or []
    line_numbers = signals.get("line_numbers") or []
    incident_functions = signals.get("functions") or []

    error_types_str = ", ".join(error_types) if error_types else "Unknown"
    keywords_str = ", ".join(keywords) if keywords else "None"
    functions_str = ", ".join(incident_functions) if incident_functions else "None"

    recommended_text = (
        "\n".join(
            [
                f"- {r.get('action', r.get('description', ''))}"
                for r in recommended[:5]
                if isinstance(r, dict)
            ]
        )
        if recommended
        else "None specified"
    )

    base_path = Path(sandbox_path)

    for item in selected:
        try:
            rel_path = item.get("file")
            if not rel_path:
                continue

            full_path = base_path / rel_path

            if not full_path.exists():
                continue

            content = _read_file_content(full_path)

            if not content:
                continue

            # Skip huge files
            if len(content.splitlines()) > 1200:
                continue

            lines = content.splitlines()

            # Build bug context window
            context_block = ""
            if line_numbers:
                for ln in line_numbers:
                    try:
                        # Ensure ln is an int
                        curr_ln = int(ln)
                        start = max(0, curr_ln - 5)
                        end = min(len(lines), curr_ln + 5)
                        snippet = "\n".join(lines[start:end])
                        context_block += f"\n--- Code around line {curr_ln} ---\n{snippet}\n"
                    except (ValueError, TypeError):
                        continue

            focus_lines = item.get("focus_lines") or []
            focus_str = ", ".join(f"L{n}" for n in focus_lines) if focus_lines else "None"

            # Use a safer way to build the prompt to avoid f-string errors with code braces
            prompt_template = """
You are a senior backend engineer fixing a production incident.

INCIDENT DESCRIPTION:
{{DESCRIPTION}}

ROOT CAUSE (analysis):
{{ROOT_CAUSE}}

ERROR TYPE:
{{ERROR_TYPES}}

ERROR DETAILS:
{{KEYWORDS}}

RECOMMENDED FIXES:
{{RECOMMENDED}}

FILE PATH:
{{FILE_PATH}}

FULL FILE CONTENT:

{{CONTENT}}


RELEVANT BUG CONTEXT:
{{CONTEXT}}

Important hints:
- Most suspicious lines: {{FOCUS}}
- Incident mentioned functions: {{FUNCTIONS}}
- If there is a bytes vs string mismatch, fix encoding/decoding.
- If a function name typo exists, correct it consistently.

RULES:
- Fix ONLY the lines causing the error.
- Do NOT rewrite the whole file.
- Do NOT modify unrelated logic.
- Preserve formatting.

TASK:
Return ONLY the FULL corrected file inside ONE code block.
No explanation.
"""
            prompt = prompt_template.replace("{{DESCRIPTION}}", str(description[:2000]))
            prompt = prompt.replace("{{ROOT_CAUSE}}", str(root_cause))
            prompt = prompt.replace("{{ERROR_TYPES}}", str(error_types_str))
            prompt = prompt.replace("{{KEYWORDS}}", str(keywords_str))
            prompt = prompt.replace("{{RECOMMENDED}}", str(recommended_text))
            prompt = prompt.replace("{{FILE_PATH}}", str(rel_path))
            prompt = prompt.replace("{{CONTENT}}", str(content))
            prompt = prompt.replace("{{CONTEXT}}", str(context_block))
            prompt = prompt.replace("{{FOCUS}}", str(focus_str))
            prompt = prompt.replace("{{FUNCTIONS}}", str(functions_str))

            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "Return ONLY the corrected file inside a code block.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                timeout=60,
            )

            if not response or not response.choices:
                continue

            raw = response.choices[0].message.content.strip()

            edited_content = _extract_code_block(raw)

            if not edited_content:
                continue

            # Skip if identical
            if edited_content.strip() == content.strip():
                print(f"⚠️ Model returned identical file for {rel_path}")
                continue

            # Prevent huge hallucinated output
            if len(edited_content) > len(content) * 1.8:
                print(f"⚠️ Skipping suspiciously large edit for {rel_path}")
                continue

            affected_lines = _get_affected_lines(content, edited_content)

            edited_list.append(
                {
                    "file": rel_path,
                    "original_content": content,
                    "edited_content": edited_content,
                    "affected_lines": affected_lines,
                    "change_summary": str(root_cause)[:300],
                }
            )

        except Exception as e:
            print(f"⚠️ Edit generation failed for {rel_path if 'rel_path' in locals() else 'unknown'}: {e}")
            import traceback
            traceback.print_exc()
            continue

    return edited_list