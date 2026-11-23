"use client";

import { useState } from "react";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";
import { saveKanjiMnemonicClient } from "@/lib/kanji-mnemonic/save-client";
import { Lightbulb, Sparkle, PencilSimple, FloppyDisk } from "@phosphor-icons/react";
import type { KanjiDetail } from "./types";

interface KanjiMnemonicSectionProps {
  kanjiData: KanjiDetail;
  hasHeisig: boolean;
  onMnemonicUpdated: (mnemonic: string | null) => void;
}

export default function KanjiMnemonicSection({
  kanjiData,
  hasHeisig,
  onMnemonicUpdated,
}: KanjiMnemonicSectionProps) {
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyDraft, setStoryDraft] = useState(kanjiData.mnemonic || "");
  const [savingStory, setSavingStory] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const handleGenerateStory = async () => {
    setGeneratingStory(true);
    setStoryError(null);
    try {
      const primaryKw =
        kanjiData.customMeaning ||
        kanjiData.heisigKeyword ||
        kanjiData.meanings[0] ||
        kanjiData.character;

      const story = await generateKanjiMnemonicClient({
        character: kanjiData.character,
        meanings: kanjiData.meanings || [],
        primitives: kanjiData.primitives ?? [],
        components: kanjiData.components ?? [],
        heisigKeyword: primaryKw,
        heisigNumber: kanjiData.heisigNumber ?? undefined,
      });

      setStoryDraft(story);

      // Save generated story
      if (await saveKanjiMnemonicClient(kanjiData.character, story)) {
        onMnemonicUpdated(story);
        setIsEditingStory(false);
      } else {
        setIsEditingStory(true);
      }
    } catch (err) {
      console.error("Failed to generate story:", err);
      setStoryError("Could not generate AI story. Please verify your Gemini API key in Settings.");
    } finally {
      setGeneratingStory(false);
    }
  };

  const handleSaveStory = async () => {
    setSavingStory(true);
    setStoryError(null);
    try {
      const trimmed = storyDraft.trim();
      if (await saveKanjiMnemonicClient(kanjiData.character, trimmed)) {
        onMnemonicUpdated(trimmed || null);
        setIsEditingStory(false);
      } else {
        setStoryError("Failed to save mnemonic story.");
      }
    } catch (err) {
      console.error("Failed to save story:", err);
      setStoryError("Failed to save mnemonic story.");
    } finally {
      setSavingStory(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-mint flex items-center gap-1.5">
          <Lightbulb size={15} weight="fill" />
          <span>{hasHeisig ? "RTK Mnemonic Story" : "Mnemonic / Study Notes"}</span>
        </p>
        <div className="flex items-center gap-1.5">
          {!isEditingStory && (
            <>
              <button
                type="button"
                onClick={handleGenerateStory}
                disabled={generatingStory}
                className="inline-flex items-center gap-1 rounded-lg border border-mint/30 bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint hover:bg-mint/25 transition-all disabled:opacity-50"
                title="Generate an imaginative mnemonic story using AI"
              >
                <Sparkle size={12} weight="fill" />
                <span>{generatingStory ? "Writing…" : "AI Story"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStoryDraft(kanjiData.mnemonic || "");
                  setIsEditingStory(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-0.5 text-[11px] font-bold text-foreground hover:border-mint transition-all"
              >
                <PencilSimple size={12} weight="bold" />
                <span>{kanjiData.mnemonic ? "Edit" : "Write"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {storyError && (
        <p className="text-[11px] text-rose-500 font-medium">{storyError}</p>
      )}

      {isEditingStory ? (
        <div className="space-y-2 pt-1">
          <textarea
            value={storyDraft}
            onChange={(e) => setStoryDraft(e.target.value)}
            placeholder="Write or paste your mnemonic story here..."
            rows={3}
            autoFocus
            className="w-full rounded-xl border-2 border-mint/40 bg-card p-3 text-xs leading-relaxed text-foreground outline-none focus:border-mint"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditingStory(false);
                setStoryDraft(kanjiData.mnemonic || "");
              }}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveStory}
              disabled={savingStory}
              className="inline-flex items-center gap-1 rounded-lg bg-mint px-3 py-1 text-xs font-bold text-zinc-950 shadow-xs hover:brightness-105 disabled:opacity-50"
            >
              <FloppyDisk size={13} weight="bold" />
              <span>{savingStory ? "Saving…" : "Save Story"}</span>
            </button>
          </div>
        </div>
      ) : kanjiData.mnemonic ? (
        <p className="text-xs sm:text-sm leading-relaxed text-foreground font-medium pt-0.5 whitespace-pre-line">
          {kanjiData.mnemonic}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 py-1 text-xs text-muted">
          <span className="text-[11px] font-medium">No mnemonic story attached yet.</span>
          <button
            type="button"
            onClick={handleGenerateStory}
            disabled={generatingStory}
            className="text-[11px] font-bold text-mint hover:underline inline-flex items-center gap-1"
          >
            <Sparkle size={12} weight="fill" />
            <span>{generatingStory ? "Generating…" : "Generate with AI"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
