"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircleText, Cards, BookOpen, Lightbulb, Sparkle, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import Kai from "../../Kai";
import Petals from "../../Petals";
import MobileAppDownloadCard from "../settings/MobileAppDownloadCard";

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
  "Let's practice ordering coffee in Tokyo!",
  "Tell me about your day in Japanese!",
  "Try using the new vocabulary you learned today!",
];

const PROVERBS = [
  { kanji: "継続は力なり", reading: "けいぞくはちからなり", meaning: "Perseverance is power." },
  { kanji: "一期一会", reading: "いちごいちえ", meaning: "Treasure every encounter." },
  { kanji: "千里の道も一歩から", reading: "せんりのみちもしっぽから", meaning: "A journey of a thousand miles begins with a single step." },
];

function getKaiSpeech(stats: Stats | null) {
  if (!stats) return "Welcome back to KaiwaAI!";
  if (stats.dueNow > 0) return `You have ${stats.dueNow} reviews ready to clear!`;
  return "Ready for a quick 2-minute Japanese conversation?";
}

export default function HomeClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [proverbIndex, setProverbIndex] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPromptIndex(Math.floor(Math.random() * DAILY_PROMPTS.length));
    setProverbIndex(Math.floor(Math.random() * PROVERBS.length));

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

  const kaiSpeech = getKaiSpeech(stats);
  const currentProverb = PROVERBS[proverbIndex];

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      {/* Background drifting sakura petals */}
      <Petals />

      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 space-y-4 sm:space-y-5">
        
        {/* ── 1. APPLE HEADER ── */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <Kai size={48} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                {stats?.name ? `おかえり, ${stats.name.trim().split(" ")[0]}!` : "おかえり — Welcome back!"}
              </h1>
              <p className="text-xs text-muted font-medium mt-0.5 leading-snug">
                {kaiSpeech}
              </p>
            </div>
          </div>

          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-ai/10 text-indigo-ai border border-indigo-ai/20">
            {stats?.progressLevel ?? "Beginner"}
          </span>
        </div>

        {/* ── 2. HERO FEATURE CARD: CHAT WITH KAI ── */}
        <div className="rounded-3xl border border-border/80 bg-card/90 p-5 sm:p-6 shadow-xs space-y-4 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center">
                <ChatCircleText size={22} className="text-indigo-ai" />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Chat with Kai
                </h2>
                <p className="text-xs text-muted font-medium">Practice Japanese in real-time</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-ai/10 text-indigo-ai uppercase tracking-wider">
              AI Voice &amp; Text
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/20 text-xs font-medium text-foreground flex items-center gap-2.5">
            <Lightbulb size={16} className="text-amber-500 shrink-0" />
            <span className="truncate">{DAILY_PROMPTS[promptIndex]}</span>
          </div>

          <Link href="/chat" className="block">
            <button className="w-full py-3.5 px-4 bg-indigo-ai hover:bg-indigo-ai/90 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99]">
              <span>Start Conversation</span>
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>

        {/* ── 3. SECONDARY ACTIONS GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Review Quests Card */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs flex flex-col justify-between space-y-3 backdrop-blur-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cards size={20} className="text-indigo-ai" />
                  <h3 className="font-display text-sm font-bold text-foreground">Review Quests</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  (stats?.dueNow ?? 0) > 0 ? 'bg-indigo-ai text-white' : 'bg-emerald-500/15 text-emerald-600'
                }`}>
                  {(stats?.dueNow ?? 0) > 0 ? (
                    `${stats?.dueNow} Due`
                  ) : (
                    <>
                      <CheckCircle size={12} weight="bold" />
                      <span>Caught up</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed font-medium">
                Spaced repetition reviews for vocabulary and kanji.
              </p>
            </div>

            <Link href="/review">
              <button className="w-full py-2.5 px-3 border border-border/80 bg-muted/15 hover:bg-muted/30 text-foreground font-semibold rounded-2xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                <span>Review Session</span>
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          {/* Daily Phrase Card */}
          <div className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xs flex flex-col justify-between space-y-3 backdrop-blur-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                  <Sparkle size={12} className="text-amber-500" />
                  <span>Phrase Spotlight</span>
                </span>
                <span className="font-jp text-xs text-muted">({currentProverb.reading})</span>
              </div>
              <h4 className="font-jp text-sm font-bold text-foreground leading-snug">{currentProverb.kanji}</h4>
              <p className="text-xs text-muted font-medium leading-relaxed">{currentProverb.meaning}</p>
            </div>

            <Link href="/chat">
              <button className="w-full py-2.5 px-3 border border-border/80 bg-muted/15 hover:bg-muted/30 text-foreground font-semibold rounded-2xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5">
                <span>Discuss with Kai</span>
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>

        </div>

        {/* ── 4. STUDY PROGRESS STRIP ── */}
        <div className="rounded-3xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-xs space-y-3 backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-ai" />
              <span>Study Progress</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-ai">
              <Link href="/vocab" className="hover:underline">Vocab ({known})</Link>
              <span>•</span>
              <Link href="/kanji" className="hover:underline">Kanji ({kanjiKnown})</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted font-medium">
                <span>Vocabulary</span>
                <span className="font-semibold text-foreground">{known} / {total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full bg-indigo-ai rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (known / total) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted font-medium">
                <span>Kanji</span>
                <span className="font-semibold text-foreground">{kanjiKnown} / {kanjiTotal}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full bg-indigo-ai rounded-full transition-all duration-500" style={{ width: `${kanjiTotal > 0 ? (kanjiKnown / kanjiTotal) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. MOBILE APP DOWNLOAD ── */}
        <MobileAppDownloadCard />

      </div>
    </div>
  );
}
