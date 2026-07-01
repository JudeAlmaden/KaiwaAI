"use client";

import { useRouter } from "next/navigation";
import { extractKanji } from "@/lib/kanji-utils";

export default function KanjiBreakdown({ word }: { word: string }) {
  const router = useRouter();
  const kanjiChars = extractKanji(word);

  if (kanjiChars.length === 0) return null;

  return (
    <div className="mt-3 border-t-2 border-border pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
        Kanji in this word
      </p>
      <div className="flex flex-wrap gap-2">
        {kanjiChars.map((kanji, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation(); // Prevent parent popups from closing
              router.push(`/kanji/${encodeURIComponent(kanji)}`);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-bg font-jp text-xl font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:bg-indigo-ai/10 hover:text-indigo-ai"
            title={`Learn ${kanji}`}
          >
            {kanji}
          </button>
        ))}
      </div>
    </div>
  );
}
