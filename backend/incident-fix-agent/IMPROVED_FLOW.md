# 🚀 Improved Incident Analysis Flow

## Problem Solved

❌ **Old Way** (keyword-only search):
- User: "App crashes when saving user"
- System: Split into keywords → `['app', 'crashes', 'when', 'saving', 'user']`
- Search: Only match filenames like `save_user.js`
- Issue: No actual code content search, no line numbers, too many false positives

✅ **New Way** (smart parsing + content search):
- User: "App crashes when saving user"
- System: **Intelligent parsing** →
  - Error types: `[crash]`
  - Functions: `[saving, save]`
  - Keywords: `[app, crash, save, user]`
  - Line numbers: Auto-detected
- Search: Search **inside file contents** → Find actual matching code + line numbers
- Result: Exact files + line numbers + code context

---

## New Architecture

### 1. **Smart Signal Extraction** (`incident_agent.py`)

```python
signals = extract_signals(description, repo_files)

# Returns:
{
    "error_types": ["type_error", "crash"],      # Auto-detected error types
    "functions": ["save_user", "commit"],        # Function names mentioned
    "file_paths": ["src/services/user.py"],      # File paths mentioned
    "line_numbers": [42, 123],                   # Line refs in description
    "keywords": ["app", "crash", "save", "user"] # Semantic keywords
}
```

**Smart Detection:**
- TypeError, AttributeError, ReferenceError, etc.
- Function calls: `functionName()`
- File paths: `src/services/file.js`
- Line numbers: "line 42", "at 123"
- Semantic keywords (removes stop words)

### 2. **Content-Based Search** (`search_service.py`)

```python
# Search INSIDE files, not just filenames
candidate_files = search_files(signals, sandbox_path)

# Returns:
[
    {
        "file": "src/services/user.py",
        "matches": [
            {
                "line": 42,
                "content": "def save_user(data):",
                "signal": "save_user",
                "confidence": 1.0
            },
            {
                "line": 45,
                "content": "result = db.commit()",
                "signal": "commit",
                "confidence": 0.8
            }
        ]
    }
]
```

**Features:**
- Searches file **contents** (like VS Code Ctrl+F)
- Returns exact **line numbers**
- Shows the actual **code snippet**
- Confidence scoring (0-1)
- Skips `.git`, `node_modules`, `__pycache__`, etc.

### 3. **Function Definition Search**

```python
function_matches = search_by_function_name(sandbox_path, functions)

# Finds:
[
    {
        "file": "src/services/user.py",
        "line": 42,
        "content": "def save_user(data):",
        "type": "function_definition"
    }
]
```

---

## Flow Diagram

```
📝 User Description
        ↓
┌──────────────────────────────────────┐
│ 🧠 Smart Signal Extraction           │
├──────────────────────────────────────┤
│ • Error types                        │
│ • Function names                     │
│ • File paths                         │
│ • Line numbers                       │
│ • Keywords (semantic)                │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 🔍 Content Search in Sandbox         │
├──────────────────────────────────────┤
│ Search files for:                    │
│ • Keywords                           │
│ • Function names                     │
│ • Error types                        │
│ Return: FILE + LINE + CONTENT        │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 🎯 Function Definition Lookup        │
├──────────────────────────────────────┤
│ Find where functions are defined     │
│ Return: FILE + LINE + DEFINITION     │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 📊 Prepare LLM Context               │
├──────────────────────────────────────┤
│ Bundle all findings for LLM:         │
│ • Top 10 files with matches          │
│ • Top 5 function definitions         │
│ • Original incident description      │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 🧠 Root Cause Analysis               │
├──────────────────────────────────────┤
│ Deep analysis of the context items   │
│ to find the exact source of failure. │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 📝 Plan & Apply Edits                │
├──────────────────────────────────────┤
│ Generate targeted code fixes for     │
│ high-confidence files.               │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 🔗 GitHub PR Creation                │
├──────────────────────────────────────┤
│ Create branch, commit changes, and   │
│ open a Pull Request automatically.   │
└──────────────────────────────────────┘
        ↓
🤖 Incident Resolved!
```

