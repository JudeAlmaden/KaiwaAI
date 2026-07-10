"use client";

import { useEffect, useState } from "react";
import { Surface, Toggle } from "../ui";
import { keysForRequest } from "@/lib/api-keys";

export default function ServerKeyCard() {
  const [stored, setStored] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/server-key")
      .then((r) => r.json())
      .then((d) => setStored(Boolean(d.stored)))
      .catch(() => setStored(false));
  }, []);

  async function enable() {
    setError(null);
    const keys = keysForRequest();
    if (keys.length === 0) {
      setError("Add a Personal API key above first.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/settings/server-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });
    setBusy(false);
    if (res.ok) setStored(true);
    else setError("Couldn't store the key. Is ENCRYPTION_KEY set?");
  }

  async function disable() {
    setBusy(true);
    await fetch("/api/settings/server-key", { method: "DELETE" });
    setBusy(false);
    setStored(false);
  }

  return (
    <Surface>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold">
              Server API Key (Optional)
            </h2>
            <span className="rounded-full bg-indigo-ai/15 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-ai">
              Advanced
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Enable server-side AI features by storing an encrypted copy of your key
          </p>
          
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-mint">✓</span>
              <span className="text-muted">AI personas in group chats</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-mint">✓</span>
              <span className="text-muted">Scheduled messages from Kai</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-mint">✓</span>
              <span className="text-muted">Background summaries & prep</span>
            </div>
          </div>
        </div>
        <Toggle
          on={Boolean(stored)}
          onClick={() => {
            if (busy) return;
            if (stored) {
              disable();
            } else {
              enable();
            }
          }}
        />
      </div>

      {busy && <p className="mt-3 text-xs text-muted">Saving…</p>}
      {error && <p className="mt-3 rounded-2xl border-2 border-sakura/20 bg-sakura/5 p-3 text-sm text-sakura">
        <strong>⚠️ Error:</strong> {error}
      </p>}
      {stored && !busy && (
        <div className="mt-3 rounded-2xl border-2 border-mint/20 bg-mint/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-mint">
            <span>✓</span>
            <span>Server features enabled</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Your key is encrypted (AES-256-GCM) and automatically rotates like your personal keys.
          </p>
        </div>
      )}
      
      <details className="mt-3 rounded-2xl border-2 border-amber/20 bg-amber/5 p-3">
        <summary className="cursor-pointer text-xs font-bold text-amber">
          🔒 Privacy & Security Information
        </summary>
        <div className="mt-2 space-y-2 text-xs text-muted">
          <p>
            When enabled, your personal API key(s) are copied to our server and encrypted at rest using AES-256-GCM encryption.
          </p>
          <p>
            <strong className="text-foreground">What we do:</strong> Encrypt your key, use it only for your AI features, automatically rotate through multiple keys.
          </p>
          <p>
            <strong className="text-foreground">What we don&apos;t do:</strong> Log your key, send it back to your browser, or share it with third parties.
          </p>
          <p>
            You can disable this anytime to immediately wipe your key from the server. Personal keys on your device are never affected.
          </p>
        </div>
      </details>
    </Surface>
  );
}
