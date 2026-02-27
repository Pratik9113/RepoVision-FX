# utils/llm.py
"""
Simple LLM wrapper for search_service using Groq
"""

import os
import json
from typing import Optional, Dict, Any

from groq import AsyncGroq


class LLMWrapper:
    """Simple LLM wrapper that returns mock data if Groq not available"""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.available = bool(self.api_key)

        if self.available:
            self.client = AsyncGroq(api_key=self.api_key)
        else:
            self.client = None

    async def call(
        self,
        prompt: str,
        response_format: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Call Groq LLM (mock implementation if no API key)"""

        if not self.available:
            print("⚠️ GROQ API key not found, using mock responses")
            return self._mock_response(prompt)

        try:
            response = await self.client.chat.completions.create(
                model="llama3-70b-8192",  # Fast + powerful model
                temperature=0.1,
                max_tokens=500,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a JSON-only response generator."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
            )

            content = response.choices[0].message.content.strip()

            # Try to parse JSON
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"text": content}

        except Exception as e:
            print(f"❌ Groq LLM call failed: {e}")
            return self._mock_response(prompt)

    def _mock_response(self, prompt: str) -> Dict[str, Any]:
        """Return mock response for testing"""
        return {
            "keywords": ["error", "fix", "bug"],
            "error_patterns": ["500", "timeout"],
            "services": ["api", "service"],
            "functions": ["main", "handler"]
        }


# Global instance
llm = LLMWrapper()


async def parse_user_description(text: str) -> Dict[str, Any]:
    """Parse user description to extract search signals"""

    prompt = f"""
Extract search terms from this user description:

"{text}"

Return ONLY valid JSON with:
- keywords: list of important keywords
- error_patterns: list of error codes/messages
- services: list of service names
- functions: list of function names

Example:
{{
    "keywords": ["payment", "timeout"],
    "error_patterns": ["500", "timeout"],
    "services": ["payment-api"],
    "functions": ["processPayment"]
}}
"""

    result = await llm.call(prompt)

    if result:
        return {
            "keywords": result.get("keywords", []),
            "error_patterns": result.get("error_patterns", []),
            "services": result.get("services", []),
            "functions": result.get("functions", [])
        }

    # Fallback
    return {
        "keywords": text.split()[:5],
        "error_patterns": [],
        "services": [],
        "functions": []
    }