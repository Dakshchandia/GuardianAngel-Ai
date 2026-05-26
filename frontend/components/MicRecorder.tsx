"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Square,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";
import {
  AudioRecorder,
  RecorderState,
  blobToFile,
  formatDuration,
} from "@/lib/audioRecorder";
import {
  getMicPreflightError,
  MIC_PERMISSION_RESET_STEPS,
  queryMicPermission,
} from "@/lib/microphoneAccess";
import { analyzeAudio } from "@/lib/api";
import { AudioAnalysisResponse } from "@/lib/types";

interface MicRecorderProps {
  onResult: (result: AudioAnalysisResponse) => void;
  onError: (msg: string) => void;
  onStateChange?: (state: RecorderState | "uploading" | "analyzing") => void;
  disabled?: boolean;
}

type UIState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "uploading"
  | "analyzing"
  | "complete"
  | "error";

const STATE_LABELS: Record<UIState, string> = {
  idle: "Start Recording",
  requesting_permission: "Requesting mic access...",
  recording: "Recording — click to stop",
  stopping: "Stopping...",
  uploading: "Uploading audio...",
  analyzing: "AI analyzing transcript...",
  complete: "Analysis complete",
  error: "Error — try again",
};

export default function MicRecorder({
  onResult,
  onError,
  onStateChange,
  disabled = false,
}: MicRecorderProps) {
  const [uiState, setUIState] = useState<UIState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPermissionSteps, setShowPermissionSteps] = useState(false);
  const [micPermission, setMicPermission] = useState<
    PermissionState | "unsupported" | null
  >(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const barsRef = useRef<number[]>(Array(20).fill(4));

  // Surface blocked mic before the user clicks Record
  useEffect(() => {
    const preflight = getMicPreflightError();
    if (preflight) {
      setMicPermission("denied");
      return;
    }
    queryMicPermission().then(setMicPermission);
  }, []);

  // Smooth audio level bars
  useEffect(() => {
    if (uiState === "recording") {
      barsRef.current = barsRef.current.map(() =>
        Math.max(4, Math.round(audioLevel * 40 + Math.random() * 10))
      );
    }
  }, [audioLevel, uiState]);

  const setState = useCallback(
    (s: UIState) => {
      setUIState(s);
      if (onStateChange) {
        if (s === "uploading" || s === "analyzing") {
          onStateChange(s);
        } else {
          onStateChange(s as RecorderState);
        }
      }
    },
    [onStateChange]
  );

  const handleStart = useCallback(async () => {
    if (disabled) return;
    setErrorMsg("");
    setShowPermissionSteps(false);
    setDuration(0);
    setAudioBlob(null);
    setUploadProgress(0);

    const recorder = new AudioRecorder({
      onStateChange: (s) => {
        if (s === "recording") setState("recording");
        else if (s === "stopping") setState("stopping");
        else if (s === "error") setState("error");
      },
      onDurationUpdate: setDuration,
      onError: (msg) => {
        setErrorMsg(msg);
        setShowPermissionSteps(
          msg.toLowerCase().includes("permission denied") ||
            msg.toLowerCase().includes("allow microphone")
        );
        setState("error");
        onError(msg);
        queryMicPermission().then(setMicPermission);
      },
      onAudioLevel: setAudioLevel,
    });

    recorderRef.current = recorder;
    await recorder.requestPermissionAndStart();
  }, [disabled, setState, onError]);

  const handleRetry = useCallback(async () => {
    recorderRef.current?.cancel();
    setErrorMsg("");
    setShowPermissionSteps(false);
    setUploadProgress(0);
    await handleStart();
  }, [handleStart]);

  const handleStop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const blob = await recorder.stop();
    if (!blob || blob.size < 1000) {
      const msg = "Recording too short. Please record at least 2 seconds.";
      setErrorMsg(msg);
      setState("error");
      onError(msg);
      return;
    }

    setAudioBlob(blob);
    setState("uploading");
    setUploadProgress(0);

    try {
      const file = blobToFile(blob);

      // Upload with progress
      setState("uploading");
      const result = await analyzeAudio(file, (pct) => {
        setUploadProgress(pct);
        if (pct === 100) setState("analyzing");
      });

      setState("complete");
      onResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Upload failed. Is the backend running?";
      setErrorMsg(msg);
      setState("error");
      onError(msg);
    }
  }, [setState, onResult, onError]);

  const handleCancel = useCallback(() => {
    recorderRef.current?.cancel();
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    setErrorMsg("");
  }, [setState]);

  const handleReset = useCallback(() => {
    setState("idle");
    setDuration(0);
    setAudioBlob(null);
    setErrorMsg("");
    setShowPermissionSteps(false);
    setUploadProgress(0);
  }, [setState]);

  const isActive = ["recording", "uploading", "analyzing", "stopping"].includes(uiState);

  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              uiState === "recording"
                ? "bg-danger/10 border-danger/30"
                : "bg-primary/10 border-primary/20"
            }`}
          >
            <Mic
              className={`w-4 h-4 ${
                uiState === "recording" ? "text-danger" : "text-primary"
              }`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Live Mic Analysis</h3>
            <p className="text-text-muted text-xs">Real audio → AI detection</p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
            uiState === "recording"
              ? "bg-danger/10 border-danger/20 text-danger"
              : uiState === "complete"
              ? "bg-safe/10 border-safe/20 text-safe"
              : uiState === "error"
              ? "bg-danger/10 border-danger/20 text-danger"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          {uiState === "recording" && <div className="pulse-dot-red" />}
          {uiState === "complete" && <CheckCircle className="w-3 h-3" />}
          {uiState === "error" && <AlertCircle className="w-3 h-3" />}
          {["uploading", "analyzing", "requesting_permission", "stopping"].includes(
            uiState
          ) && <Loader2 className="w-3 h-3 animate-spin" />}
          {uiState === "idle" && <Mic className="w-3 h-3" />}
          <span className="capitalize">
            {uiState === "idle"
              ? "Ready"
              : uiState === "recording"
              ? "REC"
              : uiState === "uploading"
              ? "Uploading"
              : uiState === "analyzing"
              ? "Analyzing"
              : uiState === "complete"
              ? "Done"
              : uiState === "error"
              ? "Error"
              : "..."}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* IDLE */}
        {uiState === "idle" && (
          <div className="text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto">
              <Mic className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-white font-semibold">Record Real Audio</p>
              <p className="text-text-muted text-sm mt-1">
                Speak into your mic — GuardianAngel will transcribe and analyze it
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-primary/10 text-left space-y-2">
              <p className="text-white text-xs font-semibold">🔒 Privacy Notice</p>
              <p className="text-text-muted text-xs leading-relaxed">
                Audio is sent to the backend for transcription only. It is not stored
                after analysis. You can stop at any time.
              </p>
            </div>
            {micPermission === "denied" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 text-left">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-warning font-semibold text-sm">
                    Microphone blocked for this site
                  </p>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">
                    Allow microphone access in your browser&apos;s site settings, then
                    start recording.
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleStart}
              disabled={disabled}
              className="w-full py-4 rounded-xl bg-primary text-background font-bold text-base flex items-center justify-center gap-3 hover:bg-primary/80 transition-all disabled:opacity-40"
            >
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          </div>
        )}

        {/* REQUESTING PERMISSION */}
        {uiState === "requesting_permission" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-20 h-20 rounded-full bg-warning/10 border-2 border-warning/30 flex items-center justify-center mx-auto animate-pulse">
              <Mic className="w-10 h-10 text-warning" />
            </div>
            <p className="text-white font-semibold">Requesting Microphone Access</p>
            <p className="text-text-muted text-sm">
              Please click &ldquo;Allow&rdquo; in your browser&apos;s permission prompt
            </p>
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          </div>
        )}

        {/* RECORDING */}
        {uiState === "recording" && (
          <div className="space-y-5">
            {/* Big record indicator */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-danger" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-danger">
                {formatDuration(duration)}
              </div>
              <p className="text-text-muted text-xs mt-1">Recording in progress</p>
            </div>

            {/* Live waveform */}
            <div className="flex items-center justify-center gap-1 h-12">
              {Array.from({ length: 24 }).map((_, i) => {
                const height = Math.max(
                  4,
                  Math.round(
                    audioLevel * 40 * (0.5 + 0.5 * Math.sin((i / 24) * Math.PI)) +
                      Math.random() * 8
                  )
                );
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-danger transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Stop button */}
            <button
              onClick={handleStop}
              className="w-full py-4 rounded-xl bg-danger text-white font-bold text-base flex items-center justify-center gap-3 hover:bg-danger/80 transition-all glow-red"
            >
              <Square className="w-5 h-5 fill-white" />
              Stop & Analyze
            </button>

            <button
              onClick={handleCancel}
              className="w-full py-2.5 rounded-xl border border-white/10 text-text-muted text-sm hover:bg-white/5 transition-all"
            >
              Cancel Recording
            </button>
          </div>
        )}

        {/* STOPPING */}
        {uiState === "stopping" && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-white font-semibold">Finalizing recording...</p>
          </div>
        )}

        {/* UPLOADING */}
        {uiState === "uploading" && (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Uploading Audio</p>
              <p className="text-text-muted text-xs mt-1">
                Sending to GuardianAngel backend...
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Upload progress</span>
                <span className="text-primary font-mono">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-safe rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted justify-center">
              <Shield className="w-3.5 h-3.5 text-safe" />
              Audio encrypted in transit · Not stored after analysis
            </div>
          </div>
        )}

        {/* ANALYZING */}
        {uiState === "analyzing" && (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 border-2 border-warning/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-warning animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">AI Analysis Running</p>
              <p className="text-text-muted text-xs mt-1">
                Whisper transcription → keyword scan → risk scoring
              </p>
            </div>
            {/* Animated steps */}
            <div className="space-y-2">
              {[
                { label: "Transcribing speech with Whisper", done: true },
                { label: "Scanning for scam keywords", done: true },
                { label: "Calculating risk score", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  {step.done ? (
                    <CheckCircle className="w-4 h-4 text-safe shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  )}
                  <span className={step.done ? "text-safe" : "text-primary"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {uiState === "complete" && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-safe/20 border-2 border-safe/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-safe" />
            </div>
            <div>
              <p className="text-safe font-bold">Analysis Complete</p>
              <p className="text-text-muted text-xs mt-1">
                Results displayed in dashboard
              </p>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Record Again
            </button>
          </div>
        )}

        {/* ERROR */}
        {uiState === "error" && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-danger font-semibold text-sm">Recording Failed</p>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">
                  {errorMsg || "An unexpected error occurred."}
                </p>
              </div>
            </div>
            {showPermissionSteps && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-left space-y-2">
                <p className="text-warning text-xs font-semibold">
                  How to fix microphone access
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-text-muted text-xs leading-relaxed">
                  {MIC_PERMISSION_RESET_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-xl bg-primary text-background font-bold text-sm hover:bg-primary/80 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl border border-white/10 text-text-muted text-sm hover:bg-white/5 transition-all"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
