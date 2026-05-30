"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Phone,
  AlertTriangle,
  Users,
  Mic,
  Video,
  Bell,
  ChevronRight,
  CheckCircle,
  Zap,
  Lock,
  Globe,
  ArrowRight,
  Play,
  Star,
} from "lucide-react";

const HEADLINE_WORDS = [
  "Scammers are using AI",
  "to sound like your family.",
  "We fight back.",
];

const STATS = [
  { value: "₹22,000 Cr", label: "Cybercrime losses in India (2024)", flag: "🇮🇳" },
  { value: "$12.5B", label: "AI fraud losses globally", flag: "🌍" },
  { value: "47%", label: "Rise in voice clone scams (2024)", flag: "📈" },
  { value: "< 3 sec", label: "GuardianAngel detection time", flag: "⚡" },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Clone Detection",
    description:
      "Real-time AI analysis detects synthetic voice patterns with 92%+ accuracy. Identifies cloned voices mid-call before any damage is done.",
    color: "primary",
    badge: "LIVE",
  },
  {
    icon: Video,
    title: "Deepfake Video Analysis",
    description:
      "Frame-by-frame analysis of video calls detects facial inconsistencies, lip-sync anomalies, and AI-generated artifacts.",
    color: "warning",
    badge: "AI",
  },
  {
    icon: Bell,
    title: "Family SOS Alerts",
    description:
      "Instant SMS alerts to trusted family contacts when a scam is detected. Includes GPS location, timestamp, and threat summary.",
    color: "safe",
    badge: "INSTANT",
  },
];

const HOW_IT_WORKS = [
  { step: 1, title: "Call Detected", desc: "Incoming call triggers GuardianAngel monitoring", icon: Phone },
  { step: 2, title: "Consent Given", desc: "User taps YES to start AI analysis", icon: CheckCircle },
  { step: 3, title: "Audio Analyzed", desc: "Whisper AI transcribes speech in real-time", icon: Mic },
  { step: 4, title: "Threats Flagged", desc: "AI detects voice clones, scam patterns, manipulation", icon: AlertTriangle },
  { step: 5, title: "Risk Scored", desc: "0–100 risk score calculated in under 3 seconds", icon: Zap },
  { step: 6, title: "Family Alerted", desc: "SOS SMS sent instantly if scam confirmed", icon: Users },
];

const TESTIMONIALS = [
  {
    name: "Ramesh Sharma",
    age: 68,
    location: "Delhi",
    text: "Someone called pretending to be my son. GuardianAngel detected it was a fake voice and warned me. Saved me ₹2 lakhs.",
    rating: 5,
  },
  {
    name: "Sunita Patel",
    age: 72,
    location: "Mumbai",
    text: "The Elder Mode is so simple. Just a big green or red screen. Even I can understand it immediately.",
    rating: 5,
  },
  {
    name: "Arjun Mehta",
    age: 45,
    location: "Bangalore",
    text: "Set up SafePhrase for my parents. Now they know if the caller can't say 'Blue Elephant 42', it's a scammer.",
    rating: 5,
  },
];

