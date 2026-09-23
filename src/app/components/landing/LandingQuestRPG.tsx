"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

type QuestTheme = "food" | "travel" | "directions" | "shopping" | "emergency" | "surprise";

type ScenarioQuest = {
  theme: QuestTheme;
  emoji: string;
  title: string;
  jpTitle: string;
  level: string;
  scene: string;
  objectives: string[];
};

const QUEST_THEMES: { id: QuestTheme; label: string; emoji: string }[] = [
  { id: "food", label: "Food & Drink", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "🏨" },
  { id: "directions", label: "Directions", emoji: "🗺️" },
  { id: "shopping", label: "Shopping", emoji: "🛒" },
  { id: "emergency", label: "Emergencies", emoji: "🏥" },
  { id: "surprise", label: "Surprise Me", emoji: "🎌" },
];

const PRESET_QUESTS: Record<QuestTheme, ScenarioQuest[]> = {
  food: [
    {
      theme: "food",
      emoji: "🍜",
      title: "Ordering Ramen at a Local Shop",
      jpTitle: "ラーメン屋で注文する",
      level: "N5",
      scene: "You sit down at a cozy ramen counter in Shibuya. The master turns to you with a warm smile: 「いらっしゃい！何にする？」",
      objectives: [
        "Greet the shop owner in natural Japanese",
        "Order tonkotsu ramen with extra chashu",
        "Ask where the water glasses are kept",
      ],
    },
    {
      theme: "food",
      emoji: "☕",
      title: "Ordering at a Kissaten Cafe",
      jpTitle: "喫茶店でコーヒーを頼む",
      level: "N5",
      scene: "You step into a classic vintage cafe in Jimbocho. Jazz plays softly as the barista hands you a wooden menu.",
      objectives: [
        "Order an iced matcha latte politely",
        "Ask for oat milk substitution (オーツミルク)",
        "Inquire if WiFi is available",
      ],
    },
  ],
  travel: [
    {
      theme: "travel",
      emoji: "🏨",
      title: "Ryokan Hotel Check-In",
      jpTitle: "旅館でチェックインする",
      level: "N4",
      scene: "You arrive at a hot spring ryokan in Hakone after a scenic train ride. The host welcomes you at the front desk.",
      objectives: [
        "State your reservation name and party size",
        "Ask what time dinner and breakfast are served",
        "Inquire about onsen bath hours",
      ],
    },
  ],
  directions: [
    {
      theme: "directions",
      emoji: "🗺️",
      title: "Finding the Right Train Line",
      jpTitle: "駅で乗り換えを聞く",
      level: "N5",
      scene: "You are at Shinjuku Station trying to transfer to the Yamanote Line. A station attendant stands by the turnstile.",
      objectives: [
        "Excuse yourself politely (すみません)",
        "Ask how to get to the JR Yamanote platform",
        "Thank them for the directions (ありがとうございます)",
      ],
    },
  ],
  shopping: [
    {
      theme: "shopping",
      emoji: "🛒",
      title: "Buying a Gift in Akihabara",
      jpTitle: "秋葉原でお土産を買う",
      level: "N4",
      scene: "You find a rare retro gaming collectible in an Akihabara hobby shop, but you want to inspect its condition.",
      objectives: [
        "Ask the clerk to see the item in the showcase",
        "Ask if tax-free shopping is available",
        "Pay using your IC transport card",
      ],
    },
  ],
  emergency: [
    {
      theme: "emergency",
      emoji: "🏥",
      title: "Visiting a Pharmacy for a Cold",
      jpTitle: "薬局で風邪薬を買う",
      level: "N4",
      scene: "You caught a sore throat while traveling. You walk into a Matsumoto Kiyoshi pharmacy to ask the pharmacist for advice.",
      objectives: [
        "Explain your symptoms: sore throat and fever",
        "Ask which medicine is most effective",
        "Inquire how many times per day to take it",
      ],
    },
  ],
  surprise: [
    {
      theme: "surprise",
      emoji: "🏮",
      title: "Matsuri Summer Festival Stalls",
      jpTitle: "夏祭りの屋台で楽しむ",
      level: "N3",
      scene: "Taiko drums echo across the shrine grounds. The aroma of sizzling yakisoba and takoyaki fills the evening air.",
      objectives: [
        "Order two servings of freshly cooked yakisoba",
        "Ask if pickled ginger (紅しょうが) is included",
        "Compliment the festival atmosphere",
      ],
    },
  ],
};

