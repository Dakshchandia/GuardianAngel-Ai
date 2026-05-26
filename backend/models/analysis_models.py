"""Pydantic models for request/response validation."""

from typing import Optional
from pydantic import BaseModel, Field


class TranscriptEntry(BaseModel):
    time: str
    text: str
    hasKeyword: bool = False
    keywords: list[str] = []


class ThreatEntry(BaseModel):
    id: str
    time: str
    type: str  # VOICE_CLONE | URGENCY | ISOLATION | OTP_SCAM | FINANCIAL | DEEPFAKE | AUTHORITY | IMPERSONATION
    label: str
    confidence: int = Field(ge=0, le=100)
    severity: str = "HIGH"  # HIGH | MEDIUM | LOW


class AudioAnalysisResponse(BaseModel):
    transcript: list[TranscriptEntry]
    risk_score: int = Field(ge=0, le=100)
    threats: list[ThreatEntry]
    voice_clone_probability: float = Field(ge=0.0, le=1.0)
    verdict: str  # SAFE | SUSPICIOUS | HIGH RISK | SCAM
    manipulation_phrases: list[str]
    evidence_summary: str
    # Voice authenticity fields (new)
    voice_risk: str = "LOW"               # LOW | MEDIUM | HIGH
    voice_flags: list[str] = []           # explainable indicators
    voice_summary: str = ""               # one-sentence description


class VoiceAnalysisResponse(BaseModel):
    """Standalone voice-only analysis response."""
    voice_clone_probability: float = Field(ge=0.0, le=1.0)
    voice_risk: str                        # LOW | MEDIUM | HIGH
    voice_flags: list[str]
    voice_summary: str
    features: dict = {}
    model: str


class VideoFrameResponse(BaseModel):
    deepfake_probability: float = Field(ge=0.0, le=1.0)
    anomalies: list[str]
    verdict: str
    face_consistency_score: float = Field(ge=0.0, le=1.0)
    lip_sync_score: float = Field(ge=0.0, le=1.0)


class FamilyContact(BaseModel):
    id: str
    name: str
    phone: str
    relationship: str
    alertEnabled: bool = True


class RiskData(BaseModel):
    score: int
    threats: list[str]
    callerNumber: str


class FamilyAlertRequest(BaseModel):
    contacts: list[FamilyContact]
    risk_data: RiskData
    message: str


class AlertResponse(BaseModel):
    sent_count: int
    status: str  # success | partial | failed
    message: str


class ReportEntry(BaseModel):
    id: str
    date: str
    callerNumber: str
    callerName: Optional[str] = None
    riskScore: int
    verdict: str
    duration: str
    threats: list[ThreatEntry]
    transcript: list[TranscriptEntry]
    voiceCloneProbability: float
