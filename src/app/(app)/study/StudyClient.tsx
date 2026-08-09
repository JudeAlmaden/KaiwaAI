"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import VocabClient from "../vocab/VocabClient";
import KanjiClient from "../kanji/KanjiClient";

type StudyTab = "vocab" | "kanji";

const LS_KEY = "kaiwa_study_tab";

export default function StudyClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive active tab from URL, falling back to localStorage, then "vocab"
  const [activeTab, setActiveTab] = useState<StudyTab>(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "kanji" || urlTab === "vocab") return urlTab;
    return "vocab";
  });

  // After mount, reconcile with localStorage if no URL param present
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (!urlTab) {
      try {
        const saved = localStorage.getItem(LS_KEY) as StudyTab | null;
        if (saved === "kanji" || saved === "vocab") {
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", saved);
          router.replace(`${pathname}?${params.toString()}`);
          Promise.resolve().then(() => setActiveTab(saved));
        }
      } catch {
        // localStorage unavailable
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = useCallback(
    (tab: StudyTab) => {
      setActiveTab(tab);
      try {
        localStorage.setItem(LS_KEY, tab);
      } catch {
        // ignore
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
      {/* Top tab bar */}
      <div className="flex items-center gap-1 border-b-2 border-border bg-bg px-5 pt-4 pb-0 sm:px-8">
        <button
          id="study-tab-vocab"
          onClick={() => switchTab("vocab")}
          className={`relative flex items-center gap-2 rounded-t-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "vocab"
              ? "bg-card text-indigo-ai shadow-sm border-2 border-b-0 border-border"
              : "text-muted hover:text-fg"
          }`}
        >
          📖
          <span>Vocab</span>
          <span className={`text-xs font-normal opacity-60 ${activeTab === "vocab" ? "text-indigo-ai" : ""}`}>
            単語
          </span>
        </button>

        <button
          id="study-tab-kanji"
          onClick={() => switchTab("kanji")}
          className={`relative flex items-center gap-2 rounded-t-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "kanji"
              ? "bg-card text-indigo-ai shadow-sm border-2 border-b-0 border-border"
              : "text-muted hover:text-fg"
          }`}
        >
          <span className="font-display text-base leading-none">字</span>
          <span>Kanji</span>
          <span className={`text-xs font-normal opacity-60 ${activeTab === "kanji" ? "text-indigo-ai" : ""}`}>
            漢字
          </span>
        </button>
      </div>

      {/* Page content — mount both but hide inactive to preserve scroll position */}
      <div className={`flex flex-1 flex-col ${activeTab === "vocab" ? "" : "hidden"}`}>
        <VocabClient />
      </div>
      <div className={`flex flex-1 flex-col ${activeTab === "kanji" ? "" : "hidden"}`}>
        <KanjiClient />
      </div>
    </div>
  );
}
