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

type NodeId = "memory" | "lookup" | "quests" | "kanji" | "focus";

type NodeConfig = {
  id: NodeId;
  label: string;
  jpTag: string;
  icon: typeof Brain;
  color: string;
  badgeBg: string;
  position: string; // Tailwind positioning relative to central screen
};

const NODES: NodeConfig[] = [
  {
    id: "memory",
    label: "In-Chat Memory",
    jpTag: "記憶",
    icon: Brain,
    color: "text-indigo-ai border-indigo-ai/40 bg-indigo-ai/10",
    badgeBg: "bg-indigo-ai",
    position: "top-0 left-0 lg:-left-12 lg:top-12",
  },
  {
    id: "lookup",
    label: "Tap-to-Lookup",
    jpTag: "辞書",
    icon: MagnifyingGlass,
    color: "text-sky border-sky/40 bg-sky/10",
    badgeBg: "bg-sky",
    position: "top-0 right-0 lg:-right-12 lg:top-12",
  },
  {
    id: "quests",
    label: "Roleplay Quests",
    jpTag: "クエスト",
    icon: Compass,
    color: "text-amber border-amber/40 bg-amber/10",
    badgeBg: "bg-amber",
    position: "bottom-12 left-0 lg:-left-16 lg:bottom-20",
  },
  {
    id: "kanji",
    label: "Kanji Collection",
    jpTag: "漢字",
    icon: BookBookmark,
    color: "text-mint border-mint/40 bg-mint/10",
    badgeBg: "bg-mint",
    position: "bottom-12 right-0 lg:-right-16 lg:bottom-20",
  },
];

