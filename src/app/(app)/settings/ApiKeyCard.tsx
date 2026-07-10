"use client";

import { useEffect, useState } from "react";
import { PopButton } from "../../PopButton";
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

function mask(key: string) {
  if (key.length <= 8) return "••••";
  return key.slice(0, 4) + "•".repeat(Math.max(key.length - 8, 4)) + key.slice(-4);
}

export default function ApiKeyCard() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [label, setLabel] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function refresh() {
    setKeys(listKeys());
    setActive(getActiveIndex());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    // Check if key already exists
    if (keys.some((k) => k.key === trimmed)) {
      setError("This API key is already added");
      return;
    }

    // Validate format first
    if (!isValidKeyFormat(trimmed)) {
      setError("Please enter a valid API key");
      return;
    }

    setIsValidating(true);
    setError("");

    // Validate with actual API call
    const result = await validateApiKey(trimmed);

    if (result.valid) {
      addKey(trimmed, label);
      setDraft("");
      setLabel("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      refresh();
    } else {
      setError(result.error || "Invalid API key");
    }

    setIsValidating(false);
  }

  function choose(i: number) {
    setActiveIndex(i);
    setActive(i);
  }

  function drop(i: number) {
    // Prevent removing the last key
    if (keys.length === 1) {
      setError("You must have at least 1 API key configured to use KaiwaAI");
      setTimeout(() => setError(""), 5000);
      return;
    }
    removeKey(i);
    refresh();
  }

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Personal API Keys</h2>
          <p className="mt-1 text-sm text-muted">
            Stored on your device only • Used for vocab, kanji, and personal chat
          </p>
        </div>
        <span className="rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-bold uppercase text-mint">
          Device Only
        </span>
      </div>

      <p className="mt-3 text-sm text-muted">
        Add multiple keys and Kai will rotate to a spare if one hits its rate limit.
      </p>

      {/* Show empty state if no keys */}
      {keys.length === 0 && (
        <div className="mt-4 rounded-2xl border-2 border-sakura/30 bg-sakura/5 p-6 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="mt-3 text-sm font-semibold text-sakura">
            At least 1 API key required
          </p>
          <p className="mt-1 text-xs text-muted">
            You must have at least one Gemini API key to use KaiwaAI features
          </p>
        </div>
      )}

      {/* Tutorial/How to get key */}
      <details className="mt-3 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-4">
        <summary className="cursor-pointer text-sm font-bold text-indigo-ai">
          📖 How to get a free Gemini API key
        </summary>
        <div className="mt-3 space-y-2 text-sm text-muted">
          <p className="font-semibold text-foreground">Step-by-step guide:</p>
          <ol className="ml-4 list-decimal space-y-1.5">
            <li>
              Visit{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-ai underline"
              >
                Google AI Studio
              </a>
            </li>
            <li>Sign in with your Google account</li>
            <li>Click &ldquo;Create API key&rdquo; button</li>
            <li>Select a Google Cloud project (or create a new one)</li>
            <li>Copy the generated key (starts with &ldquo;AIza...&rdquo;)</li>
            <li>Paste it below</li>
          </ol>
          <p className="pt-2 text-xs">
            💡 <strong>Tip:</strong> Gemini offers a generous free tier. Your key stays
            on your device and is never sent to KaiwaAI servers.
          </p>
        </div>
      </details>

      {keys.length > 0 && (
        <>
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
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold">{k.label}</p>
                  <code className="block truncate font-mono text-xs text-muted">{mask(k.key)}</code>
                </div>
                {active === i && (
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase text-mint">
                    active
                  </span>
                )}
                <button
                  onClick={() => drop(i)}
                  className={`text-xs font-bold transition-colors ${
                    keys.length === 1
                      ? "cursor-not-allowed text-muted/30"
                      : "text-muted/60 hover:text-sakura"
                  }`}
                  aria-label={keys.length === 1 ? "Cannot remove last key" : "Remove key"}
                  title={keys.length === 1 ? "You must have at least 1 API key" : "Remove key"}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {keys.length === 1 && (
            <div className="mt-3 rounded-2xl border-2 border-amber/20 bg-amber/5 p-3 text-xs text-muted">
              <strong className="text-amber">ℹ️ Note:</strong> At least 1 API key is required. 
              Add a second key before removing this one.
            </div>
          )}
        </>
      )}

      {/* Success message */}
      {success && (
        <div className="mt-4 rounded-2xl border-2 border-mint/20 bg-mint/5 p-3 text-sm text-mint">
          <strong>✓ Success!</strong> API key added and validated.
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-2xl border-2 border-sakura/20 bg-sakura/5 p-3 text-sm text-sakura">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setError("");
          }}
          placeholder="Label (optional, e.g. Personal)"
          disabled={isValidating}
          className="h-11 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai disabled:opacity-50"
        />
        <div className="flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && !isValidating && add()}
            placeholder="Paste a Gemini API key (AIza...)"
            disabled={isValidating}
            className="h-11 flex-1 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai disabled:opacity-50"
          />
          <PopButton 
            onClick={add} 
            disabled={!draft.trim() || isValidating} 
            className="h-11 px-5"
          >
            {isValidating ? "Validating..." : "Add"}
          </PopButton>
        </div>
      </div>
    </section>
  );
}
