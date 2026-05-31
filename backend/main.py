"""
GuardianAngel AI — FastAPI Backend
Real-time AI scam detection platform
Team Pillars: Daksh Chandia & Aarushi Singh | IIIT Kottayam
"""

# Load .env file first, before anything else
from dotenv import load_dotenv
load_dotenv()

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import analysis, reports, alerts
from services.scam_detector import ScamDetector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("guardianangel")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler — checks all AI pipeline components."""
    logger.info("🛡️  GuardianAngel AI Backend starting...")

    # ── Check Gemini ──────────────────────────────────────────────────────────
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            # Use models list endpoint for a lightweight key validity check
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}",
                )
            if r.status_code == 200:
                logger.info("🤖 Gemini: AVAILABLE (gemini-2.5-flash)")
            else:
                logger.warning("🤖 Gemini: key error %d — check GEMINI_API_KEY", r.status_code)
        except Exception:
            logger.warning("🤖 Gemini: unreachable at startup (will retry on first request)")
    else:
        logger.info("🤖 Gemini: no key — using GPT-3.5 fallback (set GEMINI_API_KEY for best results)")

    # ── Check OpenAI ──────────────────────────────────────────────────────────
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {openai_key}"},
                )
            if r.status_code == 200:
                logger.info("🎙️  OpenAI Whisper API: AVAILABLE (whisper-1 + gpt-3.5-turbo)")
            else:
                logger.warning("🎙️  OpenAI: key error %d", r.status_code)
        except Exception:
            logger.warning("🎙️  OpenAI: unreachable at startup (will retry on first request)")
    else:
        logger.info("🎙️  OpenAI: no key — local Whisper only")

    # ── Check local Whisper ───────────────────────────────────────────────────
    try:
        import importlib.util
        if importlib.util.find_spec("whisper") is not None:
            logger.info("🎙️  Local Whisper: installed (lazy-loaded on first request)")
        else:
            logger.info("🎙️  Local Whisper: not installed — OpenAI API handles STT")
    except Exception:
        pass

    # ── Check numpy/torch ─────────────────────────────────────────────────────
    try:
        import importlib.util
        if importlib.util.find_spec("numpy") is not None:
            logger.info("🔬 Voice analysis: numpy available")
        else:
            logger.info("🔬 Voice analysis: numpy not installed — voice analysis disabled")
    except Exception:
        pass

    logger.info("📡 API: http://localhost:8000/api")
    logger.info("📊 Status: http://localhost:8000/api/status")
    yield
    logger.info("GuardianAngel AI Backend shutting down...")


app = FastAPI(
    title="GuardianAngel AI",
    description="Real-time AI-powered scam detection API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "https://guardianangel.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis.router, prefix="/api/analyze", tags=["Analysis"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/")
async def root():
    return {
        "service": "GuardianAngel AI",
        "version": "1.0.0",
        "status": "active",
        "team": "Team Pillars — Daksh Chandia & Aarushi Singh",
        "institution": "IIIT Kottayam",
        "endpoints": {
            "analyze_audio": "POST /api/analyze/audio",
            "analyze_video": "POST /api/analyze/video-frame",
            "reports": "GET /api/reports",
            "family_alert": "POST /api/alerts/family",
            "websocket": "WS /ws/live-analysis",
            "health": "GET /health",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "GuardianAngel AI"}


@app.get("/api/status")
async def pipeline_status():
    """Returns the status of all AI pipeline components."""
    status = {
        "whisper_local": False,
        "whisper_api": False,
        "gemini": False,
        "openai_gpt": False,
        "voice_analysis": False,
        "stt_method": None,
        "llm_method": None,
    }

    # Local Whisper
    try:
        import whisper  # noqa: F401
        status["whisper_local"] = True
    except ImportError:
        pass

    # OpenAI
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {openai_key}"},
                )
            if r.status_code == 200:
                status["whisper_api"] = True
                status["openai_gpt"] = True
        except Exception:
            pass

    # Gemini
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}",
                )
            status["gemini"] = r.status_code == 200
        except Exception:
            pass

    # Voice analysis (numpy)
    try:
        import importlib.util
        status["voice_analysis"] = importlib.util.find_spec("numpy") is not None
    except Exception:
        pass

    # Determine active methods
    status["stt_method"] = "openai_whisper_api" if status["whisper_api"] else ("local_whisper" if status["whisper_local"] else "unavailable")
    status["llm_method"] = "gemini-2.5-flash" if status["gemini"] else ("gpt-3.5-turbo" if status["openai_gpt"] else "keyword_analysis")

    return {
        "status": "healthy",
        "service": "GuardianAngel AI",
        "pipeline": status,
    }


# ─── WebSocket: Live Analysis ────────────────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active: {len(self.active_connections)}")

    async def send_message(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")


manager = ConnectionManager()
detector = ScamDetector()


@app.websocket("/ws/live-analysis")
async def websocket_live_analysis(websocket: WebSocket):
    """
    WebSocket endpoint for real-time call analysis simulation.
    
    Streams messages of types:
    - call_start: { callerNumber }
    - transcript: { time, text, hasKeyword, keywords }
    - threat: { id, time, type, label, confidence, severity }
    - risk_update: { score }
    - alert: null (triggers scam alert)
    - call_end: null
    """
    await manager.connect(websocket)
    try:
        while True:
            # Wait for client message
            data = await websocket.receive_text()
            message = json.loads(data)
            command = message.get("command", "")

            if command == "start_demo":
                # Stream demo scam scenario
                await stream_demo_analysis(websocket)

            elif command == "start_analysis":
                # Real analysis would go here
                caller_number = message.get("callerNumber", "Unknown")
                await manager.send_message(websocket, {
                    "type": "call_start",
                    "data": {"callerNumber": caller_number},
                    "timestamp": asyncio.get_event_loop().time(),
                })

            elif command == "stop":
                await manager.send_message(websocket, {
                    "type": "call_end",
                    "data": None,
                    "timestamp": asyncio.get_event_loop().time(),
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def stream_demo_analysis(websocket: WebSocket):
    """Stream a pre-scripted scam scenario for demo purposes."""
    from datetime import datetime

    def ts():
        return datetime.utcnow().isoformat()

    # Call start
    await manager.send_message(websocket, {
        "type": "call_start",
        "data": {"callerNumber": "+91 98765 43210"},
        "timestamp": ts(),
    })
    await asyncio.sleep(0.5)

    # Transcript + risk progression
    transcript_events = [
        {"time": "0:03", "text": "Hello, is this Ramesh ji?", "hasKeyword": False, "keywords": []},
        {"time": "0:07", "text": "Dadu, it's me! I'm in an accident...", "hasKeyword": True, "keywords": ["accident"]},
        {"time": "0:12", "text": "Please don't tell anyone. Send ₹80,000 urgently.", "hasKeyword": True, "keywords": ["don't tell", "₹", "urgent"]},
        {"time": "0:18", "text": "My OTP just came, I need you to verify it.", "hasKeyword": True, "keywords": ["otp", "verify"]},
        {"time": "0:24", "text": "This is very secret. Don't call mom.", "hasKeyword": True, "keywords": ["secret"]},
        {"time": "0:29", "text": "Transfer to this UPI ID immediately: scam@upi", "hasKeyword": True, "keywords": ["transfer", "upi", "immediately"]},
    ]

    risk_progression = [0, 12, 28, 45, 67, 79, 89]
    threat_events = [
        {"id": "t1", "time": "0:08", "type": "VOICE_CLONE", "label": "Synthetic voice anomaly detected", "confidence": 92, "severity": "HIGH"},
        {"id": "t2", "time": "0:13", "type": "URGENCY", "label": "High-pressure urgency language", "confidence": 87, "severity": "HIGH"},
        {"id": "t3", "time": "0:15", "type": "ISOLATION", "label": "'Don't tell anyone' isolation tactic", "confidence": 95, "severity": "HIGH"},
        {"id": "t4", "time": "0:19", "type": "OTP_SCAM", "label": "OTP extraction attempt detected", "confidence": 98, "severity": "HIGH"},
        {"id": "t5", "time": "0:25", "type": "FINANCIAL", "label": "Fraudulent UPI transfer request", "confidence": 96, "severity": "HIGH"},
    ]

    # Stream transcript and risk updates interleaved
    for i, entry in enumerate(transcript_events):
        await manager.send_message(websocket, {
            "type": "transcript",
            "data": entry,
            "timestamp": ts(),
        })

        # Update risk score
        if i < len(risk_progression):
            await manager.send_message(websocket, {
                "type": "risk_update",
                "data": {"score": risk_progression[i]},
                "timestamp": ts(),
            })

        # Add threat if available
        if i < len(threat_events):
            await asyncio.sleep(0.3)
            await manager.send_message(websocket, {
                "type": "threat",
                "data": threat_events[i],
                "timestamp": ts(),
            })

        await asyncio.sleep(1.5)

    # Final risk update
    await manager.send_message(websocket, {
        "type": "risk_update",
        "data": {"score": 89},
        "timestamp": ts(),
    })
    await asyncio.sleep(0.5)

    # Trigger alert
    await manager.send_message(websocket, {
        "type": "alert",
        "data": {
            "riskScore": 89,
            "voiceCloneRisk": 92,
            "scamIntent": 94,
            "emotionalManipulation": 78,
        },
        "timestamp": ts(),
    })
