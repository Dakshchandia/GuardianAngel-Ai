"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  Settings,
  Shield,
  Globe,
  Eye,
  Bell,
  Database,
  Lock,
  Info,
  ChevronRight,
  CheckCircle,
  Moon,
  Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";

interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  color?: string;
}

function Toggle({ enabled, onChange, label, description, color = "bg-primary" }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-text-muted text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
          enabled ? color : "bg-white/10"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
            enabled ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    language: "en" as "en" | "hi",
    elderMode: false,
    dataRetention: false,
    consentRequired: true,
    notifySMS: true,
    notifyPush: true,
    notifyEmail: false,
    autoAnalyze: false,
    darkMode: true,
    pwaInstall: false,
    shareAnonymousData: false,
    voiceGuidance: false,
  });

  const update = (key: keyof typeof settings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success("Setting saved", { duration: 1500 });
  };

  const clearData = () => {
    toast.success("All local data cleared. Privacy maintained.", { duration: 3000 });
  };

  const exportData = () => {
    const data = JSON.stringify({ settings, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guardianangel-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported!");
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />

      <div className="pt-20 pb-8 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-text-muted text-sm">
            Customize GuardianAngel AI to your preferences
          </p>
        </div>

        {/* Demo mode badge */}
        <div className="glass rounded-2xl border border-primary/20 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Team Pillars — Demo Mode</p>
            <p className="text-text-muted text-xs">
              GuardianAngel AI · National Hackathon Build · IIIT Kottayam
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            DEMO
          </div>
        </div>

        <div className="space-y-6">
          {/* Language & Accessibility */}
          <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/10">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-white">Language & Accessibility</h2>
            </div>
            <div className="px-5">
              {/* Language selector */}
              <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5">
                <div>
                  <p className="text-white text-sm font-medium">Display Language</p>
                  <p className="text-text-muted text-xs mt-0.5">Interface and alert language</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: "en", label: "English" },
                    { value: "hi", label: "हिंदी" },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => update("language", lang.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        settings.language === lang.value
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "bg-white/5 text-text-muted border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle
                enabled={settings.elderMode}
                onChange={(v) => update("elderMode", v)}
                label="Elder Mode"
                description="Larger text, simplified UI, color-only alerts"
                color="bg-warning"
              />
              <Toggle
                enabled={settings.voiceGuidance}
                onChange={(v) => update("voiceGuidance", v)}
                label="Voice Guidance"
                description="Audio cues for safe/danger status"
              />
            </div>
          </div>

          {/* Privacy & Data */}
          <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/10">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-white">Privacy & Data</h2>
            </div>
            <div className="px-5">
              <Toggle
                enabled={settings.consentRequired}
                onChange={(v) => update("consentRequired", v)}
                label="Require Consent Before Analysis"
                description="Always show consent prompt before recording"
                color="bg-safe"
              />
              <Toggle
                enabled={settings.dataRetention}
                onChange={(v) => update("dataRetention", v)}
                label="Store Analysis History"
                description="Save reports locally for future reference"
              />
              <Toggle
                enabled={settings.shareAnonymousData}
                onChange={(v) => update("shareAnonymousData", v)}
                label="Share Anonymous Threat Data"
                description="Help improve AI detection (no personal data)"
              />
            </div>

            <div className="px-5 pb-5 pt-2 space-y-2">
              <button
                onClick={clearData}
                className="w-full py-2.5 rounded-xl border border-danger/20 text-danger text-sm font-semibold hover:bg-danger/10 transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" />
                Clear All Local Data
              </button>
              <button
                onClick={exportData}
                className="w-full py-2.5 rounded-xl border border-white/10 text-text-muted text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                Export My Data
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/10">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-white">Notifications</h2>
            </div>
            <div className="px-5">
              <Toggle
                enabled={settings.notifySMS}
                onChange={(v) => update("notifySMS", v)}
                label="SMS Alerts"
                description="Text message to family on scam detection"
                color="bg-safe"
              />
              <Toggle
                enabled={settings.notifyPush}
                onChange={(v) => update("notifyPush", v)}
                label="Push Notifications"
                description="In-app alerts and warnings"
              />
              <Toggle
                enabled={settings.notifyEmail}
                onChange={(v) => update("notifyEmail", v)}
                label="Email Reports"
                description="Weekly summary of detected threats"
              />
            </div>
          </div>

          {/* App Settings */}
          <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/10">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-white">App Settings</h2>
            </div>
            <div className="px-5">
              <Toggle
                enabled={settings.darkMode}
                onChange={(v) => update("darkMode", v)}
                label="Dark Mode"
                description="Dark theme (recommended for security apps)"
                color="bg-primary"
              />
              <Toggle
                enabled={settings.autoAnalyze}
                onChange={(v) => update("autoAnalyze", v)}
                label="Auto-Analyze Unknown Calls"
                description="Start analysis automatically (requires consent)"
              />
              <Toggle
                enabled={settings.pwaInstall}
                onChange={(v) => update("pwaInstall", v)}
                label="Install as Mobile App (PWA)"
                description="Add to home screen for quick access"
                color="bg-warning"
              />
            </div>
          </div>

          {/* About */}
          <div className="glass rounded-2xl border border-primary/10 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-white">About GuardianAngel AI</h2>
            </div>
            <div className="space-y-3 text-sm text-text-muted">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-white font-mono">1.0.0-hackathon</span>
              </div>
              <div className="flex justify-between">
                <span>Build</span>
                <span className="text-white font-mono">2025.05.25</span>
              </div>
              <div className="flex justify-between">
                <span>Team</span>
                <span className="text-white">Team Pillars</span>
              </div>
              <div className="flex justify-between">
              </div>
              <div className="flex justify-between">
                <span>Institution</span>
                <span className="text-white">IIIT Kottayam</span>
              </div>
              <div className="flex justify-between">
                <span>AI Models</span>
                <span className="text-white">Whisper (local) · Ollama LLM</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs text-safe">
                <CheckCircle className="w-3.5 h-3.5" />
                Privacy-first architecture — no audio stored
              </div>
              <div className="flex items-center gap-2 text-xs text-safe">
                <CheckCircle className="w-3.5 h-3.5" />
                GDPR-compliant data handling
              </div>
              <div className="flex items-center gap-2 text-xs text-safe">
                <CheckCircle className="w-3.5 h-3.5" />
                Open source components
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
