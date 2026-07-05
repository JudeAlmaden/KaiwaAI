"use client";

import { useState } from "react";
import ApiKeyCard from "./ApiKeyCard";
import ModelCard from "./ModelCard";
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
          <ApiKeyCard />
        </div>
      )}

      {/* Learning Tab */}
      {tab === "learning" && (
        <div className="flex flex-col gap-5">
          <ModelCard />
        </div>
      )}
    </div>
  );
}
