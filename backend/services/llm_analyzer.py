"""
Scam analysis service — Gemini primary, GPT-3.5 fallback, keyword fallback.

Priority:
  1. Google Gemini (gemini-1.5-flash — free tier, fast)
  2. OpenAI GPT-3.5-turbo (if OPENAI_API_KEY has credits)
  3. Enhanced keyword scoring (always works, no API needed)
"""

import json
import logging
import os
import re
import httpx

logger = logging.getLogger("guardianangel.llm")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
TIMEOUT = 25.0

SCAM_PROMPT = """You are a scam detection AI for GuardianAngel, protecting elderly people in India from phone scams.

Analyze this phone call transcript for scam activity. Be thorough and accurate.

Detect these patterns:
- OTP / password / PIN requests
- Bank / RBI / government impersonation
- Urgency pressure tactics ("act now", "immediately", "last chance")
- Isolation tactics ("don't tell anyone", "keep this secret")
- Emotional manipulation (fake accidents, fake family emergencies)
- Payment / UPI / transfer requests
- KYC fraud, Aadhaar fraud
- Lottery / prize scams
- Fake legal threats (police, CBI, court, arrest)
- Suspicious intent or grooming behavior

Return ONLY valid JSON, no markdown, no explanation:
{{
  "risk_score": <integer 0-100>,
  "verdict": "<SAFE | SUSPICIOUS | HIGH RISK>",
  "threats": [<list of specific threat strings detected, max 5>],
  "summary": "<one clear sentence explaining the risk>"
}}

Transcript:
{transcript}"""


