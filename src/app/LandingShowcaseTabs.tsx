"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  MagnifyingGlass,
  Compass,
  BookBookmark,
  Sparkle,
  Check,
  SpeakerHigh,
  PushPin,
  ForkKnife,
  Airplane,
} from "@phosphor-icons/react";

type ShowcaseTab = "memory" | "lookup" | "quests" | "kanji";

const TABS: { id: ShowcaseTab; label: string; icon: typeof Brain }[] = [
  { id: "memory", label: "In-Chat Memory", icon: Brain },
  { id: "lookup", label: "Tap-to-Lookup", icon: MagnifyingGlass },
  { id: "quests", label: "Roleplay Quests", icon: Compass },
  { id: "kanji", label: "Kanji Collection", icon: BookBookmark },
];

export default function LandingShowcaseTabs() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("memory");
  const [userInteracted, setUserInteracted] = useState(false);

  // Auto rotate tabs every 5 seconds unless user clicked manually
  useEffect(() => {
    if (userInteracted) return;
    const tabs: ShowcaseTab[] = ["memory", "lookup", "quests", "kanji"];
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = tabs.indexOf(prev);
        return tabs[(idx + 1) % tabs.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [userInteracted]);

  const selectTab = (t: ShowcaseTab) => {
    setUserInteracted(true);
    setActiveTab(t);
  };

  return (
    <section className="relative z-10 border-t-2 border-b-2 border-border bg-card/30 py-20 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai">
            <Sparkle size={14} weight="fill" /> Interactive Feature Preview
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Designed for intuitive, frictionless learning
          </h2>
          <p className="mt-2 text-sm text-muted">
            Tap a feature below to preview how KaiwaAI accelerates your Japanese acquisition.
          </p>
        </div>

        {/* Tab Selector Pill Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold transition-all duration-200 ${
                  active
                    ? "bg-indigo-ai text-white shadow-lg shadow-indigo-ai/25 scale-105"
                    : "border-2 border-border bg-card text-muted hover:border-indigo-ai/40 hover:text-foreground"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Showcase Container */}
        <div className="mt-8 min-h-[340px] overflow-hidden rounded-3xl border-2 border-border bg-card p-6 shadow-2xl sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {activeTab === "memory" && <MemoryPreview />}
              {activeTab === "lookup" && <LookupPreview />}
              {activeTab === "quests" && <QuestsPreview />}
              {activeTab === "kanji" && <KanjiPreview />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function MemoryPreview() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-ai/10 px-3 py-1 text-xs font-extrabold text-indigo-ai">
          <Brain size={16} weight="fill" /> Persona Memory Engine
        </span>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-snug">
          Kai remembers your life naturally as you talk
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          No tedious profiles to fill out. Mention your upcoming trip to Kyoto or your favorite ramen spot in conversation, and Kai automatically extracts key facts into her profile memory drawer to personalize future dialogues.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-indigo-ai/20 bg-indigo-ai/5 px-3 py-1.5 font-semibold text-indigo-ai">
            <PushPin size={14} weight="fill" /> Goal: JLPT N3 Target
          </span>
          <span className="flex items-center gap-1.5 rounded-xl border border-amber/20 bg-amber/5 px-3 py-1.5 font-semibold text-amber">
            <ForkKnife size={14} weight="fill" /> Favorite: Tonkotsu Ramen
          </span>
          <span className="flex items-center gap-1.5 rounded-xl border border-mint/20 bg-mint/5 px-3 py-1.5 font-semibold text-mint">
            <Airplane size={14} weight="fill" /> Trip: Kyoto Autumn
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-border bg-bg/50 p-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-ai text-white font-extrabold">
              Kai
            </div>
            <div>
              <p className="font-display text-sm font-extrabold">Kai Profile & Memories</p>
              <p className="text-[11px] text-muted">AI Companion · Real-Time Memory</p>
            </div>
          </div>
          <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-[10px] font-bold text-mint uppercase">
            Active
          </span>
        </div>

        <div className="mt-3 space-y-2.5 text-xs">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-ai/10 text-indigo-ai font-bold">
              1
            </span>
            <div>
              <p className="font-bold text-foreground">Personal Fact</p>
              <p className="text-muted">Lives in Tokyo, loves taking evening walks through Kichijoji.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber font-bold">
              2
            </span>
            <div>
              <p className="font-bold text-foreground">User Preference</p>
              <p className="text-muted">Prefers tonkotsu ramen and practices N5/N4 Japanese dialogue.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint font-bold">
              3
            </span>
            <div>
              <p className="font-bold text-foreground">Upcoming Travel</p>
              <p className="text-muted">Planning a 2-week trip to Kyoto & Osaka this autumn.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function LookupPreview() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/10 px-3 py-1 text-xs font-extrabold text-sky">
          <MagnifyingGlass size={16} weight="bold" /> Instant JMDict + Gemini Lookup
        </span>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-snug">
          Understand any word without breaking your flow
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Tap any word in the chat or drag-select full sentences. KaiwaAI displays pitch accent charts, Furigana readings, English definitions, part-of-speech tags, and character breakdowns instantly.
        </p>
        <ul className="mt-4 space-y-2 text-xs text-muted">
          <li className="flex items-center gap-2 font-semibold">
            <Check size={16} weight="bold" className="text-mint shrink-0" />
            Furigana annotations & Romaji transliteration
          </li>
          <li className="flex items-center gap-2 font-semibold">
            <Check size={16} weight="bold" className="text-mint shrink-0" />
            One-tap &ldquo;+ Add to Deck&rdquo; flashcard saving
          </li>
          <li className="flex items-center gap-2 font-semibold">
            <Check size={16} weight="bold" className="text-mint shrink-0" />
            Character-by-character Kanji breakdown cards
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border-2 border-border bg-bg/50 p-4 shadow-inner">
        <div className="rounded-2xl border-2 border-indigo-ai/40 bg-card p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-indigo-ai uppercase">
                NOUN · JLPT N5
              </span>
              <h4 className="mt-1.5 font-jp text-3xl font-extrabold text-foreground">
                映画館 <span className="text-base text-indigo-ai font-normal">えいがかん</span>
              </h4>
              <p className="mt-0.5 text-xs text-muted">eigakan · Pitch: [3] [0]</p>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai">
              <SpeakerHigh size={18} weight="fill" />
            </button>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-xs">
            <p className="font-extrabold text-foreground text-sm">1. Movie theater; cinema</p>
            <p className="mt-2 font-jp text-muted text-xs leading-relaxed">
              「週末に<span className="font-bold text-indigo-ai underline decoration-indigo-ai/40">映画館</span>へ行きました。」
            </p>
            <p className="mt-0.5 text-[11px] text-muted/80">&ldquo;I went to the movie theater on the weekend.&rdquo;</p>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[11px] font-bold text-mint flex items-center gap-1">
                <Check size={14} weight="bold" /> Saved in Review Deck
              </span>
              <span className="rounded-full bg-indigo-ai px-3 py-1 text-[11px] font-bold text-white">
                + Saved
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestsPreview() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-xs font-extrabold text-amber">
          <Compass size={16} weight="bold" /> Roleplay Diversity Engine
        </span>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-snug">
          Practice Japanese in realistic daily scenarios
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Need practical conversation skills? Launch interactive roleplay quests like ordering coffee, buying transit passes, or asking for directions at a matsuri festival.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-card border border-border px-3.5 py-1.5 font-bold shadow-sm">
            ☕ Kissaten Order
          </span>
          <span className="rounded-full bg-card border border-border px-3.5 py-1.5 font-bold shadow-sm">
            🚆 Tokyo Metro
          </span>
          <span className="rounded-full bg-card border border-border px-3.5 py-1.5 font-bold shadow-sm">
            🏮 Matsuri Festival
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-amber/30 bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber/10 text-amber text-lg font-bold">
              ☕
            </div>
            <div>
              <p className="font-display text-sm font-extrabold">Quest: Coffee Shop Order</p>
              <p className="text-[11px] text-muted font-jp">喫茶店で注文する</p>
            </div>
          </div>
          <span className="rounded-full bg-amber/20 px-2.5 py-0.5 text-[10px] font-bold text-amber uppercase tracking-wide">
            Active Quest
          </span>
        </div>

        <div className="mt-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5 rounded-xl bg-mint/10 p-3 text-mint font-bold border border-mint/20">
            <Check size={16} weight="bold" />
            <span>Order an iced matcha latte in Japanese</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-amber/10 p-3 text-amber font-bold border border-amber/20">
            <span className="h-2 w-2 rounded-full bg-amber animate-ping" />
            <span>Ask for oat milk substitution</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-bg/50 p-3 text-muted border border-border">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span>Pay with Suica IC card</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanjiPreview() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1 text-xs font-extrabold text-mint">
          <BookBookmark size={16} weight="fill" /> Unified Study & Kanji Deck
        </span>
        <h3 className="mt-3 font-display text-2xl font-extrabold leading-snug">
          Kanji characters automatically extracted from your vocabulary
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          No need to buy separate Kanji decks. Every vocabulary word you save automatically breaks down into individual Kanji study cards tagged with JLPT levels, stroke counts, and mastery progress.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="rounded-2xl border-2 border-border bg-card p-5 text-center shadow-lg transition-all"
        >
          <span className="font-jp text-5xl font-extrabold text-indigo-ai">日</span>
          <p className="mt-2 font-extrabold text-xs">Day; Sun</p>
          <p className="text-[11px] text-muted font-jp">ニチ, ジツ · ひ, か</p>
          <div className="mt-3 flex justify-center gap-1.5 text-[10px]">
            <span className="rounded-full bg-indigo-ai/10 px-2.5 py-0.5 font-bold text-indigo-ai">JLPT N5</span>
            <span className="rounded-full bg-border px-2.5 py-0.5 font-bold text-muted">4 strokes</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="rounded-2xl border-2 border-border bg-card p-5 text-center shadow-lg transition-all"
        >
          <span className="font-jp text-5xl font-extrabold text-indigo-ai">本</span>
          <p className="mt-2 font-extrabold text-xs">Book; Origin</p>
          <p className="text-[11px] text-muted font-jp">ホン · もと</p>
          <div className="mt-3 flex justify-center gap-1.5 text-[10px]">
            <span className="rounded-full bg-indigo-ai/10 px-2.5 py-0.5 font-bold text-indigo-ai">JLPT N5</span>
            <span className="rounded-full bg-border px-2.5 py-0.5 font-bold text-muted">5 strokes</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
