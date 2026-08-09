"use client";

import { motion } from "framer-motion";
import {
  Brain,
  MagnifyingGlass,
  Compass,
  BookBookmark,
  Lightning,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";

type FeatureItem = {
  id: string;
  icon: typeof Brain;
  jpTag: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  gradient: string;
  borderColor: string;
  iconColor: string;
};

const FEATURES: FeatureItem[] = [
  {
    id: "memory",
    icon: Brain,
    jpTag: "記憶",
    title: "In-Chat Persona Memory",
    subtitle: "Kai remembers your life & goals",
    description:
      "As you converse naturally in Japanese, Kai automatically remembers your hobbies, favorite foods, learning goals, and relationships — accessing them seamlessly during future chats.",
    badge: "Auto Memory Engine",
    gradient: "from-indigo-500/10 via-purple-500/5 to-transparent",
    borderColor: "hover:border-indigo-ai/40 border-border",
    iconColor: "text-indigo-ai bg-indigo-ai/10",
  },
  {
    id: "lookup",
    icon: MagnifyingGlass,
    jpTag: "辞書",
    title: "Tap-to-Lookup & AI Breakdown",
    subtitle: "Instant Furigana, Romaji & POS",
    description:
      "Tap any token or drag-select full sentences to reveal definitions, Furigana annotations, pitch accent, Romaji, and character-by-character Kanji breakdowns without breaking flow.",
    badge: "JMDict + Gemini AI",
    gradient: "from-sky-500/10 via-blue-500/5 to-transparent",
    borderColor: "hover:border-sky/40 border-border",
    iconColor: "text-sky bg-sky/10",
  },
  {
    id: "quests",
    icon: Compass,
    jpTag: "クエスト",
    title: "Roleplay Quests & Diversity",
    subtitle: "Real-world Japanese scenarios",
    description:
      "Step into immersive mini-quests: order coffee at a kissaten, buy tickets at Shibuya station, or check in at a clinic. Non-repeating scenario generators keep practice fresh.",
    badge: "Guided Quests",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    borderColor: "hover:border-amber/40 border-border",
    iconColor: "text-amber bg-amber/10",
  },
  {
    id: "kanji",
    icon: BookBookmark,
    jpTag: "漢字",
    title: "Auto-Extracted Kanji Deck",
    subtitle: "JLPT N5–N1 Character Cards",
    description:
      "Kanji from your saved vocabulary words automatically generate individual Kanji study cards complete with stroke counts, Onyomi/Kunyomi readings, and JLPT level tags.",
    badge: "Study Hub",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    borderColor: "hover:border-mint/40 border-border",
    iconColor: "text-mint bg-mint/10",
  },
  {
    id: "srs",
    icon: Lightning,
    jpTag: "復習",
    title: "Spaced Repetition Review (SRS)",
    subtitle: "Retain vocabulary effortlessly",
    description:
      "Words you tap during conversation quietly enter your review queue. The SuperMemo-2 algorithm schedules reviews right before memory decay occurs. Works offline too!",
    badge: "Adaptive Memory",
    gradient: "from-pink-500/10 via-rose-500/5 to-transparent",
    borderColor: "hover:border-sakura/40 border-border",
    iconColor: "text-sakura bg-sakura/10",
  },
  {
    id: "focus",
    icon: ShieldCheck,
    jpTag: "習慣",
    title: "Focus Guard App Blocker",
    subtitle: "Lock distractions until targets are met",
    description:
      "Set daily review and chat targets. Focus Guard temporarily restricts distracting apps (social media, games) until you complete your daily Japanese learning goals.",
    badge: "Android App Blocker",
    gradient: "from-violet-500/10 via-indigo-500/5 to-transparent",
    borderColor: "hover:border-indigo-ai/40 border-border",
    iconColor: "text-indigo-ai bg-indigo-ai/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function LandingFeatureGrid() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md"
        >
          <Sparkle size={14} weight="fill" /> Built for fluency, not just drills
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          Everything you need to master Japanese natively
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-3 text-base text-muted"
        >
          From natural AI conversations to automatic Kanji decks and Focus Guard, KaiwaAI combines a friendly companion with a full study ecosystem.
        </motion.p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`group relative flex flex-col justify-between rounded-3xl border-2 bg-card p-6 shadow-md transition-all duration-300 ${item.borderColor}`}
            >
              {/* Subtle ambient gradient overlay */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${item.gradient} opacity-50 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${item.iconColor}`}
                  >
                    <Icon size={26} weight="duotone" />
                  </div>
                  <span className="font-jp text-xs font-extrabold tracking-widest text-muted/60">
                    {item.jpTag}
                  </span>
                </div>

                <div className="mt-5">
                  {item.badge && (
                    <span className="inline-block rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-indigo-ai uppercase">
                      {item.badge}
                    </span>
                  )}
                  <h3 className="mt-2 font-display text-lg font-extrabold leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-muted">
                    {item.subtitle}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-muted/90">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