export default function LandingQuestRPG() {
  const [selectedTheme, setSelectedTheme] = useState<QuestTheme>("food");
  const [customInput, setCustomInput] = useState("");
  const [customQuest, setCustomQuest] = useState<ScenarioQuest | null>(null);
  const [generating, setGenerating] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const currentThemeQuests = PRESET_QUESTS[selectedTheme] ?? PRESET_QUESTS.food;
  const quest = customQuest || currentThemeQuests[variantIndex % currentThemeQuests.length];

  const handleThemeClick = (theme: QuestTheme) => {
    setSelectedTheme(theme);
    setCustomQuest(null);
    setCustomInput("");
    setGenerating(true);
    setTimeout(() => setGenerating(false), 220);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setGenerating(true);
    setTimeout(() => {
      setCustomQuest({
        theme: "surprise",
        emoji: "✨",
        title: customInput.trim(),
        jpTitle: "オリジナル・ロールプレイ",
        level: "N4",
        scene: `Custom scenario generated: "${customInput.trim()}". Kai steps into character and begins the conversation naturally in Japanese.`,
        objectives: [
          "Initiate the scenario with a polite Japanese greeting",
          "Respond to the situation using appropriate vocabulary",
          "Complete the scenario goal naturally",
        ],
      });
      setGenerating(false);
    }, 300);
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setVariantIndex((prev) => prev + 1);
    setCustomQuest(null);
    setTimeout(() => setGenerating(false), 200);
  };

  return (
    <section className="relative z-10 border-t-2 border-b-2 border-border bg-card/40 py-20 sm:py-24 backdrop-blur-md overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/3 h-72 w-72 rounded-full bg-indigo-ai/8 blur-3xl" />

      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        {/* Section title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md">
            <Sparkle size={14} weight="fill" /> In-App Roleplay Engine
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Live Scenario Quests
          </h2>
          <p className="mt-3 text-sm text-muted">
            Practice Japanese in authentic scenarios calibrated to your JLPT level. Exactly like the Quest Maker in the app.
          </p>
        </div>

        {/* Quest Launcher Frame — replicates /chat QuestLauncher */}
        <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="font-display text-base font-extrabold flex items-center gap-2">
                <span>🎭</span> Roleplay Quests
              </h3>
              <p className="text-xs text-muted">AI-generated scenarios, tailored to your level</p>
            </div>
            <span className="rounded-full bg-indigo-ai/10 px-2.5 py-1 text-[11px] font-bold text-indigo-ai">
              Interactive Preview
            </span>
          </div>

          {/* Theme Chips */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {QUEST_THEMES.map((t) => {
              const isActive = selectedTheme === t.id && !customQuest;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeClick(t.id)}
                  disabled={generating}
                  className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                    isActive
                      ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                      : "border-border bg-card text-muted hover:border-indigo-ai/50 hover:text-foreground"
                  }`}
                >
                  <span className="mr-1">{t.emoji}</span> {t.label}
                </button>
              );
            })}
          </div>

          {/* Custom Scenario Prompt Form */}
          <form onSubmit={handleCustomSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Or describe your own custom roleplay idea..."
              disabled={generating}
              className="flex-1 rounded-full border-2 border-border bg-bg/60 px-4 py-2 text-xs outline-none placeholder:text-muted/60 focus:border-indigo-ai transition-all text-foreground"
            />
            <button
              type="submit"
              disabled={generating || !customInput.trim()}
              className="rounded-full bg-indigo-ai px-4 py-2 text-xs font-bold text-white transition-all hover:bg-indigo-ai/90 disabled:opacity-40 disabled:hover:bg-indigo-ai cursor-pointer shrink-0"
            >
              Generate
            </button>
          </form>

          {/* Shimmer skeleton while generating */}
          {generating && (
            <div className="mt-5 animate-pulse rounded-3xl border-2 border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="h-12 w-12 shrink-0 rounded-2xl bg-border/50" />
                <div className="flex-1 space-y-2.5">
                  <span className="block h-4 w-2/3 rounded-full bg-border/50" />
                  <span className="block h-3 w-1/3 rounded-full bg-border/40" />
                  <span className="block h-3 w-full rounded-full bg-border/30" />
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted/60">
                ✨ Kai is crafting your quest…
              </p>
            </div>
          )}

          {/* Generated quest card */}
          {!generating && quest && (
            <AnimatePresence mode="wait">
              <motion.div
                key={quest.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-5 rounded-3xl border-2 border-indigo-ai/20 bg-gradient-to-br from-indigo-ai/5 to-sakura/5 p-5 sm:p-6 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/10 text-2xl">
                    {quest.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-extrabold text-foreground text-base sm:text-lg truncate">
                      {quest.title}
                    </h4>
                    <p className="font-jp text-sm text-indigo-ai/80 font-bold">{quest.jpTitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-ai">
                    {quest.level}
                  </span>
                </div>

                {/* Scene description */}
                <p className="mt-3 text-sm leading-relaxed text-muted">{quest.scene}</p>

                {/* Objectives preview */}
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted/70 block">
                    QUEST OBJECTIVES
                  </span>
                  {quest.objectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border/60 text-[10px] font-bold text-muted">
                        {i + 1}
                      </span>
                      <p className="text-xs text-muted leading-relaxed">{obj}</p>
                    </div>
                  ))}
                </div>

                {/* Actions footer */}
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-indigo-ai/10 pt-4">
                  <button
                    onClick={handleRegenerate}
                    className="text-xs font-bold text-muted hover:text-indigo-ai transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    🔄 Regenerate
                  </button>
                  <Link
                    href="/chat"
                    className="btn-pop flex items-center gap-1.5 rounded-full bg-indigo-ai px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-ai/90"
                  >
                    <span>Start Quest in Chat</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
