"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  title: string;
  line: string;
  /** Which edge the tail sits on — pointing back at Kai. */
  tail?: "up" | "left";
  /** Extra pill content under the text (e.g. streak chip). */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Kai's speech bubble: a white card with an indigo tail anchored toward the
 * avatar, animating between lines instead of hard-swapping.
 */
export default function KaiSpeechBubble({
  title,
  line,
  tail = "up",
  children,
  className = "",
}: Props) {
  const [displayed, setDisplayed] = useState(line);

  // Animate line changes (mood swaps, transient reactions).
  useEffect(() => {
    if (line === displayed) return;
    const t = setTimeout(() => setDisplayed(line), 140);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-ai/20 bg-white/95 px-4 py-3 text-center shadow-2xl backdrop-blur-md sm:px-6">
        <p className="font-display text-base font-bold leading-tight text-foreground sm:text-lg">
          {title}
        </p>
        <div className="relative mt-0.5 h-10 sm:h-11">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={displayed}
              className="absolute inset-x-0 inset-y-0 flex items-center justify-center text-xs font-medium leading-snug text-muted sm:text-sm"
              initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {displayed}
            </motion.p>
          </AnimatePresence>
        </div>
        {children ? <div className="mt-1 flex justify-center">{children}</div> : null}
      </div>
      {/* tail pointing at Kai */}
      <div
        aria-hidden
        className={
          tail === "up"
            ? "absolute -top-[7px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-indigo-ai/20 bg-white/95 backdrop-blur-md"
            : "absolute -left-[7px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-indigo-ai/20 bg-white/95 backdrop-blur-md"
        }
      />
    </div>
  );
}
