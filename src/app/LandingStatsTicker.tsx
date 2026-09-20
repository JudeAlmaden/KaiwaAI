"use client";

import { useRef, useState } from "react";
const STATS = [
  { emoji: "🔥", value: "Daily streak", label: "keeps vocabulary fresh" },
  { emoji: "💬", value: "AI conversation", label: "calibrated to your level" },
  { emoji: "📚", value: "Auto flashcards", label: "from every chat session" },
  { emoji: "⚡", value: "SuperMemo-2 SRS", label: "reviews before decay" },
  { emoji: "🀄", value: "Kanji auto-extracted", label: "tagged JLPT N5–N1" },
  { emoji: "🛡️", value: "Focus Guard", label: "locks apps until goals met" },
  { emoji: "🌸", value: "Persona memory", label: "Kai learns about you" },
  { emoji: "🎯", value: "Roleplay quests", label: "real-world scenarios" },
];

export default function LandingStatsTicker() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Use CSS animation — no JS needed
  return (
    <div
      className="relative z-10 overflow-hidden border-y-2 border-border bg-card/60 py-4 backdrop-blur-sm"
      aria-hidden
    >
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 40s linear infinite;
        }
        .ticker-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <div
        ref={trackRef}
        className={`ticker-track${paused ? " paused" : ""}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Duplicate for seamless loop */}
        {[...STATS, ...STATS].map((s, i) => (
          <div
            key={i}
            className="mx-6 flex shrink-0 items-center gap-2.5"
          >
            <span className="text-lg leading-none">{s.emoji}</span>
            <div className="leading-tight">
              <span className="text-xs font-extrabold text-foreground">
                {s.value}
              </span>
              <span className="mx-1.5 text-muted/40">·</span>
              <span className="text-xs font-medium text-muted">
                {s.label}
              </span>
            </div>
            {/* Divider dot */}
            <span className="ml-6 h-1 w-1 rounded-full bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
