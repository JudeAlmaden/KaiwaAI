"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import Petals from "../../Petals";

type Stats = {
  name: string | null;
  level: string;
  progressLevel: string;
  progress: number;
  nextMilestone: number;
  masteredCount: number;
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  vocab: { known: number; learning: number; new: number; total: number };
  kanji: { known: number; learning: number; new: number; total: number };
  dueNow: number;
  messagesSent: number;
};

const DAILY_PROMPTS = [
  "Let's practice ordering coffee in Tokyo! ☕",
  "Tell me about your day in Japanese! 🌸",
  "Try using the new vocabulary you learned today! 📚",
];

const PROVERBS = [
  { kanji: "継続は力なり", reading: "けいぞくはちからなり", meaning: "Perseverance is power." },
  { kanji: "一期一会", reading: "いちごいちえ", meaning: "Treasure every encounter." },
  { kanji: "千里の道も一歩から", reading: "せんりのみちもしっぽから", meaning: "A journey of a thousand miles begins with a single step." },
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { en: "Late night studying", jp: "夜遅くまでお疲れ様！" };
  if (h < 12) return { en: "Good morning", jp: "おはよう！" };
  if (h < 18) return { en: "Good afternoon", jp: "こんにちは！" };
  return { en: "Good evening", jp: "こんばんは！" };
}

function getKaiSpeech(stats: Stats | null, timeJp: string) {
  if (!stats) return `${timeJp} Welcome back to KaiwaAI!`;
  if (stats.dueNow > 0) return `${timeJp} You have ${stats.dueNow} reviews ready! Let's clear them together!`;
  if (stats.streak > 1) return `${timeJp} 🔥 ${stats.streak}-day streak! Keep up the great work!`;
  return `${timeJp} Ready for a quick 2-minute Japanese conversation?`;
}

