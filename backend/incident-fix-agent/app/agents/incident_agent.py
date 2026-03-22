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
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_groq_client():
    """Initialize Groq client with error handling"""
    if not GROQ_API_KEY:
        print("WARNING: GROQ_API_KEY not set in environment variables")
        return None
    
    try:
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"WARNING: Failed to initialize Groq client: {e}")
        return None

client = get_groq_client()




def extract_signals_with_groq(context: dict) -> dict:
    """
    Uses Groq LLM to extract structured debugging signals.
    Accepts full incident context (description + optional fields).
    Returns {} if API fails.
    """

    if not client:
        return {}

    description = context.get("description", "")
    error_log = context.get("error_log", "")
    recent_changes = context.get("recent_changes", "")
    steps = context.get("steps_to_reproduce", [])

    prompt = f"""
You are an expert software debugging AI used in an autonomous incident response system.

Your task is to analyze an incident description and extract structured debugging signals
that help locate the root cause inside a source code repository.

IMPORTANT RULES:
1. Extract ONLY signals present or strongly implied in the text.
2. DO NOT hallucinate files, functions, or services.
3. If a field is missing, return an empty list.
4. Output STRICT valid JSON only.
5. No explanations, no markdown.

Return JSON with the following schema:

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

Error Log:
\"\"\"{error_log}\"\"\"

Recent Changes:
\"\"\"{recent_changes}\"\"\"

Steps To Reproduce:
\"\"\"{steps}\"\"\"
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You extract structured debugging signals."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=800,
            timeout=30
        )

        if not response or not response.choices:
            print("Groq returned empty response")
            return {}

        content = response.choices[0].message.content.strip()

        # Clean possible markdown
        content = content.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(content)

        # Ensure required keys exist
        default_schema = {
            "error_types": [],
            "functions": [],
            "services": [],
            "file_paths": [],
            "line_numbers": [],
            "keywords": [],
            "root_cause_guess": ""
        }

        for key in default_schema:
            parsed.setdefault(key, default_schema[key])

        return parsed

    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {e}")
        return {}

    except Exception as e:
        print(f"Groq Extraction Failed: {type(e).__name__}: {e}")
        return {}
   

def extract_signals_regex(description: str) -> dict:
    """
    Advanced rule-based signal extraction fallback.
    Extracts errors, functions, file paths, line numbers, services and keywords.
    """

    if not description:
        return {}

    text = description
    text_lower = description.lower()

    # -------------------------------
    # ERROR DETECTION
    # -------------------------------

    error_patterns = {
        "TypeError": r"\bTypeError\b",
        "AttributeError": r"\bAttributeError\b",
        "ReferenceError": r"\bReferenceError\b",
        "SyntaxError": r"\bSyntaxError\b",
        "ImportError": r"\b(ImportError|ModuleNotFoundError)\b",
        "KeyError": r"\bKeyError\b",
        "IndexError": r"\bIndexError\b",
        "ValueError": r"\bValueError\b",
        "RuntimeError": r"\bRuntimeError\b",
        "MemoryError": r"\bMemoryError\b",
        "FileNotFoundError": r"\b(FileNotFoundError|no such file)\b",
        "PermissionError": r"\bPermissionError\b",
        "TimeoutError": r"\bTimeoutError\b",
        "ConnectionError": r"\b(ConnectionError|ECONNREFUSED|ECONNRESET)\b",
    }

    detected_errors = [
        err for err, pattern in error_patterns.items()
        if re.search(pattern, text, re.IGNORECASE)
    ]

    # -------------------------------
    # FUNCTION DETECTION
    # -------------------------------

    function_pattern = r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\("

    functions = re.findall(function_pattern, text)

    stop_funcs = {"if", "for", "while", "switch", "return", "catch"}

    functions = [
        f for f in functions
        if f.lower() not in stop_funcs
    ]

    # -------------------------------
    # FILE PATH DETECTION
    # -------------------------------

    file_pattern = r"([a-zA-Z0-9_\-./]*\.(?:py|js|ts|jsx|tsx|java|cpp|c|go|rb|php|cs|rs))"

    files = re.findall(file_pattern, text)

    # -------------------------------
    # STACK TRACE DETECTION
    # -------------------------------

    stack_pattern = r'File\s+"([^"]+)",\s+line\s+(\d+)'

    stack_matches = re.findall(stack_pattern, text)

    for f, _ in stack_matches:
        files.append(f)

    # -------------------------------
    # LINE NUMBER DETECTION
    # -------------------------------

    line_pattern = r"(?:line\s+(\d+)|L(\d+)|:(\d+))"

    line_matches = re.findall(line_pattern, text_lower)

    line_numbers = [
        int(num)
        for group in line_matches
        for num in group
        if num
    ]

    # -------------------------------
    # SERVICE / MODULE DETECTION
    # -------------------------------

    service_pattern = r"\b([A-Z][a-zA-Z0-9]+(?:Service|Controller|Manager|Repository|Worker))\b"

    services = re.findall(service_pattern, text)

    # -------------------------------
    # KEYWORD DETECTION
    # -------------------------------

    tech_keywords = [
        "react", "node", "express", "mongodb", "sql", "redis",
        "docker", "kubernetes", "aws", "gcp", "azure",
        "flask", "django", "spring", "fastapi",
        "openai", "groq", "langchain", "transformers",
        "jwt", "oauth", "api", "database", "cache"
    ]

    keywords = [
        kw for kw in tech_keywords
        if kw in text_lower
    ]

    # -------------------------------
    # CLEANUP
    # -------------------------------

    functions = list(dict.fromkeys(functions))[:10]
    files = list(dict.fromkeys(files))[:10]
    services = list(dict.fromkeys(services))[:10]

    line_numbers = sorted(set(line_numbers))

    # -------------------------------
    # RETURN STRUCTURED SIGNALS
    # -------------------------------

    return {
        "error_types": detected_errors,
        "functions": functions,
        "services": services,
        "file_paths": files,
        "line_numbers": line_numbers,
        "keywords": keywords,
        "root_cause_guess": ""
    }


def extract_signals(description: str, repo_files: list = None, **incident_data) -> dict:
    """
    AI-first extraction, fallback to regex.
    """

    context = {
        "description": description,
        **incident_data
    }

    ai_result = extract_signals_with_groq(context)

    print("AI result:", ai_result)

    if ai_result and "keywords" in ai_result:

        if repo_files:
            ai_files = ai_result.get("file_paths", [])
            ai_result["file_paths"] = [
                f for f in ai_files if f in repo_files
            ]

        return ai_result

    return extract_signals_regex(description)

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