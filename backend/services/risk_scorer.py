"""Risk scoring service — combines all signals into a final risk score."""

import logging

logger = logging.getLogger("guardianangel.risk_scorer")


class RiskScorer:
    """
    Calculates final risk score from multiple signals.
    
    Score breakdown:
    - Keyword hits: up to 50 pts (15 pts each, max 50)
    - Voice anomaly: up to 30 pts (voice_score * 30)
    - Urgency patterns: up to 20 pts (urgency_score * 20)
    Total: 0–100
    """

    def calculate(
        self,
        keyword_hits: int,
        voice_anomaly_score: float,
        urgency_score: float,
        isolation_detected: bool = False,
        otp_detected: bool = False,
    ) -> dict:
        """
        Calculate comprehensive risk score.
        
        Returns:
            {
                "total": int (0-100),
                "breakdown": dict,
                "verdict": str,
                "confidence": float
            }
        """
        keyword_score = min(keyword_hits * 15, 50)
        voice_score = voice_anomaly_score * 30
        urgency_pts = urgency_score * 20

        # Bonus points for high-confidence indicators
        bonus = 0
        if isolation_detected:
            bonus += 5
        if otp_detected:
            bonus += 5

        total = min(int(keyword_score + voice_score + urgency_pts + bonus), 100)

        breakdown = {
            "keyword_score": round(keyword_score, 1),
            "voice_score": round(voice_score, 1),
            "urgency_score": round(urgency_pts, 1),
            "bonus": bonus,
        }

        verdict = self._get_verdict(total)
        confidence = self._get_confidence(total, keyword_hits, voice_anomaly_score)

        logger.debug(f"Risk score: {total} ({verdict}) — breakdown: {breakdown}")

        return {
            "total": total,
            "breakdown": breakdown,
            "verdict": verdict,
            "confidence": confidence,
        }

    def _get_verdict(self, score: int) -> str:
        if score <= 30:
            return "SAFE"
        elif score <= 60:
            return "SUSPICIOUS"
        return "SCAM"

    def _get_confidence(
        self, score: int, keyword_hits: int, voice_score: float
    ) -> float:
        """Calculate confidence in the verdict (0-1)."""
        if score > 70 and keyword_hits >= 3 and voice_score > 0.6:
            return 0.95
        elif score > 50 and keyword_hits >= 2:
            return 0.80
        elif score > 30:
            return 0.65
        elif score <= 20 and keyword_hits == 0:
            return 0.90
        return 0.70
