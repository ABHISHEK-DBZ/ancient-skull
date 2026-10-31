import json
import re
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.core.exceptions import AIConfigurationError
from app.core.security import redact_secrets
from app.ai.schemas import GemmaMigrationProposal

SYSTEM_PROMPT = """You are an expert Python dependency migration planner powered by Gemma 4.
Analyze the target dependency, risk factors, and AST usage locations provided.
Propose a modern, active, well-maintained drop-in or near-equivalent replacement package.
You MUST output strictly valid JSON matching the following schema:
{
  "schema_version": "1.0.0",
  "dependency": "<original_package>",
  "risk_summary": "<summary_of_risks>",
  "candidate_replacement": "<candidate_package>",
  "reasons": ["<reason_1>", "<reason_2>"],
  "proposed_migration_steps": ["<step_1>", "<step_2>"],
  "expected_api_differences": [
    {"original_api": "<old_call>", "replacement_api": "<new_call>", "notes": "<notes>"}
  ],
  "relevant_source_locations": ["<file:line>"],
  "potential_compatibility_problems": ["<problem_1>"],
  "suggested_tests": ["<test_1>"],
  "estimated_migration_difficulty": "LOW" | "MEDIUM" | "HIGH",
  "confidence_explanation": "<explanation>",
  "assumptions_and_unknowns": ["<assumption_1>"]
}
Do not include any introductory or concluding text outside the JSON object.
"""

def validate_gemma_model_name(model_name: str) -> None:
    """Validate that the configured model is a Gemma 4 or compatible Gemma model."""
    normalized = model_name.lower().replace("-", "").replace("_", "")
    if "gemma" not in normalized:
        raise AIConfigurationError(
            f"Configured model '{model_name}' does not appear to be a Gemma 4 model. "
            "Please configure a valid Gemma 4 model (e.g., 'gemma-4-26b-a4b-it' or 'google/gemma-4-27b-it') in GEMMA_MODEL."
        )

