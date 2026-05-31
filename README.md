# GuardianAngel AI 🛡️

Real-time AI-powered scam call detection platform protecting elderly people in India from voice clone scams, OTP fraud, and emotional manipulation.

**Built by Team Pillars — Daksh Chandia & Aarushi Singh | IIIT Kottayam**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | FastAPI, Python 3.12 |
| STT | OpenAI Whisper API + Local Whisper fallback |
| Scam Analysis | Google Gemini 2.5 Flash → GPT-3.5 fallback |
| Voice Analysis | Torch acoustic feature extraction |
| SMS Alerts | Twilio |

## Quick Start (Localhost)

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
python -m uvicorn main:app --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:3002
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI Whisper API for speech-to-text |
| `GEMINI_API_KEY` | Yes | Google Gemini 2.5 Flash for scam analysis |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio for SMS family alerts |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth |
| `TWILIO_FROM_NUMBER` | Optional | Twilio sender number |

### Frontend (`frontend/.env.local`)
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g. `https://your-backend.onrender.com`) |

## Deployment

- **Frontend** → Vercel (auto-detected Next.js)
- **Backend** → Render / Railway (Python FastAPI)

See deployment guide in `/docs` for full instructions.

## Features

- 🎙️ Real-time microphone recording
- 🤖 OpenAI Whisper speech-to-text
- 🧠 Gemini 2.5 Flash scam pattern detection
- 🔬 Acoustic voice clone analysis
- 📊 Live risk scoring (0–100)
- 🚨 Family SMS alerts via Twilio
- 👴 Elder Mode for simplified UI
- 🔒 Privacy-first — no audio stored
