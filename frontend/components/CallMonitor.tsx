"use client";

import { Phone, PhoneOff, Shield, Loader2, User } from "lucide-react";

type CallState = "idle" | "ringing" | "consent" | "analyzing" | "complete";

interface CallMonitorProps {
  callState: CallState;
  callerNumber: string;
  callerName?: string;
  onConsent: (yes: boolean) => void;
  onEndCall: () => void;
  onSimulateCall: () => void;
  analysisProgress?: number;
}

export default function CallMonitor({
  callState,
  callerNumber,
  callerName,
  onConsent,
  onEndCall,
  onSimulateCall,
  analysisProgress = 0,
}: CallMonitorProps) {
  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Phone className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Call Monitor</h3>
            <p className="text-text-muted text-xs">Real-time call protection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="pulse-dot-green" />
          <span className="text-safe text-xs font-semibold">Protection Active</span>
        </div>
      </div>

      {/* Call content */}
      <div className="p-6">
        {/* IDLE STATE */}
        {callState === "idle" && (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-white font-semibold">GuardianAngel Active</p>
              <p className="text-text-muted text-sm mt-1">
                Monitoring for incoming calls...
              </p>
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{
                    animationDelay: `${i * 0.12}s`,
                    height: `${8 + Math.sin(i) * 6}px`,
                  }}
                />
              ))}
            </div>
            <button
              onClick={onSimulateCall}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Simulate Incoming Call
            </button>
          </div>
        )}

        {/* RINGING STATE */}
        {callState === "ringing" && (
          <div className="text-center space-y-5 py-4 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center mx-auto animate-pulse">
              <User className="w-10 h-10 text-warning" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-bold mb-3">
                ⚠ Unknown Caller Detected
              </div>
              <p className="text-white font-bold text-xl font-mono">{callerNumber}</p>
              {callerName && <p className="text-text-muted text-sm">{callerName}</p>}
              <p className="text-text-muted text-xs mt-1">Not in your contacts</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onConsent(false)}
                className="flex-1 py-3 rounded-xl border border-danger/30 text-danger font-bold hover:bg-danger/10 transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                Decline
              </button>
              <button
                onClick={() => onConsent(true)}
                className="flex-1 py-3 rounded-xl bg-safe/20 border border-safe/30 text-safe font-bold hover:bg-safe/30 transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Answer + Analyze
              </button>
            </div>
          </div>
        )}

        {/* CONSENT STATE */}
        {callState === "consent" && (
          <div className="text-center space-y-5 py-4 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <div className="glass rounded-xl p-5 border border-primary/20 text-left space-y-3">
              <h4 className="text-white font-semibold text-sm">🔒 Privacy Consent Required</h4>
              <p className="text-text-muted text-xs leading-relaxed">
                GuardianAngel AI will analyze this call in real-time to detect scam patterns.
                Audio is processed in-session only and never stored on our servers.
              </p>
              <div className="space-y-2 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safe" />
                  No audio recording stored
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safe" />
                  Analysis runs locally in-session
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-safe" />
                  You can stop analysis anytime
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onConsent(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted font-semibold hover:bg-white/5 transition-all text-sm"
              >
                No Thanks
              </button>
              <button
                onClick={() => onConsent(true)}
                className="flex-1 py-3 rounded-xl bg-primary text-background font-bold hover:bg-primary/80 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                YES, Analyze
              </button>
            </div>
          </div>
        )}

        {/* ANALYZING STATE */}
        {callState === "analyzing" && (
          <div className="space-y-5 py-2 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold font-mono">{callerNumber}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  <span className="text-primary text-xs font-semibold">AI Analysis Running...</span>
                </div>
              </div>
              <button
                onClick={onEndCall}
                className="w-10 h-10 rounded-full bg-danger/20 border border-danger/30 flex items-center justify-center hover:bg-danger/30 transition-all"
              >
                <PhoneOff className="w-4 h-4 text-danger" />
              </button>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Analysis Progress</span>
                <span className="text-primary font-mono">{Math.round(analysisProgress)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-safe rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>

            {/* Live indicators */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Voice", active: analysisProgress > 10 },
                { label: "Keywords", active: analysisProgress > 30 },
                { label: "Pattern", active: analysisProgress > 60 },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg p-2 text-center text-xs border transition-all ${
                    item.active
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-white/5 border-white/10 text-text-muted"
                  }`}
                >
                  {item.active && <span className="mr-1">✓</span>}
                  {item.label}
                </div>
              ))}
            </div>

            <button
              onClick={onEndCall}
              className="w-full py-2.5 rounded-xl border border-danger/20 text-danger text-sm font-semibold hover:bg-danger/10 transition-all flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              Stop Analysis & Delete
            </button>
          </div>
        )}

        {/* COMPLETE STATE */}
        {callState === "complete" && (
          <div className="text-center space-y-4 py-4 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-safe/20 border border-safe/30 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-safe" />
            </div>
            <div>
              <p className="text-safe font-bold">Analysis Complete</p>
              <p className="text-text-muted text-xs mt-1">Call ended · No data retained</p>
            </div>
            <button
              onClick={onSimulateCall}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Phone className="w-4 h-4" />
              New Call Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
