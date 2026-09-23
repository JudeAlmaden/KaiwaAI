"use client";

import { motion } from "framer-motion";

const LEARNING_STEPS = [
  {
    number: "01",
    title: "Natural Immersion",
    description:
      "Chat via text naturally. Kai never breaks character into English. You can ask specifically for an explanation, but it still feels like chatting with a Japanese friend on LINE.",
    link: "Persona-consistent AI →",
    accent: "text-indigo-ai",
    badge: "bg-indigo-ai/8 text-indigo-ai ring-indigo-ai/10",
  },
  {
    number: "02",
    title: "One-Tap Comprehension",
    description:
      "Never break your conversation flow to check a dictionary app. Tap any kanji, compound word, or grammar particle to instantly reveal furigana and mean",
    link: "Zero external app switching →",
    accent: "text-sakura",
    badge: "bg-sakura/8 text-sakura ring-sakura/10",
  },
  {

    number: "03",
    title: "SRS Flashcards & Focus Guard",
    description: "Turn words you discover into flashcards and review them as they become due. Focus Guard then puts those reviews before your distracting apps, helping you stay consistent without breaking your learning flow.",
    link: "App-Locked Flashcard Reviews →",
    accent: "text-mint",
    badge: "bg-mint/10 text-mint ring-mint/15",
  },
] as const;

export default function LandingFeatureGrid() {
  return (
    <section className="relative z-10 border-t border-border/45 bg-[#fffaf8] px-4 py-24 sm:px-7 sm:py-32 lg:py-40">
      <div className="mx-auto w-full max-w-[1500px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-indigo-ai sm:text-sm">
            Language acquisition, refined
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl 2xl:text-7xl">
            How You Learn With Kai
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg lg:text-xl 2xl:text-2xl">
            You didn&apos;t learn your first language with grammar tables. You learned it by chatting with someone who cared.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7 lg:mt-20 lg:gap-8 2xl:mt-24">
          {LEARNING_STEPS.map((step, index) => (
            <motion.article
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="group flex min-h-[280px] flex-col rounded-[1.9rem] border border-white/90 bg-white p-7 shadow-[0_14px_35px_rgba(72,52,96,0.055)] transition-shadow duration-200 hover:shadow-[0_18px_42px_rgba(72,52,96,0.1)] sm:p-8 lg:min-h-[320px] lg:p-9 2xl:min-h-[360px] 2xl:p-10"
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-base font-extrabold ring-1 2xl:h-14 2xl:w-14 2xl:text-lg ${step.badge}`}
              >
                {step.number}
              </span>

              <h3 className="mt-7 font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground lg:text-[1.65rem] 2xl:text-3xl">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-[1.6] text-muted lg:text-lg 2xl:text-xl">
                {step.description}
              </p>

              <div className="mt-auto border-t border-border/70 pt-5">
                <span className={`text-sm font-bold transition-transform duration-200 group-hover:translate-x-0.5 lg:text-base 2xl:text-lg ${step.accent}`}>
                  {step.link}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
