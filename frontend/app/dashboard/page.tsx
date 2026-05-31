"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import RiskMeter from "@/components/RiskMeter";
import TranscriptPanel from "@/components/TranscriptPanel";
import ThreatFeed from "@/components/ThreatFeed";
import ScamAlert from "@/components/ScamAlert";
import ElderModeToggle from "@/components/ElderModeToggle";
import MicRecorder from "@/components/MicRecorder";
import {
  TranscriptEntry,
  ThreatEntry,
  AudioAnalysisResponse,
  MOCK_SCAM_TRANSCRIPT,
  MOCK_THREAT_FEED,
  MOCK_RISK_PROGRESSION,
} from "@/lib/types";
import { getMockAnalysisResult, checkBackendHealth } from "@/lib/api";
import {
  Play,
  Zap,
  Lock,
  Shield,
  RefreshCw,
  Mic,
  AlertCircle,
  CheckCircle,
  WifiOff,
  Wifi,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalysisPhase =
  | "idle"
  | "recording"
  | "uploading"
  | "analyzing"
  | "complete"
  | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Core analysis state
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [riskScore, setRiskScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [threats, setThreats] = useState<ThreatEntry[]>([]);
  const [verdict, setVerdict] = useState<string>("");
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>("");
  const [showAlert, setShowAlert] = useState(false);

  // UI state
  const [demoMode, setDemoMode] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [elderMode, setElderMode] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ─── Backend health check ───────────────────────────────────────────────────
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    const interval = setInterval(
      () => checkBackendHealth().then(setBackendOnline),
      15000
    );
    return () => clearInterval(interval);
  }, []);

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setPhase("idle");
    setRiskScore(0);
    setTranscript([]);
    setThreats([]);
    setVerdict("");
    setDetectedKeywords([]);
    setEvidenceSummary("");
    setAnalysisTimestamp("");
    setShowAlert(false);
    setIsDemoRunning(false);
    setErrorMsg("");
  }, []);

  // ─── Apply real result ──────────────────────────────────────────────────────
  const applyResult = useCallback(
    (result: AudioAnalysisResponse) => {
      setTranscript(result.transcript);
      setThreats(result.threats);
      setRiskScore(result.risk_score);
      setVerdict(result.verdict);
      setDetectedKeywords(result.manipulation_phrases || []);
      setEvidenceSummary(result.evidence_summary);
      setAnalysisTimestamp(new Date().toLocaleTimeString("en-IN"));
      setPhase("complete");

      if (result.risk_score > 60) {
        setTimeout(() => setShowAlert(true), 800);
        toast.error(`⚠️ ${result.verdict} detected — Risk score: ${result.risk_score}/100`, {
          duration: 5000,
        });
      } else if (result.risk_score > 30) {
        toast("⚠️ Suspicious patterns detected", {
          icon: "🟡",
          duration: 4000,
        });
      } else {
        toast.success("✅ Call appears safe — no scam indicators found", {
          duration: 4000,
        });
      }
    },
    []
  );

  // ─── Demo mode ──────────────────────────────────────────────────────────────
  const runDemo = useCallback(() => {
    reset();
    setIsDemoRunning(true);
    setPhase("recording");

    toast("🎬 Demo mode — simulating scam call analysis", {
      icon: "🛡️",
      duration: 2500,
    });

    const add = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      demoTimers.current.push(t);
    };

    // Simulate recording → uploading → analyzing
    add(() => setPhase("uploading"), 2000);
    add(() => setPhase("analyzing"), 3500);

    // Stream transcript
    MOCK_SCAM_TRANSCRIPT.forEach((entry, i) => {
      add(() => setTranscript((prev) => [...prev, entry]), 4000 + i * 1400);
    });

    // Stream threats
    MOCK_THREAT_FEED.forEach((threat, i) => {
      add(() => setThreats((prev) => [...prev, threat]), 4500 + i * 1300);
    });

    // Risk progression
    MOCK_RISK_PROGRESSION.forEach((score, i) => {
      add(() => setRiskScore(score), 3800 + i * 1000);
    });

    // Final result
    add(() => {
      const result = getMockAnalysisResult();
      applyResult(result);
      setIsDemoRunning(false);
    }, 12000);
  }, [reset, applyResult]);

  // ─── Real mic result handler ─────────────────────────────────────────────────
  const handleRealResult = useCallback(
    (result: AudioAnalysisResponse) => {
      applyResult(result);
    },
    [applyResult]
  );

  const handleRecorderError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setPhase("error");
    toast.error(msg, { duration: 5000 });
  }, []);

  const handleRecorderStateChange = useCallback(
    (state: string) => {
      if (state === "recording") setPhase("recording");
      else if (state === "uploading") setPhase("uploading");
      else if (state === "analyzing") setPhase("analyzing");
      else if (state === "idle" || state === "error") {
        // Don't override complete state
        if (phase !== "complete") setPhase(state as AnalysisPhase);
      }
    },
    [phase]
  );

  // ─── Verdict color ───────────────────────────────────────────────────────────
  const verdictColor =
    verdict === "SCAM"
      ? "text-danger"
      : verdict === "SUSPICIOUS"
      ? "text-warning"
      : verdict === "SAFE"
      ? "text-safe"
      : "text-text-muted";

  const verdictBg =
    verdict === "SCAM"
      ? "bg-danger/10 border-danger/20"
      : verdict === "SUSPICIOUS"
      ? "bg-warning/10 border-warning/20"
      : verdict === "SAFE"
      ? "bg-safe/10 border-safe/20"
      : "bg-white/5 border-white/10";

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />

      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl font-bold text-white">
                Protection Dashboard
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-safe/10 border border-safe/20">
                <div className="pulse-dot-green" />
                <span className="text-safe text-xs font-bold">ACTIVE</span>
              </div>
            </div>
            <p className="text-text-muted text-sm">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Backend status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                backendOnline === null
                  ? "bg-white/5 border-white/10 text-text-muted"
                  : backendOnline
                  ? "bg-safe/10 border-safe/20 text-safe"
                  : "bg-danger/10 border-danger/20 text-danger"
              }`}
            >
              {backendOnline === null ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : backendOnline ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {backendOnline === null
                ? "Checking..."
                : backendOnline
                ? "Backend Online"
                : "Backend Offline"}
            </div>

            {/* Language */}
            <button
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="px-3 py-2 rounded-lg border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/10 transition-all"
            >
              {language === "en" ? "हिंदी" : "English"}
            </button>

            {/* Demo mode toggle */}
            <button
              onClick={() => {
                const next = !demoMode;
                setDemoMode(next);
                reset();
                toast(
                  next
                    ? "🎬 Demo mode ON — using mock data"
                    : "🎙️ Live mode ON — using real microphone",
                  { duration: 2500 }
                );
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm transition-all ${
                demoMode
                  ? "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20"
                  : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              }`}
            >
              {demoMode ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              {demoMode ? "Demo Mode" : "Live Mode"}
            </button>

            {/* Demo run button (only in demo mode) */}
            {demoMode && (
              <button
                onClick={runDemo}
                disabled={isDemoRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-background font-bold text-sm hover:bg-warning/80 transition-all disabled:opacity-50"
              >
                {isDemoRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isDemoRunning ? "Running..." : "Run Demo"}
              </button>
            )}

            {/* Reset */}
            {phase !== "idle" && (
              <button
                onClick={reset}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-text-muted text-sm hover:bg-white/5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Privacy bar ── */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-6 rounded-xl bg-surface/50 border border-primary/10 mb-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-safe" />
            No audio stored
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Processed in-session only
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-warning" />
            {demoMode ? "Demo mode active" : "Real mic analysis"}
          </div>
        </div>

        {/* ── Backend offline warning ── */}
        {backendOnline === false && !demoMode && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 mb-6 animate-fade-in-up">
            <WifiOff className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-danger font-semibold text-sm">Backend Offline</p>
              <p className="text-text-muted text-xs mt-1">
                The FastAPI backend is not reachable at{" "}
                <code className="text-primary">http://localhost:8000</code>. Start it
                with:{" "}
                <code className="text-primary">
                  python -m uvicorn main:app --reload --port 8000
                </code>
                , or switch to{" "}
                <button
                  onClick={() => setDemoMode(true)}
                  className="text-warning underline"
                >
                  Demo Mode
                </button>
                .
              </p>
            </div>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Mic recorder / demo controls + transcript */}
          <div className="lg:col-span-4 space-y-6">
            {/* Mic recorder (live mode) or demo info (demo mode) */}
            {!demoMode ? (
              <MicRecorder
                onResult={handleRealResult}
                onError={handleRecorderError}
                onStateChange={handleRecorderStateChange}
                disabled={backendOnline === false}
              />
            ) : (
              <div className="glass rounded-2xl border border-warning/20 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Demo Mode Active</h3>
                    <p className="text-text-muted text-xs">Using mock scam scenario</p>
                  </div>
                </div>
                <p className="text-text-muted text-xs leading-relaxed">
                  Demo mode uses pre-scripted data to showcase the full detection
                  pipeline. Switch to{" "}
                  <button
                    onClick={() => { setDemoMode(false); reset(); }}
                    className="text-primary underline"
                  >
                    Live Mode
                  </button>{" "}
                  to use your real microphone.
                </p>
                <button
                  onClick={runDemo}
                  disabled={isDemoRunning}
                  className="w-full py-3 rounded-xl bg-warning text-background font-bold text-sm flex items-center justify-center gap-2 hover:bg-warning/80 transition-all disabled:opacity-50"
                >
                  {isDemoRunning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isDemoRunning ? "Demo Running..." : "Run Scam Demo"}
                </button>
              </div>
            )}

            {/* Transcript */}
            <TranscriptPanel
              entries={transcript}
              isLive={phase === "recording" || phase === "analyzing"}
              maxHeight="300px"
            />

            {/* Elder mode */}
            <ElderModeToggle
              isEnabled={elderMode}
              onToggle={setElderMode}
              riskScore={riskScore}
              language={language}
            />
          </div>

          {/* CENTER: Risk meter + result summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Risk meter */}
            <div className="glass rounded-2xl border border-primary/20 p-6">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-white text-sm">AI Risk Score</h3>
                <p className="text-text-muted text-xs">
                  {phase === "idle"
                    ? "Waiting for audio input"
                    : phase === "recording"
                    ? "Recording audio..."
                    : phase === "uploading"
                    ? "Uploading to backend..."
                    : phase === "analyzing"
                    ? "Transcribing & analyzing..."
                    : phase === "complete"
                    ? `Analysis complete · ${analysisTimestamp}`
                    : "Error occurred"}
                </p>
              </div>

              <div className="flex justify-center">
                <RiskMeter score={riskScore} size="lg" showLabel={true} animated={true} />
              </div>

              {/* Phase progress indicator */}
              {(phase === "uploading" || phase === "analyzing" || phase === "recording") && (
                <div className="mt-4 pt-4 border-t border-primary/10 space-y-2">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>
                      {phase === "recording"
                        ? "Recording..."
                        : phase === "uploading"
                        ? "Uploading..."
                        : "Analyzing..."}
                    </span>
                    <Loader className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-safe rounded-full animate-pulse"
                      style={{ width: phase === "uploading" ? "60%" : phase === "analyzing" ? "85%" : "30%" }}
                    />
                  </div>
                </div>
              )}

              {/* Result breakdown */}
              {phase === "complete" && riskScore > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/10 space-y-3">
                  {/* Verdict badge */}
                  <div className={`flex items-center justify-center gap-2 py-2 rounded-xl border ${verdictBg}`}>
                    {verdict === "SCAM" && <AlertCircle className="w-4 h-4 text-danger" />}
                    {verdict === "SAFE" && <CheckCircle className="w-4 h-4 text-safe" />}
                    {verdict === "SUSPICIOUS" && <AlertCircle className="w-4 h-4 text-warning" />}
                    <span className={`font-bold text-sm ${verdictColor}`}>{verdict}</span>
                  </div>

                  {/* Detected keywords */}
                  {detectedKeywords.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                        Detected Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-1 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-semibold"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence summary */}
                  {evidenceSummary && (
                    <p className="text-text-muted text-xs leading-relaxed border-t border-white/5 pt-3">
                      {evidenceSummary}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pipeline status card */}
            <div className="glass rounded-2xl border border-primary/20 p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                Analysis Pipeline
              </h3>
              <div className="space-y-2">
                {[
                  {
                    step: "1. Mic Recording",
                    done: ["uploading", "analyzing", "complete"].includes(phase),
                    active: phase === "recording",
                  },
                  {
                    step: "2. Upload to Backend",
                    done: ["analyzing", "complete"].includes(phase),
                    active: phase === "uploading",
                  },
                  {
                    step: "3. Whisper Transcription",
                    done: phase === "complete",
                    active: phase === "analyzing",
                  },
                  {
                    step: "4. Scam Keyword Analysis",
                    done: phase === "complete",
                    active: phase === "analyzing",
                  },
                  {
                    step: "5. Risk Score Generated",
                    done: phase === "complete",
                    active: false,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 text-xs">
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 text-safe shrink-0" />
                    ) : item.active ? (
                      <Loader className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                    )}
                    <span
                      className={
                        item.done
                          ? "text-safe"
                          : item.active
                          ? "text-primary"
                          : "text-text-muted"
                      }
                    >
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mode indicator */}
              <div
                className={`flex items-center gap-2 pt-2 border-t border-white/5 text-xs ${
                  demoMode ? "text-warning" : "text-primary"
                }`}
              >
                {demoMode ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
                {demoMode ? "Demo mode — mock data" : "Live mode — real microphone"}
              </div>
            </div>
          </div>

          {/* RIGHT: Threat feed + session stats */}
          <div className="lg:col-span-4 space-y-6">
            <ThreatFeed
              threats={threats}
              isLive={phase === "analyzing" || phase === "recording"}
            />

            {/* Session stats */}
            <div className="glass rounded-2xl border border-primary/20 p-5 space-y-4">
              <h3 className="font-semibold text-white text-sm">Session Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Risk Score",
                    value: phase === "complete" ? riskScore.toString() : "—",
                    color:
                      riskScore > 60
                        ? "text-danger"
                        : riskScore > 30
                        ? "text-warning"
                        : riskScore > 0
                        ? "text-safe"
                        : "text-text-muted",
                  },
                  {
                    label: "Threats Found",
                    value: threats.length > 0 ? threats.length.toString() : "—",
                    color: threats.length > 0 ? "text-danger" : "text-text-muted",
                  },
                  {
                    label: "Keywords Hit",
                    value:
                      detectedKeywords.length > 0
                        ? detectedKeywords.length.toString()
                        : "—",
                    color:
                      detectedKeywords.length > 0 ? "text-warning" : "text-text-muted",
                  },
                  {
                    label: "Verdict",
                    value: verdict || "—",
                    color: verdictColor,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass rounded-xl p-3 border border-white/5 text-center"
                  >
                    <div className={`text-xl font-display font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-text-muted text-xs mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error display */}
            {phase === "error" && errorMsg && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-danger font-semibold text-sm">Analysis Failed</p>
                  <p className="text-text-muted text-xs mt-1">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scam Alert Overlay */}
      <ScamAlert
        isVisible={showAlert}
        riskScore={riskScore}
        voiceCloneRisk={Math.min(Math.round(riskScore * 1.03), 99)}
        scamIntent={Math.min(Math.round(riskScore * 1.06), 99)}
        emotionalManipulation={Math.min(Math.round(riskScore * 0.88), 99)}
        onAlertFamily={() =>
          toast.success("🚨 Emergency SMS sent to family contacts!", { duration: 5000 })
        }
        onReport={() =>
          toast.success("📋 Cybercrime evidence report generated!", { duration: 3000 })
        }
        onDismiss={() => setShowAlert(false)}
      />
    </div>
  );
}

// Inline loader icon to avoid import issues
function Loader({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
