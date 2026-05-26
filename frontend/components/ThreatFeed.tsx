"use client";

import { ThreatEntry } from "@/lib/types";
import { AlertTriangle, Mic, Clock, DollarSign, Eye, Shield } from "lucide-react";

interface ThreatFeedProps {
  threats: ThreatEntry[];
  isLive?: boolean;
}

type ThreatConfig = {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  border: string;
  text: string;
};

const THREAT_CONFIG: Record<string, ThreatConfig> = {
  VOICE_CLONE: {
    icon: Mic,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  URGENCY: {
    icon: Clock,
    bg: "bg-warning/10",
    border: "border-warning/20",
    text: "text-warning",
  },
  ISOLATION: {
    icon: Eye,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  OTP_SCAM: {
    icon: Shield,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  FINANCIAL: {
    icon: DollarSign,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  DEEPFAKE: {
    icon: Eye,
    bg: "bg-warning/10",
    border: "border-warning/20",
    text: "text-warning",
  },
  AUTHORITY: {
    icon: AlertTriangle,
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
  },
  IMPERSONATION: {
    icon: Mic,
    bg: "bg-warning/10",
    border: "border-warning/20",
    text: "text-warning",
  },
};

// Fallback for unknown types
const DEFAULT_CONFIG: ThreatConfig = {
  icon: AlertTriangle,
  bg: "bg-warning/10",
  border: "border-warning/20",
  text: "text-warning",
};

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 90 ? "#FF3B3B" : value >= 70 ? "#FFB300" : "#00E676";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

export default function ThreatFeed({ threats, isLive = false }: ThreatFeedProps) {
  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Threat Detection Feed</h3>
            <p className="text-text-muted text-xs">AI-identified risk signals</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {threats.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-danger/20 text-danger text-xs font-bold">
              {threats.length} threat{threats.length !== 1 ? "s" : ""}
            </span>
          )}
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-danger/10 border border-danger/20">
              <div className="pulse-dot-red" />
              <span className="text-danger text-xs font-bold">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Threat list */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {threats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-muted space-y-2">
            <Shield className="w-8 h-8 opacity-30" />
            <p className="text-xs">No threats detected</p>
          </div>
        ) : (
          threats.map((threat, i) => {
            const config = THREAT_CONFIG[threat.type] ?? DEFAULT_CONFIG;
            const Icon = config.icon;

            return (
              <div
                key={threat.id}
                className={`rounded-xl p-3 border ${config.bg} ${config.border} space-y-2 threat-item`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${config.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${config.text} leading-tight`}>
                        {threat.label}
                      </p>
                      <span className="text-text-muted text-xs font-mono shrink-0">
                        {threat.time}
                      </span>
                    </div>
                    <div className="mt-2">
                      <ConfidenceBar value={threat.confidence} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {threats.length > 0 && (
        <div className="px-5 py-3 border-t border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">
              {threats.filter((t) => t.severity === "HIGH").length} high severity
            </span>
            <span className="text-danger font-semibold">
              Avg confidence:{" "}
              {Math.round(
                threats.reduce((a, b) => a + b.confidence, 0) / threats.length
              )}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
