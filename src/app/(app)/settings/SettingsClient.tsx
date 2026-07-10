"use client";

import { useState } from "react";
import ApiKeyCard from "./ApiKeyCard";
import ServerKeyCard from "./ServerKeyCard";
import ModelCard from "./ModelCard";
import OutreachCard from "./OutreachCard";
import UserSettingsTab from "./UserSettingsTab";

type Tab = "user" | "ai" | "learning";

export default function SettingsClient({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("user");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "user", label: "User", icon: "👤" },
    { id: "ai", label: "AI Settings", icon: "🧠" },
    { id: "learning", label: "Learning", icon: "📚" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6 sm:px-8">
      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border-2 border-border bg-card p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              tab === t.id
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/5 hover:text-foreground"
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* User Tab */}
      {tab === "user" && <UserSettingsTab email={email} />}

      {/* AI Settings Tab */}
      {tab === "ai" && (
        <div className="flex flex-col gap-5">
          {/* Dual System Explainer */}
          <div className="rounded-3xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔑</span>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-indigo-ai">
                  How API Keys Work
                </h3>
                <p className="mt-2 text-sm text-muted">
                  KaiwaAI uses <strong>your own</strong> Google Gemini API key (BYOK).
                  You have two options:
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-mint">📱</span>
                    <div>
                      <strong className="text-foreground">Personal Keys:</strong>{" "}
                      <span className="text-muted">
                        Stored on your device only. Most private. Used for vocab, kanji, and personal chat.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-ai">🌐</span>
                    <div>
                      <strong className="text-foreground">Server Key (Optional):</strong>{" "}
                      <span className="text-muted">
                        Encrypted copy on our server. Enables groups, scheduling, and background features.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ApiKeyCard />
          <ServerKeyCard />
        </div>
      )}

      {/* Learning Tab */}
      {tab === "learning" && (
        <div className="flex flex-col gap-5">
          <ModelCard />
          <OutreachCard />
        </div>
      )}
    </div>
  );
}
