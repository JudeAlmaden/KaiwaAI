"use client";

import { useEffect, useState } from "react";
import { keysForRequest } from "@/lib/api-keys";
import { Cloud, Check, ShieldCheck } from "@phosphor-icons/react";

export default function ServerKeyCard() {
  const [stored, setStored] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/server-key")
      .then((r) => r.json())
      .then((d) => setStored(Boolean(d.stored)))
      .catch(() => setStored(false));
  }, []);

  async function enable() {
    setError(null);
    setSuccessMsg(null);
    const keys = keysForRequest();
    if (keys.length === 0) {
      setError("Add a Personal API key above first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/server-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      setBusy(false);
      if (res.ok) {
        setStored(true);
        setSuccessMsg("Server sync enabled! Your keys are safely encrypted.");
      } else {
        setError("Couldn't store key on server.");
      }
    } catch {
      setBusy(false);
      setError("Network error while enabling server key.");
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await fetch("/api/settings/server-key", { method: "DELETE" });
      setStored(false);
      setSuccessMsg("Server sync disabled.");
    } catch {
      setError("Failed to disable server key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
            <Cloud size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-foreground">
              Server Key &amp; Account Sync
            </h2>
            <p className="text-xs text-muted">
              Sync keys across devices &amp; enable background features.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => {
            if (busy) return;
            if (stored) disable();
            else enable();
          }}
          disabled={busy}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            stored ? "bg-indigo-ai" : "bg-muted/30"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              stored ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Feature Bullet List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted font-medium pt-1">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-indigo-ai shrink-0" />
          <span>Multi-device key sync</span>
        </div>
        <div className="flex items-center gap-2">
          <Check size={14} className="text-indigo-ai shrink-0" />
          <span>AI Personas in group chats</span>
        </div>
        <div className="flex items-center gap-2">
          <Check size={14} className="text-indigo-ai shrink-0" />
          <span>Scheduled Kai messages</span>
        </div>
        <div className="flex items-center gap-2">
          <Check size={14} className="text-indigo-ai shrink-0" />
          <span>Background session prep</span>
        </div>
      </div>

      {busy && <p className="text-xs text-muted font-medium animate-pulse">Updating settings...</p>}

      {error && (
        <div className="rounded-xl border border-sakura/30 bg-sakura/10 p-2.5 text-xs text-sakura font-bold">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-mint/30 bg-mint/10 p-2.5 text-xs text-mint font-bold flex items-center gap-2">
          <Check size={14} />
          {successMsg}
        </div>
      )}

      {/* Clean Security Note Footer */}
      <div className="pt-1 text-[11px] text-muted flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>Encrypted using AES-256-GCM before saving to account.</span>
      </div>
    </section>
  );
}
