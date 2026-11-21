"use client";

import { useState } from "react";
import { DeviceMobile } from "@phosphor-icons/react";
import {
  getMobileNotchOffset,
  setMobileNotchOffset,
  NOTCH_PRESETS,
  MAX_NOTCH_OFFSET,
  MIN_NOTCH_OFFSET,
} from "@/lib/mobile-notch";

export default function MobileNotchCard() {
  // null means "auto" (use device safe-area)
  const [offset, setOffset] = useState<number | null>(() => getMobileNotchOffset());

  function updateOffset(val: number | null) {
    const next = setMobileNotchOffset(val);
    setOffset(next);
  }

  const isAuto = offset === null;

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai">
          <DeviceMobile size={22} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">Top Notch &amp; Status Bar</h2>
            {isAuto ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Auto
              </span>
            ) : (
              offset > 0 && (
                <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[11px] font-bold text-indigo-ai">
                  +{offset}px
                </span>
              )
            )}
          </div>
          <p className="text-xs text-muted">
            {isAuto
              ? "Automatically uses your device's safe-area inset."
              : "Manual override — set a fixed top padding for the header."}
          </p>
        </div>
      </div>

      {/* Auto / Manual toggle */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => updateOffset(null)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            isAuto
              ? "bg-emerald-500 text-white shadow-sm"
              : "border-2 border-border text-muted hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
          }`}
        >
          Auto
        </button>

        {NOTCH_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => updateOffset(preset.px)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              !isAuto && offset === preset.px
                ? "bg-indigo-ai text-white shadow-sm"
                : "border-2 border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
            }`}
          >
            {preset.label} ({preset.px}px)
          </button>
        ))}
      </div>

      {/* Slider — only shown when in manual mode */}
      {!isAuto && (
        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            min={MIN_NOTCH_OFFSET}
            max={MAX_NOTCH_OFFSET}
            step={2}
            value={offset}
            onChange={(e) => updateOffset(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-border accent-indigo-ai"
            aria-label="Top notch spacing"
          />
          <span className="w-14 text-right text-xs font-bold text-muted">{offset} px</span>
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-muted">
        {isAuto
          ? "On most phones this is all you need. Use a manual preset only if the auto spacing looks off."
          : "Changes apply live immediately so you can test the spacing on your screen."}
      </p>
    </div>
  );
}
