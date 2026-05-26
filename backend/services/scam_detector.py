"""
Core scam detection logic for GuardianAngel AI.
Upgraded: stronger keyword coverage + rule-based boosters + stricter scoring.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger("guardianangel.scam_detector")

# ─── Keyword database ─────────────────────────────────────────────────────────
# Weights are now higher and categories are broader

SCAM_KEYWORDS: dict[str, dict] = {
    "otp_fraud": {
        "weight": 40,
        "keywords": [
            "otp", "one time password", "one-time password",
            "verification code", "verify code", "enter the code",
            "share the otp", "tell me the otp", "otp share karo",
            "otp batao", "code batao", "pin batao", "pin number",
            "cvv", "card number", "expiry date", "card details",
            "security code", "authentication code", "2fa code",
            "two factor", "passcode", "access code",
        ],
    },
    "money_request": {
        "weight": 35,
        "keywords": [
            # Direct money requests — the main gap that was missing
            "need money", "need cash", "need funds",
            "give me money", "give me cash", "give me the money",
            "send me money", "send me cash", "send me the money",
            "i need", "need from you", "need it from you",
            "lend me", "borrow money", "loan me",
            "money from you", "cash from you", "funds from you",
            "80000", "80,000", "50000", "50,000", "1 lakh", "2 lakh",
            "need rupees", "need rs", "need ₹",
            "give rupees", "give rs", "give ₹",
            "pay me", "pay for me", "pay now",
            "wire transfer", "wire me", "wire the money",
            "send the amount", "transfer the amount",
            "financial help", "financial assistance",
            "help me financially", "money help",
        ],
    },
    "financial": {
        "weight": 25,
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
            "credit card", "debit card", "net banking",
            "bank details", "account details", "account blocked",
            "account suspended", "account frozen",
            "refund", "claim refund", "get refund",
            "investment", "invest now", "double your money",
            "crypto", "bitcoin", "trading profit",
            "remote access", "anydesk", "teamviewer",
        ],
    },
    "urgency": {
        "weight": 20,
        "keywords": [
            "urgent", "urgently", "immediately", "right now",
            "hurry", "hurry up", "no time", "time is running out",
            "last chance", "deadline", "within minutes",
            "emergency", "abhi", "turant", "jaldi",
            "abhi karo", "der mat karo", "time nahi hai",
            "kal tak", "aaj hi", "within 24 hours",
            "act now", "do it now", "don't delay",
            "as soon as possible", "asap", "right away",
            "before it's too late", "limited time",
            "today only", "expires today", "last day",
        ],
    },
    "isolation": {
        "weight": 25,
        "keywords": [
            "don't tell", "dont tell", "do not tell",
            "keep secret", "keep this secret", "don't inform",
            "between us", "nobody should know", "don't call anyone",
            "don't tell mom", "don't tell dad", "don't tell family",
            "mat batao", "secret rakho", "kisi ko mat batana",
            "ghar mein mat batana", "kisi se mat bolna",
            "confidential", "private matter", "just between us",
            "don't share", "keep it private", "tell no one",
        ],
    },
    "authority_threat": {
        "weight": 25,
        "keywords": [
            "police", "arrested", "arrest", "court",
            "legal action", "warrant", "cbi", "income tax",
            "aadhaar blocked", "sim blocked", "account frozen",
            "cyber crime", "cybercrime", "fir", "case filed",
            "jail", "prison", "officer speaking", "inspector",
            "rbi", "sebi", "enforcement directorate", "ed officer",
            "narcotics", "drug case", "money laundering",
            "your account will be blocked", "account band ho jayega",
            "government notice", "tax notice", "legal notice",
            "you will be arrested", "case against you",
        ],
    },
    "impersonation": {
        "weight": 20,
        "keywords": [
            "i am your son", "i am your daughter", "it's me",
            "don't you recognize", "it is me", "this is your",
            "accident", "hospital", "injured", "hurt",
            "help me", "in trouble", "in danger",
            "i need help", "please help",
            "main bol raha hoon", "pehchana nahi",
            "beta bol raha hoon", "beti bol rahi hoon",
            "dadu", "nana", "nani", "dadi",
            "your relative", "family member", "your friend",
            "calling from bank", "bank officer", "bank manager",
            "calling from rbi", "rbi officer", "government official",
            "calling from police", "police officer",
        ],
    },
    "emotional_manipulation": {
        "weight": 25,
        "keywords": [
            "please don't tell anyone", "i'm in trouble",
            "i'm scared", "they will hurt me", "please trust me",
            "you are my only hope", "no one else can help",
            "if you love me", "do this for me",
            "mujhe bachao", "meri madad karo", "please help me",
            "agar tum mujhse pyaar karte ho", "tumhara beta hoon",
            "bahut takleef mein hoon", "please please",
            "my life is in danger", "they will kill me",
            "i am dying", "critical condition", "life or death",
            "mother in hospital", "father in hospital",
            "family emergency", "child in danger",
        ],
    },
    "prize_lottery": {
        "weight": 20,
        "keywords": [
            "you have won", "congratulations you won", "lottery winner",
            "prize money", "lucky draw", "selected winner",
            "claim your prize", "free gift", "reward",
            "aapne jeeta", "lucky winner", "bumper prize",
            "kbc", "kaun banega crorepati", "lucky number",
            "you are selected", "special offer", "exclusive offer",
            "click the link", "click here to claim",
        ],
    },
    "password_security": {
        "weight": 35,
        "keywords": [
            "password", "your password", "share password",
            "tell me your password", "what is your password",
            "login details", "username and password",
            "account password", "email password",
            "reset password", "change password for me",
        ],
    },
}

# Flatten all keywords for quick lookup
ALL_KEYWORDS = [
    kw
    for cat in SCAM_KEYWORDS.values()
    for kw in cat["keywords"]
]

# ─── High-confidence regex patterns ───────────────────────────────────────────
# These fire even when exact keyword phrases don't match

MONEY_AMOUNT_PATTERN = re.compile(
    r"\b(\d{4,7}|[\d,]{5,10})\s*(rupees?|rs\.?|₹|inr|dollars?|\$|usd)?\b",
    re.IGNORECASE,
)

NEED_MONEY_PATTERN = re.compile(
    r"\b(need|want|require|give|send|transfer|lend|borrow|pay)\b.{0,30}\b"
    r"(money|cash|funds?|rupees?|rs\.?|₹|amount|payment|loan)\b",
    re.IGNORECASE | re.DOTALL,
)

URGENCY_PATTERNS = [
    re.compile(r"\b(urgent|immediately|right now|hurry|emergency|asap)\b", re.IGNORECASE),
    re.compile(r"\b(don.?t tell|keep secret|don.?t call|tell no one)\b", re.IGNORECASE),
    re.compile(r"\b(send money|transfer|paytm|upi|gpay|phonepe)\b", re.IGNORECASE),
    re.compile(r"\b(otp|one.?time.?password|verification code|passcode)\b", re.IGNORECASE),
    re.compile(r"\b(arrested|police|court|warrant|cbi|legal action)\b", re.IGNORECASE),
    re.compile(r"\b(accident|hospital|injured|help me|in trouble|in danger)\b", re.IGNORECASE),
    re.compile(r"\b(password|pin|cvv|card number|account number)\b", re.IGNORECASE),
    re.compile(r"\b(need|give|send|lend).{0,20}(money|cash|funds|rupees|₹)\b", re.IGNORECASE),
]


class ScamDetector:
    """
    Upgraded scam detection engine.

    Risk score formula:
    - Keyword score: sum of category weights (capped at 75)
    - Pattern boost: regex pattern matches add up to 25 pts
    - Voice anomaly: up to 10 pts
    - Rule-based boosters: direct money/OTP/password requests add flat bonuses
    Total: 0–100
    """

    def __init__(self):
        logger.info("ScamDetector initialized with %d keyword categories", len(SCAM_KEYWORDS))

    # ── Rule-based boosters ────────────────────────────────────────────────────

    def rule_based_boost(self, text: str) -> tuple[int, list[str]]:
        """
        Apply hard rule-based scoring on top of keyword matching.
        Returns (boost_points, list_of_triggered_rules).
        These fire on natural speech patterns that keyword lists miss.
        """
        text_lower = text.lower()
        boost = 0
        triggered = []

        # Money amount + request pattern (catches "I need 80,000 from you")
        if NEED_MONEY_PATTERN.search(text):
            boost += 35
            triggered.append("Direct money request detected")

        # Standalone large number (likely a money amount in context)
        if MONEY_AMOUNT_PATTERN.search(text):
            boost += 15
            triggered.append("Large monetary amount mentioned")

        # Individual high-risk word boosters
        if re.search(r"\b(otp|passcode|pin)\b", text_lower):
            boost += 40
            triggered.append("OTP/PIN request")

        if re.search(r"\bpassword\b", text_lower):
            boost += 35
            triggered.append("Password request")

        if re.search(r"\b(bank account|account number|ifsc)\b", text_lower):
            boost += 25
            triggered.append("Bank account details requested")

        if re.search(r"\b(upi|gpay|phonepe|paytm|google pay)\b", text_lower):
            boost += 25
            triggered.append("UPI/payment app mentioned")

        if re.search(r"\b(urgent|immediately|right now|asap|emergency)\b", text_lower):
            boost += 15
            triggered.append("Urgency pressure detected")

        if re.search(r"\b(don.?t tell|keep secret|tell no one|between us)\b", text_lower):
            boost += 20
            triggered.append("Isolation/secrecy tactic")

        if re.search(r"\b(arrested|police|court|warrant|legal action|jail)\b", text_lower):
            boost += 25
            triggered.append("False authority/legal threat")

        if re.search(r"\b(hospital|accident|injured|dying|critical)\b", text_lower):
            boost += 20
            triggered.append("Family emergency manipulation")

        if re.search(r"\b(refund|cashback|prize|lottery|won|selected winner)\b", text_lower):
            boost += 20
            triggered.append("Prize/refund scam language")

        if re.search(r"\b(crypto|bitcoin|investment|double your money|trading)\b", text_lower):
            boost += 25
            triggered.append("Investment/crypto scam language")

        if re.search(r"\b(remote access|anydesk|teamviewer|screen share)\b", text_lower):
            boost += 35
            triggered.append("Remote access request — high risk")

        if re.search(r"\b(kyc|kyc update|kyc verification|kyc expired)\b", text_lower):
            boost += 30
            triggered.append("KYC fraud attempt")

        return boost, triggered

    # ── Keyword detection ──────────────────────────────────────────────────────

    def detect_keywords(self, text: str) -> dict[str, list[str]]:
        text_lower = text.lower()
        found: dict[str, list[str]] = {}
        for category, config in SCAM_KEYWORDS.items():
            hits = [kw for kw in config["keywords"] if kw in text_lower]
            if hits:
                found[category] = hits
        return found

    def detect_urgency_score(self, text: str) -> float:
        matches = sum(1 for p in URGENCY_PATTERNS if p.search(text))
        return min(matches / len(URGENCY_PATTERNS), 1.0)

    # ── Risk scoring ───────────────────────────────────────────────────────────

    def calculate_risk_score(
        self,
        transcript: str,
        voice_anomaly_score: float = 0.0,
        keyword_categories: Optional[dict] = None,
    ) -> int:
        if keyword_categories is None:
            keyword_categories = self.detect_keywords(transcript)

        # Keyword score
        keyword_score = 0
        for category, hits in keyword_categories.items():
            if hits:
                weight = SCAM_KEYWORDS.get(category, {}).get("weight", 10)
                keyword_score += weight
        keyword_score = min(keyword_score, 75)

        # Pattern/urgency score
        urgency_score = self.detect_urgency_score(transcript) * 25

        # Rule-based boost
        rule_boost, _ = self.rule_based_boost(transcript)
        rule_boost = min(rule_boost, 60)  # cap rule boost

        # Voice anomaly
        voice_score = voice_anomaly_score * 10

        total = keyword_score + urgency_score + rule_boost + voice_score
        return min(int(total), 100)

    def get_verdict(self, risk_score: int) -> str:
        """Stricter verdict thresholds — less lenient on suspicious content."""
        if risk_score <= 20:
            return "SAFE"
        elif risk_score <= 50:
            return "SUSPICIOUS"
        elif risk_score <= 75:
            return "HIGH RISK"
        return "SCAM"

    # ── Full analysis ──────────────────────────────────────────────────────────

    def analyze_transcript(
        self, transcript: str, voice_anomaly_score: float = 0.0
    ) -> dict:
        keyword_categories = self.detect_keywords(transcript)
        rule_boost, rule_triggers = self.rule_based_boost(transcript)
        risk_score = self.calculate_risk_score(
            transcript, voice_anomaly_score, keyword_categories
        )
        verdict = self.get_verdict(risk_score)

        threats = []
        threat_id = 1

        # Rule-based threats (these fire even without exact keyword matches)
        for trigger in rule_triggers:
            severity = "HIGH"
            threat_type = "FINANCIAL"
            if "OTP" in trigger or "PIN" in trigger:
                threat_type = "OTP_SCAM"
            elif "password" in trigger.lower():
                threat_type = "OTP_SCAM"
            elif "authority" in trigger.lower() or "legal" in trigger.lower():
                threat_type = "AUTHORITY"
            elif "isolation" in trigger.lower() or "secrecy" in trigger.lower():
                threat_type = "ISOLATION"
            elif "emergency" in trigger.lower() or "hospital" in trigger.lower():
                threat_type = "IMPERSONATION"
                severity = "HIGH"
            elif "remote" in trigger.lower():
                threat_type = "AUTHORITY"
            threats.append({
                "id": f"r{threat_id}",
                "time": "—",
                "type": threat_type,
                "label": trigger,
                "confidence": min(70 + rule_boost // 3, 98),
                "severity": severity,
            })
            threat_id += 1

        # Keyword-based threats
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

        if "otp_fraud" in keyword_categories or "password_security" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "OTP_SCAM",
                "label": "OTP / password extraction attempt",
                "confidence": 98,
                "severity": "HIGH",
            })
            threat_id += 1

        if "money_request" in keyword_categories:
            threats.append({
                "id": f"t{threat_id}",
                "time": "—",
                "type": "FINANCIAL",
                "label": f"Direct money request: {', '.join(keyword_categories['money_request'][:2])}",
                "confidence": 95,
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
                "label": f"Financial fraud indicators ({', '.join(kws[:2])})",
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

        # Deduplicate threats by label
        seen_labels = set()
        unique_threats = []
        for t in threats:
            if t["label"] not in seen_labels:
                seen_labels.add(t["label"])
                unique_threats.append(t)
        threats = unique_threats

        # Collect manipulation phrases
        all_matched = []
        for hits in keyword_categories.values():
            all_matched.extend(hits[:2])
        all_matched.extend(rule_triggers[:3])
        manipulation_phrases = list(dict.fromkeys(all_matched))[:8]

        # Evidence summary
        if verdict in ("SCAM", "HIGH RISK"):
            evidence_summary = (
                f"{verdict} DETECTED — {len(threats)} threat indicator(s) found. "
                f"Risk score: {risk_score}/100. "
                f"Triggers: {', '.join((list(keyword_categories.keys()) + rule_triggers)[:4])}. "
                "Recommend immediate call termination and family alert."
            )
        elif verdict == "SUSPICIOUS":
            evidence_summary = (
                f"Suspicious patterns detected — {len(threats)} indicator(s). "
                f"Risk score: {risk_score}/100. "
                "Verify caller identity before sharing any information."
            )
        else:
            evidence_summary = (
                f"No significant scam indicators detected. Risk score: {risk_score}/100. "
                "Call appears legitimate."
            )

        logger.info(
            "Analysis: verdict=%s score=%d threats=%d rule_boost=%d keywords=%s",
            verdict, risk_score, len(threats), rule_boost,
            list(keyword_categories.keys()),
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
