"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MOOD_PORTRAIT, nextIdleSwayDelayMs } from "@/lib/kai-mood";

export type KaiAvatarHandle = {
  poke: () => void;
  pet: () => void;
  celebrate: () => void;
  greet: () => void;
};

type Props = {
  /** Current portrait scene (file name in /images/kai/portraits, no extension). */
  portrait: string;
  /** Breathing pace multiplier — slower at night, quicker when proud. */
  tempo?: number;
  /** Disable tap reactions (e.g. while a transient line owns the bubble). */
  interactive?: boolean;
  onChange?: (handle: KaiAvatarHandle) => void;
  className?: string;
};

const portraitSrc = (name: string) => `/images/kai/portraits/${name}.png`;

/**
 * The room itself: a full-bleed portrait scene that fills its container at
 * every breakpoint. The art only changes when Kai's MOOD changes — never on
 * a timer. Life comes from a breathing bob, a soft sway, tap reactions, and
 * ambient sparkles. Fill the parent with `relative` + size, then overlay UI.
 */
export default function KaiAvatar({
  portrait,
  tempo = 1,
  interactive = true,
  onChange,
  className = "",
}: Props) {
  const reduceMotion = useReducedMotion();
  // null = follow the parent's mood scene; a string = a borrowed scene.
  const [override, setOverride] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ kind: "poke" | "pet"; id: number } | null>(null);
  const [pressing, setPressing] = useState(false);
  const [sway, setSway] = useState(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstId = useRef(0);
  const ownerRef = useRef<"react" | null>(null);
  const scene = override ?? portrait;

  // Ambient sway loop: a gentle lean that re-anchors at random intervals.
  // Never touches the portrait — the scene only changes with mood.
  useEffect(() => {
    if (reduceMotion) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setSway(Math.random() * 2 - 1);
        schedule();
      }, nextIdleSwayDelayMs());
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reduceMotion]);

  const react = useCallback((kind: "poke" | "pet" | "celebrate" | "greet") => {
    const overlay: Record<string, string> = {
      poke: MOOD_PORTRAIT.poke,
      pet: MOOD_PORTRAIT.pet,
      celebrate: MOOD_PORTRAIT.celebrate,
      greet: MOOD_PORTRAIT.greeting,
    };
    ownerRef.current = "react";
    setOverride(overlay[kind]);
    setTimeout(() => {
      if (ownerRef.current === "react") {
        setOverride(null);
        ownerRef.current = null;
      }
    }, kind === "poke" ? 800 : 1400);
    if (kind === "poke" || kind === "pet") {
      burstId.current += 1;
      setBurst({ kind, id: burstId.current });
      setTimeout(() => setBurst(null), 1100);
    }
  }, []);

  useEffect(() => {
    onChange?.({
      poke: () => react("poke"),
      pet: () => react("pet"),
      celebrate: () => react("celebrate"),
      greet: () => react("greet"),
    });
  }, [onChange, react]);

  const pressStart = () => {
    if (!interactive) return;
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      react("pet");
    }, 450);
  };

  const pressEnd = () => {
    if (!interactive) return;
    setPressing(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      react("poke");
    }
  };

  // Very subtle on a full-bleed room — a breath, not a bounce.
  const breathing = reduceMotion
    ? undefined
    : {
        scaleY: [1, 1.008, 1],
        scaleX: [1, 0.998, 1],
      };
  const breathDuration = 3.6 / Math.max(0.5, tempo);

  return (
    <div className={`absolute inset-0 select-none ${className}`}>
      {/* press anywhere on the room to poke / hold to pet */}
      <motion.button
        type="button"
        aria-label="Poke Kai"
        onPointerDown={pressStart}
        onPointerUp={pressEnd}
        onPointerLeave={() => {
          if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
            setPressing(false);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 block cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-ai/40"
        animate={reduceMotion ? undefined : breathing}
        transition={{ duration: breathDuration, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.995 }}
      >
        <motion.span
          className="absolute inset-0 block origin-center"
          animate={
            reduceMotion ? undefined : { rotate: sway * 0.5, x: sway * 4, scale: pressing ? 0.995 : 1 }
          }
          transition={{ type: "spring", stiffness: 40, damping: 12 }}
        >
          {/* Crossfade between scenes instead of hard-swapping. */}
          <AnimatePresence initial={false}>
            <motion.span
              key={scene}
              className="absolute inset-0 block"
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Image
                src={portraitSrc(scene)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-[50%_35%]"
                priority
              />
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </motion.button>

      {/* touch burst: poke squeak / pet hearts */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key={burst.id}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {(burst.kind === "poke" ? ["ひゃっ!", "✦", "✦"] : ["💗", "💜", "✨"]).map(
              (glyph, i) => (
                <motion.span
                  key={i}
                  className={`absolute text-xl font-black drop-shadow sm:text-2xl ${
                    burst.kind === "poke" ? "text-indigo-ai" : ""
                  }`}
                  style={{ left: `${28 + i * 22}%`, top: `${18 + (i % 2) * 16}%` }}
                  initial={{ opacity: 0, y: 12, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -34 - i * 8, scale: 1.1 }}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
                >
                  {glyph}
                </motion.span>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ambient sparkles — static under reduced motion */}
      <span aria-hidden className="pointer-events-none absolute left-[6%] top-[22%] text-amber drop-shadow">
        <motion.span
          className="block"
          animate={reduceMotion ? undefined : { rotate: [0, 18, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ✦
        </motion.span>
      </span>
      <span aria-hidden className="pointer-events-none absolute bottom-[30%] right-[7%] text-sakura drop-shadow">
        <motion.span
          className="block"
          animate={reduceMotion ? undefined : { y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          ✦
        </motion.span>
      </span>
    </div>
  );
}
