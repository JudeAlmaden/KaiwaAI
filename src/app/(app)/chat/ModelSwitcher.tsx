"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS, getModel, setModel } from "@/lib/model-config";

export default function ModelSwitcher() {
  const [open, setOpen] = useState(false);
  const [model, setModelState] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModelState(getModel());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = MODELS.find((m) => m.id === model);

  function choose(id: string) {
    setModel(id);
    setModelState(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
      >
        {current?.label ?? "Model"}
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border-2 border-border bg-card p-1.5 shadow-xl">
          {MODELS.map((m) => {
            const active = m.id === model;
            return (
              <button
                key={m.id}
                onClick={() => choose(m.id)}
                className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                  active ? "bg-indigo-ai/10" : "hover:bg-indigo-ai/5"
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${active ? "bg-indigo-ai" : "bg-border"}`}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{m.label}</span>
                    {m.preview && (
                      <span className="rounded-full bg-sakura/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sakura">
                        preview
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted">
                    {m.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
