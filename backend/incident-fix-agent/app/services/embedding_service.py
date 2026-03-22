import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions
import hashlib

# Use ChromeDB's default embedding function (all-MiniLM-L6-v2)
default_ef = embedding_functions.DefaultEmbeddingFunction()

class EmbeddingService:
    def __init__(self, sandbox_path: str, persist_directory: str = "./chroma_db"):
        self.sandbox_path = sandbox_path
        self.persist_directory = persist_directory
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        
        # We uniquely identify collections by the sandbox repo directory name
        repo_name = os.path.basename(os.path.normpath(sandbox_path))
        # Ensure collection name is valid (alphanumeric, no spaces)
        safe_collection_name = "".join(c if c.isalnum() else "_" for c in repo_name)
        if not safe_collection_name:
            safe_collection_name = "default_repo"
            
        self.collection = self.client.get_or_create_collection(
            name=safe_collection_name,
            embedding_function=default_ef
        )

    def _chunk_text(self, text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
        """Split text into chunks with overlap."""
        chunks = []
        start = 0
        text_length = len(text)
        while start < text_length:
            end = start + chunk_size
            chunks.append(text[start:end])
            start = end - overlap
        return chunks

    def index_repository(self) -> None:
        """Indexes the entire repository into the vector database."""
        IGNORE_DIRS = {
            "node_modules", ".git", "__pycache__", "venv",
            "env", "dist", "build", "coverage", ".next",
            "public", "static", "assets", "images",
            "vendor", "bower_components"
        }
        
        relevant_extensions = {
            '.py', '.js', '.ts', '.java', '.go', '.rb',
            '.php', '.cpp', '.c', '.h', '.cs',
            '.json', '.yaml', '.yml', '.toml', '.ini',
            '.txt', '.html', '.css', '.jsx', '.tsx',
            '.sql', '.conf', '.env', '.sh', '.bash'
        }

        print(f"Indexing repository at {self.sandbox_path} into vector DB...")
        documents = []
        metadatas = []
        ids = []

        sandbox = Path(self.sandbox_path)
        for root, dirs, files in os.walk(sandbox):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
            
            for file in files:
                # Basic file filtering
                if '.min.' in file or '.bundle.' in file or file.endswith(('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml')):
                    continue
                
                ext = "." + file.split('.')[-1].lower() if '.' in file else ""
                if ext and ext not in relevant_extensions:
                    continue
                    
                file_path = Path(root) / file
                try:
                    rel_path = str(file_path.relative_to(sandbox))
                except ValueError:
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except Exception:
                    continue
                
                # Chunk content
                chunks = self._chunk_text(content)
                for i, chunk in enumerate(chunks):
                    if not chunk.strip():
                        continue
                    
                    chunk_id = f"{rel_path}_chunk_{i}"
                    # Simple hash to avoid huge ID strings if needed
                    chunk_hash = hashlib.md5(chunk_id.encode()).hexdigest()
                    
                    documents.append(chunk)
                    metadatas.append({"file_path": rel_path, "chunk_index": i})
                    ids.append(chunk_hash)

        # Batch add to ChromaDB
        if documents:
            batch_size = 500
            for i in range(0, len(documents), batch_size):
                self.collection.add(
                    documents=documents[i:i+batch_size],
                    metadatas=metadatas[i:i+batch_size],
                    ids=ids[i:i+batch_size]
                )
            print(f"✅ Indexed {len(documents)} chunks from repository.")
        else:
            print("No documents found to index.")

    def search(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search the codebase using natural language query."""
        if not query:
            return []
            
        print(f"🔍 Vector search for: '{query}'")
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            matches = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                    distance = results["distances"][0][i] if results.get("distances") else 0
                    
                    matches.append({
                        "file_path": metadata.get("file_path", "unknown"),
                        "content": doc,
                        "distance": distance,  # Lower distance means higher similarity
                        "chunk_index": metadata.get("chunk_index", 0)
                    })
            
            return matches
        except Exception as e:
            print(f"❌ Error during vector search: {e}")
            return []
