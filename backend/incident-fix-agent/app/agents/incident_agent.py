"""
SUMMARY:
AI + Pattern-based structured signal extraction.
Groq LLM deeply understands incident description
and returns structured debugging signals.
Safe for FastAPI production use.
"""

import re
import json
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# -------------------------------------------------
# 🔐 Setup Groq Client (Secure Way)
# -------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_groq_client():
    """Initialize Groq client with error handling"""
    if not GROQ_API_KEY:
        print("⚠️ WARNING: GROQ_API_KEY not set in environment variables")
        return None
    
    try:
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"⚠️ WARNING: Failed to initialize Groq client: {e}")
        return None

client = get_groq_client()


import json

def extract_signals_with_groq(description: str) -> dict:
    """
    Uses Groq LLM to extract structured debugging signals.
    Returns {} if API fails.
    """

    if not client:
        return {}

    prompt = f"""
You are an expert software debugging AI used in an autonomous incident response system.

Your task is to analyze an incident description and extract structured debugging signals
that will help locate the root cause inside a source code repository.

IMPORTANT RULES:

1. Extract ONLY signals that appear or are strongly implied in the text.
2. Do NOT hallucinate functions, files, or services.
3. If something is not present, return an empty list.
4. Return STRICT JSON only.
5. Do NOT include explanations or markdown.
6. The output MUST be valid JSON.

Extract the following fields:

error_types:
Programming/runtime errors such as:
TypeError, ReferenceError, NullPointerException, ImportError, SyntaxError.

functions:
Function or method names mentioned in stack traces or logs.

services:
Service, module, controller, repository, manager, or component names.
Examples:
AuthService, UserService, PaymentService, OrderController, EmailWorker.

file_paths:
Any file paths or filenames mentioned.
Examples:
src/api/user.js
services/auth.py
controllers/orderController.ts

line_numbers:
Line numbers from stack traces.

keywords:
Important debugging keywords including:
- library names
- framework names
- database names
- API names
- config names
- variable names
- error messages

root_cause_guess:
A short one sentence guess about the probable cause.

Output Format (STRICT):

{{
"error_types": [],
"functions": [],
"services": [],
"file_paths": [],
"line_numbers": [],
"keywords": [],
"root_cause_guess": ""
}}

Incident Description:
\"\"\"{description}\"\"\"
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You extract structured debugging signals."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            timeout=30
        )

        if not response or not response.choices:
            print("⚠️ Groq returned empty response")
            return {}

        content = response.choices[0].message.content.strip()

        # remove markdown blocks if present
        content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing failed: {e}")
        return {}

    except Exception as e:
        print(f"⚠️ Groq Extraction Failed: {type(e).__name__}: {e}")
        return {}
    

   

def extract_signals_regex(description: str) -> dict:
    """
    Advanced rule-based signal extraction fallback.
    Extracts errors, functions, file paths, line numbers, and keywords.
    """

    if not description:
        return {}

    text = description
    text_lower = description.lower()

    # -------------------------------------------------
    # ERROR DETECTION
    # -------------------------------------------------
    error_patterns = {
        "type_error": r"\bTypeError\b",
        "attribute_error": r"\bAttributeError\b",
        "reference_error": r"\bReferenceError\b",
        "syntax_error": r"\bSyntaxError\b",
        "import_error": r"\b(ImportError|ModuleNotFoundError)\b",
        "key_error": r"\bKeyError\b",
        "index_error": r"\bIndexError\b",
        "value_error": r"\bValueError\b",
        "runtime_error": r"\bRuntimeError\b",
        "memory_error": r"\bMemoryError\b",
        "undefined": r"\b(undefined|not defined)\b",
        "null_pointer": r"\b(NoneType|null pointer|null)\b",
        "file_not_found": r"\b(FileNotFoundError|no such file)\b",
        "permission_error": r"\bPermissionError\b",
        "timeout_error": r"\bTimeoutError\b",
        "connection_error": r"\b(ConnectionError|ECONNREFUSED|ECONNRESET)\b",
    }

    detected_errors = [
        key for key, pattern in error_patterns.items()
        if re.search(pattern, text, re.IGNORECASE)
    ]

    # -------------------------------------------------
    # FUNCTION DETECTION
    # -------------------------------------------------
    function_pattern = r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\("

    functions = re.findall(function_pattern, text)

    # remove common false positives
    stop_funcs = {"if", "for", "while", "switch", "return", "catch"}

    functions = [
        f for f in functions
        if f.lower() not in stop_funcs
    ]

    # -------------------------------------------------
    # FILE PATH DETECTION
    # -------------------------------------------------
    file_pattern = r"([a-zA-Z0-9_\-./]*\.(?:py|js|ts|jsx|tsx|java|cpp|c|go|rb|php|cs|rs))"

    files = re.findall(file_pattern, text)

    # -------------------------------------------------
    # STACK TRACE PARSING
    # Example: File "app.py", line 42
    # -------------------------------------------------
    stack_pattern = r'File\s+"([^"]+)",\s+line\s+(\d+)'

    stack_matches = re.findall(stack_pattern, text)

    for f, _ in stack_matches:
        files.append(f)

    # -------------------------------------------------
    # LINE NUMBER DETECTION
    # -------------------------------------------------
    line_pattern = r"(?:line\s+(\d+)|L(\d+)|:(\d+))"

    line_matches = re.findall(line_pattern, text_lower)

    line_numbers = [
        int(num)
        for group in line_matches
        for num in group
        if num
    ]

    # -------------------------------------------------
    # KEYWORD EXTRACTION
    # -------------------------------------------------
    tech_keywords = [
        "react", "node", "express", "mongodb", "sql", "redis",
        "docker", "kubernetes", "aws", "gcp", "azure",
        "openai", "groq", "langchain", "transformers",
        "jwt", "oauth", "api", "database", "cache"
    ]

    keywords = [
        kw for kw in tech_keywords
        if kw in text_lower
    ]

    # -------------------------------------------------
    # CLEANUP
    # -------------------------------------------------
    functions = list(dict.fromkeys(functions))[:10]
    files = list(dict.fromkeys(files))[:10]
    line_numbers = sorted(set(line_numbers))

    return {
        "error_types": detected_errors,
        "functions": functions,
        "file_paths": files,
        "line_numbers": line_numbers,
        "keywords": keywords,
        "root_cause_guess": ""
    }

# -------------------------------------------------
# 🔁 HYBRID EXTRACTOR (MAIN FUNCTION)
# -------------------------------------------------
def extract_signals(description: str, repo_files: list = None) -> dict:
    """
    AI-first extraction, fallback to regex.
    Supports repo file validation.
    """

    # 1️⃣ Try AI
    ai_result = extract_signals_with_groq(description)
    print("ai result ", ai_result)

    if ai_result and "keywords" in ai_result:

        # Validate file paths against repo if provided
        if repo_files:
            ai_files = ai_result.get("file_paths", [])
            ai_result["file_paths"] = [
                f for f in ai_files if f in repo_files
            ]

        return ai_result

    # 2️⃣ Fallback to regex
    return extract_signals_regex(description)


# -------------------------------------------------
# 🧹 Keyword Extraction
# -------------------------------------------------
def extract_semantic_keywords(text: str) -> list:
    stop_words = {
        'the','a','an','and','or','but','in','on','at','to','for',
        'of','with','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','could',
        'should','may','might','can','this','that','these','those',
        'from','into','about','after','before','over','under'
    }

    words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', text.lower())
    keywords = [w for w in words if w not in stop_words and len(w) > 2]

    return sorted(list(set(keywords)))[:15]