"use client";

import { useEffect, useRef, useState } from "react";

const KANJI_ORBIT = [
  { char: "話", label: "talk" },
  { char: "語", label: "language" },
  { char: "聞", label: "listen" },
  { char: "読", label: "read" },
  { char: "書", label: "write" },
  { char: "学", label: "study" },
  { char: "見", label: "see" },
  { char: "知", label: "know" },
];

export default function LandingKanjiOrbit({ size = 320 }: { size?: number }) {
  const [angle, setAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    const tick = (ts: number) => {
      const dt = ts - lastRef.current;
      lastRef.current = ts;
      setAngle((a) => (a + dt * 0.018) % 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const r = size / 2 - 36;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,92,255,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Dashed orbit path */}
      <svg
        className="absolute inset-0 opacity-20"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--indigo)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />
      </svg>

      {/* Kanji nodes */}
      {KANJI_ORBIT.map((item, i) => {
        const theta = ((angle + (i * 360) / KANJI_ORBIT.length) * Math.PI) / 180;
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        const opacity = 0.45 + 0.55 * ((Math.sin(theta) + 1) / 2);
        const scale = 0.75 + 0.35 * ((Math.sin(theta) + 1) / 2);

        return (
          <div
            key={item.char}
            className="absolute flex flex-col items-center pointer-events-none"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              transition: "opacity 0.1s",
            }}
          >
            <span className="font-jp text-xl font-bold text-indigo-ai leading-none">
              {item.char}
            </span>
            <span className="text-[8px] font-semibold text-muted/60 uppercase tracking-wide mt-0.5">
              {item.label}
            </span>
          </div>
        );
      })}

      {/* Centre: Kai avatar placeholder with pulse */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-full"
        style={{
          width: 90,
          height: 90,
          left: cx - 45,
          top: cy - 45,
          background:
            "radial-gradient(circle at 40% 35%, #b8a4ff, #7c5cff)",
          boxShadow:
            "0 0 0 8px rgba(124,92,255,0.12), 0 0 0 16px rgba(124,92,255,0.06)",
        }}
      >
        {/* Simplified Kai head in SVG */}
        <svg width="54" height="42" viewBox="36 44 132 100" fill="none">
          <defs>
            <linearGradient id="o-head" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4c4ff" />
              <stop offset="100%" stopColor="#7c5cff" />
            </linearGradient>
          </defs>
          <path d="M38 140a62 62 0 0 1 124 0Z" fill="url(#o-head)" />
          <ellipse cx="100" cy="96" rx="46" ry="16" fill="#fff" opacity="0.22" />
          <path
            d="M99 101C118 96 130 84 127 68C124 53 110 47 96 50C107 53 114 62 112 73C110 86 102 94 91 101Z"
            fill="#7c5cff"
          />
          <g transform="translate(146 104) scale(1.05)">
            {[0, 72, 144, 216, 288].map((a) => (
              <path
                key={a}
                transform={`rotate(${a})`}
                d="M0 0C-6 -4 -6 -13 0 -19C6 -13 6 -4 0 0Z"
                fill="#ff6b9d"
              />
            ))}
            <circle r="3.2" fill="#ffd84d" />
          </g>
        </svg>
        <span className="text-[9px] font-bold text-white/80 mt-1 tracking-wide">
          KAI
        </span>
      </div>
    </div>
  );
}
