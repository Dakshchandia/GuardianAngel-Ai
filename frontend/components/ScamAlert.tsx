"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, Users, FileText, Phone } from "lucide-react";
import toast from "react-hot-toast";

interface ScamAlertProps {
  isVisible: boolean;
  riskScore: number;
  voiceCloneRisk: number;
  scamIntent: number;
  emotionalManipulation: number;
  onAlertFamily: () => void;
  onReport: () => void;
  onDismiss: () => void;
}

export default function ScamAlert({
  isVisible,
  riskScore,
  voiceCloneRisk,
  scamIntent,
  emotionalManipulation,
  onAlertFamily,
  onReport,
  onDismiss,
}: ScamAlertProps) {
  const [countdown, setCountdown] = useState(15);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setCountdown(15);
      setAlertSent(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  const handleAlertFamily = () => {
    setAlertSent(true);
    onAlertFamily();
    toast.success("🚨 SMS alert sent to 2 family contacts!", {
      duration: 4000,
      style: { background: "#111827", color: "#00E676", border: "1px solid #00E676" },
    });
  };

  const handleReport = () => {
    onReport();
    toast.success("📋 Evidence report generated!", {
      duration: 3000,
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 alert-overlay animate-fade-in-up" />

      {/* Pulsing border effect */}
      <div className="absolute inset-0 border-4 border-danger/50 animate-pulse pointer-events-none" />

      {/* Alert card */}
      <div className="relative glass-danger rounded-3xl p-8 max-w-lg w-full border-2 border-danger/50 glow-red animate-fade-in-up shadow-2xl">
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center mx-auto animate-pulse">
            <AlertTriangle className="w-10 h-10 text-danger" />
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold text-danger text-glow-red">
              ⚠️ SCAM DETECTED
            </h2>
            <p className="text-white/70 text-sm mt-2">
              High-confidence AI scam identified. Take action immediately.
            </p>
          </div>
        </div>

        {/* Risk breakdown */}
        <div className="space-y-3 mb-8">
          <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Risk Breakdown
          </h3>
          {[
            { label: "Voice Clone Risk", value: voiceCloneRisk, icon: "🎙️" },
            { label: "Scam Intent", value: scamIntent, icon: "🎯" },
            { label: "Emotional Manipulation", value: emotionalManipulation, icon: "🧠" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-lg w-8">{item.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{item.label}</span>
                  <span className="text-danger font-bold">{item.value}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger rounded-full transition-all duration-1000"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall score */}
        <div className="flex items-center justify-center gap-3 mb-8 p-4 rounded-xl bg-danger/10 border border-danger/20">
          <div className="text-center">
            <div className="text-5xl font-display font-bold text-danger">{riskScore}</div>
            <div className="text-white/50 text-xs">/100 Risk Score</div>
          </div>
          <div className="text-left">
            <p className="text-white font-semibold">Immediate Action Required</p>
            <p className="text-white/60 text-xs">End the call and alert your family</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {!alertSent ? (
            <button
              onClick={handleAlertFamily}
              className="w-full py-4 rounded-xl bg-danger text-white font-bold text-lg flex items-center justify-center gap-3 hover:bg-danger/80 transition-all glow-red"
            >
              <Users className="w-5 h-5" />
              Alert Family Now
            </button>
          ) : (
            <div className="w-full py-4 rounded-xl bg-safe/20 border border-safe/30 text-safe font-bold text-lg flex items-center justify-center gap-3">
              ✓ SMS Sent to 2 Contacts
            </div>
          )}

          <button
            onClick={handleReport}
            className="w-full py-3 rounded-xl border border-white/20 text-white font-semibold flex items-center justify-center gap-3 hover:bg-white/5 transition-all"
          >
            <FileText className="w-5 h-5" />
            Report to Cybercrime
          </button>

          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
          >
            <Phone className="w-4 h-4" />
            End Call & Dismiss
            {countdown > 0 && (
              <span className="ml-1 text-white/30">({countdown}s)</span>
            )}
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-white/30 text-xs mt-4">
          🔒 No audio stored · Evidence report generated locally
        </p>
      </div>
    </div>
  );
}
