"""
Groq-powered semantic re-ranking for candidate files.

This sits on top of the existing heuristic search in search_service and
re-orders (or filters) the candidate files using a single LLM call.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List


def semantic_rerank_files(
    groq_client,
    description: str,
    signals: Dict[str, Any],
    candidate_files: List[Dict[str, Any]],
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    """
    Use Groq to re-rank candidate files by semantic relevance to the incident.

    If groq_client is unavailable or there are no candidates, the list is
    returned unchanged.
    """
    if not groq_client or not candidate_files:
        return candidate_files

    # Limit to a manageable subset for the prompt
    subset = candidate_files[: min(len(candidate_files), top_k)]

    items = []
    for cf in subset:
        context_preview = cf.get("context_lines") or []
        # Build a short, human-readable summary for the LLM
        lines = [
            f"L{c.get('line_number')}: {c.get('text', '')}"
            for c in context_preview[:5]
            if isinstance(c, dict)
        ]
        items.append(
            {
                "file": cf.get("file"),
                "score": cf.get("score"),
                "structural_issues": cf.get("structural_issues") or [],
                "context_preview": lines,
            }
        )

    prompt = f"""
You are triaging files in a codebase for a debugging incident.

INCIDENT DESCRIPTION:
{description}

EXTRACTED SIGNALS:
- Error types: {signals.get('error_types', [])}
- Functions: {signals.get('functions', [])}
- File paths: {signals.get('file_paths', [])}
- Keywords: {signals.get('keywords', [])}

CANDIDATE FILES (from a heuristic search):
{json.dumps(items, indent=2)}

TASK:
Rank these files by how likely they are to contain the root cause or require
changes for the fix. Consider both the file name and the context_preview lines.

Return ONLY valid JSON:
{{
  "ranking": [
    {{"file": "path/to/file", "relevance": 0.0}}
  ]
}}
Where relevance is between 0.0 and 1.0 (higher = more relevant).
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON-only ranking assistant. Return ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=40,
        )
        if not response or not response.choices:
            return candidate_files

        content = response.choices[0].message.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        ranking = data.get("ranking") or []
    except Exception:
        # On any failure, fall back to original ranking
        return candidate_files

    relevance_map = {
        str(item.get("file")): float(item.get("relevance", 0.0)) for item in ranking
    }

    # Combine original heuristic score with semantic relevance
    def _combined_score(cf: Dict[str, Any]) -> float:
        base = float(cf.get("score", 0.0))
        rel = relevance_map.get(str(cf.get("file")), 0.0)
        # Weighted combination: keep original signal but let semantic bump it
        return base + rel * 100.0

    reranked = sorted(candidate_files, key=_combined_score, reverse=True)
    return reranked

