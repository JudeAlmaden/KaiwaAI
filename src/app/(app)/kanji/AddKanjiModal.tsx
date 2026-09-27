"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";

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
  initialCharacter?: string;
  initialKeyword?: string;
  initialFrameNumber?: number | string | null;
  initialPrimitives?: string[];
  initialMnemonic?: string;
};

type ParsedRow = {
  character: string;
  keyword: string;
  frameNumber: number | null;
  primitives?: string[];
  mnemonic: string;
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
  initialCharacter = "",
  initialKeyword = "",
  initialFrameNumber = null,
  initialPrimitives = [],
  initialMnemonic = "",
}: AddKanjiModalProps) {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  // Single entry form state
  const [character, setCharacter] = useState(initialCharacter);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [frameNumber, setFrameNumber] = useState<string>(
    initialFrameNumber ? String(initialFrameNumber) : ""
  );
  const [primitivesInput, setPrimitivesInput] = useState<string>(
    initialPrimitives?.join(" ") || ""
  );
  const [mnemonic, setMnemonic] = useState(initialMnemonic);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick kanji dictionary details & AI generation
  const [kanjiDetail, setKanjiDetail] = useState<KanjiQuickDetail | null>(null);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  // Sync initial props when modal opens (only when isOpen changes to true)
  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCharacter(initialCharacter || "");
    setKeyword(initialKeyword || "");
    setFrameNumber(initialFrameNumber ? String(initialFrameNumber) : "");
    setPrimitivesInput(initialPrimitives?.join(" ") || "");
    setMnemonic(initialMnemonic || "");
    setSelectedGroupId(initialGroupId || "");
    setError(null);
    setSuccessMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When character is present or changes, fetch dictionary details to assist the user
  useEffect(() => {
    const trimmed = character.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKanjiDetail(null);
      return;
    }
    let active = true;
    fetch(`/api/kanji/${encodeURIComponent(trimmed)}`)
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
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [character]);

  const handleGenerateMnemonic = async () => {
    if (!character.trim()) return;
    setGeneratingMnemonic(true);
    setError(null);
    try {
      const kw = keyword.trim() || kanjiDetail?.meanings?.[0] || character.trim();
      const story = await generateKanjiMnemonicClient({
        character: character.trim(),
        meanings: kanjiDetail?.meanings || (keyword.trim() ? [keyword.trim()] : []),
        radicals: kanjiDetail?.radicals || [],
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

  // Bulk paste state
  const [bulkText, setBulkText] = useState("");
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>(initialGroupId || "");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);



  // Parse bulk text with useMemo
  const bulkRows = useMemo(() => {
    if (!bulkText.trim()) return [];

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: ParsedRow[] = [];

    for (const line of lines) {
      // 1. Tab separated: char \t keyword \t lesson \t frame \t mnemonic
      // 2. Comma or pipe separated: char, keyword, lesson, frame, mnemonic
      let parts = line.split("\t");
      if (parts.length === 1 && line.includes("|")) {
        parts = line.split("|").map((p) => p.trim());
      } else if (parts.length === 1 && line.includes(",")) {
        parts = line.split(",").map((p) => p.trim());
      }

      if (parts.length >= 1) {
        // Extract kanji character (first non-ASCII or 1-char Japanese if possible, or part[0])
        const first = parts[0]?.trim() || "";
        // Check if first column is frame number like "12 \t 日 \t sun"
        let char = first;
        let kw = parts[1]?.trim() || "";
        let les: number | null = null;
        let frame: number | null = null;
        let mnem = "";

        if (/^\d+$/.test(first) && parts.length >= 2) {
          // Format: Frame # \t Character \t Keyword ...
          frame = parseInt(first);
          char = parts[1]?.trim() || "";
          kw = parts[2]?.trim() || "";
          if (parts[3] && /^\d+$/.test(parts[3].trim())) {
            les = parseInt(parts[3].trim());
            mnem = parts.slice(4).join(" ").trim();
          } else {
            mnem = parts.slice(3).join(" ").trim();
          }
        } else {
          // Format: Character \t Keyword \t Lesson \t Frame \t Mnemonic
          if (parts.length >= 3 && /^\d+$/.test(parts[2].trim())) {
            les = parseInt(parts[2].trim());
          }
          if (parts.length >= 4 && /^\d+$/.test(parts[3].trim())) {
            frame = parseInt(parts[3].trim());
            mnem = parts.slice(4).join(" ").trim();
          } else if (parts.length >= 3 && !les) {
            mnem = parts.slice(2).join(" ").trim();
          } else if (parts.length >= 4) {
            mnem = parts.slice(3).join(" ").trim();
          }
        }

        if (char) {
          parsed.push({
            character: char,
            keyword: kw,
            frameNumber: frame,
            mnemonic: mnem,
          });
        }
      }
    }

    return parsed;
  }, [bulkText]);

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

  const handleSaveSingle = async (addAnother = false) => {
    if (!character.trim()) {
      setError("Please enter a kanji character");
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
          character: character.trim(),
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
        setSuccessMsg(`Added "${character}"! Ready for next kanji.`);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving kanji");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (bulkRows.length === 0) {
      setError("No valid kanji rows detected to import");
      return;
    }

    setBulkImporting(true);
    setError(null);
    setBulkProgress({ current: 0, total: bulkRows.length });

    try {
      const finalGroupId = await resolveGroupId(bulkTargetGroupId, newGroupName);
      let count = 0;

      for (const row of bulkRows) {
        await fetch("/api/kanji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: row.character,
            heisigKeyword: row.keyword || undefined,
            heisigNumber: row.frameNumber ?? undefined,
            mnemonic: row.mnemonic || undefined,
            groupId: finalGroupId || undefined,
          }),
        });

        count++;
        setBulkProgress({ current: count, total: bulkRows.length });
      }

      onKanjiAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error during bulk import");
    } finally {
      setBulkImporting(false);
      setBulkProgress(null);
    }
  };
  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-border/80 bg-card shadow-2xl shadow-indigo-ai/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5 bg-card">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-ai/15 to-violet-500/10 border border-indigo-ai/20 text-xl font-bold text-indigo-ai shadow-xs font-jp">
              字
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-fg">Add Kanji / RTK Material</h2>
              <p className="text-xs text-muted">Add characters, RTK keywords, primitives, and mnemonics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-border/40 text-muted transition-all hover:bg-border hover:text-fg"
          >
            ✕
          </button>
        </div>

        {/* Modern Segmented Tab Switch */}
        <div className="px-6 pt-4 pb-1">
          <div className="grid grid-cols-2 rounded-2xl bg-border/40 p-1">
            <button
              onClick={() => setTab("single")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                tab === "single"
                  ? "bg-card text-indigo-ai shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>Single Entry</span>
            </button>
            <button
              onClick={() => setTab("bulk")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                tab === "bulk"
                  ? "bg-card text-indigo-ai shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>Bulk Paste from Notes</span>
              <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[9px] text-indigo-ai font-bold">
                Fast
              </span>
            </button>
          </div>
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

          {tab === "single" ? (
            <div className="space-y-4">
              {/* Kanji character & Keyword */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-fg">
                    Kanji Character <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                    placeholder="e.g. 日"
                    maxLength={4}
                    className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-center font-jp text-3xl font-bold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                    autoFocus
                  />
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
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-fg">
                    Heisig Keyword / Meaning
                  </label>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. sun, day"
                    className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-sm font-semibold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                  />
                </div>
              </div>

              {/* Frame Number & Primitive Buildup */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-fg">
                    RTK Frame Number (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={frameNumber}
                    onChange={(e) => setFrameNumber(e.target.value)}
                    placeholder="e.g. 12"
                    className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-sm outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-fg">
                      Primitive Buildup (Optional)
                    </label>
                    <span className="text-[10px] text-muted font-medium">e.g. 一 十 古</span>
                  </div>
                  <input
                    value={primitivesInput}
                    onChange={(e) => setPrimitivesInput(e.target.value)}
                    placeholder="e.g. 一 十 (space-separated)"
                    className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 font-jp text-sm outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                  />
                </div>
              </div>

              {/* Personal Mnemonic / Story from Heisig PDF */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-fg">
                    Your Mnemonic / Story (RTK or personal notes)
                  </label>
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
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Paste or write your mnemonic story here... e.g. A picture of the sun shining bright, with a dividing line through the center representing the horizon."
                  rows={4}
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
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-fg">
                  <span>Paste raw table or lines from your PDF / Notes</span>
                  <span className="text-[10px] font-normal text-muted">
                    Supports Tab, Pipe (|) or Comma separated
                  </span>
                </label>
                <p className="mb-2 text-xs text-muted">
                  Formats accepted per line:<br />
                  • <code>[Kanji]  [Keyword]  [Lesson]  [Frame#]  [Story...]</code><br />
                  • <code>[Frame#]  [Kanji]  [Keyword]  [Story...]</code>
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`12\t日\tsun\t1\tThe sun rising over the horizon\n13\t月\tmoon\t1\tThe moon smiling in the night sky`}
                  rows={6}
                  className="w-full font-mono text-xs rounded-2xl border-2 border-border/80 bg-bg/60 p-4 outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
                />
              </div>

              {/* Bulk Group Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-fg">
                  Assign All to Folder / Lesson (Optional)
                </label>
                <select
                  value={bulkTargetGroupId}
                  onChange={(e) => {
                    setBulkTargetGroupId(e.target.value);
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
                  <option value="new">📁 + Create New Folder / Lesson for these...</option>
                </select>

                {isCreatingNewGroup && (
                  <div className="mt-2.5">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter new folder name (e.g. Lesson 1)"
                      className="h-11 w-full rounded-2xl border-2 border-indigo-ai/50 bg-bg px-4 text-sm outline-none focus:border-indigo-ai focus:ring-4 focus:ring-indigo-ai/10"
                    />
                  </div>
                )}
              </div>

              {/* Parsed Preview */}
              {bulkRows.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-bg/50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Detected {bulkRows.length} kanji to import:</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {bulkRows.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-xl bg-card p-2.5 border border-border/60 shadow-xs"
                      >
                        <span className="font-jp text-lg font-bold text-indigo-ai w-8 text-center">
                          {r.character}
                        </span>
                        <span className="font-semibold text-fg w-24 truncate">
                          {r.keyword || "(no keyword)"}
                        </span>
                        {r.frameNumber && (
                          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500 font-bold">
                            #{r.frameNumber}
                          </span>
                        )}
                        <span className="flex-1 truncate text-muted text-[11px]">
                          {r.mnemonic || "No story"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modern Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-bg/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-border/80 bg-card px-5 py-2.5 text-xs font-bold text-muted hover:text-fg hover:border-border transition-all"
          >
            Cancel
          </button>

          {tab === "single" ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveSingle(true)}
                disabled={saving || !character.trim()}
                className="rounded-2xl border-2 border-indigo-ai/40 bg-indigo-ai/5 px-5 py-2.5 text-xs font-bold text-indigo-ai hover:bg-indigo-ai/10 transition-all disabled:opacity-50"
              >
                Save & Add Another
              </button>
              <button
                type="button"
                onClick={() => handleSaveSingle(false)}
                disabled={saving || !character.trim()}
                className="rounded-2xl bg-gradient-to-r from-indigo-ai to-indigo-deep px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-ai/25 hover:shadow-lg hover:shadow-indigo-ai/35 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Kanji"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBulkImport}
              disabled={bulkImporting || bulkRows.length === 0}
              className="rounded-2xl bg-gradient-to-r from-indigo-ai to-indigo-deep px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-ai/25 hover:shadow-lg hover:shadow-indigo-ai/35 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {bulkImporting
                ? `Importing (${bulkProgress?.current}/${bulkProgress?.total})...`
                : `Import ${bulkRows.length} Kanji`}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
