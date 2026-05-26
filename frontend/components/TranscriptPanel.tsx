"use client";

import { useEffect, useRef } from "react";
import { TranscriptEntry, SCAM_KEYWORDS } from "@/lib/types";
import { FileText, AlertCircle } from "lucide-react";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  isLive?: boolean;
  maxHeight?: string;
  analysisComplete?: boolean;
}

function highlightKeywords(text: string): React.ReactNode[] {
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Find all keyword positions
  const matches: { start: number; end: number; keyword: string }[] = [];
  SCAM_KEYWORDS.forEach((kw) => {
    let idx = lower.indexOf(kw);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + kw.length, keyword: kw });
      idx = lower.indexOf(kw, idx + 1);
    }
  });

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlaps
  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build parts
  filtered.forEach((m, i) => {
    if (m.start > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastIndex, m.start)}</span>);
    }
    parts.push(
      <span
        key={`kw-${i}`}
        className="keyword-danger inline-flex items-center gap-1"
        title={`Scam keyword: "${m.keyword}"`}
      >
        <AlertCircle className="w-3 h-3 inline" />
        {text.slice(m.start, m.end)}
      </span>
    );
    lastIndex = m.end;
  });

  if (lastIndex < text.length) {
    parts.push(<span key="text-end">{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key="full">{text}</span>];
}

export default function TranscriptPanel({
  entries,
  isLive = false,
  maxHeight = "320px",
  analysisComplete = false,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="glass rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Live Transcript</h3>
            <p className="text-text-muted text-xs">Real-time speech analysis</p>
          </div>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/20">
            <div className="pulse-dot-red" />
            <span className="text-danger text-xs font-bold">LIVE</span>
          </div>
        )}
      </div>

      {/* Transcript content */}
      <div
        className="overflow-y-auto p-4 space-y-3 font-mono text-sm"
        style={{ maxHeight }}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted space-y-3">
            {analysisComplete ? (
              <>
                <AlertCircle className="w-8 h-8 text-warning opacity-60" />
                <p className="text-xs text-center leading-relaxed px-4">
                  No speech detected.<br />
                  Whisper may not be installed on the backend.<br />
                  <code className="text-primary text-xs">pip install openai-whisper</code>
                </p>
              </>
            ) : (
              <>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="waveform-bar opacity-30"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="text-xs">Waiting for speech...</p>
              </>
            )}
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className={`flex gap-3 animate-fade-in-up ${
                entry.hasKeyword ? "bg-danger/5 rounded-lg p-2 -mx-2 border border-danger/10" : ""
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-text-muted text-xs shrink-0 mt-0.5 w-10">{entry.time}</span>
              <span className={`leading-relaxed ${entry.hasKeyword ? "text-white" : "text-text-muted"}`}>
                {entry.hasKeyword ? highlightKeywords(entry.text) : entry.text}
              </span>
              {entry.hasKeyword && (
                <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              )}
            </div>
          ))
        )}

        {isLive && entries.length > 0 && (
          <div className="flex gap-3">
            <span className="text-text-muted text-xs w-10" />
            <span className="text-primary typing-cursor text-xs">Analyzing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Keyword legend */}
      {entries.some((e) => e.hasKeyword) && (
        <div className="px-5 py-3 border-t border-primary/10 flex items-center gap-2 text-xs text-text-muted">
          <span className="keyword-danger px-1">highlighted</span>
          <span>= scam keyword detected</span>
        </div>
      )}
    </div>
  );
}
