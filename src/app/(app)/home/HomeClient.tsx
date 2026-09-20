"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChatCircleText,
  Cards,
  BookOpen,
  Lightbulb,
  Sparkle,
  ArrowRight,
  CheckCircle,
  Fire,
  Trophy,
  Lightning,
  Star,
  BookBookmark,
  MaskHappy,
} from "@phosphor-icons/react";
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
  "Let's practice ordering coffee and treats in Shibuya!",
  "Tell me about what you did today in simple Japanese!",
  "Try using the new vocabulary words you discovered!",
  "Ask Kai about must-visit hidden gems around Tokyo!",
  "Describe your favorite food or ramen in Japanese!",
];

const STARTER_CHIPS = [
  { label: "Order Café", emoji: "☕", href: "/chat" },
  { label: "Daily Check-in", emoji: "💭", href: "/chat" },
  { label: "Grammar Tip", emoji: "📖", href: "/chat" },
  { label: "Roleplay Quest", emoji: "🎭", href: "/chat?tab=ai" },
];

const PROVERBS = [
  { kanji: "継続は力なり", reading: "けいぞくはちからなり", meaning: "Perseverance is power." },
  { kanji: "一期一会", reading: "いちごいちえ", meaning: "Treasure every encounter; it only happens once." },
  {
    kanji: "千里の道も一歩から",
    reading: "せんりのみちもいっぽから",
    meaning: "A journey of a thousand miles begins with a single step.",
  },
  { kanji: "七転び八起き", reading: "ななころびやおき", meaning: "Fall seven times, rise eight. Resilience conquers all." },
];

const FEATURED_QUESTS = [
  {
    theme: "Food & Dining",
    tag: "居酒屋 · Izakaya",
    title: "Ordering at a Traditional Izakaya",
    jpTitle: "居酒屋でおすすめを注文する",
    desc: "Greet the master, ask for today's special (本日のおすすめ), and order dishes with ease.",
  },
  {
    theme: "Travel & Transit",
    tag: "駅 · Shinkansen",
    title: "Navigating the Shinkansen Ticket Counter",
    jpTitle: "みどりの窓口で新幹線の切符を買う",
    desc: "Ask station staff for reserved seats to Kyoto, check departure times, and confirm your platform.",
  },
  {
    theme: "Daily Life",
    tag: "コンビニ · Konbini",
    title: "Convenience Store Quick Stop",
    jpTitle: "コンビニでお弁当を温めてもらう",
    desc: "Ask the clerk to warm your bento (あたためますか), pick up chopsticks, and pay with Suica.",
  },
];

function getKaiSpeech(stats: Stats | null) {
  if (!stats) return "Connecting with your learning companion…";
  if (stats.dueNow > 0) return `You have ${stats.dueNow} review${stats.dueNow === 1 ? "" : "s"} ready to cement in memory!`;
  if (stats.streak > 3) return `${stats.streak} day streak! Consistency is the fastest path to fluency. 🔥`;
  return "Ready for a 2-minute Japanese conversation today?";
}

// Animated counter that ticks up smoothly from 0
function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const step = Math.ceil(target / 30);
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + step;
        if (next >= target) {
          clearInterval(id);
          return target;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [target]);
  return (
    <>
      {count}
      {suffix}
    </>
  );
}

