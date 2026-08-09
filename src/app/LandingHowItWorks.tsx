"use client";

import { motion } from "framer-motion";
import { ChatCircleText, Cards, ArrowClockwise, Sparkle } from "@phosphor-icons/react";

const STEPS = [
  {
    step: "01",
    title: "Chat Naturally",
    subtitle: "Conversation at your level",
    description:
      "Text Kai in Japanese at your own pace. She adapts her vocabulary to your level (N5 to N1) and remembers personal details about your life.",
    icon: ChatCircleText,
    accent: "border-indigo-ai/30 text-indigo-ai bg-indigo-ai/10",
  },
  {
    step: "02",
    title: "Tap & Collect",
    subtitle: "Instant lookups & Furigana",
    description:
      "Tap any unfamiliar word to reveal instant definitions, Furigana annotations, and pitch accent. One tap saves it directly to your review deck.",
    icon: Cards,
    accent: "border-sky/30 text-sky bg-sky/10",
  },
  {
    step: "03",
    title: "Review & Retain",
    subtitle: "Smart SRS Spaced Repetition",
    description:
      "Spaced repetition algorithms schedule flashcard reviews right before memory decay occurs. Master words and auto-generated Kanji cards effortlessly.",
    icon: ArrowClockwise,
    accent: "border-mint/30 text-mint bg-mint/10",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 sm:px-10">
      <div className="text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md"
        >
          <Sparkle size={14} weight="fill" /> Simple 3-Step Routine
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          How KaiwaAI turns conversations into fluency
        </motion.h2>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              whileHover={{ y: -6 }}
              className="relative flex flex-col justify-between rounded-3xl border-2 border-border bg-card p-7 shadow-lg transition-all duration-300 hover:border-indigo-ai/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.accent}`}
                  >
                    <Icon size={26} weight="duotone" />
                  </div>
                  <span className="font-display text-2xl font-extrabold text-muted/30">
                    {item.step}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-extrabold">
                  {item.title}
                </h3>
                <p className="text-xs font-bold text-indigo-ai mt-0.5">
                  {item.subtitle}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
