"use client";

import { motion } from "framer-motion";
import { BookOpen, Sparkle, CheckCircle } from "@phosphor-icons/react";

export default function LandingVocabBuilder() {
  return (
    <section className="relative z-10 border-t border-border/45 bg-white px-4 py-24 sm:px-7 sm:py-32 lg:py-40">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 2xl:gap-20">
          {/* Left side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center lg:justify-start"
          >
            <div className="relative">
              {/* Background glow */}
              <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-indigo-ai/20 via-sakura/10 to-transparent blur-3xl" />
              
              {/* Flashcards */}
              <div className="relative flex items-center gap-4 sm:gap-6 2xl:gap-8">
                {/* Card 1 - Kanji */}
                <motion.div
                  initial={{ rotate: -8, y: 20 }}
                  whileInView={{ rotate: -6, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-48 sm:w-56 lg:w-64 2xl:w-72 rounded-2xl border-2 border-indigo-ai/20 bg-white p-6 sm:p-7 lg:p-8 2xl:p-10 shadow-xl"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-ai sm:text-sm">
                    JLPT N5 KANJI
                  </p>
                  <p className="mt-4 font-jp text-6xl font-bold text-indigo-ai sm:text-7xl lg:text-8xl 2xl:text-9xl">
                    語
                  </p>
                  <p className="mt-4 text-base font-bold text-foreground sm:text-lg lg:text-xl 2xl:text-2xl">
                    Language, Word
                  </p>
                  <p className="mt-1 font-jp text-sm text-muted sm:text-base lg:text-lg">
                    ご · こと · ば
                  </p>
                </motion.div>

                {/* Card 2 - Vocab */}
                <motion.div
                  initial={{ rotate: 8, y: -20 }}
                  whileInView={{ rotate: 6, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-48 sm:w-56 lg:w-64 2xl:w-72 rounded-2xl border-2 border-mint/20 bg-white p-6 sm:p-7 lg:p-8 2xl:p-10 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-white sm:h-7 sm:w-7 2xl:h-8 2xl:w-8">
                      <CheckCircle size={16} weight="bold" className="sm:w-5 sm:h-5" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider text-mint sm:text-sm">
                      KNOWN
                    </p>
                  </div>
                  <p className="mt-4 font-jp text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl 2xl:text-7xl">
                    日本語
                  </p>
                  <p className="mt-1 font-jp text-sm text-muted sm:text-base lg:text-lg">
                    にほんご
                  </p>
                  <p className="mt-3 text-base font-semibold text-foreground sm:text-lg lg:text-xl 2xl:text-2xl">
                    Japanese language
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-mint sm:text-sm 2xl:px-5 2xl:py-2.5">
              <BookOpen size={16} weight="fill" className="2xl:w-5 2xl:h-5" />
              Unified Study Deck
            </div>

            <h2 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl 2xl:text-7xl 2xl:mt-6">
              Your vocabulary builds itself as you chat
            </h2>

            <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg lg:text-xl 2xl:text-2xl 2xl:mt-6">
              Every word you save in conversation is automatically organized into your Study Hub. Individual Kanji characters are extracted into character cards tagged with stroke counts, readings, and JLPT levels.
            </p>

            <div className="mt-8 space-y-4 2xl:mt-10 2xl:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint sm:h-11 sm:w-11 2xl:h-12 2xl:w-12">
                  <Sparkle size={20} weight="fill" className="2xl:w-6 2xl:h-6" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-foreground sm:text-lg lg:text-xl 2xl:text-2xl">
                    Adaptive SuperMemo-2 Spaced Repetition (SRS)
                  </p>
                  <p className="mt-1 text-sm text-muted sm:text-base lg:text-lg 2xl:text-xl">
                    Smart scheduling optimizes review timing for maximum retention
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai sm:h-11 sm:w-11 2xl:h-12 2xl:w-12">
                  <BookOpen size={20} weight="fill" className="2xl:w-6 2xl:h-6" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-foreground sm:text-lg lg:text-xl 2xl:text-2xl">
                    Automatic JLPT N5–N1 Kanji decomposition
                  </p>
                  <p className="mt-1 text-sm text-muted sm:text-base lg:text-lg 2xl:text-xl">
                    Every character is automatically tagged and categorized by level
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