export default function HomeClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [greeting] = useState(() => getTimeGreeting());
  const [promptIndex] = useState(() => Math.floor(Math.random() * DAILY_PROMPTS.length));
  const [proverbIndex] = useState(() => Math.floor(Math.random() * PROVERBS.length));

  useEffect(() => {

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
  const vocabNew = stats?.vocab.new ?? 0;

  const kanjiKnown = stats?.kanji.known ?? 0;
  const kanjiTotal = stats?.kanji.total ?? 0;
  const kanjiLearning = stats?.kanji.learning ?? 0;
  const kanjiNew = stats?.kanji.new ?? 0;

  const kaiSpeech = getKaiSpeech(stats, greeting.jp);
  const currentProverb = PROVERBS[proverbIndex];

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      {/* Background drifting sakura petals */}
      <Petals />

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 space-y-6">
        
        {/* ── 1. KAI COMPANION HERO BANNER ── */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 sm:p-6 md:p-7 shadow-xs">
          {/* Subtle watermark */}
          <div className="absolute -right-4 -bottom-6 text-[120px] font-bold font-jp text-foreground/5 select-none pointer-events-none leading-none">
            友
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Kai Companion Mascot */}
            <div className="relative shrink-0 flex items-center justify-center">
              <Kai size={60} className="relative z-10" />
            </div>

            {/* Kai Speech Bubble */}
            <div className="flex-1 space-y-1.5 min-w-0 max-w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-muted/15 text-muted border border-border max-w-full">
                <span className="truncate">{greeting.en}</span>
                <span>•</span>
                <span className="font-jp truncate">{greeting.jp}</span>
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate max-w-full">
                {stats?.name
                  ? `おかえり, ${stats.name.trim().split(" ")[0]}!`
                  : "おかえり — Welcome back!"}
              </h1>

              {/* Speech balloon */}
              <div className="relative p-3 rounded-2xl bg-background border border-border text-xs sm:text-sm text-foreground flex items-center gap-2 min-w-0 max-w-full">
                <span className="text-base shrink-0">💬</span>
                <p className="font-semibold leading-relaxed min-w-0 flex-1 break-words">
                  {kaiSpeech}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. HERO ACTION CARDS (2-COLUMN GRID) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Chat with Kai Hero Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-border bg-card p-6 shadow-xs transition-all hover:-translate-y-1 hover:border-indigo-ai/50 hover:shadow-md overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-[96px] font-bold font-jp text-foreground/5 select-none pointer-events-none leading-none group-hover:text-indigo-ai/10 transition-colors">
              話
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-ai/10 text-indigo-ai text-2xl group-hover:scale-110 transition-transform">
                    💬
                  </span>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-foreground group-hover:text-indigo-ai transition-colors">
                      Chat with Kai
                    </h2>
                    <p className="text-xs text-muted font-medium">AI Japanese Companion</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-ai/15 text-indigo-ai border border-indigo-ai/20 uppercase tracking-wide">
                  RECOMMENDED
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Real-time Japanese voice &amp; text conversation. Practice listening, speaking &amp; grammar organically.
              </p>

              {/* Topic suggestion pill */}
              <div className="p-3 rounded-2xl bg-background border border-border text-xs font-medium text-foreground flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span className="truncate">{DAILY_PROMPTS[promptIndex]}</span>
              </div>
            </div>

            <Link href="/chat" className="mt-5 block">
              <button className="w-full py-3.5 px-4 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 active:translate-y-[2px]">
                <span>Start Conversation</span>
                <span className="text-base">🚀</span>
              </button>
            </Link>
          </div>

          {/* Review Quests Hero Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-border bg-card p-6 shadow-xs transition-all hover:-translate-y-1 hover:border-indigo-ai/50 hover:shadow-md overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-[96px] font-bold font-jp text-foreground/5 select-none pointer-events-none leading-none group-hover:text-indigo-ai/10 transition-colors">
              復
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-ai/10 text-indigo-ai text-2xl group-hover:scale-110 transition-transform">
                    ⚔️
                  </span>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-foreground group-hover:text-indigo-ai transition-colors">
                      Review Quests
                    </h2>
                    <p className="text-xs text-muted font-medium">Spaced Repetition System</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  (stats?.dueNow ?? 0) > 0
                    ? 'bg-indigo-ai/15 text-indigo-ai border border-indigo-ai/20'
                    : 'bg-muted/15 text-muted'
                }`}>
                  {stats?.dueNow ? `🎯 ${stats.dueNow} CARDS DUE` : "CAUGHT UP"}
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Clear your review backlog. Strengthen long-term memory for vocabulary, readings &amp; kanji.
              </p>

              {/* Mode preview */}
              <div className="p-3 rounded-2xl bg-background border border-border text-xs font-medium text-foreground flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <span>Spaced Repetition (SRS) • Mixed Modes &amp; Quests</span>
              </div>
            </div>

            <Link href="/review" className="mt-5 block">
              <button className="w-full py-3.5 px-4 bg-card border-2 border-border border-b-4 hover:bg-muted/10 text-foreground font-extrabold rounded-2xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 active:translate-y-[2px]">
                <span>Launch Review Session</span>
                <span className="text-base">🔁</span>
              </button>
            </Link>
          </div>

        </div>

        {/* ── 3. LEVEL & STREAK PROGRESSION CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Level Progress (Spans 2 cols) */}
          <div className="md:col-span-2 rounded-3xl border-2 border-border bg-card p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted font-display">
                    Learner Rank
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">
                    {stats?.progressLevel ?? "Beginner"}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {stats?.masteredCount ?? 0} items mastered ·{" "}
                    {stats?.nextMilestone && stats.nextMilestone !== Infinity
                      ? `${stats.nextMilestone - (stats?.masteredCount ?? 0)} items until next rank`
                      : "Maximum rank reached!"}
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/10 text-3xl">
                  {getLevelEmoji(stats?.progressLevel ?? "Beginner")}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted">Rank Progress</span>
                  <span className="text-indigo-ai font-display">{stats?.progress ?? 0}%</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-border/40 p-0.5">
                  <div
                    className="h-full rounded-full bg-indigo-ai transition-all duration-700"
                    style={{ width: `${stats?.progress ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Streak */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 md:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted font-display">
                  Daily Streak
                </p>
                <span className="text-xs text-muted font-bold">Best: {stats?.bestStreak ?? 0} days</span>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold text-foreground">
                  🔥 {stats?.streak ?? 0}
                </span>
                <span className="text-sm font-bold text-foreground">
                  day{stats?.streak === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-2 text-xs text-muted leading-relaxed">
                {stats?.activeToday
                  ? "You showed up today — awesome!"
                  : "Chat or review today to keep the flame alive."}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-bold text-muted">
              <span>{stats?.activeToday ? "✓ Checked in" : "Pending activity"}</span>
              <span>{stats?.activeToday ? "✨" : "⚡"}</span>
            </div>
          </div>

        </div>

        {/* ── 4. MASTERY STAT TILES ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Words Mastered"
            value={known}
            subtitle={`${learning} learning`}
            icon="🌱"
          />
          <StatTile
            label="Kanji Mastered"
            value={kanjiKnown}
            subtitle={`${kanjiLearning} learning`}
            icon="漢"
          />
          <StatTile
            label="JLPT Level"
            value={stats?.level ?? "N5"}
            subtitle="Target Level"
            icon="🎯"
          />
          <StatTile
            label="Conversations"
            value={stats?.messagesSent ?? 0}
            subtitle="Messages Sent"
            icon="💬"
          />
        </div>

        {/* ── 5. VOCAB & KANJI BREAKDOWN DECKS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Vocab Progress Card */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai text-base font-bold">
                  📚
                </span>
                <h3 className="font-display text-base font-extrabold text-foreground">Vocabulary</h3>
              </div>
              <Link href="/vocab" className="text-xs font-extrabold text-indigo-ai hover:underline">
                Explore Deck →
              </Link>
            </div>

            {/* Stacked bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-border/40 p-0.5">
              {total > 0 && (
                <>
                  <div className="h-full rounded-l-full bg-mint" style={{ flex: known }} />
                  <div className="h-full bg-amber" style={{ flex: learning }} />
                  <div className="h-full rounded-r-full bg-sky" style={{ flex: vocabNew }} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted font-semibold pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-mint" /> {known} Known</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber" /> {learning} Learning</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky" /> {vocabNew} New</span>
            </div>
          </div>

          {/* Kanji Progress Card */}
          <div className="rounded-3xl border-2 border-border bg-card p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai text-base font-bold font-jp">
                  漢
                </span>
                <h3 className="font-display text-base font-extrabold text-foreground">Kanji Grid</h3>
              </div>
              <Link href="/kanji" className="text-xs font-extrabold text-indigo-ai hover:underline">
                Explore Grid →
              </Link>
            </div>

            {/* Stacked bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-border/40 p-0.5">
              {kanjiTotal > 0 && (
                <>
                  <div className="h-full rounded-l-full bg-sakura" style={{ flex: kanjiKnown }} />
                  <div className="h-full bg-amber" style={{ flex: kanjiLearning }} />
                  <div className="h-full rounded-r-full bg-sky" style={{ flex: kanjiNew }} />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted font-semibold pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sakura" /> {kanjiKnown} Known</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber" /> {kanjiLearning} Learning</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky" /> {kanjiNew} New</span>
            </div>
          </div>

        </div>

        {/* ── 6. KAI'S JAPANESE PHRASE SPOTLIGHT ── */}
        <div className="rounded-3xl border-2 border-border bg-card p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-ai/10 text-indigo-ai font-jp font-bold text-2xl flex items-center justify-center shrink-0">
              {currentProverb.kanji.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted font-display">
                Phrase Spotlight
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h4 className="font-jp text-lg font-bold text-foreground">{currentProverb.kanji}</h4>
                <span className="text-xs text-muted font-jp">({currentProverb.reading})</span>
              </div>
              <p className="text-xs text-muted mt-0.5 font-medium">{currentProverb.meaning}</p>
            </div>
          </div>

          <Link href="/chat">
            <button className="px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/10 text-foreground font-extrabold text-xs transition active:scale-95 whitespace-nowrap">
              Discuss with Kai →
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-4 transition-all hover:border-indigo-ai/40">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-muted">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-[10px] text-muted font-medium mt-0.5">{subtitle}</p>
    </div>
  );
}

function getLevelEmoji(level: string): string {
  const emojiMap: Record<string, string> = {
    "Beginner": "🌱",
    "Elementary": "🌿",
    "Intermediate": "🌳",
    "Upper Intermediate": "🎋",
    "Advanced": "⭐",
    "Expert": "💎",
    "Master": "👑",
    "Native-like": "🏆",
  };
  return emojiMap[level] || "🌱";
}
