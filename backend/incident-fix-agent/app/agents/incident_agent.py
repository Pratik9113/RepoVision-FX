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


# -------------------------------------------------
# 🤖 AI SIGNAL EXTRACTION
# -------------------------------------------------
def extract_signals_with_groq(description: str) -> dict:
    """
    Uses Groq LLM to extract structured debugging signals.
    Returns {} if API fails.
    """

    if not client:
        return {}

    prompt = f"""
You are a senior software debugging assistant.

Analyze this incident description and extract structured debugging signals.

Return ONLY valid JSON in this format:

{{
  "error_types": [],
  "functions": [],
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
            model="llama-3.3-70b-versatile",
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

        # Remove possible ```json blocks
        content = content.replace("```json", "").replace("```", "").strip()

        return json.loads(content)

    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing failed: {e}")
        return {}
    except Exception as e:
        print(f"⚠️ Groq Extraction Failed: {type(e).__name__}: {e}")
        return {}


# -------------------------------------------------
# 🧠 REGEX FALLBACK
# -------------------------------------------------
def extract_signals_regex(description: str) -> dict:
    """
    Fallback rule-based extraction
    """

    description_lower = description.lower()

    error_patterns = {
        'type_error': r'(TypeError|type error)',
        'attribute_error': r'(AttributeError|attribute error)',
        'reference_error': r'(ReferenceError|reference error)',
        'syntax_error': r'(SyntaxError|syntax error)',
        'import_error': r'(ImportError|ModuleNotFoundError)',
        'key_error': r'(KeyError)',
        'index_error': r'(IndexError)',
        'undefined': r'(undefined|not defined)',
        'null_pointer': r'(null|NoneType)',
        'file_not_found': r'(FileNotFoundError|no such file)'
    }

    detected_errors = [
        key for key, pattern in error_patterns.items()
        if re.search(pattern, description, re.IGNORECASE)
    ]

    function_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
    functions = re.findall(function_pattern, description)

    file_pattern = r'([a-zA-Z0-9_\-./]*\.(?:js|ts|py|java|cpp|go|rb|php|cs))'
    files = re.findall(file_pattern, description)

    line_pattern = r'(?:line\s+(\d+)|L(\d+))'
    line_matches = re.findall(line_pattern, description_lower)
    line_numbers = [int(num) for group in line_matches for num in group if num]

    keywords = extract_semantic_keywords(description)

    return {
        "error_types": detected_errors,
        "functions": functions[:5],
        "file_paths": files[:5],
        "line_numbers": sorted(set(line_numbers)),
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