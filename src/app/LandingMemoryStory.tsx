"use client";

import { motion } from "framer-motion";
import { Brain, PushPin, ForkKnife, Airplane } from "@phosphor-icons/react";

export default function LandingMemoryStory() {
  return (
    <section className="relative z-10 py-24 px-6 sm:px-10 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side — Story & Chat Bubble */}
        <div>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md"
          >
            <Brain size={14} weight="fill" /> In-Chat Persona Memory
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            A friend who never forgets your stories
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-4 text-base text-muted leading-relaxed"
          >
            Mention your trip to Kyoto next autumn, your goal to pass JLPT N3, or your favorite ramen shop. Kai quietly logs these details in her **Persona Profile Drawer** and brings them back up in future conversations when you least expect it.
          </motion.p>

          {/* Sample Chat Message from Kai */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 rounded-3xl border-2 border-indigo-ai/30 bg-card p-6 shadow-xl relative"
          >
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-ai text-white font-extrabold">
                Kai
              </div>
              <div>
                <p className="font-display text-sm font-extrabold">Kai</p>
                <p className="text-[11px] text-muted font-jp">Kaiwa Companion</p>
              </div>
            </div>

            <p className="mt-4 font-jp text-lg leading-relaxed text-foreground">
              「そういえば、来月<span className="font-bold text-indigo-ai underline decoration-indigo-ai/40">京都</span>へ行くって言っていましたね！金閣寺へ行く予定はありますか？」
            </p>
            <p className="mt-2 text-xs text-muted">
              &ldquo;Speaking of which, you mentioned you&apos;re visiting Kyoto next month! Are you planning to visit Kinkaku-ji?&rdquo;
            </p>
          </motion.div>
        </div>

        {/* Right Side — Floating Memory Nodes & Drawer Representation */}
        <div className="relative">
          <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-ai/10 text-indigo-ai">
                  <Brain size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold">Kai&apos;s Memory Profile</h3>
                  <p className="text-xs text-muted">Auto-updated in real time</p>
                </div>
              </div>
              <span className="rounded-full bg-mint/15 px-3 py-1 text-xs font-bold text-mint">
                3 Active Memories
              </span>
            </div>

            {/* Memory Bubbles floating into drawer */}
            <div className="space-y-3 pt-2">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3 rounded-2xl border border-indigo-ai/20 bg-indigo-ai/5 p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai">
                  <Airplane size={18} weight="fill" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Upcoming Trip to Kyoto</span>
                  <span className="text-[11px] text-muted">
                    Extracted from chat: Planning a 2-week trip to Kyoto in October.
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber">
                  <ForkKnife size={18} weight="fill" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Food Preference</span>
                  <span className="text-[11px] text-muted">
                    Loves authentic tonkotsu ramen; prefers non-spicy dishes.
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-3 rounded-2xl border border-mint/20 bg-mint/5 p-4 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-mint/10 text-mint">
                  <PushPin size={18} weight="fill" />
                </div>
                <div>
                  <span className="font-bold text-xs text-foreground block">Learning Goal</span>
                  <span className="text-[11px] text-muted">
                    Targeting JLPT N3 vocabulary & conversational mastery.
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
