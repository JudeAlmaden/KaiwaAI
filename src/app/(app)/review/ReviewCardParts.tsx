"use client";

import { useEffect, useState } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { speakJa, canSpeak } from "@/lib/speak";
import { formLabel } from "@/lib/form-label";
import { canBreakdown } from "@/lib/review/breakdown";
import { cacheBreakdown, readCachedBreakdown } from "@/lib/review/breakdown-cache";
import {
  generateCardBreakdownClient,
  type CardBreakdown,
} from "@/lib/card-breakdown-client";
import type { Card } from "./card-types";

export function SpeakerButton({ text, title }: { text: string; title?: string }) {
  if (!canSpeak() || !text) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speakJa(text);
      }}
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai hover:bg-indigo-ai/20 transition-colors z-10"
      title={title || "Hear audio"}
    >
      <SpeakerHigh size={18} />
    </button>
  );
}

export function ConjugationBadge({
  formType,
  dictionary,
}: {
  formType: string | null | undefined;
  dictionary: string | null | undefined;
}) {
  if (!formLabel(formType) || !dictionary) return null;
  return (
    <p className="text-xs font-semibold text-indigo-ai">
      {formLabel(formType)} · base:{" "}
      <span className="font-jp">{dictionary}</span>
    </p>
  );
}

/**
 * Card back extras: the original chat exchange that gave the word meaning,
 * and Kai's Breakdown for any card that names a word or kanji.
 */
export function CardExtras({ card }: { card: Card }) {
  const [breakdown, setBreakdown] = useState<CardBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = card.sourceContext ?? null;
  const kanjiContext = card.wordKanji ?? card.components ?? [];
  // A hint is only valid for the content it was written about.
  const hintSignature = [
    card.word || card.character || "",
    card.meaning || card.customMeaning || "",
    kanjiContext.map((component) => component.keyword ?? component.glyph).join(","),
  ].join("|");

  useEffect(() => {
    const cached = readCachedBreakdown(card.id, hintSignature);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setBreakdown(cached);
  }, [card.id, hintSignature]);

  if (!canBreakdown(card) && !source) return null;

  async function openBreakdown() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateCardBreakdownClient({
        word: card.word || card.character || "",
        reading: card.reading,
        meaning: card.meaning || card.customMeaning || card.meanings?.join(", "),
        partOfSpeech: card.partOfSpeech,
        sourceContext: source,
        wordKanji: kanjiContext,
      });
      cacheBreakdown(card.id, hintSignature, result);
      setBreakdown(result);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "NO_API_KEY"
          ? "Add your Gemini key in Settings to use Kai's Breakdown."
          : "Kai couldn't build a breakdown right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 w-full space-y-2" onClick={(e) => e.stopPropagation()} data-stop-flip>
      {source && (
        <div className="rounded-2xl border border-border bg-surface/50 px-3 py-2 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
            From your chat
          </p>
          {source.user && (
            <p className="mt-1 font-jp text-xs text-muted leading-relaxed">「{source.user}」</p>
          )}
          <p className="mt-1 font-jp text-sm text-foreground leading-relaxed">「{source.ai}」</p>
        </div>
      )}

      {canBreakdown(card) && (
        <button
          type="button"
          onClick={openBreakdown}
          disabled={loading}
          className="mx-auto flex items-center justify-center rounded-full border border-indigo-ai/25 bg-indigo-ai/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-indigo-ai transition-all hover:border-indigo-ai/50 hover:bg-indigo-ai/10 disabled:opacity-50"
        >
          {loading ? "Kai is thinking…" : breakdown ? "New angle" : "Kai's Breakdown"}
        </button>
      )}

      {error && (
        <p className="text-center text-[11px] font-semibold text-sakura">{error}</p>
      )}

      {breakdown && (
        <div className="space-y-2 text-left">
          <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display">
              Mnemonic
            </p>
            <p className="mt-1 text-xs text-foreground leading-relaxed">{breakdown.mnemonic}</p>
          </div>

          {breakdown.lookalikes.length > 0 && (
            <div className="rounded-2xl border border-amber/30 bg-amber/5 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber font-display">
                Don&apos;t confuse it with
              </p>
              {breakdown.lookalikes.map((look) => (
                <p key={look.jp} className="mt-1 text-xs text-foreground leading-relaxed">
                  <span className="font-jp font-bold">{look.jp}</span> — {look.note}
                </p>
              ))}
            </div>
          )}

          {breakdown.examples.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface/50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
                In the wild
              </p>
              {breakdown.examples.map((ex) => (
                <div key={ex.jp} className="mt-1.5">
                  <p className="font-jp text-sm text-foreground leading-snug">{ex.jp}</p>
                  <p className="text-[11px] text-muted leading-snug">{ex.en}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
