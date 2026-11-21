"use client";

import { useEffect, useMemo, useState } from "react";

export type Memory = {
  id: string;
  content: string;
  category: string;
  importance?: number;
  createdAt: string;
};

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  profile: "Profile",
  preference: "Preference",
  fact: "Fact",
  goal: "Goal",
  relationship: "Relationship",
};

export type MemoryModalProps = {
  chatId?: string | null;
  chatName?: string | null;
  chatKind?: string | null; // "group" | "dm" | "persona"
  personaId?: string | null;
  personaName?: string | null;
  onClose: () => void;
};

export default function MemoryModal({
  chatId,
  chatName,
  chatKind,
  personaId,
  personaName = "Kai",
  onClose,
}: MemoryModalProps) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState<string>("fact");
  const [busy, setBusy] = useState(false);

  // Close on Escape key and lock body scrolling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Load memories for this specific conversation
  const query = chatId
    ? `chatId=${encodeURIComponent(chatId)}`
    : personaId
      ? `personaId=${encodeURIComponent(personaId)}`
      : "";

  useEffect(() => {
    let cancelled = false;
    if (!query) {
      return;
    }

    fetch(`/api/memory?${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          setMemories(d?.memories ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMemories([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  async function addMemory() {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);

    try {
      const payload = {
        content,
        category: draftCategory,
        ...(chatId ? { chatId } : { personaId }),
      };

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const d = await res.json();
        if (d.memory) {
          setMemories((prev) => [
            d.memory,
            ...(prev ?? []).filter((m) => m.id !== d.memory.id),
          ]);
          setDraft("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeMemory(id: string) {
    setMemories((prev) => prev?.filter((m) => m.id !== id) ?? null);
    await fetch(`/api/memory/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const filteredMemories = useMemo(() => {
    if (!memories) return [];
    const list =
      activeCategory === "all"
        ? memories
        : memories.filter((m) => m.category === activeCategory);
    return [...list].sort(
      (a, b) => (b.importance ?? 0) - (a.importance ?? 0)
    );
  }, [memories, activeCategory]);

  const isGroup = chatKind === "group";
  const isDm = chatKind === "dm";
  const title = isGroup
    ? chatName ? `${chatName} memory` : "Group memory"
    : isDm
      ? "Chat memory"
      : `${personaName}'s memory`;

  const subtitle = isGroup
    ? `What ${personaName} remembers from this group. Only you can see this.`
    : isDm
      ? "Notes from this conversation. Only you can see them."
      : `Notes ${personaName} remembers about you in this conversation.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl border-2 border-border bg-card sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id="memory-modal-title" className="font-display text-lg font-bold">
              {title}
            </h2>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted/70 transition-colors hover:bg-border/60 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 py-2.5 border-b border-border/40 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              activeCategory === "all"
                ? "bg-indigo-ai text-white"
                : "border border-border bg-card text-muted hover:border-indigo-ai/50 hover:text-foreground"
            }`}
          >
            All {memories ? `(${memories.length})` : ""}
          </button>
          {CATEGORIES.map((cat) => {
            const count = memories?.filter((m) => m.category === cat).length ?? 0;
            const label = CATEGORY_LABELS[cat] ?? cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeCategory === cat
                    ? "bg-indigo-ai text-white"
                    : "border border-border bg-card text-muted hover:border-indigo-ai/50 hover:text-foreground"
                }`}
              >
                {label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Scrollable Memory List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-10 text-center text-xs text-muted">Loading memories…</div>
          ) : filteredMemories.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center my-4">
              <p className="text-sm font-bold text-foreground">No memories yet</p>
              <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
                {personaName} will naturally keep notes from this conversation, or you can add details below.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredMemories.map((m) => {
                const label = CATEGORY_LABELS[m.category] ?? m.category;
                return (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 transition-colors hover:border-indigo-ai/40"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1">
                        {label}
                      </span>
                      <p className="font-jp text-sm font-medium leading-relaxed text-foreground">
                        {m.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeMemory(m.id)}
                      className="shrink-0 text-xs font-semibold text-muted/60 transition-colors hover:text-sakura pt-0.5"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Memory Form at Bottom */}
        <div className="border-t border-border/60 bg-card p-3 sm:px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addMemory();
            }}
            className="flex items-center gap-2"
          >
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className="rounded-full border border-border bg-bg/50 px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-ai text-foreground"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a memory note for this chat…"
              className="min-w-0 flex-1 rounded-full border border-border bg-bg/50 px-3.5 py-1.5 text-xs outline-none placeholder:text-muted/60 transition-colors focus:border-indigo-ai focus:bg-card"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="shrink-0 rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
            >
              {busy ? "…" : "Add"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
