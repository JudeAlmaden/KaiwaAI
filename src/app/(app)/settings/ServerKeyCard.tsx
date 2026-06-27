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
      setError("Add a Gemini key above first.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/settings/server-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keys[0] }),
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
        <div>
          <h2 className="font-display text-lg font-bold">
            Let Kai work in the background
          </h2>
          <p className="mt-1 text-sm text-muted">
            Stores your Gemini key on the server (encrypted) so Kai can message
            you first and prep summaries even when the app is closed. Off by
            default — your key normally stays on this device.
          </p>
        </div>
        <Toggle
          on={Boolean(stored)}
          onClick={() => (stored ? disable() : enable())}
        />
      </div>

      {busy && <p className="mt-2 text-xs text-muted">Saving…</p>}
      {error && <p className="mt-2 text-sm font-semibold text-sakura">{error}</p>}
      {stored && !busy && (
        <p className="mt-3 flex items-center gap-1 text-xs font-bold text-mint">
          ✓ Background features enabled — your key is encrypted at rest.
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        Heads up: this is a deliberate trade of some privacy for convenience. The
        key is encrypted (AES-256-GCM), never logged, and never sent back to the
        browser. Turn it off anytime to wipe it from the server.
      </p>
    </Surface>
  );
}
