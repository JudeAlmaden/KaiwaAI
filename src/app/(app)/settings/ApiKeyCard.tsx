"use client";

import { useEffect, useState } from "react";
import {
  listKeys,
  addKey,
  removeKey,
  getActiveIndex,
  setActiveIndex,
  isValidKeyFormat,
  validateApiKey,
  type ApiKeyEntry,
} from "@/lib/api-keys";
import { Key, ArrowsClockwise, Check, Trash, Plus, Lock } from "@phosphor-icons/react";

function mask(key: string) {
  if (key.length <= 8) return "••••";
  return key.slice(0, 4) + "•".repeat(Math.max(key.length - 8, 4)) + key.slice(-4);
}

export default function ApiKeyCard() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function refresh() {
    setKeys(listKeys());
    setActive(getActiveIndex());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (keys.some((k) => k.key === trimmed)) {
      setError("This API key is already added");
      return;
    }

    if (!isValidKeyFormat(trimmed)) {
      setError("Please enter a valid API key (starts with AIza...)");
      return;
    }

    setIsValidating(true);
    setError("");

    const result = await validateApiKey(trimmed);

    if (result.valid) {
      addKey(trimmed, `Key ${keys.length + 1}`);
      setDraft("");
      setSuccess("API key validated and added!");
      setTimeout(() => setSuccess(""), 4000);
      refresh();
    } else {
      setError(result.error || "Invalid API key. Please check your key.");
    }

    setIsValidating(false);
  }

  async function syncFromAccount() {
    setIsSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/settings/server-key?sync=true");
      const data = await res.json();
      
      if (res.ok && data.keys && data.keys.length > 0) {
        let addedCount = 0;
        data.keys.forEach((k: string, idx: number) => {
          if (!keys.some(existing => existing.key === k)) {
            addKey(k, `Synced Key ${idx + 1}`);
            addedCount++;
          }
        });
        refresh();
        if (addedCount > 0) {
          setSuccess(`Synced ${addedCount} key(s) from account!`);
        } else {
          setSuccess("Keys are up to date.");
        }
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError("No saved server keys found.");
      }
    } catch {
      setError("Failed to sync keys.");
    }
    setIsSyncing(false);
  }

  function choose(index: number) {
    setActiveIndex(index);
    setActive(index);
  }

  function drop(index: number) {
    removeKey(index);
    refresh();
  }

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      {/* Clean Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
            <Key size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-foreground">Gemini API Keys</h2>
            <p className="text-xs text-muted truncate">Stored locally on your device.</p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-indigo-ai">
          BYOK
        </span>
      </div>

      {/* Empty Alert */}
      {keys.length === 0 && (
        <div className="rounded-2xl border border-sakura/30 bg-sakura/5 p-3 text-center space-y-1">
          <p className="text-xs font-bold text-sakura flex items-center justify-center gap-1.5">
            <Lock size={14} />
            At least 1 API key required
          </p>
        </div>
      )}

      {/* Keys List */}
      {keys.length > 0 && (
        <ul className="space-y-2">
          {keys.map((k, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 transition ${
                active === i ? "border-indigo-ai bg-indigo-ai/5" : "border-border bg-background"
              }`}
            >
              <button
                onClick={() => choose(i)}
                className="flex items-center gap-3 min-w-0 text-left flex-1"
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active === i ? "border-indigo-ai bg-indigo-ai text-white" : "border-border"
                  }`}
                >
                  {active === i && <Check size={10} weight="bold" />}
                </span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-foreground truncate">{k.label || `Key ${i + 1}`}</p>
                  <code className="font-mono text-[11px] text-muted truncate block">{mask(k.key)}</code>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {active === i && (
                  <span className="px-2 py-0.5 rounded-full bg-mint/15 text-mint text-[10px] font-extrabold uppercase">
                    Active
                  </span>
                )}
                <button
                  onClick={() => drop(i)}
                  disabled={keys.length === 1}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    keys.length === 1
                      ? "opacity-30 cursor-not-allowed text-muted"
                      : "text-muted hover:text-rose-500 hover:bg-rose-500/10"
                  }`}
                  title={keys.length === 1 ? "Minimum 1 key required" : "Remove key"}
                >
                  <Trash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Banners */}
      {success && (
        <div className="rounded-xl border border-mint/30 bg-mint/10 p-2.5 text-xs text-mint font-bold flex items-center gap-2">
          <Check size={14} />
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-sakura/30 bg-sakura/10 p-2.5 text-xs text-sakura font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Input Field + Primary Add Button */}
      <div className="space-y-2">
        <input
          type="password"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && !isValidating && add()}
          placeholder="Paste Gemini API key (AIza...)"
          disabled={isValidating}
          className="w-full h-11 rounded-2xl border-2 border-border bg-background px-4 text-xs outline-none focus:border-indigo-ai transition"
        />
        <button
          onClick={add}
          disabled={!draft.trim() || isValidating}
          className="w-full py-2.5 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus size={15} />
          <span>{isValidating ? "Validating Key..." : "Add API Key"}</span>
        </button>
      </div>

      {/* Footer Actions Row */}
      <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-indigo-ai hover:underline text-[11px]"
        >
          Get free Gemini key →
        </a>

        <button
          onClick={syncFromAccount}
          disabled={isSyncing}
          className="text-[11px] font-bold text-muted hover:text-foreground flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
        >
          <ArrowsClockwise size={12} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "Syncing..." : "Sync from Account"}</span>
        </button>
      </div>
    </section>
  );
}
