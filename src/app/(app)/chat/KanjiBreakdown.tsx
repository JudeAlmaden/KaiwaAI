"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { extractKanji } from "@/lib/kanji-utils";
import { speakJa, canSpeak } from "@/lib/speak";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";

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
  mnemonic?: string | null;
};

export default function KanjiBreakdown({ word }: { word: string }) {
  const kanjiChars = extractKanji(word);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [kanjiData, setKanjiData] = useState<KanjiDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [mnemonicError, setMnemonicError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[KanjiBreakdown] Component mounted/updated", { 
      selectedKanji, 
      hasKanjiData: !!kanjiData,
      generatingMnemonic,
      mnemonicError 
    });
  }, [selectedKanji, kanjiData, generatingMnemonic, mnemonicError]);

  const loadKanjiDetail = useCallback(async (kanji: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(kanji)}`);
      if (res.ok) {
        const data = await res.json();
        // Merge the mnemonic from the API response into the kanji data
        setKanjiData({
          ...data.kanji,
          mnemonic: data.mnemonic || data.kanji.mnemonic,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKanjiClick = useCallback((kanji: string) => {
    setSelectedKanji(kanji);
    loadKanjiDetail(kanji);
  }, [loadKanjiDetail]);

  const handleClose = useCallback(() => {
    console.log("[KanjiBreakdown] handleClose called");
    setSelectedKanji(null);
    setKanjiData(null);
    setMnemonicError(null);
  }, []);

  const handleGenerateMnemonic = useCallback(async () => {
    console.log("[KanjiBreakdown] handleGenerateMnemonic called");
    if (!kanjiData) {
      console.log("[KanjiBreakdown] No kanjiData, returning");
      return;
    }
    
    console.log("[KanjiBreakdown] Starting mnemonic generation for:", kanjiData.character);
    setGeneratingMnemonic(true);
    setMnemonicError(null);
    
    try {
      console.log("[KanjiBreakdown] Calling generateKanjiMnemonicClient...");
      const mnemonic = await generateKanjiMnemonicClient({
        character: kanjiData.character,
        meanings: kanjiData.meanings,
        radicals: kanjiData.radicals,
      });
      
      console.log("[KanjiBreakdown] Mnemonic generated:", mnemonic.substring(0, 50) + "...");
      
      // Update the kanji data with the generated mnemonic
      setKanjiData({ ...kanjiData, mnemonic });
      
      // Save the mnemonic to the server
      console.log("[KanjiBreakdown] Saving mnemonic to server...");
      const saveRes = await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/mnemonic/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        console.error("[KanjiBreakdown] Failed to save mnemonic:", data.error);
        // Still show the mnemonic even if save fails
      } else {
        console.log("[KanjiBreakdown] Mnemonic saved successfully");
      }
    } catch (err) {
      console.error("[KanjiBreakdown] Failed to generate mnemonic:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to generate mnemonic";
      if (errorMsg === "NO_API_KEY") {
        setMnemonicError("Add your API key in Settings to generate mnemonics");
      } else if (errorMsg === "BAD_API_KEY") {
        setMnemonicError("Invalid API key. Check your Settings.");
      } else {
        setMnemonicError("Failed to generate mnemonic. Try again.");
      }
    } finally {
      console.log("[KanjiBreakdown] Mnemonic generation complete");
      setGeneratingMnemonic(false);
    }
  }, [kanjiData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (selectedKanji) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedKanji, handleClose]);

  if (kanjiChars.length === 0) return null;

  return (
    <>
      <div className="mt-3 border-t-2 border-border pt-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          Kanji in this word
        </div>
        <div className="flex flex-wrap gap-2">
          {kanjiChars.map((kanji, i) => (
            <button
              key={i}
              onClick={(e) => {
              e.stopPropagation();
              handleKanjiClick(kanji);
            }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-bg font-jp text-xl font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:bg-indigo-ai/10 hover:text-indigo-ai"
              title={`Learn ${kanji}`}
            >
              {kanji}
            </button>
          ))}
        </div>
      </div>
      {selectedKanji && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
          onTouchEnd={(e) => {
            console.log("[KanjiBreakdown] Backdrop TOUCHEND", e.target === e.currentTarget);
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
          onClick={(e) => {
            console.log("[KanjiBreakdown] Backdrop clicked", e.target === e.currentTarget);
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <div
            className="relative z-[99999] max-h-[80vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-border bg-card p-5 shadow-2xl pointer-events-auto"
            onTouchEnd={(e) => {
              console.log("[KanjiBreakdown] Modal content TOUCHEND");
              e.stopPropagation();
            }}
            onClick={(e) => {
              console.log("[KanjiBreakdown] Modal content clicked");
              e.stopPropagation();
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="font-jp text-6xl font-bold leading-none text-foreground sm:text-7xl">
                  {selectedKanji}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Kanji details</p>
                  <h3 className="font-display text-lg font-bold">Explore this kanji</h3>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
              >
                ✕
              </button>
            </div>
            {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="animate-pulse rounded-2xl bg-indigo-ai/10 h-16 w-16 flex items-center justify-center">
                    <span className="font-jp text-3xl">{selectedKanji}</span>
                  </div>
                  <p className="text-sm text-muted animate-pulse">Loading…</p>
                </div>
              ) : kanjiData ? (
                <div className="space-y-5">
                  {canSpeak() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJa(selectedKanji);
                      }}
                      className="flex items-center justify-center gap-2 rounded-full border-2 border-sky/30 bg-sky/10 px-4 py-2 text-sm font-bold text-sky transition-colors hover:bg-sky/20"
                    >
                      <span>🔊</span>
                      <span className="text-sm font-bold">Listen</span>
                    </button>
                  )}
                  <div>
                    {kanjiData.jlptLevel && (
                      <span className="rounded-full bg-indigo-ai px-3 py-1 text-xs font-bold text-white">
                        JLPT N{kanjiData.jlptLevel}
                      </span>
                    )}
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted">Meanings</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                    {kanjiData.meanings.map((m, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${i === 0 ? "bg-indigo-ai text-white" : "bg-border/50 text-foreground"}`}
                      >
                        {m}
                      </span>
                    ))}
                    </div>
                  </div>
                  <div className="space-y-3 rounded-2xl bg-surface p-3">
                    {kanjiData.readingsOn.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-sky">On</span>
                        {kanjiData.readingsOn.map((r, i) => (
                          <span
                            key={i}
                            className="font-jp rounded-full bg-sky/20 px-3 py-1 text-xs font-semibold text-sky"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    {kanjiData.readingsKun.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-amber">Kun</span>
                        {kanjiData.readingsKun.map((r, i) => (
                          <span
                            key={i}
                            className="font-jp rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {kanjiData.radicals && kanjiData.radicals.length > 0 && (
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2">Radicals</p>
                      <div className="flex flex-wrap gap-2">
                        {kanjiData.radicals.map((radical, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-indigo-ai/20 px-3 py-1 text-xs font-semibold text-indigo-ai"
                          >
                            {radical}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {kanjiData.mnemonic ? (
                    <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-mint">
                        💡 Mnemonic
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {kanjiData.mnemonic}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onTouchEnd={(e) => {
                          console.log("[KanjiBreakdown] Generate mnemonic TOUCHEND");
                          e.preventDefault();
                          e.stopPropagation();
                          handleGenerateMnemonic();
                        }}
                        onMouseDown={(e) => {
                          console.log("[KanjiBreakdown] Generate mnemonic MOUSEDOWN");
                          e.preventDefault();
                          e.stopPropagation();
                          handleGenerateMnemonic();
                        }}
                        onClick={(e) => {
                          console.log("[KanjiBreakdown] Generate mnemonic button clicked");
                          e.stopPropagation();
                          console.log("[KanjiBreakdown] stopPropagation called");
                        }}
                        disabled={generatingMnemonic}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-mint/30 bg-mint/5 px-4 py-3 text-sm font-bold text-mint transition-colors hover:bg-mint/10 disabled:opacity-50 touch-none"
                        type="button"
                      >
                        {generatingMnemonic ? (
                          <>
                            <span className="animate-pulse">⏳</span>
                            <span>Generating mnemonic...</span>
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            <span>Generate mnemonic</span>
                          </>
                        )}
                      </button>
                      {mnemonicError && (
                        <p className="text-xs text-sakura">{mnemonicError}</p>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/kanji/${encodeURIComponent(selectedKanji)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex w-full items-center justify-center rounded-full bg-indigo-ai px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-soft"
                  >
                    Open kanji lesson
                  </Link>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="text-3xl">❌</div>
                  <p className="mt-2 text-sm text-muted">Couldn&apos;t load kanji details</p>
                </div>
              )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
