"""
SUMMARY:
Extracts keywords and structured signals from incident description.
"""

def extract_signals(description: str):
    keywords = description.lower().split()

    return {
        "keywords": keywords,
        "error_type": "generic"
    }