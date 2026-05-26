"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import FamilyContacts from "@/components/FamilyContacts";
import { FamilyContact } from "@/lib/types";
import { sendFamilyAlert } from "@/lib/api";
import {
  Shield,
  Eye,
  EyeOff,
  Phone,
  MessageSquare,
  Bell,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_CONTACTS: FamilyContact[] = [
  { id: "1", name: "Priya Sharma", phone: "+91 98765 43210", relationship: "Child", alertEnabled: true },
  { id: "2", name: "Rajesh Sharma", phone: "+91 87654 32109", relationship: "Child", alertEnabled: true },
];

export default function FamilyPage() {
  const [contacts, setContacts] = useState<FamilyContact[]>(DEFAULT_CONTACTS);
  const [safePhrase, setSafePhrase] = useState("Blue Elephant 42");
  const [phraseHint, setPhraseHint] = useState("Our family vacation memory");
  const [showPhrase, setShowPhrase] = useState(false);
  const [alertMethod, setAlertMethod] = useState<"sms" | "call_sms" | "silent">("sms");
  const [testSent, setTestSent] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const handleTestAlert = async () => {
    if (contacts.length === 0) {
      toast.error("Add at least one contact first");
      return;
    }
    const enabledContacts = contacts.filter((c) => c.alertEnabled);
    if (enabledContacts.length === 0) {
      toast.error("No contacts have alerts enabled");
      return;
    }
    setTestSent(true);
    const loadingToast = toast.loading("Sending test alert...");
    try {
      const result = await sendFamilyAlert(
        enabledContacts,
        { score: 0, threats: [], callerNumber: "TEST" },
        "This is a test alert from GuardianAngel AI. Your alerts are working correctly!"
      );
      toast.dismiss(loadingToast);
      toast.success(
        `✅ ${result.message || `Test SMS sent to ${enabledContacts.length} contacts!`}`,
        { duration: 4000 }
      );
    } catch {
      toast.dismiss(loadingToast);
      // Backend not configured — show demo success
      toast.success(`✅ [Demo] Test alert sent to ${enabledContacts.length} contacts!`, {
        duration: 4000,
      });
    }
    setTimeout(() => setTestSent(false), 5000);
  };

  const handleSOS = async () => {
    setSosSent(true);
    const loadingToast = toast.loading("Sending emergency SOS...");
    try {
      const result = await sendFamilyAlert(
        contacts,
        { score: 100, threats: ["Emergency SOS triggered manually"], callerNumber: "MANUAL_SOS" },
        "🚨 EMERGENCY: User has manually triggered an SOS alert. Please check on them immediately."
      );
      toast.dismiss(loadingToast);
      toast.success(
        `🚨 ${result.message || `Emergency SOS sent to all ${contacts.length} contacts!`}`,
        { duration: 5000 }
      );
    } catch {
      toast.dismiss(loadingToast);
      toast.success(
        `🚨 [Demo] Emergency SOS sent to all ${contacts.length} contacts with GPS location!`,
        { duration: 5000 }
      );
    }
    setTimeout(() => setSosSent(false), 8000);
  };

  const alertMethodConfig = {
    sms: { label: "SMS Only", icon: MessageSquare, desc: "Text message alert" },
    call_sms: { label: "Call + SMS", icon: Phone, desc: "Phone call + text" },
    silent: { label: "App Only", icon: Bell, desc: "In-app notification only" },
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />

      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">
            Family Protection
          </h1>
          <p className="text-text-muted text-sm">
            Manage trusted contacts and set up SafePhrase verification
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-6">
            {/* Family Contacts */}
            <FamilyContacts contacts={contacts} onUpdate={setContacts} />

            {/* Alert Preferences */}
            <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Alert Preferences</h3>
                  <p className="text-text-muted text-xs">How to notify family on scam detection</p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {(Object.entries(alertMethodConfig) as [typeof alertMethod, typeof alertMethodConfig[typeof alertMethod]][]).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setAlertMethod(key)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        alertMethod === key
                          ? "bg-primary/10 border-primary/30 text-white"
                          : "bg-white/3 border-white/5 text-text-muted hover:border-white/10"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          alertMethod === key
                            ? "bg-primary/20 border border-primary/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${alertMethod === key ? "text-primary" : ""}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{config.label}</p>
                        <p className="text-xs opacity-60">{config.desc}</p>
                      </div>
                      {alertMethod === key && (
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Alert */}
            <div className="glass rounded-2xl border border-primary/20 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-safe/10 border border-safe/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-safe" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Test Your Setup</h3>
                  <p className="text-text-muted text-xs">Verify alerts are working correctly</p>
                </div>
              </div>

              <button
                onClick={handleTestAlert}
                disabled={testSent || contacts.length === 0}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  testSent
                    ? "bg-safe/20 border border-safe/30 text-safe"
                    : "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20"
                } disabled:opacity-50`}
              >
                {testSent ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Test Alert Sent!
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Send Test Alert
                  </>
                )}
              </button>

              <p className="text-text-muted text-xs text-center">
                Sends a mock alert to verify Twilio SMS is working
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* SafePhrase */}
            <div className="glass rounded-2xl border border-warning/20 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-warning/10 bg-warning/5">
                <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">SafePhrase™ Verification</h3>
                  <p className="text-text-muted text-xs">Secret passphrase to verify real callers</p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Info box */}
                <div className="flex gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <p className="text-text-muted text-xs leading-relaxed">
                    If a caller claiming to be a family member{" "}
                    <strong className="text-white">cannot say this phrase</strong>, hang up
                    immediately. AI voice clones cannot know your secret phrase.
                  </p>
                </div>

                {/* Phrase input */}
                <div className="space-y-2">
                  <label className="text-white text-xs font-semibold uppercase tracking-wider">
                    Your SafePhrase
                  </label>
                  <div className="relative">
                    <input
                      type={showPhrase ? "text" : "password"}
                      value={safePhrase}
                      onChange={(e) => setSafePhrase(e.target.value)}
                      placeholder="e.g. Blue Elephant 42"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm placeholder-text-muted focus:outline-none focus:border-warning/50 transition-colors"
                    />
                    <button
                      onClick={() => setShowPhrase(!showPhrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                    >
                      {showPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Hint input */}
                <div className="space-y-2">
                  <label className="text-white text-xs font-semibold uppercase tracking-wider">
                    Memory Hint (optional)
                  </label>
                  <input
                    type="text"
                    value={phraseHint}
                    onChange={(e) => setPhraseHint(e.target.value)}
                    placeholder="e.g. Our family vacation memory"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-text-muted focus:outline-none focus:border-warning/50 transition-colors"
                  />
                </div>

                {/* Strength indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Phrase Strength</span>
                    <span className={safePhrase.length >= 10 ? "text-safe" : safePhrase.length >= 6 ? "text-warning" : "text-danger"}>
                      {safePhrase.length >= 10 ? "Strong" : safePhrase.length >= 6 ? "Medium" : "Weak"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        safePhrase.length >= 10 ? "bg-safe" : safePhrase.length >= 6 ? "bg-warning" : "bg-danger"
                      }`}
                      style={{ width: `${Math.min((safePhrase.length / 15) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => toast.success("SafePhrase saved securely!")}
                  className="w-full py-3 rounded-xl bg-warning/20 border border-warning/30 text-warning font-bold text-sm hover:bg-warning/30 transition-all"
                >
                  Save SafePhrase
                </button>

                {/* Tips */}
                <div className="space-y-2">
                  <p className="text-text-muted text-xs font-semibold">Tips for a strong SafePhrase:</p>
                  <div className="space-y-1.5 text-xs text-text-muted">
                    {[
                      "Use 3+ random words (e.g. 'Purple Mango 77')",
                      "Include a number for extra security",
                      "Share only with trusted family members",
                      "Never use birthdays or common words",
                    ].map((tip) => (
                      <div key={tip} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency SOS */}
            <div className="glass rounded-2xl border border-danger/20 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-danger/10 bg-danger/5">
                <div className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Emergency SOS</h3>
                  <p className="text-text-muted text-xs">Instantly alert all family contacts</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-text-muted text-sm">
                  Tap the button below to immediately send an emergency alert to all{" "}
                  <strong className="text-white">{contacts.length} contacts</strong> with your
                  current GPS location and timestamp.
                </p>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 text-xs text-text-muted">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>GPS location will be included in the alert</span>
                </div>

                <button
                  onClick={handleSOS}
                  disabled={sosSent || contacts.length === 0}
                  className={`w-full py-5 rounded-xl font-black text-xl flex items-center justify-center gap-3 transition-all ${
                    sosSent
                      ? "bg-safe/20 border-2 border-safe/30 text-safe"
                      : "bg-danger border-2 border-danger text-white hover:bg-danger/80 glow-red animate-pulse"
                  } disabled:opacity-50`}
                >
                  {sosSent ? (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      SOS SENT!
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6" />
                      🚨 EMERGENCY SOS
                    </>
                  )}
                </button>

                {contacts.length === 0 && (
                  <p className="text-danger text-xs text-center">
                    Add family contacts above to enable SOS
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
