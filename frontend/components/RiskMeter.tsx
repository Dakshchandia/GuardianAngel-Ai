"use client";

import { useEffect, useRef } from "react";

interface RiskMeterProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export default function RiskMeter({
  score,
  size = "md",
  showLabel = true,
  animated = true,
}: RiskMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const currentScoreRef = useRef(0);

  const sizeMap = { sm: 120, md: 180, lg: 240 };
  const canvasSize = sizeMap[size];
  const radius = canvasSize / 2 - 20;
  const lineWidth = size === "sm" ? 10 : size === "md" ? 14 : 18;

  const getColor = (s: number) => {
    if (s <= 30) return "#00E676";
    if (s <= 60) return "#FFB300";
    return "#FF3B3B";
  };

  const getLabel = (s: number): { text: string; sub: string } => {
    if (s <= 30) return { text: "SAFE", sub: "No threats detected" };
    if (s <= 60) return { text: "SUSPICIOUS", sub: "Monitor closely" };
    return { text: "SCAM DETECTED", sub: "Alert family now" };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetScore = score;
    const startScore = currentScoreRef.current;
    const startTime = performance.now();
    const duration = animated ? 1200 : 0;

    const draw = (currentScore: number) => {
      ctx.clearRect(0, 0, canvasSize, canvasSize);
      const cx = canvasSize / 2;
      const cy = canvasSize / 2;
      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;
      const totalAngle = endAngle - startAngle;

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Tick marks
      for (let i = 0; i <= 10; i++) {
        const angle = startAngle + (totalAngle * i) / 10;
        const innerR = radius - lineWidth / 2 - 4;
        const outerR = radius + lineWidth / 2 + 4;
        const x1 = cx + innerR * Math.cos(angle);
        const y1 = cy + innerR * Math.sin(angle);
        const x2 = cx + outerR * Math.cos(angle);
        const y2 = cy + outerR * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (currentScore > 0) {
        // Gradient arc
        const progressAngle = startAngle + (totalAngle * currentScore) / 100;
        const gradient = ctx.createLinearGradient(
          cx - radius, cy, cx + radius, cy
        );
        if (currentScore <= 30) {
          gradient.addColorStop(0, "#00E676");
          gradient.addColorStop(1, "#00b359");
        } else if (currentScore <= 60) {
          gradient.addColorStop(0, "#00E676");
          gradient.addColorStop(0.5, "#FFB300");
          gradient.addColorStop(1, "#ff8c00");
        } else {
          gradient.addColorStop(0, "#FFB300");
          gradient.addColorStop(0.5, "#FF3B3B");
          gradient.addColorStop(1, "#cc0000");
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, progressAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.stroke();

        // Glow effect
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, progressAngle);
        ctx.strokeStyle = getColor(currentScore) + "40";
        ctx.lineWidth = lineWidth + 8;
        ctx.lineCap = "round";
        ctx.stroke();

        // Needle dot at end
        const dotX = cx + radius * Math.cos(progressAngle);
        const dotY = cy + radius * Math.sin(progressAngle);
        ctx.beginPath();
        ctx.arc(dotX, dotY, lineWidth / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = getColor(currentScore);
        ctx.fill();
        ctx.shadowColor = getColor(currentScore);
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Center score text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Score number
      ctx.font = `bold ${size === "sm" ? 28 : size === "md" ? 40 : 52}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = getColor(currentScore);
      ctx.shadowColor = getColor(currentScore);
      ctx.shadowBlur = 10;
      ctx.fillText(Math.round(currentScore).toString(), cx, cy - (size === "sm" ? 8 : 12));
      ctx.shadowBlur = 0;

      // /100 label
      ctx.font = `${size === "sm" ? 10 : 12}px 'Inter', sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("/100", cx, cy + (size === "sm" ? 12 : 16));
    };

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const currentScore = startScore + (targetScore - startScore) * eased;
      currentScoreRef.current = currentScore;
      draw(currentScore);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    if (duration === 0) {
      draw(targetScore);
      currentScoreRef.current = targetScore;
    } else {
      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score, canvasSize, radius, lineWidth, animated, size]);

  const label = getLabel(score);
  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="drop-shadow-lg"
      />
      {showLabel && (
        <div className="text-center space-y-1">
          <div
            className="font-display font-bold text-lg tracking-wider"
            style={{ color, textShadow: `0 0 15px ${color}80` }}
          >
            {label.text}
          </div>
          <div className="text-text-muted text-xs">{label.sub}</div>
        </div>
      )}
    </div>
  );
}
