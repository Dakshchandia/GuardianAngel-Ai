"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Navbar from "@/components/Navbar";
import RiskMeter from "@/components/RiskMeter";
import ThreatFeed from "@/components/ThreatFeed";
import TranscriptPanel from "@/components/TranscriptPanel";
import { analyzeAudio, getMockAnalysisResult } from "@/lib/api";
import { AudioAnalysisResponse } from "@/lib/types";
import {
  Upload,
  Mic,
  FileAudio,
  Loader2,
  CheckCircle,
  Download,
  Play,
  Video,
  AlertTriangle,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";

type AnalysisState = "idle" | "uploading" | "processing" | "complete" | "error";

export default function AnalysisPage() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [result, setResult] = useState<AudioAnalysisResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"audio" | "video">("audio");
  const [errorMsg, setErrorMsg] = useState("");
  const [usedRealBackend, setUsedRealBackend] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setAnalysisState("idle");
      setResult(null);
      setErrorMsg("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      activeTab === "audio"
        ? { "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"] }
        : {
            "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
            "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"],
          },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const runRealAnalysis = async (file: File) => {
    setAnalysisState("uploading");
    setProgress(0);
    setResult(null);
    setErrorMsg("");
    setUsedRealBackend(false);

    try {
      const result = await analyzeAudio(file, (pct) => {
        setProgress(pct);
        if (pct >= 100) setAnalysisState("processing");
      });

      setResult(result);
      setAnalysisState("complete");
      setUsedRealBackend(true);

      if (result.risk_score > 60) {
        toast.error(`⚠️ ${result.verdict} — Risk: ${result.risk_score}/100`, { duration: 5000 });
      } else if (result.risk_score > 30) {
        toast("⚠️ Suspicious patterns detected", { icon: "🟡", duration: 4000 });
      } else {
        toast.success("✅ No scam indicators found", { duration: 4000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setErrorMsg(msg);
      setAnalysisState("error");
      toast.error(msg, { duration: 5000 });
    }
  };

  const runAnalysis = async () => {
    if (!uploadedFile) return;
    // Both audio and video files go through the same audio analysis pipeline
    // For video files, the backend extracts audio via ffmpeg automatically
    await runRealAnalysis(uploadedFile);
  };

  const runSampleDemo = async () => {
    setAnalysisState("processing");
    setProgress(0);
    setResult(null);
    setErrorMsg("");
    setUsedRealBackend(false);

    toast("🎬 Running demo analysis with mock data...", { icon: "🛡️", duration: 2000 });

    // Simulate progress steps
    const steps = [
      { progress: 20, label: "Loading sample audio..." },
      { progress: 40, label: "Running Whisper transcription..." },
      { progress: 60, label: "Scanning for scam keywords..." },
      { progress: 80, label: "Analyzing voice patterns..." },
      { progress: 95, label: "Calculating risk score..." },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 500));
      setProgress(step.progress);
    }

    await new Promise((r) => setTimeout(r, 400));
    const mockResult = getMockAnalysisResult();
    setResult(mockResult);
    setAnalysisState("complete");
    toast.success("Demo analysis complete!", { duration: 3000 });
  };

  const downloadReport = () => {
    if (!result) return;
    const report = {
      generated: new Date().toISOString(),
      source: usedRealBackend ? "real_audio_analysis" : "demo_mock_data",
      verdict: result.verdict,
      risk_score: result.risk_score,
      voice_clone_probability: result.voice_clone_probability,
      threats: result.threats,
      transcript: result.transcript,
      evidence_summary: result.evidence_summary,
      manipulation_phrases: result.manipulation_phrases,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardianangel-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Evidence report downloaded!");
  };

  const verdictConfig = {
    SCAM: { color: "text-danger", bg: "bg-danger/10", border: "border-danger/30", icon: "🔴" },
    SUSPICIOUS: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", icon: "🟡" },
    SAFE: { color: "text-safe", bg: "bg-safe/10", border: "border-safe/30", icon: "🟢" },
  };

  const isProcessing = analysisState === "uploading" || analysisState === "processing";

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />

      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">
            Forensic Analysis
          </h1>
          <p className="text-text-muted text-sm">
            Upload audio recordings for AI-powered scam detection — uses real Whisper transcription
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Upload */}
          <div className="space-y-6">
            {/* Tab selector */}
            <div className="flex gap-2 p-1 rounded-xl bg-surface border border-white/5">
              {[
                { id: "audio", label: "Audio Analysis", icon: Mic },
                { id: "video", label: "Video Analysis", icon: Video },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as "audio" | "video");
                      setUploadedFile(null);
                      setResult(null);
                      setAnalysisState("idle");
                      setErrorMsg("");
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-text-muted hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : uploadedFile
                  ? "border-safe/40 bg-safe/5"
                  : "border-white/10 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <input {...getInputProps()} />

              {uploadedFile ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-safe/10 border border-safe/20 flex items-center justify-center mx-auto">
                    <FileAudio className="w-8 h-8 text-safe" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{uploadedFile.name}</p>
                    <p className="text-text-muted text-xs mt-1">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setResult(null);
                      setAnalysisState("idle");
                      setErrorMsg("");
                    }}
                    className="text-text-muted text-xs hover:text-danger transition-colors flex items-center gap-1 mx-auto"
                  >
                    <X className="w-3 h-3" /> Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {isDragActive ? "Drop file here" : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-text-muted text-sm mt-1">
                      {activeTab === "audio"
                        ? "MP3, WAV, M4A, OGG, FLAC, WEBM · Max 50MB"
                        : "MP4, WEBM, MOV, AVI, MKV · Max 50MB"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error display */}
            {analysisState === "error" && errorMsg && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 animate-fade-in-up">
                <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-danger font-semibold text-sm">Analysis Failed</p>
                  <p className="text-text-muted text-xs mt-1">{errorMsg}</p>
                  <p className="text-text-muted text-xs mt-2">
                    Make sure the backend is running:{" "}
                    <code className="text-primary">python -m uvicorn main:app --port 8000</code>
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={runAnalysis}
                disabled={!uploadedFile || isProcessing}
                className="w-full py-4 rounded-xl bg-primary text-background font-bold text-base flex items-center justify-center gap-3 hover:bg-primary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {analysisState === "uploading" ? `Uploading... ${progress}%` : "Analyzing with Whisper..."}
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Analyze with Real AI
                  </>
                )}
              </button>

              <button
                onClick={runSampleDemo}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl border border-primary/20 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-all disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                Try Sample Scam Demo (Mock Data)
              </button>
            </div>

            {/* Progress bar */}
            {isProcessing && (
              <div className="space-y-2 animate-fade-in-up">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>
                    {analysisState === "uploading" ? "Uploading audio..." : "AI processing..."}
                  </span>
                  <span className="text-primary font-mono">{progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-safe rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: "Upload", done: progress >= 100 },
                    { label: "Whisper", done: analysisState === "complete" },
                    { label: "Risk Score", done: analysisState === "complete" },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className={`flex items-center gap-1.5 ${step.done ? "text-safe" : "text-text-muted"}`}
                    >
                      {step.done ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-current opacity-40" />
                      )}
                      {step.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="glass rounded-2xl border border-primary/10 p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">How Analysis Works</h3>
              <div className="space-y-2 text-xs text-text-muted">
                {[
                  "1. Audio transcribed using local Whisper (tiny model, offline)",
                  "2. Scam keywords extracted across 8 categories",
                  "3. Voice patterns analyzed for AI synthesis artifacts",
                  "4. Risk score calculated (0–100) with weighted scoring",
                  "5. Evidence report generated for police filing",
                ].map((step) => (
                  <div key={step} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {analysisState === "complete" && result ? (
              <>
                {/* Source badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold ${
                  usedRealBackend
                    ? "bg-safe/10 border-safe/20 text-safe"
                    : "bg-warning/10 border-warning/20 text-warning"
                }`}>
                  {usedRealBackend ? (
                    <><Wifi className="w-3.5 h-3.5" /> Real AI analysis — Whisper + keyword detection</>
                  ) : (
                    <><WifiOff className="w-3.5 h-3.5" /> Demo mode — mock data (not real audio)</>
                  )}
                </div>

                {/* Verdict banner */}
                <div
                  className={`rounded-2xl p-6 border ${
                    verdictConfig[result.verdict as keyof typeof verdictConfig]?.bg ?? "bg-white/5"
                  } ${
                    verdictConfig[result.verdict as keyof typeof verdictConfig]?.border ?? "border-white/10"
                  } text-center space-y-3 animate-fade-in-up`}
                >
                  <div className="text-4xl">
                    {verdictConfig[result.verdict as keyof typeof verdictConfig]?.icon ?? "⚪"}
                  </div>
                  <div>
                    <div
                      className={`font-display text-3xl font-bold ${
                        verdictConfig[result.verdict as keyof typeof verdictConfig]?.color ?? "text-white"
                      }`}
                    >
                      {result.verdict}
                    </div>
                    <p className="text-text-muted text-sm mt-1">{result.evidence_summary}</p>
                  </div>
                  <div className="flex justify-center gap-6 pt-2">
                    <div className="text-center">
                      <div className={`text-2xl font-bold font-mono ${
                        verdictConfig[result.verdict as keyof typeof verdictConfig]?.color ?? "text-white"
                      }`}>
                        {result.risk_score}
                      </div>
                      <div className="text-text-muted text-xs">Risk Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono text-danger">
                        {Math.round(result.voice_clone_probability * 100)}%
                      </div>
                      <div className="text-text-muted text-xs">Voice Clone</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono text-warning">
                        {result.threats.length}
                      </div>
                      <div className="text-text-muted text-xs">Threats Found</div>
                    </div>
                  </div>
                </div>

                {/* Risk meter */}
                <div className="glass rounded-2xl border border-primary/20 p-6 flex justify-center">
                  <RiskMeter score={result.risk_score} size="md" showLabel={true} />
                </div>

                {/* Manipulation phrases */}
                {result.manipulation_phrases.length > 0 && (
                  <div className="glass rounded-2xl border border-danger/20 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      <h3 className="text-white font-semibold text-sm">Manipulation Phrases Detected</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.manipulation_phrases.map((phrase) => (
                        <span
                          key={phrase}
                          className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-semibold"
                        >
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threats */}
                <ThreatFeed threats={result.threats} />

                {/* Transcript */}
                <TranscriptPanel entries={result.transcript} maxHeight="200px" />

                {/* Download */}
                <button
                  onClick={downloadReport}
                  className="w-full py-4 rounded-xl border border-primary/30 text-primary font-bold flex items-center justify-center gap-3 hover:bg-primary/10 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Evidence Report (JSON)
                </button>
              </>
            ) : (
              <div className="glass rounded-2xl border border-primary/10 p-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Mic className="w-10 h-10 text-primary opacity-50" />
                </div>
                <div>
                  <p className="text-white font-semibold">No Analysis Yet</p>
                  <p className="text-text-muted text-sm mt-1">
                    Upload an audio file for real AI analysis, or try the sample demo
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={runSampleDemo}
                    className="btn-primary mx-auto flex items-center gap-2 text-sm px-6 py-3"
                  >
                    <Play className="w-4 h-4" />
                    Try Sample Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
