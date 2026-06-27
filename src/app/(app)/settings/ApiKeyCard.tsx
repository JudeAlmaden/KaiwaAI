"use client";

import { useEffect, useState } from "react";
import { PopButton } from "../../PopButton";
import {
  listKeys,
  addKey,
  removeKey,
  getActiveIndex,
  setActiveIndex,
  type ApiKeyEntry,
} from "@/lib/api-keys";

function mask(key: string) {
  if (key.length <= 8) return "••••";
  return key.slice(0, 4) + "•".repeat(Math.max(key.length - 8, 4)) + key.slice(-4);
}

export default function ApiKeyCard() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState("");

  function refresh() {
    setKeys(listKeys());
    setActive(getActiveIndex());
  }

  useEffect(() => {
    refresh();
  }, []);

  function add() {
    if (!draft.trim()) return;
    addKey(draft, label);
    setDraft("");
    setLabel("");
    refresh();
  }

  function choose(i: number) {
    setActiveIndex(i);
    setActive(i);
  }

  function drop(i: number) {
    removeKey(i);
    refresh();
  }

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Kai&apos;s brain</h2>
      <p className="mt-1 text-sm text-muted">
        KaiwaAI uses your own Google Gemini API key(s). They&apos;re stored only
        on this device, never on our servers. Add more than one and Kai will
        rotate to a spare if one hits its rate limit.{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-indigo-ai"
        >
          Get a free key →
        </a>
      </p>

      {keys.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {keys.map((k, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                active === i ? "border-indigo-ai bg-indigo-ai/5" : "border-border"
              }`}
            >
              <button
                onClick={() => choose(i)}
                className="flex items-center gap-2"
                title={active === i ? "Active key" : "Use this key"}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active === i ? "border-indigo-ai" : "border-border"
                  }`}
                >
                  {active === i && (
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-ai" />
                  )}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{k.label}</p>
                <code className="font-mono text-xs text-muted">{mask(k.key)}</code>
              </div>
              {active === i && (
                <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase text-mint">
                  active
                </span>
              )}
              <button
                onClick={() => drop(i)}
                className="text-xs font-bold text-muted/60 transition-colors hover:text-sakura"
                aria-label="Remove key"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional, e.g. Personal)"
          className="h-11 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
        />
        <div className="flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Paste a Gemini API key"
            className="h-11 flex-1 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
          />
          <PopButton onClick={add} disabled={!draft.trim()} className="h-11 px-5">
            Add
          </PopButton>
        </div>
      </div>
    </section>
  );
}
