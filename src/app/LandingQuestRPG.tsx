"use client";

import { motion } from "framer-motion";
import { Compass, Target } from "@phosphor-icons/react";

export default function LandingQuestRPG() {
  return (
    <section className="relative z-10 border-t-2 border-b-2 border-border bg-card/40 py-24 backdrop-blur-md overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber backdrop-blur-md"
          >
            <Compass size={14} weight="bold" /> Roleplay Diversity Engine
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            Step into real-world Japanese scenarios
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-3 text-base text-muted"
          >
            Practice real conversation skills through dynamic mini-quests with live objective checkmarks and natural interaction twists.
          </motion.p>
        </div>

        {/* RPG Scenario Encounter Prompt Box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-14 mx-auto max-w-4xl rounded-3xl border-2 border-amber/40 bg-card p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber/15 blur-2xl" />

          {/* Location & Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber/10 text-amber font-bold text-2xl border border-amber/20">
                ☕
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber uppercase tracking-widest">
                  LOCATION: SHIBUYA, TOKYO
                </span>
                <h3 className="font-display text-xl font-extrabold">Quest: Ordering Coffee at a Kissaten</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-extrabold text-amber flex items-center gap-1.5">
                <Target size={14} weight="bold" /> Active Quest
              </span>
            </div>
          </div>

          {/* Scenario Dialogue Context */}
          <div className="mt-6 rounded-2xl bg-bg/60 p-5 border border-border">
            <p className="font-jp text-base leading-relaxed text-foreground font-semibold">
              店員：「いらっしゃいませ！ご注文はお決まりですか？」
            </p>
            <p className="mt-1 text-xs text-muted">
              Staff: &ldquo;Welcome! Are you ready to order?&rdquo;
            </p>
          </div>

          {/* Live Quest Objectives */}
          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              QUEST OBJECTIVES:
            </p>

            <motion.div
              whileHover={{ x: 4 }}
              className="flex items-center justify-between rounded-2xl border border-mint/30 bg-mint/10 p-4 text-xs font-bold text-mint"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-white font-extrabold">
                  ✓
                </div>
                <span>Order an iced matcha latte in Japanese</span>
              </div>
              <span className="font-mono text-[10px]">COMPLETED</span>
            </motion.div>

            <motion.div
              whileHover={{ x: 4 }}
              className="flex items-center justify-between rounded-2xl border border-amber/30 bg-amber/10 p-4 text-xs font-bold text-amber"
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-amber animate-ping ml-1.5" />
                <span>Ask for oat milk substitution (オーツミルク)</span>
              </div>
              <span className="font-mono text-[10px]">IN PROGRESS</span>
            </motion.div>

            <motion.div
              whileHover={{ x: 4 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-bg/40 p-4 text-xs text-muted"
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-border ml-1.5" />
                <span>Pay with Suica IC card</span>
              </div>
              <span className="font-mono text-[10px]">PENDING</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
