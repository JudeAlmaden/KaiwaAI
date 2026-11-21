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
  const [offset, setOffset] = useState<number>(() => getMobileNotchOffset());

  function updateOffset(val: number) {
    const next = setMobileNotchOffset(val);
    setOffset(next);
  }

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai">
          <DeviceMobile size={22} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">Top Notch & Status Bar</h2>
            {offset > 0 && (
              <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[11px] font-bold text-indigo-ai">
                +{offset}px
              </span>
            )}
          </div>
          <p className="text-xs text-muted">
            Add top padding if your phone&apos;s camera cutout or status bar covers the header.
          </p>
        </div>
      </div>

      {/* Preset pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {NOTCH_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => updateOffset(preset.px)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              offset === preset.px
                ? "bg-indigo-ai text-white shadow-sm"
                : "border-2 border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
            }`}
          >
            {preset.label} ({preset.px}px)
          </button>
        ))}
      </div>

      {/* Slider */}
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
        <span className="w-14 text-right text-xs font-bold text-muted">
          {offset} px
        </span>
      </div>

      <p className="mt-2.5 text-[11px] text-muted">
        Changes apply live immediately so you can test the spacing on your screen.
      </p>
    </div>
  );
}
