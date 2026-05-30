"use client";

import { useState } from "react";
import { Eye, EyeOff, Phone, AlertTriangle, Shield } from "lucide-react";

interface ElderModeToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  riskScore?: number;
  language?: "en" | "hi";
}

export default function ElderModeToggle({
  isEnabled,
  onToggle,
  riskScore = 0,
  language = "en",
}: ElderModeToggleProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const isSafe = riskScore <= 30;
  const isDanger = riskScore > 60;

  const labels = {
    en: {
      safe: "SAFE CALL",
      danger: "DANGER! END CALL NOW",
      suspicious: "BE CAREFUL",
      help: "GET HELP",
      toggle: "Elder Mode",
      on: "ON",
      off: "OFF",
    },
    hi: {
      safe: "सुरक्षित कॉल",
      danger: "खतरा! अभी कॉल काटें",
      suspicious: "सावधान रहें",
      help: "मदद लें",
      toggle: "बुजुर्ग मोड",
      on: "चालू",
      off: "बंद",
    },
  };

  const t = labels[language];

  if (isEnabled && showFullscreen) {
    return (
      <div
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 transition-all ${
          isDanger
            ? "bg-danger"
            : isSafe
            ? "bg-safe"
            : "bg-warning"
        }`}
      >
        {/* Main status */}
        <div className="text-center space-y-6">
          {isDanger ? (
            <AlertTriangle className="w-32 h-32 text-white mx-auto animate-pulse" />
          ) : (
            <Shield className="w-32 h-32 text-white mx-auto" />
          )}

          <div className="text-white font-display font-black text-6xl md:text-8xl text-center px-8">
            {isDanger ? t.danger : isSafe ? t.safe : t.suspicious}
          </div>

          {isDanger && (
            <p className="text-white/80 text-2xl font-semibold">
              {language === "hi"
                ? "यह एक AI स्कैम हो सकता है"
                : "This may be an AI scam"}
            </p>
          )}
        </div>

        {/* Risk score large */}
        <div className="text-white/60 text-3xl font-mono">
          {language === "hi" ? "जोखिम स्कोर:" : "Risk Score:"} {riskScore}/100
        </div>

        {/* GET HELP button */}
        <button
          className="w-64 h-24 rounded-3xl bg-white text-danger font-black text-3xl shadow-2xl hover:scale-105 transition-transform flex items-center justify-center gap-3"
          onClick={() => alert("Calling emergency contact...")}
        >
          <Phone className="w-8 h-8" />
          {t.help}
        </button>

        {/* Exit elder mode */}
        <button
          onClick={() => setShowFullscreen(false)}
          className="text-white/50 text-lg underline"
        >
          {language === "hi" ? "वापस जाएं" : "Back to normal view"}
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-primary/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{t.toggle}</h3>
            <p className="text-text-muted text-xs">Simplified view for seniors</p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={() => onToggle(!isEnabled)}
          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
            isEnabled ? "bg-primary" : "bg-white/10"
          }`}
        >
          <div
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
              isEnabled ? "left-8" : "left-1"
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-safe" />
              Large text enabled
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-safe" />
              Color-only alerts
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-safe" />
              Hindi/English toggle
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-safe" />
              GET HELP button
            </div>
          </div>

          <button
            onClick={() => setShowFullscreen(true)}
            className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Elder Mode
          </button>
        </div>
      )}

      {/* Always-visible GET HELP button when elder mode is on */}
      {isEnabled && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setShowFullscreen(true)}
            className="w-16 h-16 rounded-full bg-danger text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-2xl glow-red hover:scale-110 transition-transform"
          >
            <Phone className="w-5 h-5" />
            HELP
          </button>
        </div>
      )}
    </div>
  );
}