export default function LandingPage() {
  const [currentWord, setCurrentWord] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [callState, setCallState] = useState<"idle" | "ringing" | "intercepted" | "safe">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!mounted) return;
    const fullText = HEADLINE_WORDS[currentWord];
    let i = 0;
    setDisplayText("");
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
        setTimeout(() => {
          setCurrentWord((prev) => (prev + 1) % HEADLINE_WORDS.length);
        }, 2000);
      }
    }, 60);

    return () => clearInterval(typeInterval);
  }, [currentWord, mounted]);

  // Call animation loop
  useEffect(() => {
    if (!mounted) return;
    const sequence = async () => {
      setCallState("idle");
      await delay(1000);
      setCallState("ringing");
      await delay(2000);
      setCallState("intercepted");
      await delay(3000);
      setCallState("safe");
      await delay(2000);
    };

    const loop = setInterval(sequence, 9000);
    sequence();
    return () => clearInterval(loop);
  }, [mounted]);

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return (
    <div className="min-h-screen bg-background grid-bg overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg text-white">
              Guardian<span className="text-primary">Angel</span> AI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Analysis", href: "/analysis" },
              { label: "Family", href: "/family" },
              { label: "Reports", href: "/reports" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-text-muted hover:text-primary transition-colors text-sm font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Live Demo
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <div className="pulse-dot-green" />
              Real-Time AI Protection — Active Now
            </div>

            <h1 className="font-display text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-white">
                {currentWord === 0 && (
                  <span className={isTyping ? "typing-cursor" : ""}>{displayText}</span>
                )}
                {currentWord !== 0 && HEADLINE_WORDS[0]}
              </span>
              <br />
              <span className="text-text-muted text-4xl lg:text-5xl">
                {currentWord === 1 && (
                  <span className={isTyping ? "typing-cursor" : ""}>{displayText}</span>
                )}
                {currentWord !== 1 && HEADLINE_WORDS[1]}
              </span>
              <br />
              <span className="text-primary text-glow-cyan">
                {currentWord === 2 && (
                  <span className={isTyping ? "typing-cursor" : ""}>{displayText}</span>
                )}
                {currentWord !== 2 && HEADLINE_WORDS[2]}
              </span>
            </h1>

            <p className="text-text-muted text-lg leading-relaxed max-w-xl">
              AI voice cloning can replicate anyone&apos;s voice from a 30-second clip. Scammers
              exploit this to impersonate your family. GuardianAngel AI detects, warns, and alerts
              — all within seconds, <strong className="text-white">during the live call itself.</strong>
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="btn-primary flex items-center gap-2 text-base px-8 py-4"
              >
                See Live Demo
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/analysis"
                className="flex items-center gap-2 px-8 py-4 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all text-base font-semibold"
              >
                <Mic className="w-5 h-5" />
                Analyze Audio
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-safe" />
                Privacy-first
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                &lt;3 sec detection
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-warning" />
                Hindi + English
              </div>
            </div>
          </div>

          {/* Right: Animated Call Demo */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-80">
              {/* Phone mockup */}
              <div className="glass rounded-3xl p-6 border border-primary/20 glow-cyan">
                {/* Status bar */}
                <div className="flex justify-between items-center mb-6 text-xs text-text-muted font-mono">
                  <span>9:41 AM</span>
                  <span>GuardianAngel Active</span>
                  <div className="pulse-dot-green" />
                </div>

                {/* Call UI */}
                {callState === "idle" && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-surface-2 border border-primary/20 flex items-center justify-center mx-auto">
                      <Phone className="w-8 h-8 text-text-muted" />
                    </div>
                    <p className="text-text-muted text-sm">Waiting for calls...</p>
                    <div className="flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="waveform-bar"
                          style={{ animationDelay: `${i * 0.15}s`, height: "8px" }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {callState === "ringing" && (
                  <div className="text-center py-8 space-y-4 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center mx-auto animate-pulse">
                      <Phone className="w-8 h-8 text-warning" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Incoming Call</p>
                      <p className="text-text-muted text-sm font-mono">+91 98765 43210</p>
                      <p className="text-warning text-xs mt-1">⚠ Unknown Number</p>
                    </div>
                    <div className="glass rounded-xl p-3 border border-warning/30">
                      <p className="text-xs text-text-muted mb-2">Start AI Analysis?</p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-lg bg-safe/20 text-safe text-xs font-bold border border-safe/30">
                          YES
                        </button>
                        <button className="flex-1 py-2 rounded-lg bg-danger/20 text-danger text-xs font-bold border border-danger/30">
                          NO
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {callState === "intercepted" && (
                  <div className="text-center py-6 space-y-4 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center mx-auto animate-pulse-red">
                      <AlertTriangle className="w-8 h-8 text-danger" />
                    </div>
                    <div>
                      <p className="text-danger font-bold text-lg">SCAM DETECTED</p>
                      <p className="text-text-muted text-xs">Risk Score: 89/100</p>
                    </div>
                    <div className="space-y-2 text-left">
                      {["Voice Clone: 92%", "OTP Scam: 98%", "Urgency: 87%"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-danger" />
                          <span className="text-danger">{item}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-2 rounded-lg bg-danger text-white text-xs font-bold">
                      🚨 Alert Family Now
                    </button>
                  </div>
                )}

                {callState === "safe" && (
                  <div className="text-center py-8 space-y-4 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-full bg-safe/20 border-2 border-safe flex items-center justify-center mx-auto">
                      <Shield className="w-8 h-8 text-safe" />
                    </div>
                    <div>
                      <p className="text-safe font-bold text-lg">REAL CALLER</p>
                      <p className="text-text-muted text-xs">Risk Score: 8/100</p>
                    </div>
                    <p className="text-text-muted text-xs">✓ SMS sent to 2 family contacts</p>
                  </div>
                )}

                {/* Bottom indicator */}
                <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-center gap-2 text-xs text-text-muted">
                  <Lock className="w-3 h-3" />
                  No data stored · Session only
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 glass rounded-xl px-3 py-2 border border-safe/30 text-safe text-xs font-bold animate-float">
                ✓ Protected
              </div>
              <div className="absolute -bottom-4 -left-4 glass rounded-xl px-3 py-2 border border-primary/30 text-primary text-xs font-mono animate-float" style={{ animationDelay: "1s" }}>
                AI Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-primary/10 bg-surface/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center space-y-1">
                <div className="text-3xl font-display font-bold text-primary">{stat.flag} {stat.value}</div>
                <div className="text-text-muted text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
            <Zap className="w-4 h-4" />
            Core Capabilities
          </div>
          <h2 className="font-display text-4xl font-bold text-white">
            Three Layers of Protection
          </h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            GuardianAngel AI combines voice analysis, visual detection, and behavioral pattern
            recognition to stop scams before they succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const colorMap = {
              primary: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary", badge: "bg-primary/20 text-primary" },
              warning: { bg: "bg-warning/10", border: "border-warning/20", text: "text-warning", badge: "bg-warning/20 text-warning" },
              safe: { bg: "bg-safe/10", border: "border-safe/20", text: "text-safe", badge: "bg-safe/20 text-safe" },
            };
            const colors = colorMap[feature.color as keyof typeof colorMap];

            return (
              <div
                key={i}
                className={`glass rounded-2xl p-8 border ${colors.border} card-hover space-y-6`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${colors.text}`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                    {feature.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-text-muted leading-relaxed">{feature.description}</p>
                </div>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 ${colors.text} text-sm font-semibold hover:gap-3 transition-all`}
                >
                  See it in action <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-surface/30 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-4xl font-bold text-white">How It Works</h2>
            <p className="text-text-muted text-lg">From call detection to family alert in under 10 seconds</p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative text-center space-y-4">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px bg-gradient-to-r from-primary/40 to-transparent" />
                  )}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto relative z-10">
                    <Icon className="w-7 h-7 text-primary" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-background text-xs font-bold flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{step.title}</p>
                    <p className="text-text-muted text-xs mt-1">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-display text-4xl font-bold text-white">Real Stories, Real Protection</h2>
          <p className="text-text-muted text-lg">Families protected across India</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-8 border border-primary/10 card-hover space-y-4">
              <div className="flex gap-1">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-warning fill-warning" />
                ))}
              </div>
              <p className="text-text-muted leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-primary/10">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}, {t.age}</p>
                  <p className="text-text-muted text-xs">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-danger/5" />
        <div className="relative max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="font-display text-5xl font-bold text-white">
            Protect Your Family <span className="text-primary">Today</span>
          </h2>
          <p className="text-text-muted text-xl">
            Don&apos;t wait for a scam to happen. Set up GuardianAngel AI in minutes and give your
            family the protection they deserve.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard" className="btn-primary flex items-center gap-2 text-lg px-10 py-5">
              Start Protection Now
              <Shield className="w-5 h-5" />
            </Link>
            <Link href="/family" className="flex items-center gap-2 px-10 py-5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all text-lg font-semibold">
              <Users className="w-5 h-5" />
              Setup Family Contacts
            </Link>
          </div>
          <p className="text-text-muted text-sm">
            🔒 Privacy-first · No data stored · Audio processed in-session only
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-white">GuardianAngel AI</span>
            </div>
            <p className="text-text-muted text-sm text-center">
              Built for national-level hackathon by{" "}
              <span className="text-primary font-semibold">Team Pillars</span> — Daksh Chandia &
              Aarushi Singh · IIIT Kottayam
            </p>
            <div className="flex gap-6 text-text-muted text-sm">
              <Link href="/settings" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/reports" className="hover:text-primary transition-colors">Reports</Link>
              <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
