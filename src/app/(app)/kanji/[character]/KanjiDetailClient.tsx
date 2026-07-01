"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { speakJa, canSpeak } from "@/lib/speak";

type KanjiDetail = {
  id: string;
  character: string;
  strokes: number;
  grade: number | null;
  frequency: number | null;
  jlptLevel: number | null;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  radicals: string[];
  wkLevel: number | null;
};

type VocabExample = {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  status: "new" | "learning" | "known";
};

export default function KanjiDetailClient({ character }: { character: string }) {
  const router = useRouter();
  const [kanji, setKanji] = useState<KanjiDetail | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [vocabExamples, setVocabExamples] = useState<VocabExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKanjiDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("API error:", res.status, errorData);
        throw new Error(errorData.error || `Failed to load kanji (${res.status})`);
      }
      const data = await res.json();
      setKanji(data.kanji);
      setMnemonic(data.mnemonic);
      setVocabExamples(data.vocabularyExamples || []);
    } catch (err) {
      console.error("Error loading kanji:", err);
      setError(err instanceof Error ? err.message : "Failed to load kanji details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKanjiDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  async function generateMnemonic(regenerate = false) {
    setGeneratingMnemonic(true);
    try {
      const res = await fetch(
        `/api/kanji/${encodeURIComponent(character)}/mnemonic`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate mnemonic");
      }

      const data = await res.json();
      setMnemonic(data.mnemonic);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate mnemonic";
      alert(message);
    } finally {
      setGeneratingMnemonic(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 animate-pulse rounded-3xl bg-indigo-ai/10"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">
            {character}
          </div>
        </div>
        <p className="text-sm text-muted animate-pulse">Loading kanji details...</p>
      </div>
    );
  }

  if (error || !kanji) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl">❌</div>
        <h2 className="mt-4 font-display text-lg font-bold">Kanji not found</h2>
        <p className="mt-1 text-sm text-muted">{error || "This kanji doesn't exist in our database"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-full border-2 border-indigo-ai px-6 py-2 text-sm font-bold text-indigo-ai transition-colors hover:bg-indigo-ai hover:text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b-2 border-border bg-bg/95 backdrop-blur-sm px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-start gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-border transition-all hover:border-indigo-ai hover:bg-indigo-ai/10 hover:scale-105"
          >
            ←
          </button>
          
          {/* Large Kanji Display */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="font-jp text-6xl font-bold leading-none sm:text-7xl">{kanji.character}</div>
              {canSpeak() && (
                <button
                  onClick={() => speakJa(kanji.character)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-ai/10 text-xl transition-all hover:bg-indigo-ai/20 hover:scale-110"
                  aria-label="Hear pronunciation"
                >
                  🔊
                </button>
              )}
            </div>
            
            {/* Meta Info */}
            <div className="flex flex-wrap gap-2">
              {kanji.jlptLevel && (
                <span className="rounded-full bg-indigo-ai px-3 py-1 text-xs font-bold text-white">
                  JLPT N{kanji.jlptLevel}
                </span>
              )}
              <span className="rounded-full bg-sky/20 px-3 py-1 text-xs font-bold text-sky">
                {kanji.strokes} strokes
              </span>
              {kanji.grade && (
                <span className="rounded-full bg-mint/20 px-3 py-1 text-xs font-bold text-mint">
                  Grade {kanji.grade}
                </span>
              )}
              {kanji.frequency && (
                <span className="rounded-full bg-amber/20 px-3 py-1 text-xs font-bold text-amber">
                  #{kanji.frequency}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Meanings */}
          <Section title="Meanings">
            <div className="flex flex-wrap gap-2">
              {kanji.meanings.map((meaning, i) => (
                <span
                  key={i}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                    i === 0
                      ? "bg-indigo-ai text-white shadow-md shadow-indigo-ai/20"
                      : "bg-border/40 text-muted hover:bg-border/60"
                  }`}
                >
                  {meaning}
                </span>
              ))}
            </div>
          </Section>

          {/* Readings */}
          <Section title="Readings">
            <div className="space-y-4">
              {kanji.readingsOn.length > 0 && (
                <div className="rounded-2xl bg-sky/5 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-sky">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky/20 text-[10px]">
                      音
                    </span>
                    On&apos;yomi (音読み)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {kanji.readingsOn.map((reading, i) => (
                      <span
                        key={i}
                        className="font-jp rounded-full bg-sky/20 px-4 py-2 text-sm font-semibold text-sky shadow-sm"
                      >
                        {reading}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {kanji.readingsKun.length > 0 && (
                <div className="rounded-2xl bg-amber/5 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-amber">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/20 text-[10px]">
                      訓
                    </span>
                    Kun&apos;yomi (訓読み)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {kanji.readingsKun.map((reading, i) => (
                      <span
                        key={i}
                        className="font-jp rounded-full bg-amber/20 px-4 py-2 text-sm font-semibold text-amber shadow-sm"
                      >
                        {reading}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Radicals */}
          {kanji.radicals.length > 0 && (
            <Section title="Radicals" subtitle="Components that make up this kanji">
              <div className="rounded-2xl bg-mint/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {kanji.radicals.map((radical, i) => (
                    <span
                      key={i}
                      className="group relative rounded-xl bg-mint/20 px-4 py-2.5 text-sm font-semibold text-mint shadow-sm transition-all hover:scale-105 hover:bg-mint/30"
                    >
                      {radical}
                    </span>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Mnemonic */}
          <Section title="Memory Aid" subtitle="AI-powered story to help you remember">
            {mnemonic ? (
              <div className="space-y-3">
                <div className="group relative overflow-hidden rounded-2xl border-2 border-indigo-soft bg-gradient-to-br from-indigo-ai/5 to-purple-500/5 p-5 shadow-md transition-all hover:shadow-lg">
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-ai/10 blur-2xl"></div>
                  <p className="relative text-sm leading-relaxed text-foreground">
                    {mnemonic}
                  </p>
                </div>
                <button
                  onClick={() => generateMnemonic(true)}
                  disabled={generatingMnemonic}
                  className="rounded-full border-2 border-border px-5 py-2 text-xs font-bold text-muted transition-all hover:border-indigo-ai hover:text-indigo-ai hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {generatingMnemonic ? "✨ Generating..." : "🔄 Regenerate"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border-2 border-dashed border-border/50 bg-card p-6 text-center">
                <div className="text-4xl">💡</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No mnemonic yet
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Generate an AI-powered memory story to help you remember this kanji.
                  </p>
                </div>
                <button
                  onClick={() => generateMnemonic(false)}
                  disabled={generatingMnemonic}
                  className="rounded-full bg-indigo-ai px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-ai/20 transition-all hover:bg-indigo-ai/90 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {generatingMnemonic ? "✨ Generating..." : "✨ Generate Mnemonic"}
                </button>
              </div>
            )}
          </Section>

          {/* Vocabulary Examples */}
          <Section
            title="Your Vocabulary"
            subtitle={`${vocabExamples.length} word${vocabExamples.length !== 1 ? "s" : ""} using this kanji`}
          >
            {vocabExamples.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card p-8 text-center">
                <div className="text-3xl">📝</div>
                <p className="mt-2 text-sm text-muted">
                  You don&apos;t have any vocabulary words using this kanji yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vocabExamples.map((vocab) => (
                  <div
                    key={vocab.id}
                    onClick={() => router.push("/vocab")}
                    className="group cursor-pointer rounded-2xl border-2 border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-indigo-soft hover:shadow-lg hover:shadow-indigo-ai/10"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <HighlightKanji word={vocab.word} kanji={kanji.character} />
                      <StatusBadge status={vocab.status} />
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-jp text-xs text-indigo-ai/70">
                        {vocab.reading}
                      </span>
                      <span className="text-[10px] text-muted/50">
                        {vocab.romaji}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{vocab.meaning}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function HighlightKanji({ word, kanji }: { word: string; kanji: string }) {
  const parts = word.split(kanji);
  return (
    <span className="font-jp text-lg font-bold">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-indigo-ai transition-colors group-hover:text-indigo-soft">{kanji}</span>
          )}
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: "new" | "learning" | "known" }) {
  const style = {
    new: "bg-sky/20 text-sky",
    learning: "bg-amber/20 text-amber",
    known: "bg-mint/20 text-mint",
  };

  return (
    <span
      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style[status]}`}
    >
      {status}
    </span>
  );
}
