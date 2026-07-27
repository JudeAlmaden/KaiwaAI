"use client";

import { useState } from "react";
import ApiKeyCard from "./ApiKeyCard";
import ServerKeyCard from "./ServerKeyCard";
import ModelCard from "./ModelCard";
import OutreachCard from "./OutreachCard";
import ReviewNotificationCard from "./ReviewNotificationCard";
import UserSettingsTab from "./UserSettingsTab";
import AppBlockerSettings from "./app-blocker/page";
import MobileAppDownloadCard from "./MobileAppDownloadCard";

import { Capacitor } from "@capacitor/core";

type Tab = "user" | "ai" | "learning" | "mobile";

export default function SettingsClient({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("user");
  const isAndroid = Capacitor.getPlatform() === "android";

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "user", label: "User", icon: "👤" },
    { id: "ai", label: "AI Settings", icon: "🧠" },
    { id: "learning", label: "Learning", icon: "📚" },
    { id: "mobile", label: "Mobile", icon: "📱" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:px-8 min-w-0">
      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 rounded-2xl border-2 border-border bg-card p-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              tab === t.id
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/5 hover:text-foreground"
            }`}
          >
            <span className="text-sm sm:text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* User Tab */}
      {tab === "user" && <UserSettingsTab email={email} />}

      {/* AI Settings Tab */}
      {tab === "ai" && (
        <div className="flex flex-col gap-5">
          <ApiKeyCard />
          <ServerKeyCard />
        </div>
      )}

      {/* Learning Tab */}
      {tab === "learning" && (
        <div className="flex flex-col gap-5">
          <ModelCard />
          <OutreachCard />
          <ReviewNotificationCard />
        </div>
      )}

      {/* Mobile Tab */}
      {tab === "mobile" && (
        <div className="flex flex-col gap-5">
          <MobileAppDownloadCard />
          {isAndroid && <AppBlockerSettings />}
        </div>
      )}
    </div>
  );
}
