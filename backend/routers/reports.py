"""Reports router — scam history and evidence reports."""

import logging
from fastapi import APIRouter
from models.analysis_models import ReportEntry, TranscriptEntry, ThreatEntry

logger = logging.getLogger("guardianangel.reports")
router = APIRouter()

# Mock report data for demo
MOCK_REPORTS = [
    ReportEntry(
        id="r1",
        date="2024-05-20T14:32:00",
        callerNumber="+91 98765 43210",
        callerName="Unknown",
        riskScore=89,
        verdict="SCAM",
        duration="1:24",
        threats=[
            ThreatEntry(id="t1", time="0:08", type="VOICE_CLONE", label="Synthetic voice anomaly detected", confidence=92, severity="HIGH"),
            ThreatEntry(id="t2", time="0:13", type="URGENCY", label="High-pressure urgency language", confidence=87, severity="HIGH"),
            ThreatEntry(id="t3", time="0:15", type="ISOLATION", label="'Don't tell anyone' isolation tactic", confidence=95, severity="HIGH"),
            ThreatEntry(id="t4", time="0:19", type="OTP_SCAM", label="OTP extraction attempt detected", confidence=98, severity="HIGH"),
        ],
        transcript=[
            TranscriptEntry(time="0:03", text="Hello, is this Ramesh ji?", hasKeyword=False),
            TranscriptEntry(time="0:07", text="Dadu, it's me! I'm in an accident...", hasKeyword=True, keywords=["accident"]),
            TranscriptEntry(time="0:12", text="Please don't tell anyone. Send ₹80,000 urgently.", hasKeyword=True, keywords=["don't tell", "urgent"]),
            TranscriptEntry(time="0:18", text="My OTP just came, I need you to verify it.", hasKeyword=True, keywords=["otp", "verify"]),
        ],
        voiceCloneProbability=0.92,
    ),
    ReportEntry(
        id="r2",
        date="2024-05-19T09:15:00",
        callerNumber="+91 87654 32109",
        callerName="Unknown",
        riskScore=67,
        verdict="SUSPICIOUS",
        duration="0:45",
        threats=[
            ThreatEntry(id="t1", time="0:10", type="URGENCY", label="High-pressure urgency language", confidence=87, severity="HIGH"),
            ThreatEntry(id="t2", time="0:20", type="FINANCIAL", label="Suspicious financial request", confidence=72, severity="MEDIUM"),
        ],
        transcript=[
            TranscriptEntry(time="0:05", text="Hello, I'm calling about your bank account.", hasKeyword=True, keywords=["bank account"]),
            TranscriptEntry(time="0:12", text="There's an urgent issue that needs immediate attention.", hasKeyword=True, keywords=["urgent", "immediately"]),
        ],
        voiceCloneProbability=0.45,
    ),
    ReportEntry(
        id="r3",
        date="2024-05-18T16:50:00",
        callerNumber="+91 76543 21098",
        callerName="Priya (Daughter)",
        riskScore=12,
        verdict="SAFE",
        duration="3:20",
        threats=[],
        transcript=[
            TranscriptEntry(time="0:05", text="Hi Dad, how are you feeling today?", hasKeyword=False),
            TranscriptEntry(time="0:12", text="I'll be home for dinner, don't worry.", hasKeyword=False),
        ],
        voiceCloneProbability=0.04,
    ),
    ReportEntry(
        id="r4",
        date="2024-05-17T11:22:00",
        callerNumber="+91 65432 10987",
        callerName="Unknown",
        riskScore=94,
        verdict="SCAM",
        duration="2:10",
        threats=[
            ThreatEntry(id="t1", time="0:05", type="VOICE_CLONE", label="Synthetic voice anomaly detected", confidence=97, severity="HIGH"),
            ThreatEntry(id="t2", time="0:10", type="AUTHORITY", label="False authority threat (police/court)", confidence=88, severity="HIGH"),
            ThreatEntry(id="t3", time="0:18", type="FINANCIAL", label="Fraudulent UPI transfer request", confidence=96, severity="HIGH"),
        ],
        transcript=[
            TranscriptEntry(time="0:03", text="This is CBI officer speaking. Your Aadhaar is blocked.", hasKeyword=True, keywords=["cbi"]),
            TranscriptEntry(time="0:10", text="You need to transfer money immediately to avoid arrest.", hasKeyword=True, keywords=["transfer", "immediately", "arrested"]),
        ],
        voiceCloneProbability=0.97,
    ),
    ReportEntry(
        id="r5",
        date="2024-05-16T08:05:00",
        callerNumber="+91 54321 09876",
        callerName="Rajesh (Son)",
        riskScore=8,
        verdict="SAFE",
        duration="5:45",
        threats=[],
        transcript=[
            TranscriptEntry(time="0:03", text="Good morning Papa! Did you take your medicine?", hasKeyword=False),
            TranscriptEntry(time="0:15", text="I'll call you again in the evening.", hasKeyword=False),
        ],
        voiceCloneProbability=0.02,
    ),
]


@router.get("", response_model=list[ReportEntry])
async def get_reports():
    """Get all analysis reports (mock data for demo)."""
    logger.info(f"Returning {len(MOCK_REPORTS)} reports")
    return MOCK_REPORTS


@router.get("/{report_id}", response_model=ReportEntry)
async def get_report(report_id: str):
    """Get a specific report by ID."""
    report = next((r for r in MOCK_REPORTS if r.id == report_id), None)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return report
