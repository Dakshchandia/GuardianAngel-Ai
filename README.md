# 🛡️ GuardianAngel AI
### Real-Time AI Scam Protection Platform

**National Hackathon Build | Team Pillars | Daksh Chandia & Aarushi Singh | IIIT Kottayam**

---

## 🎯 The Problem

AI voice cloning can replicate anyone's voice from a **30-second audio clip**. Scammers are exploiting this to impersonate family members and extract money from elderly victims. In 2024:

- **₹22,000 Crore** lost to cybercrime in India
- **$12.5 Billion** in AI fraud losses globally  
- **47% rise** in voice clone scam incidents
- **No existing tool** stops this *during* the live call

## 💡 The Solution

GuardianAngel AI is a **real-time AI threat analyzer** that listens, detects, warns, and alerts — all within **3 seconds**, during the call itself.

This is NOT a spam-number blocker. This is a live AI protection system.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GuardianAngel AI                          │
├─────────────────────┬───────────────────────────────────────┤
│   Frontend          │   Backend                             │
│   Next.js 14        │   FastAPI + Python                    │
│   TypeScript        │                                       │
│   TailwindCSS       │   ┌─────────────────────────────┐    │
│                     │   │  Services                    │    │
│   Pages:            │   │  ├── ScamDetector            │    │
│   / (Landing)       │   │  ├── VoiceAnalyzer           │    │
│   /dashboard        │   │  ├── TranscriptService       │    │
│   /analysis         │   │  │   └── OpenAI Whisper      │    │
│   /family           │   │  ├── RiskScorer              │    │
│   /reports          │   │  └── AlertService            │    │
│   /settings         │   │      └── Twilio SMS          │    │
│                     │   └─────────────────────────────┘    │
│   Components:       │                                       │
│   ├── RiskMeter     │   REST API:                          │
│   ├── CallMonitor   │   POST /api/analyze/audio            │
│   ├── Transcript    │   POST /api/analyze/video-frame      │
│   ├── ThreatFeed    │   GET  /api/reports                  │
│   ├── ScamAlert     │   POST /api/alerts/family            │
│   ├── FamilyMgr     │                                       │
│   └── ElderMode     │   WebSocket:                         │
│                     │   WS /ws/live-analysis               │
└─────────────────────┴───────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3002
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your API keys

# Start server
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### Environment Variables

```bash
# backend/.env
OPENAI_API_KEY=sk-...          # For real Whisper transcription
TWILIO_ACCOUNT_SID=AC...       # For SMS family alerts
TWILIO_AUTH_TOKEN=...          # Twilio auth token
TWILIO_FROM_NUMBER=+1234567890 # Your Twilio number
```

> **Demo Mode:** The app works fully without any API keys using mock data. All features are demonstrable without real credentials.

### Docker (Full Stack)

```bash
# From project root
docker-compose up --build
# Frontend: http://localhost:3002
# Backend:  http://localhost:8000
```

---

## 🎬 Demo Flow (3-Minute Judge Presentation)

1. **Landing Page** (30s) — Problem statement, statistics, animated call demo
2. **Dashboard** — Click **"Demo Mode"** button
3. Watch the AI detect a scam in real-time:
   - Unknown caller rings → consent prompt
   - Transcript streams with highlighted scam keywords
   - Risk meter animates 0 → 89
   - Threat feed populates: Voice Clone 92%, OTP Scam 98%
   - Full-screen **SCAM DETECTED** alert fires
   - Click "Alert Family" → SMS confirmation
4. Toggle **Elder Mode** → simple green/red screen
5. Navigate to **Analysis** → "Try Sample Scam Audio" → instant results
6. Navigate to **Family** → show SafePhrase feature

---

## 🔑 Key Features

### Real-Time Dashboard
- Live call monitoring with consent-first flow
- Animated risk meter (0–100) with color transitions
- Real-time speech transcript with keyword highlighting
- Live threat detection feed with confidence scores
- Full-screen SCAM DETECTED alert overlay

### AI Detection Engine
- **Voice Clone Detection** — spectral analysis for AI synthesis artifacts
- **Keyword Extraction** — 50+ scam keywords across 5 categories
- **Urgency Pattern Detection** — regex-based manipulation detection
- **Risk Scoring** — weighted formula combining all signals

