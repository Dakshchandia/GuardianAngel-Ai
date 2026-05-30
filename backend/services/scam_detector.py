"""
Core scam detection logic for GuardianAngel AI.
Real keyword-based detection with dynamic risk scoring.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger("guardianangel.scam_detector")

# ─── Keyword database ─────────────────────────────────────────────────────────
# Each category has a weight multiplier for risk scoring

SCAM_KEYWORDS: dict[str, dict] = {
    "otp_fraud": {
        "weight": 20,
        "keywords": [
            "otp", "one time password", "one-time password",
            "verification code", "verify code", "enter the code",
            "share the otp", "tell me the otp", "otp share karo",
            "otp batao", "code batao", "pin batao", "pin number",
            "cvv", "card number", "expiry date",
        ],
    },
    "financial": {
        "weight": 15,
        "keywords": [
            "send money", "transfer money", "send cash",
            "bank account", "account number", "ifsc",
            "paytm", "upi", "gpay", "phonepe", "neft", "rtgs",
            "transaction", "payment", "deposit", "withdraw",
            "kyc", "kyc update", "kyc verification",
            "rupees", "₹", "lakh", "crore",
            "paise bhejo", "paisa transfer", "account mein dalo",
            "google pay", "amazon pay", "bhim upi",
            "wallet", "recharge", "cashback",
        ],
    },
    "urgency": {
        "weight": 15,
        "keywords": [
            "urgent", "urgently", "immediately", "right now",
            "hurry", "hurry up", "no time", "time is running out",
            "last chance", "deadline", "within minutes",
            "emergency", "abhi", "turant", "jaldi",
            "abhi karo", "der mat karo", "time nahi hai",
            "kal tak", "aaj hi", "within 24 hours",
            "act now", "do it now", "don't delay",
        ],
    },
    "isolation": {
        "weight": 20,
        "keywords": [
            "don't tell", "dont tell", "do not tell",
            "keep secret", "keep this secret", "don't inform",
            "between us", "nobody should know", "don't call anyone",
            "don't tell mom", "don't tell dad", "don't tell family",
            "mat batao", "secret rakho", "kisi ko mat batana",
            "ghar mein mat batana", "kisi se mat bolna",
            "confidential", "private matter", "just between us",
        ],
    },
    "authority_threat": {
        "weight": 15,
        "keywords": [
            "police", "arrested", "arrest", "court",
            "legal action", "warrant", "cbi", "income tax",
            "aadhaar blocked", "sim blocked", "account frozen",
            "cyber crime", "cybercrime", "fir", "case filed",
            "jail", "prison", "officer speaking", "inspector",
            "rbi", "sebi", "enforcement directorate", "ed officer",
            "narcotics", "drug case", "money laundering",
            "your account will be blocked", "account band ho jayega",
        ],
    },
    "impersonation": {
        "weight": 10,
        "keywords": [
            "i am your son", "i am your daughter", "it's me",
            "don't you recognize", "it is me", "this is your",
            "accident", "hospital", "injured", "hurt",
            "help me", "in trouble", "in danger",
            "i need help", "please help",
            "main bol raha hoon", "pehchana nahi",
            "beta bol raha hoon", "beti bol rahi hoon",
            "dadu", "nana", "nani", "dadi",
        ],
    },
    "emotional_manipulation": {
        "weight": 20,
        "keywords": [
            "please don't tell anyone", "i'm in trouble",
            "i'm scared", "they will hurt me", "please trust me",
            "you are my only hope", "no one else can help",
            "if you love me", "do this for me",
            "mujhe bachao", "meri madad karo", "please help me",
            "agar tum mujhse pyaar karte ho", "tumhara beta hoon",
            "bahut takleef mein hoon", "please please",
        ],
    },
    "prize_lottery": {
        "weight": 15,
        "keywords": [
            "you have won", "congratulations you won", "lottery winner",
            "prize money", "lucky draw", "selected winner",
            "claim your prize", "free gift", "reward",
            "aapne jeeta", "lucky winner", "bumper prize",
            "kbc", "kaun banega crorepati", "lucky number",
        ],
    },
}

# Flatten all keywords for quick lookup
ALL_KEYWORDS = [
    kw
    for cat in SCAM_KEYWORDS.values()
    for kw in cat["keywords"]
]

# Compiled urgency patterns for fast regex matching
URGENCY_PATTERNS = [
    re.compile(r"\b(urgent|immediately|right now|hurry|emergency)\b", re.IGNORECASE),
    re.compile(r"\b(don.?t tell|keep secret|don.?t call)\b", re.IGNORECASE),
    re.compile(r"\b(send money|transfer|paytm|upi|gpay)\b", re.IGNORECASE),
    re.compile(r"\b(otp|one.?time.?password|verification code)\b", re.IGNORECASE),
    re.compile(r"\b(arrested|police|court|warrant|cbi)\b", re.IGNORECASE),
    re.compile(r"\b(accident|hospital|injured|help me|in trouble)\b", re.IGNORECASE),
]


class ScamDetector:
    """
    Real keyword-based scam detection engine.

    Risk score formula:
    - Each keyword hit adds its category weight (capped at 70 pts total from keywords)
    - Urgency pattern matches add up to 20 pts
    - Voice anomaly score adds up to 10 pts
    Total: 0–100
    """

    def __init__(self):
        logger.info("ScamDetector initialized with %d keyword categories", len(SCAM_KEYWORDS))

    # ── Keyword detection ──────────────────────────────────────────────────────

    def detect_keywords(self, text: str) -> dict[str, list[str]]:
        """
        Find scam keywords in text, grouped by category.
        Returns { category_name: [matched_keywords] }
        """
        text_lower = text.lower()
        found: dict[str, list[str]] = {}
        for category, config in SCAM_KEYWORDS.items():
            hits = [kw for kw in config["keywords"] if kw in text_lower]
            if hits:
                found[category] = hits
        return found

    def detect_urgency_score(self, text: str) -> float:
        """
        Regex-based urgency/manipulation pattern score.
        Returns 0.0–1.0.
        """
        matches = sum(1 for p in URGENCY_PATTERNS if p.search(text))
        return min(matches / len(URGENCY_PATTERNS), 1.0)

    # ── Risk scoring ───────────────────────────────────────────────────────────

    def calculate_risk_score(
        self,
        transcript: str,
        voice_anomaly_score: float = 0.0,
        keyword_categories: Optional[dict] = None,
    ) -> int:
        """
        Dynamic risk score (0–100).

        Breakdown:
        - Keyword score: sum of category weights for matched categories, capped at 70
        - Urgency score: urgency_pattern_ratio * 20
        - Voice score: voice_anomaly_score * 10
        """
        if keyword_categories is None:
            keyword_categories = self.detect_keywords(transcript)

        # Keyword score: each matched category contributes its weight
        keyword_score = 0
        for category, hits in keyword_categories.items():
            if hits:
                weight = SCAM_KEYWORDS.get(category, {}).get("weight", 10)
                keyword_score += weight
        keyword_score = min(keyword_score, 70)

        urgency_score = self.detect_urgency_score(transcript) * 20
        voice_score = voice_anomaly_score * 10

        total = keyword_score + urgency_score + voice_score
        return min(int(total), 100)

    def get_verdict(self, risk_score: int) -> str:
        if risk_score <= 30:
            return "SAFE"
        elif risk_score <= 60:
            return "SUSPICIOUS"
        return "SCAM"

    # ── Full analysis ──────────────────────────────────────────────────────────

    def analyze_transcript(
        self, transcript: str, voice_anomaly_score: float = 0.0
    ) -> dict:
        """
        Full analysis pipeline.
        Returns structured result dict.
        """
        keyword_categories = self.detect_keywords(transcript)
        risk_score = self.calculate_risk_score(
            transcript, voice_anomaly_score, keyword_categories
        )
        verdict = self.get_verdict(risk_score)

        # Build threat list from detected categories
        threats = []
        threat_id = 1

        if voice_anomaly_score > 0.5:
            threats.append({
                "id": f"t{threat_id}",
                "time": "0:02",
                "type": "VOICE_CLONE",
                "label": "Synthetic voice anomaly detected",
                "confidence": int(voice_anomaly_score * 100),
                "severity": "HIGH" if voice_anomaly_score > 0.7 else "MEDIUM",
            })
            threat_id += 1

        if "otp_fraud" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "OTP_SCAM",
                "label": "OTP extraction attempt detected",
                "confidence": 98,
                "severity": "HIGH",
            })
            threat_id += 1

        if "urgency" in keyword_categories:
            conf = min(len(keyword_categories["urgency"]) * 20, 95)
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "URGENCY",
                "label": "High-pressure urgency language detected",
                "confidence": conf,
                "severity": "HIGH",
            })
            threat_id += 1

        if "isolation" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "ISOLATION",
                "label": "'Don't tell anyone' isolation tactic",
                "confidence": 95,
                "severity": "HIGH",
            })
            threat_id += 1

        if "financial" in keyword_categories:
            kws = keyword_categories["financial"]
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "FINANCIAL",
                "label": f"Fraudulent financial request ({', '.join(kws[:2])})",
                "confidence": min(len(kws) * 18, 95),
                "severity": "HIGH",
            })
            threat_id += 1

        if "authority_threat" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "AUTHORITY",
                "label": "False authority / legal threat detected",
                "confidence": 88,
                "severity": "HIGH",
            })
            threat_id += 1

        if "emotional_manipulation" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "ISOLATION",
                "label": "Emotional manipulation language detected",
                "confidence": 90,
                "severity": "HIGH",
            })
            threat_id += 1

        if "impersonation" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "IMPERSONATION",
                "label": "Possible identity impersonation detected",
                "confidence": 82,
                "severity": "MEDIUM",
            })
            threat_id += 1

        if "prize_lottery" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "FINANCIAL",
                "label": "Prize / lottery scam language detected",
                "confidence": 85,
                "severity": "HIGH",
            })
            threat_id += 1

        # Collect all matched keywords for the response
        all_matched = []
        for hits in keyword_categories.values():
            all_matched.extend(hits[:2])  # top 2 per category
        manipulation_phrases = list(dict.fromkeys(all_matched))[:8]  # deduplicate

        # Evidence summary
        if verdict == "SCAM":
            evidence_summary = (
                f"SCAM DETECTED — {len(threats)} threat indicator(s) found. "
                f"Risk score: {risk_score}/100. "
                f"Matched categories: {', '.join(keyword_categories.keys())}. "
                "Recommend immediate call termination and family alert."
            )
        elif verdict == "SUSPICIOUS":
            evidence_summary = (
                f"Suspicious patterns detected — {len(threats)} indicator(s). "
                f"Risk score: {risk_score}/100. "
                "Verify caller identity using SafePhrase before sharing any information."
            )
        else:
            evidence_summary = (
                f"No significant scam indicators detected. Risk score: {risk_score}/100. "
                "Call appears legitimate."
            )

        logger.info(
            "Analysis: verdict=%s score=%d threats=%d keywords=%s",
            verdict, risk_score, len(threats), list(keyword_categories.keys()),
        )

        return {
            "risk_score": risk_score,
            "verdict": verdict,
            "threats": threats,
            "keyword_categories": keyword_categories,
            "manipulation_phrases": manipulation_phrases,
            "evidence_summary": evidence_summary,
            "voice_clone_probability": voice_anomaly_score,
        }

    # ── Keyword highlighting ───────────────────────────────────────────────────

    def highlight_keywords(self, text: str) -> dict:
        """Return keyword positions for frontend highlighting."""
        text_lower = text.lower()
        highlights = []
        for kw in ALL_KEYWORDS:
            idx = text_lower.find(kw)
            if idx != -1:
                highlights.append({
                    "start": idx,
                    "end": idx + len(kw),
                    "keyword": kw,
                    "category": next(
                        (
                            cat
                            for cat, cfg in SCAM_KEYWORDS.items()
                            if kw in cfg["keywords"]
                        ),
                        "other",
                    ),
                })
        return {
            "text": text,
            "highlights": sorted(highlights, key=lambda x: x["start"]),
            "hasKeyword": len(highlights) > 0,
            "keywords": list({h["keyword"] for h in highlights}),
        }
