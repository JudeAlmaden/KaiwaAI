"use client";

import { useEffect, useState } from "react";
import { STATUS_STYLE } from "../ui";
import KanjiBreakdown from "../chat/KanjiBreakdown";
import { formLabel } from "@/lib/form-label";
import { canSpeak, speakJa } from "@/lib/speak";
import { progressOf, type Card, type WordForm } from "./types";

/**
 * The word/phrase detail sheet. Owns its editing state (note, reading/meaning,
 * conjugation picks); the list only hands it a card and gets told what changed.
 */
export default function VocabDetailSheet({
  card,
  onClose,
  onReload,
  onUpdated,
  onRemove,
}: {
  card: Card;
  onClose: () => void;
  onReload: () => void;
  onUpdated: (patch: Partial<Card>) => void;
  onRemove: (id: string) => void;
}) {
  const [current, setCurrent] = useState<Card>(card);
  const [forms, setForms] = useState<WordForm[]>([]);
  const [formsLoading, setFormsLoading] = useState<boolean>(
    Boolean(card.wordId && card.dictionary)
  );
  const [addingAllForms, setAddingAllForms] = useState(false);
  const [addingFormId, setAddingFormId] = useState<string | null>(null);
  const [usingBaseOnly, setUsingBaseOnly] = useState(false);
  const [showConjugations, setShowConjugations] = useState(false);

  // Note editing state
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(card.note || "");
  const [savingNote, setSavingNote] = useState(false);

  // Card detail editing state (reading, meaning)
  const [editingCard, setEditingCard] = useState(false);
  const [editReading, setEditReading] = useState(card.reading || "");
  const [editMeaning, setEditMeaning] = useState(card.meaning || "");
  const [savingCardEdit, setSavingCardEdit] = useState(false);

  useEffect(() => {
    if (!card.wordId || !card.dictionary) return;
    let cancelled = false;
    fetch(`/api/dictionary/lookup?dictForm=${encodeURIComponent(card.dictionary)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setForms(data?.type === "word" ? data.forms : []);
      })
      .catch(() => !cancelled && setForms([]))
      .finally(() => !cancelled && setFormsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [card.wordId, card.dictionary]);

  async function addAllConjugations() {
    if (!current.wordId) return;
    const unsavedFormIds = forms
      .filter((form) => form.formType !== "dictionary" && !form.saved)
      .map((form) => form.id);
    if (!unsavedFormIds.length) return;
    setAddingAllForms(true);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: current.wordId, wordFormIds: unsavedFormIds }),
    });
    if (res.ok) {
      setForms((list) => list.map((form) => ({ ...form, saved: true })));
      onReload();
    }
    setAddingAllForms(false);
  }

  async function addConjugation(form: WordForm) {
    if (!current.wordId || form.saved) return;
    setAddingFormId(form.id);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: current.wordId, wordFormId: form.id }),
    });
    if (res.ok) {
      setForms((list) =>
        list.map((item) => (item.id === form.id ? { ...item, saved: true } : item))
      );
      onReload();
    }
    setAddingFormId(null);
  }

  async function useBaseOnly() {
    if (!current.wordId) return;
    setUsingBaseOnly(true);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: current.wordId, baseOnly: true }),
    });
    if (res.ok) {
      onReload();
      onClose();
    }
    setUsingBaseOnly(false);
  }

  async function act(action: "reset" | "markKnown") {
    await fetch(`/api/flashcards/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    onReload();
    onClose();
  }

  async function saveCardEdit() {
    setSavingCardEdit(true);
    try {
      const res = await fetch(`/api/flashcards/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editCard",
          reading: editReading.trim(),
          meaning: editMeaning.trim(),
        }),
      });

      if (res.ok) {
        const updatedReading = editReading.trim();
        const updatedMeaning = editMeaning.trim();
        const patch = {
          reading: updatedReading || current.reading,
          meaning: updatedMeaning || current.meaning,
        };
        setCurrent((c) => ({ ...c, ...patch }));
        onUpdated(patch);
        setEditingCard(false);
      }
    } finally {
      setSavingCardEdit(false);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      const note = noteText.trim() || null;
      const res = await fetch(`/api/flashcards/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateNote", note }),
      });

      if (res.ok) {
        setCurrent((c) => ({ ...c, note }));
        onUpdated({ note });
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-border bg-card p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-jp text-3xl font-bold">{current.word}</p>
            {editingCard ? (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Reading (Kana)
                  </label>
                  <input
                    type="text"
                    value={editReading}
                    onChange={(e) => setEditReading(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border-2 border-border bg-surface px-3 py-1.5 font-jp text-sm text-foreground outline-none focus:border-indigo-ai"
                    placeholder="e.g. きいろ"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Meaning (English)
                  </label>
                  <input
                    type="text"
                    value={editMeaning}
                    onChange={(e) => setEditMeaning(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border-2 border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-indigo-ai"
                    placeholder="e.g. yellow"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={saveCardEdit}
                    disabled={savingCardEdit}
                    className="rounded-full bg-indigo-ai px-3.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
                  >
                    {savingCardEdit ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingCard(false);
                      setEditReading(current.reading || "");
                      setEditMeaning(current.meaning || "");
                    }}
                    className="rounded-full border-2 border-border px-3.5 py-1 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-jp text-base text-indigo-ai">{current.reading}</p>
                {current.romaji && <p className="text-sm text-muted">{current.romaji}</p>}
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!editingCard && (
              <button
                onClick={() => {
                  setEditingCard(true);
                  setEditReading(current.reading || "");
                  setEditMeaning(current.meaning || "");
                }}
                className="flex h-9 items-center justify-center rounded-full border border-border px-3 text-xs font-bold text-muted hover:border-indigo-ai hover:text-indigo-ai transition-colors"
                title="Edit reading or meaning"
              >
                ✏️ Edit
              </button>
            )}
            {canSpeak() && (
              <button
                onClick={() => speakJa(current.word)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai"
                title="Hear it"
              >
                🔊
              </button>
            )}
          </div>
        </div>

        {!editingCard && (
          <div className="mt-4 rounded-2xl bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Meaning</p>
            <p className="mt-1 text-base font-semibold leading-6 break-words whitespace-pre-wrap">
              {current.meaning}
            </p>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-border/60 px-2.5 py-1 font-bold uppercase text-muted">
            {current.partOfSpeech}
          </span>
          {formLabel(current.formType) && (
            <span className="rounded-full bg-indigo-ai/10 px-2.5 py-1 font-bold uppercase text-indigo-ai">
              {formLabel(current.formType)}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 font-bold uppercase ${STATUS_STYLE[current.status]}`}>
            {current.status}
          </span>
          <span className="rounded-full bg-border/60 px-2.5 py-1 font-bold text-muted">
            {progressOf(current)}% learned
          </span>
        </div>

        <p className="mt-3 text-xs text-muted">
          Next review:{" "}
          {new Date(current.nextReview).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>

        {formsLoading ? (
          <p className="mt-4 text-xs text-muted">Loading conjugations…</p>
        ) : (
          forms.length > 1 && (
            <section className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    Conjugations
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {forms.filter((form) => form.formType !== "dictionary").length} forms available
                  </p>
                </div>
                <button
                  onClick={() => setShowConjugations((show) => !show)}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                >
                  {showConjugations ? "Hide forms" : "View forms"}
                </button>
              </div>
              {showConjugations && forms.some((form) => form.formType !== "dictionary" && !form.saved) && (
                <button
                  onClick={addAllConjugations}
                  disabled={addingAllForms}
                  className="mt-3 w-full rounded-full border border-indigo-ai/30 px-3 py-2 text-xs font-bold text-indigo-ai transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                >
                  {addingAllForms
                    ? "Adding…"
                    : `+ Add all ${forms.filter((form) => form.formType !== "dictionary" && !form.saved).length} conjugations`}
                </button>
              )}
              {showConjugations && (
                <button
                  onClick={useBaseOnly}
                  disabled={usingBaseOnly}
                  className="mt-2 w-full rounded-full border border-border px-3 py-2 text-xs font-bold text-muted transition-colors hover:border-sakura/50 hover:bg-sakura/5 hover:text-sakura disabled:opacity-60"
                >
                  {usingBaseOnly ? "Updating…" : "Use base form only (remove conjugation cards)"}
                </button>
              )}
              {showConjugations && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {forms.map((form) => (
                    <div
                      key={form.id}
                      className={`rounded-xl border px-3 py-2 ${form.saved ? "border-mint/30 bg-mint/5" : "border-border bg-card"}`}
                    >
                      <p className="font-jp text-base font-bold">{form.form}</p>
                      <p className="font-jp text-xs text-indigo-ai">{form.reading}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {formLabel(form.formType) ?? "Dictionary form"}
                      </p>
                      {form.formType !== "dictionary" &&
                        (form.saved ? (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-mint">
                            In deck
                          </p>
                        ) : (
                          <button
                            onClick={() => addConjugation(form)}
                            disabled={addingFormId === form.id}
                            className="mt-2 rounded-full border border-indigo-ai/30 px-2 py-1 text-[10px] font-bold text-indigo-ai transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                          >
                            {addingFormId === form.id ? "Adding…" : "+ Add this form"}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        )}

        <KanjiBreakdown word={current.word} />

        {/* Custom Note Section */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Personal Note</p>
            {!editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="text-xs font-bold text-indigo-ai hover:underline"
              >
                {current.note ? "Edit" : "+ Add note"}
              </button>
            )}
          </div>

          {editingNote ? (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add examples, mnemonics, or anything to help you remember..."
                className="w-full rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-ai"
                rows={4}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  className="rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
                >
                  {savingNote ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingNote(false);
                    setNoteText(current.note || "");
                  }}
                  className="rounded-full border-2 border-border px-4 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : current.note ? (
            <div className="rounded-lg bg-amber/5 border border-amber/20 px-3 py-2">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{current.note}</p>
            </div>
          ) : (
            <p className="text-xs text-muted italic">
              No note yet. Click &quot;+ Add note&quot; to create one.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {current.status !== "known" && (
            <button
              onClick={() => act("markKnown")}
              className="rounded-full border-2 border-mint/40 px-4 py-2 text-sm font-bold text-mint transition-colors hover:bg-mint/10"
            >
              Mark known
            </button>
          )}
          <button
            onClick={() => act("reset")}
            className="rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
          >
            Reset progress
          </button>
          <button
            onClick={() => {
              onRemove(current.id);
              onClose();
            }}
            className="ml-auto rounded-full border-2 border-sakura/40 px-4 py-2 text-sm font-bold text-sakura transition-colors hover:bg-sakura/10"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