def extract_json_from_text(text: str) -> Dict[str, Any]:
    """Extract JSON object from raw LLM text output even if surrounded by markdown code blocks or thoughts."""
    if not text:
        raise ValueError("Empty response text from LLM")

    # 1. Strip thought sections if present (e.g. <thought>...</thought>)
    cleaned = re.sub(r"<thought>.*?</thought>", "", text, flags=re.DOTALL).strip()

    # 2. Check for fenced JSON code block
    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fenced_match:
        try:
            return json.loads(fenced_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. Look for JSON objects using JSONDecoder.raw_decode
    decoder = json.JSONDecoder()
    candidates_json = []
    idx = 0
    while idx < len(cleaned):
        idx = cleaned.find("{", idx)
        if idx == -1:
            break
        try:
            obj, end_pos = decoder.raw_decode(cleaned[idx:])
            if isinstance(obj, dict):
                candidates_json.append(obj)
            idx += max(end_pos, 1)
        except json.JSONDecodeError:
            idx += 1

    if candidates_json:
        # Prioritize candidate with candidate_replacement or schema_version
        for obj in candidates_json:
            if "candidate_replacement" in obj:
                return obj
        return max(candidates_json, key=lambda d: len(d.keys()))

    # 4. Outermost braces fallback
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(cleaned[start:end+1])

    raise ValueError(f"Could not parse valid JSON object from LLM output: {text[:200]}")

class GemmaClient:
    """Client adapter for communicating with Gemma 4 via Google GenAI, OpenAI-compatible endpoints, or Ollama."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = settings.GEMMA_API_KEY if api_key is None else api_key
        self.base_url = (settings.GEMMA_API_BASE_URL if base_url is None else base_url).rstrip("/")
        self.model = settings.GEMMA_MODEL if model is None else model

    def is_configured(self) -> tuple[bool, str]:
        """Check if client is configured and ready."""
        is_local_ollama = "localhost" in self.base_url or "127.0.0.1" in self.base_url
        if not is_local_ollama and not self.api_key:
            return False, "GEMMA_API_KEY is not configured in environment."
        
        try:
            validate_gemma_model_name(self.model)
        except AIConfigurationError as e:
            return False, str(e)

        return True, "Gemma 4 provider configured."

    def plan_migration(
        self,
        package_name: str,
        pinned_version: Optional[str],
        risk_summary: str,
        ast_usages: list[Dict[str, Any]],
        project_python_version: str = ">=3.10",
        timeout: float = 60.0
    ) -> GemmaMigrationProposal:
        """
        Request a migration plan from Gemma 4 with bounded retries and fallback models.
        """
        configured, reason = self.is_configured()
        if not configured:
            raise AIConfigurationError(f"Cannot generate AI migration plan: {reason}")

        # Limit ast usages to bounded summary to avoid token overflow
        bounded_usages = []
        for u in ast_usages[:5]:
            bounded_usages.append({
                "file": u.get("file_path"),
                "line": u.get("line_number"),
                "symbol": u.get("referenced_symbol"),
                "call": u.get("call_expression"),
                "scope": u.get("enclosing_scope"),
                "snippet": u.get("code_snippet")
            })

        user_content = {
            "target_dependency": package_name,
            "current_version": pinned_version or "unpinned",
            "risk_evidence": risk_summary,
            "project_python_constraint": project_python_version,
            "observed_code_usages": bounded_usages
        }

        is_google_api = "googleapis.com" in self.base_url
        clean_model = self.model.replace("models/", "").replace("google/", "")

        # Candidate models to try in case one returns 500
        models_to_try = [clean_model]
        if clean_model != "gemma-4-26b-a4b-it" and is_google_api:
            models_to_try.append("gemma-4-26b-a4b-it")

        last_error = ""
        for model_candidate in models_to_try:
            for attempt in range(2):
                try:
                    with httpx.Client(timeout=timeout) as client:
                        if is_google_api:
                            # Send the key as a header; query strings leak into
                            # proxy and access logs.
                            endpoint = f"{self.base_url}/models/{model_candidate}:generateContent"
                            combined_text = (
                                f"{SYSTEM_PROMPT}\n\n"
                                f"Analyze the following dependency and output strictly valid JSON matching the schema:\n"
                                f"{json.dumps(user_content, indent=2)}"
                            )
                            payload = {
                                "contents": [{"parts": [{"text": combined_text}]}]
                            }
                            response = client.post(
                                endpoint,
                                json=payload,
                                headers={"x-goog-api-key": self.api_key},
                            )
                            if response.status_code != 200:
                                last_error = f"Google Gemma API error (HTTP {response.status_code}): {redact_secrets(response.text[:200])}"
                                # If it's a 500 error on this model, break inner loop to try next candidate model
                                if response.status_code == 500:
                                    break
                                continue

                            data = response.json()
                            candidates = data.get("candidates", [])
                            if not candidates:
                                last_error = "Google Gemma API returned no response candidates."
                                continue

                            parts = candidates[0].get("content", {}).get("parts", [])
                            # Separate thinking parts from final text
                            non_thought = [p.get("text", "") for p in parts if not p.get("thought", False)]
                            if non_thought:
                                raw_content = "".join(non_thought)
                            else:
                                raw_content = "".join([p.get("text", "") for p in parts])

                        else:
                            endpoint = f"{self.base_url}/chat/completions"
                            headers = {"Content-Type": "application/json"}
                            if self.api_key:
                                headers["Authorization"] = f"Bearer {self.api_key}"
                            payload = {
                                "model": self.model,
                                "messages": [
                                    {"role": "system", "content": SYSTEM_PROMPT},
                                    {"role": "user", "content": json.dumps(user_content, indent=2)}
                                ],
                                "temperature": 0.2,
                                "response_format": {"type": "json_object"} if "ollama" not in self.base_url else None
                            }
                            payload = {k: v for k, v in payload.items() if v is not None}
                            response = client.post(endpoint, headers=headers, json=payload)
                            if response.status_code != 200:
                                last_error = f"Gemma provider API error (HTTP {response.status_code}): {response.text[:200]}"
                                continue

                            data = response.json()
                            choices = data.get("choices", [])
                            if not choices:
                                last_error = "Gemma provider returned empty response choices."
                                continue
                            raw_content = choices[0].get("message", {}).get("content", "")

                        parsed_json = extract_json_from_text(raw_content)
                        # Ensure required fields have valid fallback defaults if LLM omitted any
                        if "dependency" not in parsed_json:
                            parsed_json["dependency"] = package_name
                        if "candidate_replacement" not in parsed_json:
                            parsed_json["candidate_replacement"] = "unknown"
                        if "schema_version" not in parsed_json:
                            parsed_json["schema_version"] = "1.0.0"

                        proposal = GemmaMigrationProposal(**parsed_json)
                        return proposal

                except Exception as e:
                    last_error = str(e)

        raise AIConfigurationError(f"Failed to obtain valid proposal from Gemma 4 after retries: {last_error}")
