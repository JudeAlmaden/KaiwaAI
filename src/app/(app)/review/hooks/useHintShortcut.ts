"use client";

import { useEffect, useRef } from "react";

/**
 * Press H to reveal a hint, the same in both practice modes. Ignored while the
 * learner is typing so the letter still reaches the answer field.
 */
export function useHintShortcut(onHint: () => void, enabled: boolean) {
  const latest = useRef(onHint);

  useEffect(() => {
    latest.current = onHint;
  }, [onHint]);

  useEffect(() => {
    if (!enabled) return;

    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key.toLowerCase() !== "h" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      event.preventDefault();
      latest.current();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [enabled]);
}
