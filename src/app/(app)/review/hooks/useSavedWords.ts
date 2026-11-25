"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Which words are already in the learner's deck, kept in sync with the lookup
 * popup and with removals announced elsewhere in the app. Only used to badge
 * the popup's add/remove action, so failures are silent.
 */
export function useSavedWords() {
  const [savedWords, setSavedWords] = useState<Set<string>>(() => new Set());
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void fetch("/api/flashcards?wordsOnly=true")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!Array.isArray(data?.words)) return;
        setSavedWords(
          new Set(
            data.words
              .map((item: { word?: string }) => item.word)
              .filter((word: string | undefined): word is string => Boolean(word))
          )
        );
      })
      .catch(() => {
        // Definitions still work; the saved badge is cosmetic.
      });
  }, []);

  useEffect(() => {
    function handleRemoved(event: Event) {
      const word = (event as CustomEvent<{ word?: string }>).detail?.word;
      if (!word) return;
      setSavedWords((current) => {
        if (!current.has(word)) return current;
        const next = new Set(current);
        next.delete(word);
        return next;
      });
    }
    window.addEventListener("kaiwa:vocab-removed", handleRemoved);
    return () => window.removeEventListener("kaiwa:vocab-removed", handleRemoved);
  }, []);

  const markSaved = useCallback((word: string) => {
    setSavedWords((current) => {
      if (current.has(word)) return current;
      const next = new Set(current);
      next.add(word);
      return next;
    });
  }, []);

  return { savedWords, markSaved };
}
