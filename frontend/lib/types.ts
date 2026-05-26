// Core types for GuardianAngel AI

export type RiskLevel = "SAFE" | "SUSPICIOUS" | "HIGH RISK" | "SCAM";

export interface TranscriptEntry {
  time: string;
  text: string;
  hasKeyword?: boolean;
  keywords?: string[];
}

export interface ThreatEntry {
  id: string;
  time: string;
  type: "VOICE_CLONE" | "URGENCY" | "ISOLATION" | "OTP_SCAM" | "FINANCIAL" | "DEEPFAKE" | "AUTHORITY" | "IMPERSONATION";
  label: string;
  confidence: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  callerNumber: string;
  callerName?: string;
  riskScore: number;
  verdict: RiskLevel;
  transcript: TranscriptEntry[];
  threats: ThreatEntry[];
  voiceCloneProbability: number;
  deepfakeProbability?: number;
  manipulationPhrases: string[];
  evidenceSummary: string;
}

export interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  alertEnabled: boolean;
}

export interface SafePhrase {
  phrase: string;
  hint: string;
  isSet: boolean;
}

export interface AlertPreference {
  method: "sms" | "call_sms" | "silent";
  contacts: string[]; // contact IDs
}

export interface ReportEntry {
  id: string;
  date: string;
  callerNumber: string;
  callerName?: string;
  riskScore: number;
  verdict: RiskLevel;
  duration: string;
  threats: ThreatEntry[];
  transcript: TranscriptEntry[];
  voiceCloneProbability: number;
}

export interface UserSettings {
  language: "en" | "hi";
  elderMode: boolean;
  dataRetention: boolean;
  consentGiven: boolean;
  notifications: {
    sms: boolean;
    push: boolean;
    email: boolean;
  };
}

// WebSocket message types
export type WSMessageType = "transcript" | "threat" | "risk_update" | "call_start" | "call_end" | "alert";

export interface WSMessage {
  type: WSMessageType;
  data: TranscriptEntry | ThreatEntry | { score: number } | { callerNumber: string } | null;
  timestamp: string;
}

// API response types
export interface AudioAnalysisResponse {
  transcript: TranscriptEntry[];
  risk_score: number;
  threats: ThreatEntry[];
  voice_clone_probability: number;
  verdict: RiskLevel;
  manipulation_phrases: string[];
  evidence_summary: string;
  // Voice authenticity fields
  voice_risk: "LOW" | "MEDIUM" | "HIGH";
  voice_flags: string[];
  voice_summary: string;
}

export interface VoiceAnalysisResponse {
  voice_clone_probability: number;
  voice_risk: "LOW" | "MEDIUM" | "HIGH";
  voice_flags: string[];
  voice_summary: string;
  features: Record<string, number | null>;
  model: string;
}

export interface AlertResponse {
  sent_count: number;
  status: "success" | "partial" | "failed";
  message: string;
}

// Demo mode types
export interface DemoStep {
  step: number;
  action: string;
  delay: number;
  data?: unknown;
}

export const SCAM_KEYWORDS = [
  "otp", "one time password", "send money", "urgent", "accident",
  "don't tell", "secret", "immediately", "bank account", "kyc",
  "verify", "arrested", "police", "transfer", "paytm", "upi",
  "₹", "password", "pin", "cvv", "loan", "prize", "won",
];

export const MOCK_SCAM_TRANSCRIPT: TranscriptEntry[] = [
  { time: "0:03", text: "Hello, is this Ramesh ji?", hasKeyword: false },
  { time: "0:07", text: "Dadu, it's me! I'm in an accident...", hasKeyword: true, keywords: ["accident"] },
  { time: "0:12", text: "Please don't tell anyone. Send ₹80,000 urgently.", hasKeyword: true, keywords: ["don't tell", "₹", "urgent"] },
  { time: "0:18", text: "My OTP just came, I need you to verify it.", hasKeyword: true, keywords: ["otp", "verify"] },
  { time: "0:24", text: "This is very secret. Don't call mom.", hasKeyword: true, keywords: ["secret"] },
  { time: "0:29", text: "Transfer to this UPI ID immediately: scam@upi", hasKeyword: true, keywords: ["transfer", "upi", "immediately"] },
];

export const MOCK_THREAT_FEED: ThreatEntry[] = [
  { id: "t1", time: "0:08", type: "VOICE_CLONE", label: "Synthetic voice anomaly detected", confidence: 92, severity: "HIGH" },
  { id: "t2", time: "0:13", type: "URGENCY", label: "High-pressure urgency language", confidence: 87, severity: "HIGH" },
  { id: "t3", time: "0:15", type: "ISOLATION", label: "'Don't tell anyone' isolation tactic", confidence: 95, severity: "HIGH" },
  { id: "t4", time: "0:19", type: "OTP_SCAM", label: "OTP extraction attempt detected", confidence: 98, severity: "HIGH" },
  { id: "t5", time: "0:25", type: "FINANCIAL", label: "Fraudulent UPI transfer request", confidence: 96, severity: "HIGH" },
];

export const MOCK_RISK_PROGRESSION = [0, 12, 28, 45, 67, 79, 89];

export const MOCK_REPORTS: ReportEntry[] = [
  {
    id: "r1",
    date: "2024-05-20T14:32:00",
    callerNumber: "+91 98765 43210",
    callerName: "Unknown",
    riskScore: 89,
    verdict: "SCAM",
    duration: "1:24",
    threats: MOCK_THREAT_FEED,
    transcript: MOCK_SCAM_TRANSCRIPT,
    voiceCloneProbability: 0.92,
  },
  {
    id: "r2",
    date: "2024-05-19T09:15:00",
    callerNumber: "+91 87654 32109",
    callerName: "Unknown",
    riskScore: 67,
    verdict: "SUSPICIOUS",
    duration: "0:45",
    threats: [MOCK_THREAT_FEED[1], MOCK_THREAT_FEED[2]],
    transcript: MOCK_SCAM_TRANSCRIPT.slice(0, 3),
    voiceCloneProbability: 0.45,
  },
  {
    id: "r3",
    date: "2024-05-18T16:50:00",
    callerNumber: "+91 76543 21098",
    callerName: "Priya (Daughter)",
    riskScore: 12,
    verdict: "SAFE",
    duration: "3:20",
    threats: [],
    transcript: [
      { time: "0:05", text: "Hi Dad, how are you feeling today?", hasKeyword: false },
      { time: "0:12", text: "I'll be home for dinner, don't worry.", hasKeyword: false },
    ],
    voiceCloneProbability: 0.04,
  },
  {
    id: "r4",
    date: "2024-05-17T11:22:00",
    callerNumber: "+91 65432 10987",
    callerName: "Unknown",
    riskScore: 94,
    verdict: "SCAM",
    duration: "2:10",
    threats: MOCK_THREAT_FEED,
    transcript: MOCK_SCAM_TRANSCRIPT,
    voiceCloneProbability: 0.97,
  },
  {
    id: "r5",
    date: "2024-05-16T08:05:00",
    callerNumber: "+91 54321 09876",
    callerName: "Rajesh (Son)",
    riskScore: 8,
    verdict: "SAFE",
    duration: "5:45",
    threats: [],
    transcript: [
      { time: "0:03", text: "Good morning Papa! Did you take your medicine?", hasKeyword: false },
    ],
    voiceCloneProbability: 0.02,
  },
];
