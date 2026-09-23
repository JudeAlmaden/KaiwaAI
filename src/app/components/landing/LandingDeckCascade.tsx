"use client";

import { motion } from "framer-motion";
import { BookBookmark, Lightning, CheckCircle } from "@phosphor-icons/react";

export default function LandingDeckCascade() {
  return (
    <section className="relative z-10 py-24 px-6 sm:px-10 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side — Layered Cascading Cards */}
        <div className="relative min-h-[380px] flex items-center justify-center">
          {/* Card 1 — Kanji Card */}
          <motion.div
            initial={{ rotate: -8, x: -20, opacity: 0 }}
            whileInView={{ rotate: -6, x: -10, opacity: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, rotate: -2, zIndex: 30 }}
            className="absolute top-4 left-4 w-64 rounded-3xl border-2 border-indigo-ai/30 bg-card p-6 shadow-2xl z-10 cursor-pointer"
          >
            <span className="rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-ai uppercase">
              JLPT N5 KANJI
            </span>
            <div className="mt-3 font-jp text-5xl font-extrabold text-indigo-ai text-center">
              語
            </div>
            <p className="mt-2 text-center text-xs font-extrabold">Language; Word</p>
            <p className="text-[10px] text-center text-muted font-jp">ゴ · かたる</p>
          </motion.div>

          {/* Card 2 — Main Vocab Card */}
          <motion.div
            initial={{ rotate: 4, x: 20, opacity: 0 }}
            whileInView={{ rotate: 3, x: 10, opacity: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05, rotate: 0, zIndex: 30 }}
            className="absolute top-12 right-4 w-64 rounded-3xl border-2 border-mint/40 bg-card p-6 shadow-2xl z-20 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-[10px] font-bold text-mint uppercase">
                KNOWN
              </span>
              <CheckCircle size={18} weight="fill" className="text-mint" />
            </div>
            <div className="mt-2">
              <p className="font-jp text-3xl font-extrabold">日本語</p>
              <p className="text-xs text-indigo-ai font-jp font-semibold">にほんご</p>
              <p className="mt-2 text-xs font-bold text-foreground">Japanese language</p>
            </div>
          </motion.div>
        </div>

        {/* Right Side — Copy & Explanations */}
        <div>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-mint backdrop-blur-md"
          >
            <BookBookmark size={14} weight="fill" /> Unified Study Deck
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            Your vocabulary builds itself as you chat
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-4 text-base text-muted leading-relaxed"
          >
            Every word you save in conversation is automatically organized into your Study Hub. Individual Kanji characters are extracted into character cards tagged with stroke counts, readings, and JLPT levels.
          </motion.p>

          <div className="mt-6 space-y-3 text-xs font-bold">
            <div className="flex items-center gap-3 text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/10 text-mint">
                <Lightning size={18} weight="fill" />
              </div>
              <span>Adaptive SuperMemo-2 Spaced Repetition (SRS)</span>
            </div>
            <div className="flex items-center gap-3 text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai">
                <BookBookmark size={18} weight="fill" />
              </div>
              <span>Automatic JLPT N5–N1 Kanji decomposition</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
