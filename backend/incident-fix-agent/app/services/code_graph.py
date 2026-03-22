"""
Lightweight AST + dependency graph utilities for sandboxed repos.

Focus:
- Python: use built-in ast module for imports and symbol definitions.
- JS/TS: simple regex-based import scanning (good enough for impact analysis).

This is intentionally generic and side-effect free so it can run safely in the
sandboxed cloned repository without external dependencies.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Dict, List, Set, Any, Optional

# Reuse the same "what is code" logic as search_service so we don't miss
# tech stacks (.java, .go, .rb, .php, .cs, .cpp, etc.).
from app.services.search_service import is_relevant_file


def _is_code_file(path: Path) -> bool:
    """
    Return True if this file is likely to contain source code.

    Delegates to search_service.is_relevant_file so that any language you
    already consider for incident search (Python, JS/TS, Java, Go, Ruby,
    PHP, C/C++, C#, config files, etc.) is also visible to the graph layer.
    """
    return is_relevant_file(path.name)


def _safe_read(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None


def build_ast_index(sandbox_path: str) -> Dict[str, Any]:
    """
    Build a very lightweight AST index for the sandboxed repo.

    Returns:
        {
          "files": {
            "relative/path.py": {
               "language": "python",
               "symbols": [
                   {"name": "func", "kind": "function", "start_line": 10, "end_line": 25},
                   ...
               ],
               "imports": ["pkg.mod", "other_file", ...],
            },
            ...
          }
        }
    """
    root = Path(sandbox_path)
    index: Dict[str, Any] = {"files": {}}

    if not root.exists():
        return index

    for path in root.rglob("*"):
        if not path.is_file() or not _is_code_file(path):
            continue

        rel_path = str(path.relative_to(root)).replace("\\", "/")
        content = _safe_read(path)
        if content is None:
            continue

        # Language-specific enrichment where we have parsers; otherwise
        # keep a generic "unknown" node in the graph.
        if path.suffix == ".py":
            file_info = _analyze_python_file(content)
        elif path.suffix in {".js", ".jsx", ".ts", ".tsx"}:
            file_info = _analyze_js_like_file(content)
        else:
            file_info = {
                "language": path.suffix.lstrip(".").lower() or "unknown",
                "symbols": [],
                "imports": [],
            }

        file_info["relative_path"] = rel_path
        index["files"][rel_path] = file_info

    return index


def _analyze_python_file(source: str) -> Dict[str, Any]:
    symbols: List[Dict[str, Any]] = []
    imports: List[str] = []

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return {"language": "python", "symbols": symbols, "imports": imports}

    class Visitor(ast.NodeVisitor):
        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            symbols.append(
                {
                    "name": node.name,
                    "kind": "function",
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                }
            )
            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
            symbols.append(
                {
                    "name": node.name,
                    "kind": "async_function",
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                }
            )
            self.generic_visit(node)

        def visit_ClassDef(self, node: ast.ClassDef) -> None:
            symbols.append(
                {
                    "name": node.name,
                    "kind": "class",
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                }
            )
            self.generic_visit(node)

        def visit_Import(self, node: ast.Import) -> None:
            for alias in node.names:
                imports.append(alias.name)

        def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
            if node.module:
                imports.append(node.module)

    Visitor().visit(tree)
    return {"language": "python", "symbols": symbols, "imports": sorted(set(imports))}


_JS_IMPORT_RE = re.compile(
    r"""(?:import\s+.*?\s+from\s+['"](?P<from>[^'"]+)['"]|require\(\s*['"](?P<req>[^'"]+)['"]\s*\))""",
    re.MULTILINE,
)


def _analyze_js_like_file(source: str) -> Dict[str, Any]:
    imports: List[str] = []
    symbols: List[Dict[str, Any]] = []

    # Imports: ES modules or CommonJS require
    for m in _JS_IMPORT_RE.finditer(source):
        mod = m.group("from") or m.group("req")
        if mod:
            imports.append(mod)

    # Very rough function detection (for display only)
    lines = source.splitlines()
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("function "):
            name = stripped.split()[1].split("(")[0]
            symbols.append(
                {
                    "name": name,
                    "kind": "function",
                    "start_line": i,
                    "end_line": i,
                }
            )
        elif stripped.startswith(("const ", "let ", "var ")):
            # const foo = (...) => / function
            if "=" in stripped and ("=>" in stripped or "function" in stripped):
                try:
                    name = stripped.split()[1]
                except IndexError:
                    continue
                symbols.append(
                    {
                        "name": name,
                        "kind": "function_like",
                        "start_line": i,
                        "end_line": i,
                    }
                )

    return {
        "language": "javascript",
        "symbols": symbols,
        "imports": sorted(set(imports)),
    }


def build_dependency_graph(ast_index: Dict[str, Any]) -> Dict[str, Set[str]]:
    """
    Build a file-level dependency graph from the AST index.

    Graph:
        { "fileA.js": {"fileB.js", "node:fs", ...}, ... }
    """
    graph: Dict[str, Set[str]] = {}
    files = ast_index.get("files") or {}

    for rel_path, info in files.items():
        deps: Set[str] = set()
        for imp in info.get("imports") or []:
            deps.add(imp)
        graph[rel_path] = deps

    return graph


def summarize_dependency_neighborhood(
    target_files: List[str],
    graph: Dict[str, Set[str]],
    max_depth: int = 2,
) -> Dict[str, Any]:
    """
    Summarize the dependency neighborhood around a set of files.

    Returns:
        {
          "targets": [...],
          "outbound": { "file": ["dep1", "dep2"] },
          "inbound": { "file": ["used_by_1", ...] },
        }
    """
    if not target_files or not graph:
        return {"targets": [], "outbound": {}, "inbound": {}}

    targets = [t.replace("\\", "/") for t in target_files]

    # Outbound: straightforward from graph
    outbound: Dict[str, List[str]] = {}
    for t in targets:
        if t in graph:
            deps = list(sorted(graph.get(t, set())))
            outbound[t] = deps[:20]

    # Inbound: reverse edges (who depends on the target)
    inbound_raw: Dict[str, Set[str]] = {t: set() for t in targets}
    for src, deps in graph.items():
        for dep in deps:
            for t in targets:
                if dep == t or dep.endswith("/" + t):
                    inbound_raw[t].add(src)

    inbound: Dict[str, List[str]] = {
        t: list(sorted(v))[:20] for t, v in inbound_raw.items() if v
    }

    return {
        "targets": targets,
        "outbound": outbound,
        "inbound": inbound,
    }

