"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type SavedWordsCtx = {
  savedWords: Set<string>;
  vocabLoaded: boolean;
  markSaved: (w: string) => void;
  unmarkSaved: (w: string) => void;
  refresh: () => void;
};

const Ctx = createContext<SavedWordsCtx | null>(null);

/** Fetch saved vocab once per session; share across all RichKaiText bubbles. */
export function SavedWordsProvider({ children }: { children: ReactNode }) {
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [vocabLoaded, setVocabLoaded] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/flashcards?wordsOnly=true")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.words)) {
          setSavedWords(new Set(d.words.map((w: { word: string }) => w.word)));
        }
        setVocabLoaded(true);
      })
      .catch(() => setVocabLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markSaved = useCallback((w: string) => {
    setSavedWords((s) => new Set(s).add(w));
  }, []);

  const unmarkSaved = useCallback((w: string) => {
    setSavedWords((s) => {
      const next = new Set(s);
      next.delete(w);
      return next;
    });
  }, []);

  // Listen for global custom events when a card is removed elsewhere (e.g. from Vocab study page)
  useEffect(() => {
    const handleRemovedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ word?: string }>;
      if (customEvent.detail?.word) {
        unmarkSaved(customEvent.detail.word);
      } else {
        refresh();
      }
    };
    window.addEventListener("kaiwa:vocab-removed", handleRemovedEvent);
    return () => window.removeEventListener("kaiwa:vocab-removed", handleRemovedEvent);
  }, [unmarkSaved, refresh]);

  return (
    <Ctx.Provider value={{ savedWords, vocabLoaded, markSaved, unmarkSaved, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSavedWords(): SavedWordsCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback when used outside provider (e.g. isolated tests).
    return {
      savedWords: new Set(),
      vocabLoaded: true,
      markSaved: () => {},
      unmarkSaved: () => {},
      refresh: () => {},
    };
  }
  return v;
}