---

## Example: Real Flow

### Input
```
Repo: https://github.com/Pratik9113/RAG-Powered-Chatbot-for-News-Websites.git
Description: "Build fails when saving embeddings to database with TypeError on line 42"
```

### Output

**Signal Extraction:**
```json
{
  "error_types": ["type_error"],
  "functions": ["saving", "embeddings"],
  "file_paths": [],
  "line_numbers": [42],
  "keywords": ["build", "fails", "saving", "embeddings", "database"]
}
```

**Content Search Results:**
```json
[
  {
    "file": "src/services/embedding_service.py",
    "matches": [
      {
        "line": 42,
        "content": "embedding = model.encode(text)",
        "signal": "saving",
        "confidence": 0.8
      },
      {
        "line": 45,
        "content": "db.save_embeddings(embedding)",
        "signal": "database",
        "confidence": 0.8
      }
    ]
  },
  {
    "file": "src/models/embedding.py",
    "matches": [
      {
        "line": 12,
        "content": "class Embedding:",
        "signal": "embeddings",
        "confidence": 0.9
      }
    ]
  }
]
```

**Frontend Display:**
```
🚨 Detected Error Types: type_error
🔧 Functions Mentioned: saving, embeddings
📍 Line Numbers: L42
🔑 Keywords: save, embedding, database, error...

📄 Files with Matching Content
  → src/services/embedding_service.py (2 matches)
    L42: embedding = model.encode(text)
    L45: db.save_embeddings(embedding)
  → src/models/embedding.py (1 match)
    L12: class Embedding:

🎯 Function Definitions Found
  → src/services/embedding_service.py:45 | db.save_embeddings(embedding)
```

---

## Supported Languages

Searchable file types:
- Python: `.py`
- JavaScript/TypeScript: `.js`, `.ts`, `.jsx`, `.tsx`
- Java: `.java`
- C/C++: `.cpp`, `.c`
- C#: `.cs`
- Go: `.go`
- Ruby: `.rb`
- PHP: `.php`
- Swift: `.swift`
- Config: `.json`, `.yaml`, `.yml`, `.xml`
- Web: `.html`, `.css`, `.scss`

---

## API Response

```json
{
  "status": "success",
  "repo_status": "cloned",
  "sandbox_path": "/path/to/sandbox/repo",
  
  "signals": {
    "error_types": ["type_error"],
    "functions": ["save", "commit"],
    "file_paths": ["src/services/user.py"],
    "line_numbers": [42],
    "keywords": ["save", "user", "database"]
  },
  
  "candidate_files": [
    {
      "file": "src/services/user.py",
      "matches": [...]
    }
  ],
  
  "function_matches": [
    {
      "file": "src/services/user.py",
      "line": 42,
      "content": "def save_user(data):",
      "type": "function_definition"
    }
  ],
  
  "llm_context": {
    "incident_description": "...",
    "files_with_matches": [...],
    "function_definitions": [...],
    "summary": "Found 5 files with potential issues"
  },
  
  "total_files": 245,
  "total_matches": 15,
  "message": "✅ Ready for root cause analysis"
}
```

---

## Next Steps

Now you can:

1. **Feed to LLM** → Use `llm_context` + actual file contents for root cause
2. **Generate Fix** → LLM knows exact files + lines to patch
3. **Validate** → Test patch in Docker sandbox
4. **Return Solution** → Show user the fix code + explanation

---

## Configuration

To customize:

**In `search_service.py`:**
- `should_search_file()` - Add/remove file extensions
- `search_file_content()` - Adjust matching logic
- Line limit: Change `[:100]` to show more code context

**In `incident_agent.py`:**
- `error_patterns` - Add new error types
- `extract_semantic_keywords()` - Adjust stop words

---

## Performance Notes

- **First run:** Clone repo (~1-30s depending on size)
- **Subsequent runs:** Pull latest (~1-5s)
- **Search:** Searches all files in parallel-friendly way
- **Result:** Typically 50-500ms per search

For very large repos (10K+ files), consider:
- Limiting file types further
- Ignoring test/docs folders
- Caching search results
