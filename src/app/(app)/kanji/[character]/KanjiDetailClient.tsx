"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { speakJa, canSpeak } from "@/lib/speak";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";
import { hasAnyKey } from "@/lib/api-keys";

type KanjiDetail = {
  id: string;
  character: string;
  strokes: number;
  grade: number | null;
  frequency: number | null;
  jlptLevel: number | null;
  heisigNumber: number | null;
  heisigLesson: number | null;
  heisigKeyword: string | null;
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

type Group = {
  id: string;
  name: string;
  type: string;
};

export default function KanjiDetailClient({ character }: { character: string }) {
  const router = useRouter();
  const [kanji, setKanji] = useState<KanjiDetail | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [inReviews, setInReviews] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUserGroups, setAllUserGroups] = useState<Group[]>([]);
  const [vocabExamples, setVocabExamples] = useState<VocabExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing Mnemonic state
  const [isEditingMnemonic, setIsEditingMnemonic] = useState(false);
  const [mnemonicDraft, setMnemonicDraft] = useState("");
  const [savingMnemonic, setSavingMnemonic] = useState(false);

  // Editing Heisig fields state
  const [isEditingHeisig, setIsEditingHeisig] = useState(false);
  const [heisigKeywordDraft, setHeisigKeywordDraft] = useState("");
  const [heisigLessonDraft, setHeisigLessonDraft] = useState("");
  const [heisigNumberDraft, setHeisigNumberDraft] = useState("");
  const [savingHeisig, setSavingHeisig] = useState(false);

  // Toggling review queue
  const [togglingReview, setTogglingReview] = useState(false);

  // Add to Group state
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState("");
  const [addingToGroup, setAddingToGroup] = useState(false);

  const loadKanjiDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to load kanji (${res.status})`);
      }
      const data = await res.json();
      setKanji(data.kanji);
      setMnemonic(data.mnemonic);
      setMnemonicDraft(data.mnemonic || "");
      setInReviews(data.inReviews ?? false);
      setGroups(data.groups || []);
      setVocabExamples(data.vocabularyExamples || []);

      // Seed Heisig drafts
      setHeisigKeywordDraft(data.kanji.heisigKeyword || "");
      setHeisigLessonDraft(data.kanji.heisigLesson ? String(data.kanji.heisigLesson) : "");
      setHeisigNumberDraft(data.kanji.heisigNumber ? String(data.kanji.heisigNumber) : "");
    } catch (err) {
      console.error("Error loading kanji:", err);
      setError(err instanceof Error ? err.message : "Failed to load kanji details");
    } finally {
      setLoading(false);
    }
  }, [character]);

  const loadAllGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/kanji/groups");
      if (res.ok) {
        const data = await res.json();
        setAllUserGroups(data.groups || []);
      }
    } catch (e) {
      console.error("Failed to load user groups:", e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKanjiDetail();
    loadAllGroups();
  }, [loadKanjiDetail, loadAllGroups]);

  const handleSaveMnemonic = async () => {
    setSavingMnemonic(true);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: mnemonicDraft }),
      });
      if (res.ok) {
        setMnemonic(mnemonicDraft.trim() || null);
        setIsEditingMnemonic(false);
      }
    } catch (e) {
      console.error("Failed to save mnemonic:", e);
    } finally {
      setSavingMnemonic(false);
    }
  };

  const handleSaveHeisig = async () => {
    setSavingHeisig(true);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heisigKeyword: heisigKeywordDraft,
          heisigLesson: heisigLessonDraft ? Number(heisigLessonDraft) : null,
          heisigNumber: heisigNumberDraft ? Number(heisigNumberDraft) : null,
        }),
      });
      if (res.ok) {
        setKanji((prev) =>
          prev
            ? {
                ...prev,
                heisigKeyword: heisigKeywordDraft.trim() || null,
                heisigLesson: heisigLessonDraft ? Number(heisigLessonDraft) : null,
                heisigNumber: heisigNumberDraft ? Number(heisigNumberDraft) : null,
              }
            : null
        );
        setIsEditingHeisig(false);
      }
    } catch (e) {
      console.error("Failed to save Heisig details:", e);
    } finally {
      setSavingHeisig(false);
    }
  };

  const handleToggleReview = async () => {
    if (togglingReview) return;
    setTogglingReview(true);
    try {
      if (inReviews) {
        await fetch(`/api/kanji/${encodeURIComponent(character)}/learn`, { method: "DELETE" });
        setInReviews(false);
      } else {
        await fetch(`/api/kanji/${encodeURIComponent(character)}/learn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mnemonic }),
        });
        setInReviews(true);
      }
    } catch (e) {
      console.error("Failed to toggle review:", e);
    } finally {
      setTogglingReview(false);
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedGroupToAdd || !kanji) return;
    setAddingToGroup(true);
    try {
      const res = await fetch(`/api/kanji/groups/${selectedGroupToAdd}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanjiId: kanji.id }),
      });
      if (res.ok) {
        const addedGroup = allUserGroups.find((g) => g.id === selectedGroupToAdd);
        if (addedGroup && !groups.some((g) => g.id === addedGroup.id)) {
          setGroups([...groups, addedGroup]);
        }
        setSelectedGroupToAdd("");
      }
    } catch (e) {
      console.error("Failed to add to group:", e);
    } finally {
      setAddingToGroup(false);
    }
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!kanji) return;
    try {
      await fetch(`/api/kanji/groups/${groupId}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanjiId: kanji.id }),
      });
      setGroups(groups.filter((g) => g.id !== groupId));
    } catch (e) {
      console.error("Failed to remove from group:", e);
    }
  };

  async function generateMnemonic(regenerate = false) {
    if (!hasAnyKey()) {
      alert(
        "💡 Add your Gemini API key in Settings to generate mnemonics.\n\nThis feature uses your own API key (BYOK) - no server key needed!"
      );
      return;
    }

    if (!regenerate && mnemonic) return;

    setGeneratingMnemonic(true);
    try {
      if (!kanji) return;

      const generated = await generateKanjiMnemonicClient({
        character: kanji.character,
        meanings: kanji.heisigKeyword ? [kanji.heisigKeyword, ...kanji.meanings] : kanji.meanings,
        radicals: kanji.radicals,
      });

      await fetch(`/api/kanji/${encodeURIComponent(character)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: generated }),
      });

      setMnemonic(generated);
      setMnemonicDraft(generated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate mnemonic";
      alert(`Mnemonic generation note: ${message}`);
    } finally {
      setGeneratingMnemonic(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-indigo-ai/10 text-3xl font-bold font-jp">
          {character}
        </div>
        <p className="text-xs text-muted animate-pulse">Loading kanji details...</p>
      </div>
    );
  }

  if (error || !kanji) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-4xl">❌</div>
        <h2 className="mt-4 font-display text-base font-bold">Kanji not found</h2>
        <p className="mt-1 text-xs text-muted">{error || "This kanji does not exist"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-full border-2 border-indigo-ai px-5 py-2 text-xs font-bold text-indigo-ai hover:bg-indigo-ai hover:text-white transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Top Bar Header */}
      <div className="sticky top-0 z-10 border-b-2 border-border bg-bg/95 backdrop-blur-sm px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-border text-muted hover:border-indigo-ai hover:text-fg hover:bg-indigo-ai/10 transition-all"
            >
              ←
            </button>

            <div className="flex items-center gap-3">
              <span className="font-jp text-5xl font-bold leading-none sm:text-6xl text-fg">
                {kanji.character}
              </span>

              {canSpeak() && (
                <button
                  onClick={() => speakJa(kanji.character)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-ai/10 text-base text-indigo-ai hover:bg-indigo-ai/20 transition-all"
                  title="Hear pronunciation"
                >
                  🔊
                </button>
              )}

              <div>
                <h2 className="font-display text-lg font-bold text-fg">
                  {kanji.heisigKeyword || kanji.meanings[0] || "Kanji"}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {kanji.heisigNumber && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                      RTK #{kanji.heisigNumber}
                    </span>
                  )}
                  {kanji.heisigLesson && (
                    <span className="rounded-full bg-sky/15 px-2 py-0.5 text-[10px] font-bold text-sky">
                      Lesson {kanji.heisigLesson}
                    </span>
                  )}
                  {kanji.jlptLevel && (
                    <span className="rounded-full bg-indigo-ai/15 px-2 py-0.5 text-[10px] font-bold text-indigo-ai">
                      N{kanji.jlptLevel}
                    </span>
                  )}
                  <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {kanji.strokes} strokes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleReview}
              disabled={togglingReview}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                inReviews
                  ? "bg-mint/15 text-mint border-2 border-mint/40 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/40"
                  : "bg-indigo-ai text-white shadow-md shadow-indigo-ai/20 hover:bg-indigo-ai/90"
              }`}
            >
              {togglingReview ? "..." : inReviews ? "✓ In Study Queue" : "+ Add to Study Queue"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Remembering the Kanji (RTK) Details Card */}
          <Section
            title="Remembering the Kanji (RTK)"
            subtitle="Heisig frame number, lesson, and primary keyword"
          >
            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm space-y-4">
              {!isEditingHeisig ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="grid grid-cols-3 gap-4 flex-1">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                        RTK Keyword
                      </span>
                      <span className="text-sm font-bold text-fg">
                        {kanji.heisigKeyword || "Not set"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                        Frame Number (#)
                      </span>
                      <span className="text-sm font-bold text-amber-500">
                        {kanji.heisigNumber ? `#${kanji.heisigNumber}` : "Not set"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                        Lesson Number
                      </span>
                      <span className="text-sm font-bold text-sky">
                        {kanji.heisigLesson ? `Lesson ${kanji.heisigLesson}` : "Not set"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingHeisig(true)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-fg transition-all"
                  >
                    ✏️ Edit RTK Info
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">Keyword</label>
                      <input
                        value={heisigKeywordDraft}
                        onChange={(e) => setHeisigKeywordDraft(e.target.value)}
                        placeholder="e.g. sun"
                        className="h-10 w-full rounded-xl border-2 border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">Frame #</label>
                      <input
                        type="number"
                        value={heisigNumberDraft}
                        onChange={(e) => setHeisigNumberDraft(e.target.value)}
                        placeholder="e.g. 12"
                        className="h-10 w-full rounded-xl border-2 border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">Lesson #</label>
                      <input
                        type="number"
                        value={heisigLessonDraft}
                        onChange={(e) => setHeisigLessonDraft(e.target.value)}
                        placeholder="e.g. 1"
                        className="h-10 w-full rounded-xl border-2 border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingHeisig(false)}
                      className="rounded-xl border border-border px-4 py-1.5 text-xs font-bold text-muted hover:bg-bg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveHeisig}
                      disabled={savingHeisig}
                      className="rounded-xl bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-ai/90 disabled:opacity-50"
                    >
                      {savingHeisig ? "Saving..." : "Save RTK Info"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Personal Mnemonic / Story Section */}
          <Section
            title="Mnemonic & Story"
            subtitle="Your personal mnemonic story (copy/paste from your Heisig notes or generate with AI)"
          >
            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm space-y-4">
              {!isEditingMnemonic ? (
                <div>
                  {mnemonic ? (
                    <div className="rounded-2xl border-2 border-mint/20 bg-mint/5 p-4 text-xs sm:text-sm leading-relaxed text-fg whitespace-pre-wrap">
                      {mnemonic}
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 p-6 text-center">
                      <p className="text-xs text-muted">
                        No mnemonic saved for this kanji yet. Add your story from your RTK PDF or notes!
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setMnemonicDraft(mnemonic || "");
                        setIsEditingMnemonic(true);
                      }}
                      className="rounded-xl bg-indigo-ai/10 border border-indigo-ai/30 px-3.5 py-1.5 text-xs font-bold text-indigo-ai hover:bg-indigo-ai/20 transition-all"
                    >
                      {mnemonic ? "✏️ Edit / Paste Story" : "＋ Add Story / Mnemonic"}
                    </button>

                    <button
                      onClick={() => generateMnemonic(!!mnemonic)}
                      disabled={generatingMnemonic}
                      className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-fg transition-all disabled:opacity-50"
                    >
                      {generatingMnemonic ? "✨ Generating..." : "✨ AI Inspiration"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={mnemonicDraft}
                    onChange={(e) => setMnemonicDraft(e.target.value)}
                    placeholder="Paste or write your story here (e.g. from RTK Volume 1)..."
                    rows={4}
                    className="w-full rounded-2xl border-2 border-border bg-bg p-3.5 text-xs sm:text-sm outline-none transition-all focus:border-indigo-ai"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingMnemonic(false)}
                      className="rounded-xl border border-border px-4 py-1.5 text-xs font-bold text-muted hover:bg-bg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMnemonic}
                      disabled={savingMnemonic}
                      className="rounded-xl bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-ai/90 disabled:opacity-50"
                    >
                      {savingMnemonic ? "Saving..." : "Save Story"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Groups & Lessons Assignment */}
          <Section
            title="Lessons & Custom Sets"
            subtitle="Organize this kanji into study groups"
          >
            <div className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm space-y-4">
              {groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <span
                      key={g.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-fg"
                    >
                      <span>📁 {g.name}</span>
                      <button
                        onClick={() => handleRemoveFromGroup(g.id)}
                        className="text-muted hover:text-rose-500 transition-colors"
                        title="Remove from group"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">This kanji is not assigned to any custom group yet.</p>
              )}

              {/* Add to group dropdown */}
              {allUserGroups.filter((g) => !groups.some((existing) => existing.id === g.id)).length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <select
                    value={selectedGroupToAdd}
                    onChange={(e) => setSelectedGroupToAdd(e.target.value)}
                    className="h-10 flex-1 rounded-xl border-2 border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                  >
                    <option value="">Select group to add this kanji...</option>
                    {allUserGroups
                      .filter((g) => !groups.some((existing) => existing.id === g.id))
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAddToGroup}
                    disabled={!selectedGroupToAdd || addingToGroup}
                    className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-bold text-white hover:bg-indigo-ai/90 disabled:opacity-50 transition-all"
                  >
                    {addingToGroup ? "Adding..." : "Add to Group"}
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Dictionary Meanings */}
          <Section title="Dictionary Meanings">
            <div className="flex flex-wrap gap-2">
              {kanji.meanings.map((meaning, i) => (
                <span
                  key={i}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    i === 0
                      ? "bg-indigo-ai text-white shadow-sm"
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
            <div className="space-y-3">
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
                        className="font-jp rounded-full bg-sky/20 px-3.5 py-1.5 text-xs font-semibold text-sky"
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
                        className="font-jp rounded-full bg-amber/20 px-3.5 py-1.5 text-xs font-semibold text-amber"
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
            <Section title="Radicals" subtitle="Component radicals · Click to filter">
              <div className="rounded-2xl bg-mint/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {kanji.radicals.map((radical, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(`/kanji?search=${encodeURIComponent(radical)}`)}
                      className="rounded-xl bg-mint/20 px-3.5 py-2 text-xs font-semibold text-mint hover:scale-105 transition-all"
                      title={`Search for kanji containing ${radical}`}
                    >
                      {radical}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Vocabulary Examples */}
          <Section
            title="Saved Vocabulary Words"
            subtitle={`${vocabExamples.length} word${vocabExamples.length !== 1 ? "s" : ""} in your flashcards`}
          >
            {vocabExamples.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card p-6 text-center">
                <p className="text-xs text-muted">
                  No vocabulary flashcards contain this kanji yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vocabExamples.map((vocab) => (
                  <div
                    key={vocab.id}
                    onClick={() => router.push("/vocab")}
                    className="group cursor-pointer rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-indigo-ai/50 hover:shadow-md"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <HighlightKanji word={vocab.word} kanji={kanji.character} />
                      <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                        {vocab.status}
                      </span>
                    </div>
                    <p className="mt-1 font-jp text-xs text-indigo-ai">{vocab.reading}</p>
                    <p className="mt-1.5 text-xs text-muted">{vocab.meaning}</p>
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
      <div className="mb-2.5">
        <h3 className="font-display text-base font-bold text-fg">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function HighlightKanji({ word, kanji }: { word: string; kanji: string }) {
  const parts = word.split(kanji);
  return (
    <span className="font-jp text-base font-bold text-fg">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="text-indigo-ai">{kanji}</span>}
        </span>
      ))}
    </span>
  );
}