### Family Protection
- Up to 5 trusted family contacts
- **SafePhrase™** — secret passphrase to verify real callers
- Instant SMS alerts via Twilio
- Emergency SOS with GPS location

### Elder Mode
- 150% larger text
- Color-only alerts (green = safe, red = danger)
- Hindi/English bilingual
- Giant GET HELP button always visible

### Forensic Analysis
- Upload MP3/WAV/M4A for post-call analysis
- Downloadable evidence reports (JSON)
- Cybercrime complaint formatting

---

## 🧠 AI Risk Scoring Formula

```python
def calculate_risk_score(transcript, voice_anomaly_score, keyword_hits):
    keyword_score = min(keyword_hits * 15, 50)   # max 50 pts
    voice_score   = voice_anomaly_score * 30      # max 30 pts
    urgency_score = detect_urgency_patterns(transcript) * 20  # max 20 pts
    return min(keyword_score + voice_score + urgency_score, 100)

# Verdict thresholds:
# 0–30:  SAFE (green)
# 31–60: SUSPICIOUS (amber)
# 61–100: SCAM DETECTED (red)
```

---

## 🔒 Privacy Architecture

- **No audio stored** — processed in-session only
- **Explicit consent** required before any analysis
- **"Stop & Delete"** button always visible during analysis
- Privacy status bar on every page
- GDPR-compliant data handling

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Animations | Framer Motion, CSS animations |
| Charts | Canvas API (custom risk meter) |
| Backend | FastAPI, Python 3.11 |
| Transcription | OpenAI Whisper API |
| SMS Alerts | Twilio |
| Real-time | WebSocket (FastAPI native) |
| Deployment | Docker, docker-compose |

---

## 📁 Project Structure

```
guardianangel-ai/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── analysis/page.tsx     # Audio analysis
│   │   ├── family/page.tsx       # Family contacts
│   │   ├── reports/page.tsx      # Scam history
│   │   └── settings/page.tsx     # Settings
│   ├── components/
│   │   ├── RiskMeter.tsx         # Canvas-based gauge
│   │   ├── CallMonitor.tsx       # Call state machine
│   │   ├── TranscriptPanel.tsx   # Live transcript
│   │   ├── ThreatFeed.tsx        # Threat list
│   │   ├── ScamAlert.tsx         # Alert overlay
│   │   ├── FamilyContacts.tsx    # Contact manager
│   │   ├── ElderModeToggle.tsx   # Elder mode
│   │   └── Navbar.tsx            # Navigation
│   └── lib/
│       ├── types.ts              # TypeScript interfaces
│       ├── api.ts                # API client
│       └── websocket.ts          # WS manager + demo simulator
│
├── backend/
│   ├── main.py                   # FastAPI app + WebSocket
│   ├── routers/
│   │   ├── analysis.py           # Audio/video endpoints
│   │   ├── reports.py            # Report endpoints
│   │   └── alerts.py             # SMS alert endpoints
│   ├── services/
│   │   ├── scam_detector.py      # Core detection logic
│   │   ├── voice_analyzer.py     # Voice clone detection
│   │   ├── transcript_service.py # Whisper integration
│   │   ├── risk_scorer.py        # Risk calculation
│   │   └── alert_service.py      # Twilio SMS
│   └── utils/
│       └── audio_utils.py        # File validation helpers
│
├── docker-compose.yml
└── README.md
```

---

## 🏆 Hackathon Checklist

- [x] Landing page with problem statement and statistics
- [x] Real-time dashboard with risk meter, transcript, threat feed
- [x] Animated SCAM DETECTED alert overlay
- [x] Elder Mode with simplified interface
- [x] SafePhrase verification on Family page
- [x] Manual audio upload + analysis
- [x] Scam history timeline with expandable reports
- [x] Privacy-first consent flow
- [x] Demo Mode button for judge presentation
- [x] WebSocket real-time streaming simulation
- [x] Mobile-responsive design
- [x] Dark mode, polished UI
- [x] All pages connected in navigation
- [x] Docker deployment ready
- [x] PWA manifest

---

*Built with ❤️ for national-level hackathon competition*  
*Team Pillars — Daksh Chandia & Aarushi Singh | IIIT Kottayam*
