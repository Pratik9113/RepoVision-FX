import os
import networkx as nx
from pathlib import Path
from typing import List, Dict, Any, Tuple
from tree_sitter import Language, Parser

# You will need to build the tree-sitter binaries for Python and JS
# For this example, we'll construct a simplified naive AST relying strictly on AST standard lib for Python initially
import ast as python_ast

class CodeAnalysisService:
    def __init__(self, sandbox_path: str):
        self.sandbox_path = sandbox_path
        self.graph = nx.DiGraph()

    def build_dependency_graph(self) -> None:
        """
        Builds a basic Python-focused dependency and call graph using naive AST.
        """
        IGNORE_DIRS = {
            "node_modules", ".git", "__pycache__", "venv",
            "env", "dist", "build", "coverage", ".next",
            "public", "static", "assets", "images",
            "vendor", "bower_components"
        }

        print(f"Building dependency graph for {self.sandbox_path}...")
        
        sandbox = Path(self.sandbox_path)
        for root, dirs, files in os.walk(sandbox):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
            
            for file in files:
                if not file.endswith('.py'):
                    continue
                    
                file_path = Path(root) / file
                try:
                    rel_path = str(file_path.relative_to(sandbox))
                except ValueError:
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Parse AST
                    tree = python_ast.parse(content, filename=rel_path)
                    
                    # Store file node
                    self.graph.add_node(rel_path, type="file", content=content[:500])
                    
                    self._extract_python_edges(tree, rel_path, content)
                        
                except Exception as e:
                    print(f"Failed to parse {rel_path}: {e}")

        print(f"✅ Dependency graph built with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges.")

    def _extract_python_edges(self, tree: python_ast.AST, filepath: str, source: str) -> None:
        """Extract functions, classes, and calls from Python AST and add to graph."""
        lines = source.splitlines()
        
        for node in python_ast.walk(tree):
            # Function definitions
            if isinstance(node, python_ast.FunctionDef):
                func_id = f"{filepath}::{node.name}"
                self.graph.add_node(func_id, type="function", file=filepath, line=node.lineno)
                self.graph.add_edge(filepath, func_id, relation="defines")
                
                # Check for calls within this function
                for inner_node in python_ast.walk(node):
                    if isinstance(inner_node, python_ast.Call):
                        if isinstance(inner_node.func, python_ast.Name):
                            called_func = f"{filepath}::{inner_node.func.id}" # Assume local call for simplicity
                            self.graph.add_edge(func_id, called_func, relation="calls")
                        elif isinstance(inner_node.func, python_ast.Attribute):
                            # Method call: obj.method()
                            method_name = inner_node.func.attr
                            self.graph.add_edge(func_id, method_name, relation="calls_method")

            # Imports
            elif isinstance(node, python_ast.ImportFrom):
                module = node.module
                for alias in node.names:
                    imported = f"{module}.{alias.name}" if module else alias.name
                    self.graph.add_edge(filepath, imported, relation="imports")
            
            elif isinstance(node, python_ast.Import):
                for alias in node.names:
                    self.graph.add_edge(filepath, alias.name, relation="imports")

    def get_related_nodes(self, node_id: str, depth: int = 1) -> Dict[str, List[str]]:
        """Find interconnected functions or files up to a certain depth."""
        if not self.graph.has_node(node_id):
            return {"callers": [], "callees": [], "imports": []}
            
        callers = []
        callees = []
        
        # In-edges (Callers)
        for u, v, data in self.graph.in_edges(node_id, data=True):
            if data.get("relation") == "calls":
                callers.append(u)
                
        # Out-edges (Callees)
        for u, v, data in self.graph.out_edges(node_id, data=True):
            if data.get("relation") in ["calls", "calls_method"]:
                callees.append(v)
                
        return {
            "callers": callers,
            "callees": callees
        }
