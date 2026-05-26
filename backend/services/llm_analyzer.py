"""
Local LLM analysis service using Ollama.
Upgraded: strict scam-detection system prompt, higher risk boosts.
"""

import json
import logging
import httpx

logger = logging.getLogger("guardianangel.llm")

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"
TIMEOUT = 30.0

# ─── Strict system prompt ─────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an advanced scam detection AI for phone calls protecting elderly and vulnerable people.

Your job is to AGGRESSIVELY detect:
- Any request for money, cash, funds, loans, or financial transfers
- OTP, password, PIN, CVV, or any security credential requests
- Urgency pressure tactics ("send now", "immediately", "emergency")
- Impersonation of family members, bank officials, police, or government
- Emotional manipulation ("I'm in danger", "hospital", "accident")
- Isolation tactics ("don't tell anyone", "keep this secret")
- False authority threats ("your account will be blocked", "you will be arrested")
- Investment/crypto scams, lottery/prize scams, KYC fraud
- Remote access requests (AnyDesk, TeamViewer)

CRITICAL RULES:
1. If ANYONE asks for money in ANY form — even politely — this is HIGH RISK
2. If ANYONE asks for OTP, password, PIN, or bank details — this is CRITICAL RISK
3. If there is ANY urgency combined with money/credentials — this is SCAM
4. NEVER label a call SAFE if it contains financial requests
5. Be CONSERVATIVE: when in doubt, mark as suspicious or high risk
6. A polite tone does NOT reduce risk — scammers are always polite

VERDICT SCALE:
- 0-20: SAFE (no suspicious content at all)
- 21-50: SUSPICIOUS (mild red flags)
- 51-75: HIGH RISK (clear scam indicators)
- 76-100: SCAM (definitive scam attempt)

Return ONLY valid JSON, no explanation, no markdown:"""

PROMPT_TEMPLATE = """{system_prompt}

Transcript to analyze:
"{transcript}"

Return ONLY this JSON:
{{
  "llm_risk_boost": <integer 0-40, extra risk points based on scam severity>,
  "llm_threats": [<list of specific threat strings detected, max 4>],
  "llm_summary": "<one sentence describing the scam pattern found>"
}}"""


class LLMAnalyzer:
    """
    Ollama-based LLM analysis layer with strict scam detection prompting.
    Falls back gracefully if Ollama is not running.
    """

    def __init__(self):
        self._available: bool | None = None
        logger.info("LLMAnalyzer initialized (Ollama at %s)", OLLAMA_URL)

    async def analyze(self, transcript: str) -> dict:
        if not transcript or len(transcript.strip()) < 5:
            return self._empty_result()

        if self._available is False:
            return self._empty_result()

        try:
            prompt = PROMPT_TEMPLATE.format(
                system_prompt=SYSTEM_PROMPT,
                transcript=transcript[:2000],
            )

            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.post(
                    OLLAMA_URL,
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.05,   # very low — deterministic
                            "num_predict": 300,
                            "top_p": 0.9,
                        },
                    },
                )

            if response.status_code != 200:
                logger.warning("Ollama returned %d", response.status_code)
                self._available = False
                return self._empty_result()

            raw = response.json().get("response", "")
            self._available = True
            result = self._parse_response(raw)
            logger.info(
                "LLM analysis: boost=%d threats=%s",
                result["llm_risk_boost"], result["llm_threats"],
            )
            return result

        except httpx.ConnectError:
            if self._available is not False:
                logger.info("Ollama not running — skipping LLM analysis")
            self._available = False
            return self._empty_result()
        except Exception as e:
            logger.warning("LLM analysis failed: %s", e)
            return self._empty_result()

    def _parse_response(self, raw: str) -> dict:
        try:
            text = raw.strip()
            # Strip markdown code blocks
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            # Extract JSON object
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                text = text[start:end]

            data = json.loads(text)
            boost = min(int(data.get("llm_risk_boost", 0)), 40)
            threats = [str(t) for t in data.get("llm_threats", [])[:4]]
            summary = str(data.get("llm_summary", ""))[:400]

            return {
                "llm_risk_boost": boost,
                "llm_threats": threats,
                "llm_summary": summary,
                "llm_available": True,
            }
        except Exception as e:
            logger.warning("Could not parse LLM response: %s | raw: %s", e, raw[:200])
            return self._empty_result(available=True)

    def _empty_result(self, available: bool = False) -> dict:
        return {
            "llm_risk_boost": 0,
            "llm_threats": [],
            "llm_summary": "",
            "llm_available": available,
        }