export default function HomeClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [promptIndex] = useState(() => Math.floor(Math.random() * DAILY_PROMPTS.length));
  const [proverbIndex] = useState(() => Math.floor(Math.random() * PROVERBS.length));
  const [questIndex] = useState(() => Math.floor(Math.random() * FEATURED_QUESTS.length));
  const [greeting] = useState(() => {
    if (typeof window === "undefined") return "おかえり";
    const hour = new Date().getHours();
    if (hour < 5) return "おやすみなさい";
    if (hour < 11) return "おはよう";
    if (hour < 17) return "こんにちは";
    return "こんばんは";
  });

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
  const kanjiKnown = stats?.kanji.known ?? 0;
  const kanjiTotal = stats?.kanji.total ?? 0;
  const streak = stats?.streak ?? 0;
  const dueNow = stats?.dueNow ?? 0;
  const kaiSpeech = getKaiSpeech(stats);
  const currentProverb = PROVERBS[proverbIndex];
  const featuredQuest = FEATURED_QUESTS[questIndex];
  const vocabPct = total > 0 ? Math.min(100, Math.round((known / total) * 100)) : 0;
  const kanjiPct = kanjiTotal > 0 ? Math.min(100, Math.round((kanjiKnown / kanjiTotal) * 100)) : 0;

  const firstName = stats?.name?.trim().split(" ")[0];

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto pb-28 lg:pb-12">
      {/* Background drifting sakura petals */}
      <Petals />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[450px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-ai/10 via-sakura/5 to-transparent blur-3xl" />

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-7">
        {/* ── 1. GREETING & COMPANION HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border-2 border-border/80 bg-card/85 p-4 sm:p-5 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Kai avatar with active pulse indicator */}
            <div className="relative shrink-0">
              <Kai size={52} />
              {stats?.activeToday && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-mint shadow-sm" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                  {firstName ? `${greeting}、${firstName}さん!` : `${greeting} — Welcome back!`}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-ai/10 border border-indigo-ai/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-ai">
                  <Sparkle size={11} weight="fill" />
                  {stats?.progressLevel ?? "Beginner"}
                </span>
              </div>
              <p className="text-xs text-muted font-medium mt-1 leading-snug truncate sm:whitespace-normal">
                {kaiSpeech}
              </p>
            </div>
          </div>

          {/* Streak & Milestone Quick Badges */}
          <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
            <div className="flex items-center gap-1.5">
              {streak > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-3 py-1 text-xs font-extrabold text-amber shadow-xs">
                  <Fire size={14} weight="fill" className="animate-pulse" />
                  {streak} day streak
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <Fire size={13} className="text-muted/60" /> Day 1
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-muted">
              {stats?.activeToday ? "✨ Active today" : "Ready for today's practice"}
            </span>
          </div>
        </div>

        {/* ── 2. BENTO ROW 1: PRIMARY ACTION & SRS MOMENTUM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Hero Card: Chat with Kai */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl border-2 border-indigo-ai/25 bg-gradient-to-br from-indigo-ai/10 via-card to-sakura/5 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
            {/* Ambient accent bubble */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-ai/10 blur-2xl" />

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-ai text-white shadow-md shadow-indigo-ai/30">
                    <ChatCircleText size={22} weight="fill" />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-extrabold text-foreground">
                      Conversation with Kai
                    </h2>
                    <p className="text-xs text-muted font-medium">Real-time Japanese speaking partner</p>
                  </div>
                </div>
                <span className="rounded-full bg-card/80 border border-border/80 px-2.5 py-1 text-[11px] font-bold text-indigo-ai shadow-xs">
                  AI Sensei
                </span>
              </div>

              {/* Today's suggested conversation topic */}
              <div className="relative flex items-center gap-2.5 rounded-2xl border border-indigo-ai/20 bg-card/80 p-3 text-xs font-medium text-foreground backdrop-blur-sm shadow-xs">
                <Lightbulb size={17} className="text-amber shrink-0" weight="fill" />
                <span className="italic text-foreground/90">&ldquo;{DAILY_PROMPTS[promptIndex]}&rdquo;</span>
              </div>

              {/* 1-Tap Starter Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {STARTER_CHIPS.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/70 px-2.5 py-1 text-[11px] font-bold text-foreground/85 transition-all hover:border-indigo-ai/40 hover:bg-indigo-ai/10 hover:text-indigo-ai hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>{chip.emoji}</span>
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/chat" className="block relative pt-2">
              <button className="btn-pop w-full py-3.5 px-4 bg-indigo-ai border-indigo-deep text-white font-bold rounded-2xl text-sm shadow-md shadow-indigo-ai/25 transition-all flex items-center justify-center gap-2 hover:brightness-105 active:translate-y-[2px]">
                <span>Start Conversation</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </Link>
          </div>

          {/* Daily Momentum / SRS Review Sprint */}
          <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 transition-all hover:border-indigo-ai/30">
            {dueNow > 0 && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber/10 via-transparent to-indigo-ai/5" />
            )}

            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      dueNow > 0
                        ? "bg-amber/15 text-amber border border-amber/30"
                        : "bg-mint/15 text-mint border border-mint/30"
                    }`}
                  >
                    <Cards size={20} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-extrabold text-foreground">
                      Daily Review Sprint
                    </h3>
                    <p className="text-[11px] text-muted font-medium">Spaced repetition queue</p>
                  </div>
                </div>

                {dueNow > 0 ? (
                  <span className="relative flex items-center gap-1 rounded-full bg-amber px-2.5 py-1 text-[11px] font-extrabold text-white shadow-xs">
                    <Lightning size={12} weight="fill" />
                    <span>
                      <CountUp target={dueNow} /> Due
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-mint/15 border border-mint/30 px-2.5 py-1 text-[11px] font-bold text-mint">
                    <CheckCircle size={13} weight="fill" />
                    <span>Caught up</span>
                  </span>
                )}
              </div>

              {/* Status feedback & description */}
              {dueNow > 0 ? (
                <div className="rounded-2xl border border-amber/25 bg-amber/5 p-3 text-xs text-foreground/90 leading-relaxed font-medium">
                  <p>
                    You have <strong>{dueNow} flashcards</strong> waiting. Complete them today to lock vocabulary into permanent memory!
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-mint/25 bg-mint/5 p-3 text-xs text-foreground/90 leading-relaxed font-medium">
                  <p>
                    All caught up! Next spaced repetition cards will unlock as intervals mature. Keep up the great consistency!
                  </p>
                </div>
              )}
            </div>

            <div className="relative pt-2">
              <Link href="/review" className="block">
                <button
                  className={`w-full py-3 px-4 font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] ${
                    dueNow > 0
                      ? "bg-amber text-white hover:brightness-105 shadow-amber/20"
                      : "border-2 border-border bg-muted/10 hover:bg-muted/20 text-foreground"
                  }`}
                >
                  <span>{dueNow > 0 ? "Begin Review Session" : "Practice Reviews Early"}</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 3. BENTO ROW 2: ROLEPLAY QUEST & PHRASE SPOTLIGHT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Daily Roleplay Quest Spotlight */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-sakura/40 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sakura/15 text-sakura border border-sakura/25">
                    <MaskHappy size={19} weight="duotone" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                      Featured Roleplay Quest
                    </span>
                    <h3 className="font-display text-sm sm:text-base font-extrabold text-foreground">
                      {featuredQuest.title}
                    </h3>
                  </div>
                </div>
                <span className="rounded-full bg-sakura/10 border border-sakura/20 px-2.5 py-0.5 text-[10px] font-bold text-sakura">
                  {featuredQuest.tag}
                </span>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/60 p-3 space-y-1">
                <p className="font-jp text-xs font-bold text-foreground">{featuredQuest.jpTitle}</p>
                <p className="text-xs text-muted font-medium leading-relaxed">{featuredQuest.desc}</p>
              </div>
            </div>

            <Link href="/chat?tab=ai" className="block pt-2">
              <button className="w-full py-2.5 px-3 border-2 border-border bg-card hover:bg-sakura/10 hover:border-sakura/30 hover:text-sakura text-foreground font-bold rounded-2xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                <span>Launch Roleplay Quest</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </Link>
          </div>

          {/* Kotowaza / Phrase Spotlight */}
          <div className="lg:col-span-5 rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber/40 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/15 text-amber border border-amber/25">
                    <Star size={18} weight="duotone" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                    Kotowaza · Phrase Spotlight
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/60 p-3 space-y-1">
                <h4 className="font-jp text-base font-extrabold text-foreground leading-snug">
                  {currentProverb.kanji}
                </h4>
                <p className="font-jp text-[11px] text-muted font-medium">{currentProverb.reading}</p>
                <p className="text-xs text-foreground/80 font-medium leading-relaxed pt-0.5">
                  &ldquo;{currentProverb.meaning}&rdquo;
                </p>
              </div>
            </div>

            <Link href="/chat" className="block pt-2">
              <button className="w-full py-2.5 px-3 border-2 border-border bg-card hover:bg-amber/10 hover:border-amber/30 hover:text-amber text-foreground font-bold rounded-2xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                <span>Discuss with Kai</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </Link>
          </div>
        </div>

        {/* ── 4. BENTO ROW 3: STUDY SHELF & PROGRESS TRACKS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-sm font-extrabold text-foreground flex items-center gap-2">
              <BookBookmark size={17} className="text-indigo-ai" weight="duotone" />
              <span>Learning Tracks &amp; Progress</span>
            </h3>
            {stats?.masteredCount ? (
              <span className="text-[11px] font-bold text-mint flex items-center gap-1">
                <CheckCircle size={13} weight="fill" />
                <CountUp target={stats.masteredCount} /> items mastered
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Kanji Shelf */}
            <div className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-mint/40 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15 text-mint border border-mint/25">
                      <BookBookmark size={17} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-jp text-xs font-bold text-foreground">漢字 · Kanji</h4>
                      <p className="text-[10px] text-muted">Character Explorer</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-foreground">
                    <CountUp target={kanjiKnown} /> / {kanjiTotal}
                  </span>
                </div>

                <div className="relative h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-mint transition-all duration-700"
                    style={{ width: `${kanjiPct}%` }}
                  />
                </div>
              </div>

              <Link
                href="/kanji"
                className="text-[11px] font-bold text-mint hover:underline flex items-center gap-1 pt-1"
              >
                <span>Browse Kanji</span>
                <ArrowRight size={12} weight="bold" />
              </Link>
            </div>

            {/* Vocab Shelf */}
            <div className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-indigo-ai/40 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-ai/15 text-indigo-ai border border-indigo-ai/25">
                      <BookOpen size={17} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-jp text-xs font-bold text-foreground">語彙 · Vocab</h4>
                      <p className="text-[10px] text-muted">Flashcard Decks</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-foreground">
                    <CountUp target={known} /> / {total}
                  </span>
                </div>

                <div className="relative h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-ai transition-all duration-700"
                    style={{ width: `${vocabPct}%` }}
                  />
                </div>
              </div>

              <Link
                href="/vocab"
                className="text-[11px] font-bold text-indigo-ai hover:underline flex items-center gap-1 pt-1"
              >
                <span>Browse Vocabulary</span>
                <ArrowRight size={12} weight="bold" />
              </Link>
            </div>

            {/* Mastered Milestones Shelf */}
            <div className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-amber/40 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-amber border border-amber/25">
                      <Trophy size={17} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="font-jp text-xs font-bold text-foreground">習得 · Mastery</h4>
                      <p className="text-[10px] text-muted">Permanent Retention</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber">
                    <CountUp target={stats?.masteredCount ?? 0} />
                  </span>
                </div>

                <p className="text-[11px] text-muted font-medium leading-relaxed">
                  Items retained through all SRS stages into permanent memory.
                </p>
              </div>

              <Link
                href="/review"
                className="text-[11px] font-bold text-amber hover:underline flex items-center gap-1 pt-1"
              >
                <span>View Retention Stats</span>
                <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