class LLMAnalyzer:
    """
    AI scam analysis using Gemini → GPT-3.5 → keyword fallback.
    Returns structured risk assessment for any transcript.
    """

    def __init__(self):
        self._gemini_available: bool | None = None
        self._openai_available: bool | None = None
        if GEMINI_API_KEY:
            logger.info("LLMAnalyzer: Gemini API key configured")
        elif OPENAI_API_KEY:
            logger.info("LLMAnalyzer: OpenAI key configured (GPT-3.5 fallback)")
        else:
            logger.warning("LLMAnalyzer: No API keys — keyword-only mode")

    async def analyze(self, transcript: str) -> dict:
        """
        Analyze transcript for scam activity.

        Returns:
            {
                "risk_score": int 0-100,
                "verdict": str,
                "threats": list[str],
                "summary": str,
                "llm_available": bool,
                "llm_provider": str,
                "llm_risk_boost": int,   # compat with existing router
                "llm_threats": list[str],
                "llm_summary": str,
            }
        """
        if not transcript or len(transcript.strip()) < 10:
            return self._empty_result()

        # 1. Try Gemini
        if GEMINI_API_KEY and self._gemini_available is not False:
            result = await self._call_gemini(transcript)
            if result:
                return result

        # 2. Try OpenAI GPT-3.5
        if OPENAI_API_KEY and self._openai_available is not False:
            result = await self._call_openai(transcript)
            if result:
                return result

        # 3. Keyword fallback (always works)
        return self._keyword_analysis(transcript)

    # ── Gemini ────────────────────────────────────────────────────────────────

    async def _call_gemini(self, transcript: str) -> dict | None:
        prompt = SCAM_PROMPT.format(transcript=transcript[:2000])
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1024,  # Gemini 2.5 uses thinking tokens — needs more room
            },
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(
                    f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                    json=payload,
                )
            if r.status_code == 200:
                data = r.json()
                # Handle both standard and thinking-model response structures
                candidates = data.get("candidates", [])
                if not candidates:
                    logger.warning("Gemini: empty candidates")
                    return None
                parts = candidates[0].get("content", {}).get("parts", [])
                # Collect all text parts (thinking models may split output)
                raw = "".join(p.get("text", "") for p in parts if "text" in p)
                self._gemini_available = True
                result = self._parse_llm_json(raw)
                if result:
                    result["llm_provider"] = "gemini-2.5-flash"
                    logger.info("Gemini analysis: verdict=%s score=%d", result["verdict"], result["risk_score"])
                    return result
                logger.warning("Gemini: could not parse JSON from response (len=%d)", len(raw))
            elif r.status_code in (400, 403):
                logger.warning("Gemini key invalid/quota: %d — disabling", r.status_code)
                self._gemini_available = False
            else:
                logger.warning("Gemini HTTP %d: %s", r.status_code, r.text[:100])
        except httpx.ConnectError:
            logger.info("Gemini unreachable")
            self._gemini_available = False
        except Exception as e:
            logger.warning("Gemini error: %s", e)
        return None

    # ── OpenAI GPT-3.5 ───────────────────────────────────────────────────────

    async def _call_openai(self, transcript: str) -> dict | None:
        prompt = SCAM_PROMPT.format(transcript=transcript[:2000])
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 300,
            "response_format": {"type": "json_object"},
        }
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(
                    OPENAI_URL,
                    json=payload,
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                )
            if r.status_code == 200:
                raw = r.json()["choices"][0]["message"]["content"]
                self._openai_available = True
                result = self._parse_llm_json(raw)
                if result:
                    result["llm_provider"] = "gpt-3.5-turbo"
                    logger.info("GPT-3.5 analysis: verdict=%s score=%d", result["verdict"], result["risk_score"])
                    return result
            elif r.status_code == 429:
                logger.warning("OpenAI quota exceeded — disabling")
                self._openai_available = False
            elif r.status_code in (401, 403):
                logger.warning("OpenAI key invalid — disabling")
                self._openai_available = False
            else:
                logger.warning("OpenAI HTTP %d", r.status_code)
        except httpx.ConnectError:
            self._openai_available = False
        except Exception as e:
            logger.warning("OpenAI error: %s", e)
        return None

    # ── Keyword fallback ──────────────────────────────────────────────────────

    def _keyword_analysis(self, transcript: str) -> dict:
        """Enhanced keyword-based analysis when no LLM is available."""
        text = transcript.lower()

        threat_patterns = {
            "OTP request detected": ["otp", "one time password", "verification code", "otp share", "otp batao"],
            "Bank impersonation": ["bank account", "account number", "ifsc", "kyc", "kyc update", "rbi"],
            "Urgency pressure": ["urgent", "immediately", "right now", "abhi", "jaldi", "turant", "last chance"],
            "Isolation tactic": ["don't tell", "dont tell", "secret", "mat batao", "kisi ko mat"],
            "Payment fraud": ["send money", "transfer", "upi", "paytm", "gpay", "phonepe", "₹", "rupees"],
            "Legal threat": ["police", "arrested", "cbi", "court", "warrant", "jail", "fir"],
            "Emotional manipulation": ["accident", "hospital", "help me", "in trouble", "please trust"],
            "Impersonation": ["i am your son", "it's me", "dadu", "beta bol raha", "don't you recognize"],
            "Prize/lottery scam": ["you have won", "lucky winner", "prize money", "lottery", "bumper prize"],
        }

        found_threats = []
        score = 0
        weights = {
            "OTP request detected": 25,
            "Bank impersonation": 20,
            "Urgency pressure": 15,
            "Isolation tactic": 20,
            "Payment fraud": 20,
            "Legal threat": 15,
            "Emotional manipulation": 15,
            "Impersonation": 15,
            "Prize/lottery scam": 20,
        }

        for threat, keywords in threat_patterns.items():
            if any(kw in text for kw in keywords):
                found_threats.append(threat)
                score += weights.get(threat, 10)

        score = min(score, 100)
        verdict = "HIGH RISK" if score >= 60 else "SUSPICIOUS" if score >= 30 else "SAFE"

        if found_threats:
            summary = f"Detected {len(found_threats)} scam indicator(s): {', '.join(found_threats[:2])}."
        else:
            summary = "No significant scam indicators detected in transcript."

        logger.info("Keyword analysis: verdict=%s score=%d threats=%d", verdict, score, len(found_threats))

        return self._format_result(score, verdict, found_threats, summary, "keyword_analysis")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse_llm_json(self, raw: str) -> dict | None:
        """Safely parse LLM JSON response."""
        try:
            text = raw.strip()
            # Strip markdown code fences if present
            text = re.sub(r"```(?:json)?", "", text).strip()
            # Find JSON object
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                text = text[start:end]
            data = json.loads(text)

            score = max(0, min(int(data.get("risk_score", 0)), 100))
            verdict = str(data.get("verdict", "SAFE")).upper().strip()
            # Normalize verdict
            if "HIGH" in verdict or score >= 60:
                verdict = "HIGH RISK"
            elif "SUSPICIOUS" in verdict or score >= 30:
                verdict = "SUSPICIOUS"
            else:
                verdict = "SAFE"

            threats = [str(t) for t in data.get("threats", [])[:5]]
            summary = str(data.get("summary", ""))[:400]

            return self._format_result(score, verdict, threats, summary, "llm")
        except Exception as e:
            logger.warning("LLM JSON parse failed: %s | raw: %.100s", e, raw)
            return None

    def _format_result(self, score: int, verdict: str, threats: list, summary: str, provider: str) -> dict:
        """Normalize result into the format the router expects."""
        return {
            "risk_score": score,
            "verdict": verdict,
            "threats": threats,
            "summary": summary,
            "llm_available": provider != "keyword_analysis",
            "llm_provider": provider,
            # Legacy compat fields used by analysis router
            "llm_risk_boost": 0,          # score already final — no boost needed
            "llm_threats": threats,
            "llm_summary": summary,
        }

    def _empty_result(self) -> dict:
        return self._format_result(0, "SAFE", [], "", "none")