export default function LandingInteractiveCanvas() {
  const [activeNode, setActiveNode] = useState<NodeId>("memory");
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (userInteracted) return;
    const ids: NodeId[] = ["memory", "lookup", "quests", "kanji"];
    const interval = setInterval(() => {
      setActiveNode((prev) => {
        const idx = ids.indexOf(prev);
        return ids[(idx + 1) % ids.length];
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [userInteracted]);

  const selectNode = (id: NodeId) => {
    setUserInteracted(true);
    setActiveNode(id);
  };

  return (
    <section className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto w-full">
      <div className="text-center max-w-3xl mx-auto">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md"
        >
          <Sparkle size={14} weight="fill" /> Interactive Live Canvas
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
        >
          An AI companion that learns with you
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-3 text-base text-muted"
        >
          Click any orbiting feature node to see how KaiwaAI transforms natural conversation into fluency.
        </motion.p>
      </div>

      {/* Main Orbital Canvas Container */}
      <div className="relative mt-10 sm:mt-16 mx-auto max-w-4xl flex flex-col items-center justify-center lg:block lg:min-h-[520px]">
        {/* Orbital Nodes (Floating around central UI on lg; 2x2 grid on mobile/tablet) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 lg:mb-0 lg:block">
          {NODES.map((node) => {
            const Icon = node.icon;
            const active = activeNode === node.id;
            return (
              <motion.button
                key={node.id}
                onClick={() => selectNode(node.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 shadow-md backdrop-blur-xl transition-all duration-300 ${
                  active
                    ? "ring-2 ring-indigo-ai/50 shadow-indigo-ai/20 border-indigo-ai bg-card"
                    : "border-border/60 bg-card/80 text-muted hover:border-indigo-ai/30"
                } lg:absolute z-20 ${node.position}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${node.color}`}>
                  <Icon size={20} weight={active ? "fill" : "regular"} />
                </div>
                <div className="text-left min-w-0">
                  <span className="block truncate font-display text-xs font-extrabold text-foreground">
                    {node.label}
                  </span>
                  <span className="block font-jp text-[10px] font-bold text-muted">
                    {node.jpTag}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Central Display Screen */}
        <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border-2 border-border bg-card shadow-2xl shadow-indigo-ai/10 backdrop-blur-2xl lg:mx-auto">
          {/* Top Screen Bar */}
          <div className="flex items-center justify-between border-b border-border bg-bg/60 px-4 sm:px-5 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 shrink-0 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500/80" />
              <span className="ml-1 truncate font-display text-xs font-extrabold text-muted">
                KaiwaAI Studio
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-ai/10 px-2.5 py-1 font-mono text-[10px] font-bold text-indigo-ai">
              LIVE DEMO
            </span>
          </div>

          {/* Screen Content View */}
          <div className="p-4 sm:p-8 min-h-[340px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNode}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {activeNode === "memory" && <CanvasMemoryView />}
                {activeNode === "lookup" && <CanvasLookupView />}
                {activeNode === "quests" && <CanvasQuestsView />}
                {activeNode === "kanji" && <CanvasKanjiView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function CanvasMemoryView() {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai text-white font-extrabold">
            Kai
          </div>
          <div className="min-w-0">
            <h4 className="font-display text-xs sm:text-sm font-extrabold truncate">Persona Memory Stream</h4>
            <p className="text-[11px] text-muted truncate">Kai is updating her profile memory of you…</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-ai/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-ai">
          Auto Memory
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between gap-2 rounded-2xl border border-indigo-ai/20 bg-indigo-ai/5 p-3 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <PushPin size={18} weight="fill" className="text-indigo-ai shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-foreground block truncate">Goal Extracted</span>
              <p className="text-muted text-[11px] truncate">User is targeting JLPT N3 level by winter.</p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-indigo-ai shrink-0">JUST NOW</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between gap-2 rounded-2xl border border-amber/20 bg-amber/5 p-3 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ForkKnife size={18} weight="fill" className="text-amber shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-foreground block truncate">Preference Saved</span>
              <p className="text-muted text-[11px] truncate">Loves authentic tonkotsu & shoyu ramen in Tokyo.</p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-amber shrink-0">SAVED</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between gap-2 rounded-2xl border border-mint/20 bg-mint/5 p-3 text-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Airplane size={18} weight="fill" className="text-mint shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-foreground block truncate">Upcoming Trip</span>
              <p className="text-muted text-[11px] truncate">Traveling to Kyoto & Osaka this October.</p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-mint shrink-0">SAVED</span>
        </motion.div>
      </div>
    </div>
  );
}

function CanvasLookupView() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-indigo-ai/30 bg-bg/60 p-3.5 sm:p-4">
        <span className="text-[10px] font-bold text-indigo-ai uppercase tracking-wider block">
          Interactive Tap Selection
        </span>
        <p className="mt-1 font-jp text-xl sm:text-2xl font-bold leading-relaxed">
          週末に<span className="rounded-md bg-indigo-ai/15 text-indigo-ai px-1.5 py-0.5 underline decoration-2">映画館</span>へ行きました。
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-border bg-card p-3.5 sm:p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[10px] font-bold text-indigo-ai">
              NOUN · JLPT N5
            </span>
            <h4 className="mt-1 font-jp text-xl sm:text-2xl font-extrabold">
              映画館 <span className="text-xs text-indigo-ai font-normal">えいがかん</span>
            </h4>
            <p className="text-[11px] text-muted">eigakan · Pitch: [3][0]</p>
          </div>
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai">
            <SpeakerHigh size={16} weight="fill" />
          </button>
        </div>

        <p className="mt-2 text-xs font-bold">1. Movie theater; cinema</p>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
          <span className="text-[11px] font-bold text-mint flex items-center gap-1">
            <Check size={14} weight="bold" /> Saved to Flashcard Deck
          </span>
          <span className="rounded-full bg-indigo-ai px-3 py-1 text-[10px] font-bold text-white">
            + Saved
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function CanvasQuestsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber font-bold text-base">
            ☕
          </div>
          <div className="min-w-0">
            <h4 className="font-display text-xs sm:text-sm font-extrabold truncate">Coffee Shop Quest</h4>
            <p className="text-[11px] text-muted font-jp truncate">喫茶店で注文する</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-amber/20 px-2.5 py-0.5 text-[10px] font-bold text-amber uppercase">
          Quest Active
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2.5 rounded-xl bg-mint/10 p-2.5 sm:p-3 text-mint font-bold border border-mint/20">
          <Check size={16} weight="bold" className="shrink-0" />
          <span className="truncate">Order an iced matcha latte in Japanese</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-amber/10 p-2.5 sm:p-3 text-amber font-bold border border-amber/20">
          <span className="h-2 w-2 rounded-full bg-amber animate-ping shrink-0" />
          <span className="truncate">Ask for oat milk substitution</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-bg/50 p-2.5 sm:p-3 text-muted border border-border">
          <span className="h-2 w-2 rounded-full bg-border shrink-0" />
          <span className="truncate">Pay with Suica IC card</span>
        </div>
      </div>
    </div>
  );
}

function CanvasKanjiView() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="rounded-2xl border-2 border-border bg-card p-3 sm:p-4 text-center shadow-lg min-w-0"
      >
        <span className="font-jp text-4xl sm:text-5xl font-extrabold text-indigo-ai block">日</span>
        <p className="mt-1.5 font-extrabold text-xs truncate">Day; Sun</p>
        <p className="text-[10px] text-muted font-jp truncate">ニチ, ジツ · ひ, か</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1 text-[9px]">
          <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 font-bold text-indigo-ai whitespace-nowrap">JLPT N5</span>
          <span className="rounded-full bg-border px-2 py-0.5 font-bold text-muted whitespace-nowrap">4 strokes</span>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.03 }}
        className="rounded-2xl border-2 border-border bg-card p-3 sm:p-4 text-center shadow-lg min-w-0"
      >
        <span className="font-jp text-4xl sm:text-5xl font-extrabold text-indigo-ai block">本</span>
        <p className="mt-1.5 font-extrabold text-xs truncate">Book; Origin</p>
        <p className="text-[10px] text-muted font-jp truncate">ホン · もと</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1 text-[9px]">
          <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 font-bold text-indigo-ai whitespace-nowrap">JLPT N5</span>
          <span className="rounded-full bg-border px-2 py-0.5 font-bold text-muted whitespace-nowrap">5 strokes</span>
        </div>
      </motion.div>
    </div>
  );
}
