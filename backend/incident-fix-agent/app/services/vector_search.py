"""
Semantic / Vector Search service using ChromaDB and SentenceTransformers.
This allows finding code concepts (e.g., 'db connection') that keyword search misses.
"""

import os
import chromadb
from typing import List, Dict, Any
from pathlib import Path

# Use a lightweight model for fast embeddings in sandboxed environments
from sentence_transformers import SentenceTransformer

# Initialize the model globally (Lazy load)
_model = None

def get_model():
    global _model
    if _model is None:
        hf_token = os.getenv("HF_TOKEN")
        print("hf_teokn",hf_token) 
        if hf_token:
            # Set it globally so all underlying HF libraries see it
            os.environ["HF_TOKEN"] = hf_token
            os.environ["HUGGING_FACE_HUB_TOKEN"] = hf_token
        
        # Using the absolute smallest/fastest model available
        # Note: 'UNEXPECTED' logs for position_ids are normal for this model architecture and can be ignored.
        _model = SentenceTransformer('all-MiniLM-L6-v2', use_auth_token=hf_token)
    return _model

def semantic_vector_search(query: str, sandbox_path: str, repo_files: List[str]) -> List[Dict[str, Any]]:
    """
    Perform a semantic vector search across the repository files.
    """
    try:
        model = get_model()
        client = chromadb.Client()
        
        # Create a unique collection for this run
        import uuid
        collection_name = f"repo_search_{uuid.uuid4().hex}"
        collection = client.create_collection(name=collection_name)

        # 1. Prepare documents (Chunking code files)
        documents = []
        metadatas = []
        ids = []

        for rel_path in repo_files[:200]: # Limit for performance
            full_path = os.path.join(sandbox_path, rel_path)
            if not os.path.isfile(full_path):
                continue
                
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                # Simple chunking: take first 1000 chars as 'summary' or concept
                # In production level, we'd use better chunking
                chunk = content[:1000] 
                if chunk.strip():
                    documents.append(chunk)
                    metadatas.append({"file": rel_path})
                    ids.append(rel_path)
            except:
                continue

        if not documents:
            return []

        # 2. Add to collection
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

        # 3. Query
        results = collection.query(
            query_texts=[query],
            n_results=min(10, len(documents))
        )

        # 4. Process results
        search_results = []
        if results['ids']:
            for i, file_id in enumerate(results['ids'][0]):
                score = 1.0 - (results['distances'][0][i] if results['distances'] else 0.5)
                search_results.append({
                    "file": file_id,
                    "semantic_score": round(score * 100, 2), # Scale to 0-100
                    "metadata": results['metadatas'][0][i]
                })

        return search_results

    except Exception as e:
        print(f"Vector search failed: {e}")
        return []