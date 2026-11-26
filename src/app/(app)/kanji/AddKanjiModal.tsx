"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";
import type { ComponentContext } from "@/lib/kanji-mnemonic/types";
import { normalizeKanjiCharacter } from "@/lib/kanji-input";
import { MODELS, getMnemonicModel, setMnemonicModel } from "@/lib/model-config";

type KanjiGroup = {
  id: string;
  name: string;
  type: string;
  _count?: { entries: number };
};

type AddKanjiModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onKanjiAdded: () => void;
  groups: KanjiGroup[];
  initialGroupId?: string | null;
};

type KanjiQuickDetail = {
  jlptLevel?: number | null;
  strokes?: number;
  readingsOn: string[];
  readingsKun: string[];
  radicals: string[];
  meanings: string[];
};

export default function AddKanjiModal({
  isOpen,
  onClose,
  onKanjiAdded,
  groups,
  initialGroupId = null,
}: AddKanjiModalProps) {
  // Single entry form state
  const [character, setCharacter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [frameNumber, setFrameNumber] = useState<string>("");
  const [primitivesInput, setPrimitivesInput] = useState<string>("");
  const [mnemonic, setMnemonic] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [showRtkEditor, setShowRtkEditor] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [mnemonicModel, setMnemonicModelState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick kanji dictionary details & AI generation
  const [kanjiDetail, setKanjiDetail] = useState<KanjiQuickDetail | null>(null);
  const [kanjiComponents, setKanjiComponents] = useState<ComponentContext[]>([]);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  // Sync initial props when modal opens (only when isOpen changes to true)
  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCharacter("");
    setKeyword("");
    setFrameNumber("");
    setPrimitivesInput("");
    setMnemonic("");
    setSelectedGroupId(initialGroupId || "");
    setShowRtkEditor(false);
    setAddAnother(false);
    setMnemonicModelState(getMnemonicModel());
    setKanjiComponents([]);
    setIsCreatingNewGroup(false);
    setNewGroupName("");
    setLookingUp(false);
    setError(null);
    setSuccessMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const panelRef = useRef<HTMLDivElement>(null);
  const characterInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape/backdrop close, focus trap, scroll lock, and focus return.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    characterInputRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // When character is present or changes, fetch dictionary details to assist the user
  useEffect(() => {
    const normalized = normalizeKanjiCharacter(character);
    if (!normalized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKanjiDetail(null);
      setKanjiComponents([]);
      setLookingUp(false);
      return;
    }
    let active = true;
    setLookingUp(true);
    fetch(`/api/kanji/${encodeURIComponent(normalized)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.kanji) return;
        setKanjiDetail({
          jlptLevel: data.kanji.jlptLevel,
          strokes: data.kanji.strokes,
          readingsOn: data.kanji.readingsOn || [],
          readingsKun: data.kanji.readingsKun || [],
          radicals: data.kanji.radicals || [],
          meanings: data.kanji.meanings || [],
        });
        setKanjiComponents(data.kanji.components ?? []);
        setKeyword((prev) =>
          prev ||
          data.userKanji?.customMeaning ||
          data.kanji.heisigKeyword ||
          data.kanji.meanings?.[0] ||
          ""
        );
        if (data.kanji.heisigNumber) {
          setFrameNumber((prev) => prev || String(data.kanji.heisigNumber));
        }
        if (data.kanji.primitives && Array.isArray(data.kanji.primitives)) {
          setPrimitivesInput((prev) => prev || data.kanji.primitives.join(" "));
        }
        if (data.mnemonic || data.kanji.mnemonic) {
          setMnemonic((prev) => prev || data.mnemonic || data.kanji.mnemonic || "");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLookingUp(false);
      });
    return () => {
      active = false;
    };
  }, [character]);

  const handleGenerateMnemonic = async () => {
    const normalized = normalizeKanjiCharacter(character);
    if (!normalized) return;
    setGeneratingMnemonic(true);
    setError(null);
    try {
      const kw = keyword.trim() || kanjiDetail?.meanings?.[0] || normalized;
      const story = await generateKanjiMnemonicClient({
        character: normalized,
        meanings: kanjiDetail?.meanings || (keyword.trim() ? [keyword.trim()] : []),
        primitives: primitivesInput.trim()
          ? primitivesInput.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean)
          : undefined,
        components: kanjiComponents,
        heisigKeyword: kw,
        heisigNumber: frameNumber.trim() ? Number(frameNumber) : undefined,
      });
      setMnemonic(story);
    } catch (err) {
      console.error(err);
      setError("Failed to generate mnemonic story");
    } finally {
      setGeneratingMnemonic(false);
    }
  };

  // Parse bulk text with useMemo
  const primitiveChips = primitivesInput.trim()
    ? primitivesInput.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean)
    : [];

  if (!isOpen) return null;

  async function resolveGroupId(userGroupId: string, newName: string): Promise<string | null> {
    if (userGroupId === "new" && newName.trim()) {
      const res = await fetch("/api/kanji/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.group.id;
      }
    } else if (userGroupId && userGroupId !== "new") {
      return userGroupId;
    }
    return null;
  }

  const handleSaveSingle = async () => {
    const normalized = normalizeKanjiCharacter(character);
    if (!normalized) {
      setError("Enter exactly one kanji character (e.g. 日)");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const finalGroupId = await resolveGroupId(selectedGroupId, newGroupName);
      const parsedPrimitives = primitivesInput.trim()
        ? primitivesInput.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean)
        : undefined;

      const res = await fetch("/api/kanji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: normalized,
          heisigKeyword: keyword.trim() || undefined,
          heisigNumber: frameNumber.trim() ? Number(frameNumber) : undefined,
          primitives: parsedPrimitives,
          mnemonic: mnemonic.trim() || undefined,
          groupId: finalGroupId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add kanji");
      }

      onKanjiAdded();

      if (addAnother) {
        // Keep frame number incrementing if possible for faster entry
        const nextFrame = frameNumber.trim() ? Number(frameNumber) + 1 : "";
        setCharacter("");
        setKeyword("");
        setMnemonic("");
        setPrimitivesInput("");
        setFrameNumber(nextFrame ? String(nextFrame) : "");
        setSuccessMsg(`Added "${normalized}"! Ready for next kanji.`);
        // If a new folder was just created, switch to its real ID so subsequent
        // saves reuse it instead of creating duplicate folders.
        if (selectedGroupId === "new" && finalGroupId) {
          setSelectedGroupId(finalGroupId);
          setIsCreatingNewGroup(false);
          setNewGroupName("");
        }
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving kanji");
    } finally {
      setSaving(false);
    }
  };

  
  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-kanji-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-border/80 bg-card shadow-2xl shadow-indigo-ai/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5 bg-card">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-ai/15 to-violet-500/10 border border-indigo-ai/20 text-xl font-bold text-indigo-ai shadow-xs font-jp">
              字
            </span>
            <div>
              <h2 id="add-kanji-title" className="font-display text-lg font-bold text-fg">
                Add Kanji / RTK Material
              </h2>
              <p className="text-xs text-muted">Type a character — RTK data fills in.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-border/40 text-muted transition-all hover:bg-border hover:text-fg"
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-2xl border border-mint/30 bg-mint/10 p-3.5 text-xs text-mint font-semibold flex items-center gap-2">
              <span>✨</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-4">
              {/* Kanji character — the only required input */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-fg">
                  Kanji Character <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={characterInputRef}
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="e.g. 日"
                  maxLength={4}
                  className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-center font-jp text-3xl font-bold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                />
                {lookingUp && !kanjiDetail && (
                  <p className="mt-2 text-[10px] font-semibold text-muted">Looking up…</p>
                )}
                {kanjiDetail && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                    {kanjiDetail.jlptLevel && (
                      <span className="rounded-md bg-indigo-ai/10 border border-indigo-ai/20 px-1.5 py-0.5 font-bold text-indigo-ai">
                        JLPT N{kanjiDetail.jlptLevel}
                      </span>
                    )}
                    {kanjiDetail.strokes && (
                      <span className="rounded-md bg-border/80 px-1.5 py-0.5 font-semibold text-muted">
                        {kanjiDetail.strokes} strokes
                      </span>
                    )}
                    {kanjiDetail.readingsOn?.length > 0 && (
                      <span className="rounded-md bg-sky/15 text-sky px-1.5 py-0.5 font-semibold">
                        音: {kanjiDetail.readingsOn.join(", ")}
                      </span>
                    )}
                    {kanjiDetail.radicals?.length > 0 && (
                      <span className="rounded-md bg-amber/15 text-amber px-1.5 py-0.5 font-semibold">
                        Radicals: {kanjiDetail.radicals.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* RTK data: a summary you can edit when the lookup is wrong */}
              <div className="rounded-2xl border border-border/70 bg-bg/40 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {keyword.trim() ? (
                      <span className="rounded-lg border border-indigo-ai/20 bg-indigo-ai/10 px-2 py-0.5 font-bold text-indigo-ai">
                        {keyword.trim()}
                      </span>
                    ) : (
                      <span className="font-semibold text-muted">No keyword yet</span>
                    )}
                    {frameNumber.trim() && (
                      <span className="rounded-lg bg-amber/15 px-2 py-0.5 font-bold text-amber">
                        #{frameNumber.trim()}
                      </span>
                    )}
                    {primitiveChips.length > 0 && (
                      <span className="flex items-center gap-1 text-muted">
                        {primitiveChips.map((glyph, i) => (
                          <span key={`${glyph}-${i}`} className="flex items-center gap-1">
                            {i > 0 && <span aria-hidden="true">→</span>}
                            <span className="rounded-lg bg-border/70 px-1.5 py-0.5 font-jp font-bold text-fg">
                              {glyph}
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                    {!keyword.trim() && !frameNumber.trim() && primitiveChips.length === 0 && (
                      <span className="text-muted">Keyword, frame and primitives fill in after lookup.</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRtkEditor((v) => !v)}
                    className="shrink-0 text-[11px] font-bold text-indigo-ai hover:underline"
                  >
                    {showRtkEditor ? "Done" : "Edit RTK data"}
                  </button>
                </div>

                {showRtkEditor && (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-fg">
                        Heisig Keyword / Meaning
                      </label>
                      <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="e.g. sun, day"
                        className="h-10 w-full rounded-xl border-2 border-border/80 bg-bg/60 px-3 text-sm font-semibold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-fg">RTK Frame #</label>
                        <input
                          type="number"
                          min="1"
                          value={frameNumber}
                          onChange={(e) => setFrameNumber(e.target.value)}
                          placeholder="e.g. 12"
                          className="h-10 w-full rounded-xl border-2 border-border/80 bg-bg/60 px-3 text-sm outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-fg">Primitive Buildup</label>
                        <input
                          value={primitivesInput}
                          onChange={(e) => setPrimitivesInput(e.target.value)}
                          placeholder="e.g. 一 十"
                          className="h-10 w-full rounded-xl border-2 border-border/80 bg-bg/60 px-3 font-jp text-sm outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Story — generate it, or write your own */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-fg">Story</label>
                  <div className="flex items-center gap-2">
                    <label htmlFor="mnemonic-model" className="sr-only">
                      Model for mnemonic generation
                    </label>
                    <select
                      id="mnemonic-model"
                      value={mnemonicModel}
                      onChange={(e) => {
                        setMnemonicModel(e.target.value);
                        setMnemonicModelState(e.target.value);
                      }}
                      disabled={generatingMnemonic}
                      className="h-7 max-w-[9.5rem] rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted outline-none transition-all focus:border-indigo-ai disabled:opacity-50"
                    >
                      {MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label.replace("Gemini ", "")}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleGenerateMnemonic}
                      disabled={generatingMnemonic || !character.trim()}
                      className="flex items-center gap-1.5 rounded-full bg-mint/15 border border-mint/30 px-3 py-1 text-[11px] font-bold text-mint hover:bg-mint/25 transition-all disabled:opacity-50"
                    >
                      <span>✨</span>
                      <span>{generatingMnemonic ? "Generating…" : "Generate with AI"}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Generate a story from the components, or write your own."
                  rows={3}
                  className="w-full rounded-2xl border-2 border-border/80 bg-bg/60 p-4 text-sm outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10 leading-relaxed"
                />
              </div>

              {/* Folder / Lesson Assignment */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-fg">
                  Assign to Folder / Lesson
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setIsCreatingNewGroup(e.target.value === "new");
                  }}
                  className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-sm font-semibold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                >
                  <option value="">None (Unassigned)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      📁 {g.name}
                    </option>
                  ))}
                  <option value="new">📁 + Create New Folder / Lesson...</option>
                </select>

                {isCreatingNewGroup && (
                  <div className="mt-2.5">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter new folder name (e.g. Lesson 1: Strokes)"
                      className="h-11 w-full rounded-2xl border-2 border-indigo-ai/50 bg-bg px-4 text-sm outline-none focus:border-indigo-ai focus:ring-4 focus:ring-indigo-ai/10"
                    />
                  </div>
                )}
              </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-bg/50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-indigo-ai"
              />
              Add another
            </label>
            <Link
              href="/kanji/import"
              onClick={onClose}
              className="text-xs font-semibold text-indigo-ai hover:underline"
            >
              Paste many at once →
            </Link>
          </div>
          <button
            type="button"
            onClick={() => handleSaveSingle()}
            disabled={saving || !character.trim()}
            className="rounded-2xl bg-gradient-to-r from-indigo-ai to-indigo-deep px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-ai/25 hover:shadow-lg hover:shadow-indigo-ai/35 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Kanji"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
