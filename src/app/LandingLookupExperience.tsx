"use client";

import { motion } from "framer-motion";
import { MagnifyingGlass, SpeakerHigh, BookBookmark, Check } from "@phosphor-icons/react";

export default function LandingLookupExperience() {
  return (
    <section className="relative z-10 border-t-2 border-b-2 border-border bg-card/40 py-24 backdrop-blur-md overflow-hidden">
      {/* Ambient glowing radial lights */}
      <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-indigo-ai/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-sky/15 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-sky/30 bg-sky/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sky backdrop-blur-md"
          >
            <MagnifyingGlass size={14} weight="bold" /> Augmented Text Lookup
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            Never stop to look up a word
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-3 text-base text-muted"
          >
            Tap any token or drag-select any phrase in a message. KaiwaAI extracts instant JMDict & Gemini definitions, pitch accent charts, and character breakdowns right in place.
          </motion.p>
        </div>

        {/* Augmented Typography Canvas */}
        <div className="relative mt-16 mx-auto max-w-4xl rounded-3xl border-2 border-border bg-bg/80 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
          {/* Main Giant Sentence Typography */}
          <div className="text-center my-6">
            <span className="text-xs font-bold text-muted/60 uppercase tracking-widest block mb-4">
              INTERACTIVE SAMPLE SENTENCE
            </span>
            <div className="inline-flex flex-wrap items-center justify-center gap-3 font-jp text-4xl sm:text-6xl font-extrabold leading-relaxed">
              <span>週末に</span>
              
              {/* Highlighted Word Token */}
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="relative rounded-2xl bg-indigo-ai/15 px-4 py-1 text-indigo-ai border-2 border-indigo-ai/40 cursor-pointer shadow-lg shadow-indigo-ai/10"
              >
                映画館
                {/* Floating Furigana Pill */}
                <motion.span
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-indigo-ai px-3 py-0.5 font-jp text-xs font-bold text-white shadow-md"
                >
                  えいがかん
                </motion.span>
              </motion.span>

              <span>へ行きました。</span>
            </div>
          </div>

          {/* Floating Augmented AR Badges around the Sentence */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Badge 1: Pitch Accent & Audio */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky uppercase tracking-wider">
                  Pitch Accent
                </span>
                <SpeakerHigh size={18} weight="fill" className="text-sky" />
              </div>
              <p className="mt-2 font-display text-base font-extrabold">Pitch Pattern [3][0]</p>
              <p className="text-xs text-muted mt-1">
                Flat / Heiban pattern · standard Tokyo dialect audio available.
              </p>
            </motion.div>

            {/* Badge 2: Meaning & POS */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-ai uppercase tracking-wider">
                  Dictionary Entry
                </span>
                <BookBookmark size={18} weight="fill" className="text-indigo-ai" />
              </div>
              <p className="mt-2 font-display text-base font-extrabold">Movie theater; cinema</p>
              <p className="text-xs text-muted mt-1">
                Noun · JLPT N5 vocabulary word.
              </p>
            </motion.div>

            {/* Badge 3: Kanji Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-mint uppercase tracking-wider">
                  Kanji Breakdown
                </span>
                <Check size={18} weight="bold" className="text-mint" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 font-jp text-xs sm:text-sm font-bold">
                <span className="rounded-lg bg-indigo-ai/10 px-2 py-0.5 text-indigo-ai">映 (Reflect)</span>
                <span>+</span>
                <span className="rounded-lg bg-indigo-ai/10 px-2 py-0.5 text-indigo-ai">画 (Picture)</span>
                <span>+</span>
                <span className="rounded-lg bg-indigo-ai/10 px-2 py-0.5 text-indigo-ai">館 (Hall)</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
