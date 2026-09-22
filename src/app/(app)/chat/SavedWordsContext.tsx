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

  return (
    <Ctx.Provider value={{ savedWords, vocabLoaded, markSaved, refresh }}>
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
      refresh: () => {},
    };
  }
  return v;
}
