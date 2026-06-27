"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import { Surface } from "../ui";

type Stats = {
  name: string | null;
  level: string;
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  vocab: { known: number; learning: number; new: number; total: number };
  dueNow: number;
  messagesSent: number;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night studying";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [greet, setGreet] = useState("Hello");

  useEffect(() => {
    // Compute the time-based greeting on the client only, to avoid an SSR/client
    // hydration mismatch (server and client clocks/timezones can differ).
    setGreet(greeting());
    // Register today's visit (advances streak), then load stats.
    fetch("/api/activity", { method: "POST" })
      .catch(() => {})
      .finally(() => {
        fetch("/api/stats")
          .then((r) => r.json())
          .then(setStats)
          .catch(() => {});
      });
  }, []);

  const known = stats?.vocab.known ?? 0;
  const total = stats?.vocab.total ?? 0;
  const learning = stats?.vocab.learning ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* hero greeting */}
      <div className="flex items-center gap-4 px-5 py-6 sm:px-8">
        <Kai size={56} />
        <div>
          <p className="text-sm text-muted">{greet},</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {stats?.name || "welcome back"}!
          </h1>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 px-5 sm:px-8">
        {/* streak — full width feature */}
        <div className="col-span-2 flex items-center justify-between rounded-3xl border-2 border-amber/30 bg-amber/10 p-5">
          <div>
            <p className="font-display text-3xl font-extrabold text-amber">
              🔥 {stats?.streak ?? 0}
              <span className="ml-1 text-lg">
                day{stats?.streak === 1 ? "" : "s"}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {stats?.activeToday
                ? "You showed up today — nice!"
                : "Chat with Kai today to keep it going."}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            <p className="font-bold">Best</p>
            <p className="text-lg font-extrabold text-foreground">
              {stats?.bestStreak ?? 0}
            </p>
          </div>
        </div>

        <StatCard label="Words known" value={known} accent="text-mint" />
        <StatCard label="Learning" value={learning} accent="text-amber" />
        <StatCard label="Level" value={stats?.level ?? "—"} accent="text-indigo-ai" />
        <StatCard
          label="Messages sent"
          value={stats?.messagesSent ?? 0}
          accent="text-sky"
        />

        {/* vocab progress bar */}
        <Surface className="col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Vocabulary</h2>
            <Link href="/vocab" className="text-xs font-bold text-indigo-ai">
              View all →
            </Link>
          </div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-border/40">
            {total > 0 && (
              <>
                <div className="h-full bg-mint" style={{ flex: known }} />
                <div className="h-full bg-amber" style={{ flex: learning }} />
                <div
                  className="h-full bg-sky"
                  style={{ flex: stats?.vocab.new ?? 0 }}
                />
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            {total === 0
              ? "No words yet — tap words while chatting to collect them."
              : `${known} known · ${learning} learning · ${stats?.vocab.new ?? 0} new`}
          </p>
        </Surface>

        {/* CTAs */}
        <Link
          href="/review"
          className="col-span-2 flex items-center justify-between rounded-3xl border-2 border-indigo-ai bg-indigo-ai/5 p-5 transition-colors hover:bg-indigo-ai/10 sm:col-span-1"
        >
          <div>
            <p className="font-display text-lg font-extrabold">Review</p>
            <p className="text-sm text-muted">
              {stats?.dueNow
                ? `${stats.dueNow} card${stats.dueNow === 1 ? "" : "s"} due`
                : "Nothing due"}
            </p>
          </div>
          <span className="text-2xl">🔁</span>
        </Link>

        <Link
          href="/chat"
          className="col-span-2 mb-6 flex items-center justify-between rounded-3xl border-2 border-border bg-card p-5 transition-colors hover:border-indigo-soft sm:col-span-1"
        >
          <div>
            <p className="font-display text-lg font-extrabold">Chat with Kai</p>
            <p className="text-sm text-muted">Practice a little today</p>
          </div>
          <span className="text-2xl">💬</span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-4">
      <p className={`font-display text-2xl font-extrabold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs font-bold text-muted">{label}</p>
    </div>
  );
}
