"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PopButton } from "../../PopButton";
import { addKey, hasAnyKey } from "@/lib/api-keys";

export default function OnboardingClient({}: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncMessage, setSyncMessage] = useState("");
  const [enableServerSync, setEnableServerSync] = useState(true); // Default to enabled for convenience

  // Check if user already has keys or try to sync from server
  useEffect(() => {
    // If user already has keys locally, skip to chat
    if (hasAnyKey()) {
      router.push("/chat");
      return;
    }

    // Try to auto-sync keys from server on first login
    async function tryAutoSync() {
      try {
        const res = await fetch("/api/settings/server-key?sync=true");
        const data = await res.json();
        
        if (res.ok && data.keys && data.keys.length > 0) {
          // Found server keys, sync them to localStorage
          let addedCount = 0;
          data.keys.forEach((k: string, idx: number) => {
            addKey(k, `Synced Key ${idx + 1}`);
            addedCount++;
          });
          
          if (addedCount > 0) {
            setSyncMessage(`Found ${addedCount} API key${addedCount > 1 ? 's' : ''} from your account. Syncing...`);
            // Wait a moment to show the message, then redirect
            setTimeout(() => {
              router.push("/chat");
            }, 1500);
            return;
          }
        }
      } catch {
        // Silent fail - just continue to manual setup
      }
      
      // No server keys found, continue with manual setup
      setIsSyncing(false);
    }

    tryAutoSync();
  }, [router]);

  const validateAndAddKey = async () => {
    const trimmed = apiKey.trim();
    
    if (!trimmed) {
      setError("Please enter an API key");
      return;
    }

    // Basic validation - just check it's not empty
    if (trimmed.length === 0) {
      setError("Please enter a valid API key");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Test the API key with a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`
      );

      if (!response.ok) {
        if (response.status === 400) {
          setError("Invalid API key. Please check and try again.");
        } else if (response.status === 429) {
          setError("Rate limit exceeded. Please try again in a moment.");
        } else {
          setError("Could not validate API key. Please check your key.");
        }
        setIsValidating(false);
        return;
      }

      // Key is valid, add it
      addKey(trimmed, label || "Primary Key");
      
      // If user opted for server sync, enable it
      if (enableServerSync) {
        try {
          await fetch("/api/settings/server-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keys: [trimmed] }),
          });
          // Silent success - don't block on this
        } catch {
          // Silent fail - user can enable later in settings
        }
      }
      
      // Trigger Kai's welcome message (fire and forget - don't block on it)
      fetch("/api/onboarding/welcome", { method: "POST" }).catch(() => {
        // Silently fail - user can still use the app
      });
      
      // Small delay to show success before redirecting
      setTimeout(() => {
        router.push("/chat");
      }, 500);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating) {
      if (step === 2) {
        validateAndAddKey();
      }
    }
  };

  // Show loading state while checking for server keys
  if (isSyncing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-ai/5 via-background to-mint/5 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-3xl border-2 border-border bg-card p-8 shadow-xl">
            <div className="mb-4 text-6xl">🔄</div>
            <h2 className="font-display text-2xl font-bold">
              {syncMessage || "Checking for saved API keys..."}
            </h2>
            <p className="mt-3 text-muted">
              {syncMessage ? "Redirecting you to chat..." : "This will only take a moment"}
            </p>
            <div className="mt-6 flex justify-center">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-border">
                <div className="h-full w-full animate-pulse bg-indigo-ai" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-ai/5 via-background to-mint/5 px-4">
      <div className="w-full max-w-2xl">
        {/* Welcome Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🎌</div>
          <h1 className="font-display text-4xl font-bold">
            Welcome to KaiwaAI
          </h1>
          <p className="mt-2 text-lg text-muted">
            Your personal Japanese learning companion powered by AI
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border-2 border-border bg-card p-8 shadow-xl">
          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold transition-all ${
                    step >= s
                      ? "border-indigo-ai bg-indigo-ai text-white"
                      : "border-border text-muted"
                  }`}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className={`h-1 w-12 rounded-full transition-all ${
                      step > s ? "bg-indigo-ai" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Why do you need an API key */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  🔑 Why do you need an API key?
                </h2>
                <p className="mt-3 text-muted">
                  KaiwaAI uses <strong>your own Google Gemini API key</strong>{" "}
                  to power all AI features. This means:
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 rounded-2xl border-2 border-mint/20 bg-mint/5 p-4">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="font-bold text-mint">Free to Use</h3>
                    <p className="mt-1 text-sm text-muted">
                      Gemini offers a generous free tier. No subscription fees!
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-4">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-bold text-indigo-ai">
                      Privacy First
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Your key stays on your device only. Never sent to our
                      servers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-2xl border-2 border-sakura/20 bg-sakura/5 p-4">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h3 className="font-bold text-sakura">Full Control</h3>
                    <p className="mt-1 text-sm text-muted">
                      You own the key. Add multiple keys for automatic rotation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <PopButton onClick={() => setStep(2)} className="px-8">
                  Get Started →
                </PopButton>
              </div>
            </div>
          )}

          {/* Step 2: Add API Key */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  📖 Get your free Gemini API key
                </h2>
                <p className="mt-3 text-muted">
                  Follow these simple steps to get your API key:
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-5">
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      1
                    </span>
                    <div>
                      <span>Visit </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-indigo-ai underline"
                      >
                        Google AI Studio
                      </a>
                      <span> (opens in new tab)</span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      2
                    </span>
                    <span>Sign in with your Google account</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      3
                    </span>
                     <span>Click &quot;Create API key&quot; button</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      4
                    </span>
                    <span>
                      Select or create a Google Cloud project
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      5
                    </span>
                     <span>Copy the key (starts with &quot;AIza...&quot;)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-ai font-bold text-white">
                      6
                    </span>
                    <span>Paste it below!</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="e.g., Personal, Work"
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-ai"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    API Key <span className="text-sakura">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setError("");
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="AIza..."
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-indigo-ai"
                  />
                </div>

                {/* Server Sync Checkbox */}
                <div className="rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableServerSync}
                      onChange={(e) => setEnableServerSync(e.target.checked)}
                      className="mt-1 h-4 w-4 cursor-pointer accent-indigo-ai"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-bold text-indigo-ai">
                        Enable Account Sync (Recommended)
                      </span>
                      <p className="mt-1 text-xs text-muted">
                        Securely save your API key to your account for multi-device sync and 
                        background features like AI personas and scheduled messages. 
                        Your key is encrypted (AES-256-GCM) before storage.
                      </p>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="rounded-2xl border-2 border-sakura/20 bg-sakura/5 p-3 text-sm text-sakura">
                    <strong>⚠️ Error:</strong> {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm font-bold text-muted hover:text-foreground"
                  disabled={isValidating}
                >
                  ← Back
                </button>
                <PopButton
                  onClick={validateAndAddKey}
                  disabled={!apiKey.trim() || isValidating}
                  className="px-8"
                >
                  {isValidating ? "Validating..." : "Complete Setup →"}
                </PopButton>
              </div>

              <div className="rounded-2xl border-2 border-amber/20 bg-amber/5 p-4 text-xs text-muted">
                <p>
                  <strong className="text-amber">💡 Tip:</strong> You can add
                  more API keys later in Settings. KaiwaAI will automatically
                  rotate between them if one hits its rate limit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Already have an API key configured?{" "}
            <button
              onClick={() => router.push("/chat")}
              className="font-bold text-indigo-ai hover:underline"
            >
              Skip to Chat
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
