"use client";

import { useState } from "react";
import ApiKeyCard from "./ApiKeyCard";
import ServerKeyCard from "./ServerKeyCard";
import ModelCard from "./ModelCard";
import ProactiveChatCard from "./ProactiveChatCard";
import FsrsSettingsCard from "./FsrsSettingsCard";
import ReviewDefaultsCard from "./ReviewDefaultsCard";
import UserSettingsTab from "./UserSettingsTab";
import AppBlockerSettings from "./app-blocker/page";
import LearningResetCard from "./LearningResetCard";
import MobileAppDownloadCard from "./MobileAppDownloadCard";
import { User, Brain, BookOpen, DeviceMobile } from "@phosphor-icons/react";
import { useAppBlockerSupported } from "@/lib/app-blocker-platform";

type Tab = "user" | "ai" | "learning" | "mobile";

export default function SettingsClient({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("user");
  const appBlockerEnabled = useAppBlockerSupported();

  const tabs: { id: Tab; label: string; Icon: typeof User }[] = [
    { id: "user", label: "User", Icon: User },
    { id: "ai", label: "AI Settings", Icon: Brain },
    { id: "learning", label: "Learning", Icon: BookOpen },
    { id: "mobile", label: "Mobile", Icon: DeviceMobile },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-5 px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 sm:pb-8">
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2 rounded-2xl border-2 border-border bg-card p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex min-w-0 items-center justify-center gap-1.5 sm:flex-1 sm:gap-2 rounded-xl px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/5 hover:text-foreground"
            }`}
          >
            <t.Icon size={16} weight={tab === t.id ? "fill" : "duotone"} />
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
          <ModelCard />
          <ProactiveChatCard />
        </div>
      )}

      {/* Learning Tab */}
      {tab === "learning" && (
        <div className="flex flex-col gap-5">
          <FsrsSettingsCard />
          <ReviewDefaultsCard />
          <LearningResetCard />
        </div>
      )}

      {/* Mobile Tab */}
      {tab === "mobile" && (
        <div className="flex flex-col gap-5">
          <MobileAppDownloadCard />
          {appBlockerEnabled && <AppBlockerSettings />}
        </div>
      )}
    </div>
  );
}
