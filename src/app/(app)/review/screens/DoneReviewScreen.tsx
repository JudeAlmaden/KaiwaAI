"use client";

import Link from "next/link";
import Kai from "../../../Kai";
import Petals from "../../../Petals";
import PageHeader from "../../PageHeader";
import { PopButton } from "../../../PopButton";
import { AppBlocker } from "@/plugins/app-blocker";

export default function DoneReviewScreen({
  again,
  good,
  onNewSession,
}: {
  again: number;
  good: number;
  onNewSession: () => void;
}) {
  const reviewed = again + good;
  const accuracy = reviewed > 0 ? Math.round((good / reviewed) * 100) : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  return (
    <div className="flex flex-1 flex-col relative overflow-hidden">
      {/* Celebrating drifting sakura petals in background */}
      {reviewed > 0 && <Petals />}

      <PageHeader title="Review" jp="復習" subtitle="Review complete! Here's your performance." />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center z-10">
        <Kai size={80} />
        <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground">
          {reviewed > 0 ? "Nice work! 🎉" : "Nothing to review"}
        </h2>

        {reviewed > 0 ? (
          <>
            {/* Radial Accuracy Ring */}
            <div className="relative flex items-center justify-center h-28 w-28 mt-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-border"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-indigo-ai transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-foreground">{accuracy}%</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted">Accuracy</span>
              </div>
            </div>

            {/* Stats Cards Dashboard */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                <span className="text-xl">📚</span>
                <span className="block text-lg font-extrabold text-foreground mt-1">{reviewed}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Reviewed</span>
              </div>
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                <span className="text-xl">✅</span>
                <span className="block text-lg font-extrabold text-mint mt-1">{good}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">Solid</span>
              </div>
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                <span className="text-xl">🔁</span>
                <span className="block text-lg font-extrabold text-sakura mt-1">{again}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">To Revisit</span>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-1.5 text-sm text-muted">
            You have no pending cards left to review right now.
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("blocked_package") && (
            <button
              onClick={() => {
                const pkg = new URLSearchParams(window.location.search).get("blocked_package");
                if (pkg) AppBlocker.launchApp({ packageName: pkg }).catch(() => {});
              }}
              className="w-full h-12 rounded-2xl bg-emerald-500 border-b-4 border-emerald-600 text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
            >
              🚀 Launch App
            </button>
          )}
          <PopButton onClick={onNewSession} size="md" className="flex-1">
            New session
          </PopButton>
          <Link
            href="/chat"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border-2 border-border bg-card/40 backdrop-blur-sm px-6 text-sm font-bold text-muted transition-all hover:border-indigo-ai hover:text-indigo-ai"
          >
            Back to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
