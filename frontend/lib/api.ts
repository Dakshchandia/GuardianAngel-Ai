import {
  AudioAnalysisResponse,
  VoiceAnalysisResponse,
  AlertResponse,
  FamilyContact,
  ReportEntry,
} from "./types";

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
    : "http://127.0.0.1:8000";

// ─── Real audio analysis ──────────────────────────────────────────────────────

/**
 * Upload a real audio blob/file to the backend for analysis.
 * This is the REAL pipeline — no mocks.
 */
export async function analyzeAudio(
  file: File | Blob,
  onProgress?: (pct: number) => void
): Promise<AudioAnalysisResponse> {
  const formData = new FormData();

  // Ensure we send a proper File with a name the backend can use
  if (file instanceof Blob && !(file instanceof File)) {
    const ext = file.type.includes("webm")
      ? "webm"
      : file.type.includes("ogg")
      ? "ogg"
      : file.type.includes("mp4")
      ? "mp4"
      : "webm";
    formData.append("file", file, `recording.${ext}`);
  } else {
    formData.append("file", file);
  }

  // Use XMLHttpRequest so we can track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log("REAL BACKEND RESPONSE:", data);
          resolve(data);
        } catch {
          reject(new Error("Invalid JSON response from server"));
        }
      } else {
        let detail = xhr.statusText;
        try {
          const body = JSON.parse(xhr.responseText);
          detail = body.detail || detail;
        } catch {}
        reject(new Error(`Analysis failed (${xhr.status}): ${detail}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — is the backend running?"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));

    xhr.open("POST", `${API_BASE}/api/analyze/audio`);
    xhr.timeout = 120_000; // 2 min max for Whisper
    xhr.send(formData);
  });
}

// ─── Video frame analysis ─────────────────────────────────────────────────────

export async function analyzeVideoFrame(file: File): Promise<{
  deepfake_probability: number;
  anomalies: string[];
  verdict: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/analyze/video-frame`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(): Promise<ReportEntry[]> {
  const response = await fetch(`${API_BASE}/api/reports`);
  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.statusText}`);
  }
  return response.json();
}

// ─── Family alerts ────────────────────────────────────────────────────────────

export async function sendFamilyAlert(
  contacts: FamilyContact[],
  riskData: { score: number; threats: string[]; callerNumber: string },
  message: string
): Promise<AlertResponse> {
  const response = await fetch(`${API_BASE}/api/alerts/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts, risk_data: riskData, message }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Alert failed: ${response.statusText}`);
  }

  return response.json();
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  // Try both 127.0.0.1 and localhost to handle IPv4/IPv6 differences on Windows
  const urls = [
    "http://127.0.0.1:8000/health",
    "http://localhost:8000/health",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      // try next
    }
  }
  return false;
}

// ─── Demo mode mock (only used when demoMode=true) ───────────────────────────

export function getMockAnalysisResult(): AudioAnalysisResponse {
  return {
    transcript: [
      { time: "0:03", text: "Hello, is this Ramesh ji?", hasKeyword: false },
      {
        time: "0:07",
        text: "Dadu, it's me! I'm in an accident...",
        hasKeyword: true,
        keywords: ["accident"],
      },
      {
        time: "0:12",
        text: "Please don't tell anyone. Send ₹80,000 urgently.",
        hasKeyword: true,
        keywords: ["don't tell", "₹", "urgent"],
      },
      {
        time: "0:18",
        text: "My OTP just came, I need you to verify it.",
        hasKeyword: true,
        keywords: ["otp", "verify"],
      },
      {
        time: "0:24",
        text: "This is very secret. Don't call mom.",
        hasKeyword: true,
        keywords: ["secret"],
      },
    ],
    risk_score: 89,
    threats: [
      {
        id: "t1",
        time: "0:08",
        type: "VOICE_CLONE",
        label: "Synthetic voice anomaly detected",
        confidence: 92,
        severity: "HIGH",
      },
      {
        id: "t2",
        time: "0:13",
        type: "URGENCY",
        label: "High-pressure urgency language",
        confidence: 87,
        severity: "HIGH",
      },
      {
        id: "t3",
        time: "0:15",
        type: "ISOLATION",
        label: "'Don't tell anyone' isolation tactic",
        confidence: 95,
        severity: "HIGH",
      },
      {
        id: "t4",
        time: "0:19",
        type: "OTP_SCAM",
        label: "OTP extraction attempt detected",
        confidence: 98,
        severity: "HIGH",
      },
    ],
    voice_clone_probability: 0.92,
    verdict: "SCAM",
    manipulation_phrases: [
      "don't tell anyone",
      "send money urgently",
      "OTP verification",
    ],
    evidence_summary:
      "High-confidence AI voice clone detected. Multiple scam indicators present including urgency pressure, isolation tactics, and OTP extraction attempt. Recommend immediate call termination and family alert.",
  };
}
