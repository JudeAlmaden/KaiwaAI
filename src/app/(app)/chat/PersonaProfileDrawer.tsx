"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { X, Plus, Trash, BookBookmark, Sparkle, Gear } from "@phosphor-icons/react/dist/ssr";

type Memory = {
  id: string;
  content: string;
  category: string;
  importance: number;
  createdAt: string;
};

type PersonaInfo = {
  id: string;
  name: string;
  avatar: string;
  personality?: string | null;
  blurb?: string | null;
  builtin?: boolean;
};

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"];

const CATEGORY_EMOJI: Record<string, string> = {
  profile: "🙂",
  preference: "💜",
  fact: "📌",
  goal: "🎯",
  relationship: "🤝",
};

export default function PersonaProfileDrawer({
  persona,
  onClose,
}: {
  persona: PersonaInfo;
  onClose: () => void;
}) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("fact");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMemories = useCallback(() => {
    if (!persona.id) return;
    fetch(`/api/memory?personaId=${encodeURIComponent(persona.id)}`)
      .then((r) => r.json())
      .then((d) => setMemories(d.memories ?? []))
      .catch(() => setMemories([]));
  }, [persona.id]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  async function handleAdd() {
    const content = draft.trim();
    if (!content || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          category,
          personaId: persona.id,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setMemories((m) => (m ? [d.memory, ...m] : [d.memory]));
        setDraft("");
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setDeletingId(id);
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null);
    try {
      await fetch(`/api/memory/${id}`, { method: "DELETE" });
    } catch {
      loadMemories(); // Restore on error
    } finally {
      setDeletingId(null);
    }
  }

  const isKai = persona.name.trim().toLowerCase() === "kai";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l-2 border-border bg-card shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <BookBookmark size={20} className="text-indigo-ai" />
            <h2 className="font-display text-base font-extrabold text-foreground">
              Persona Profile & Memory
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-border/60 hover:text-foreground"
            aria-label="Close panel"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Persona Card */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-ai/20 bg-gradient-to-br from-indigo-ai/10 via-card to-sakura/5 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Avatar name={persona.name} emoji={persona.avatar} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-xl font-extrabold text-foreground">
                    {persona.name}
                  </h3>
                  <span className="rounded-full bg-indigo-ai/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-ai">
                    {isKai ? "AI Companion" : "AI Persona"}
                  </span>
                </div>

                {persona.blurb && (
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {persona.blurb}
                  </p>
                )}
              </div>
            </div>

            {persona.personality && (
              <div className="mt-4 rounded-2xl border border-indigo-ai/15 bg-card/80 p-3 text-xs leading-relaxed text-foreground/90 backdrop-blur-xs">
                <span className="font-bold text-indigo-ai">Personality Prompt: </span>
                {persona.personality}
              </div>
            )}
          </div>

          {/* Persona Memories Section */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkle size={18} className="text-indigo-ai" weight="fill" />
                <h4 className="font-display text-sm font-extrabold text-foreground">
                  What {persona.name} Remembers
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/settings"
                  title="Manage memory & AI preferences in Settings"
                  className="flex items-center gap-1 rounded-full bg-border/40 px-2 py-0.5 text-[10px] font-bold text-muted hover:text-indigo-ai transition-colors"
                >
                  <Gear size={12} />
                  Settings
                </Link>
                <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-bold text-muted">
                  {memories ? memories.length : "…"}
                </span>
              </div>
            </div>

            {/* Quick Add Memory */}
            <div className="rounded-2xl border-2 border-border bg-card p-3 shadow-xs">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Teach ${persona.name} something about you (e.g. I live in Tokyo)…`}
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-bg/50 px-3 py-2 text-xs font-jp outline-none focus:border-indigo-ai focus:bg-card"
              />
              <div className="mt-2 flex items-center justify-between">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-bold capitalize outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c]} {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={adding || !draft.trim()}
                  className="flex items-center gap-1 rounded-full bg-indigo-ai px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-50"
                >
                  <Plus size={14} weight="bold" />
                  <span>{adding ? "Saving…" : "Add"}</span>
                </button>
              </div>
            </div>

            {/* Memory entries list */}
            {memories === null ? (
              <div className="py-6 text-center text-xs text-muted">Loading memories…</div>
            ) : memories.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
                <p className="font-jp text-xs font-bold text-indigo-ai">
                  まだ覚えていません
                </p>
                <p className="mt-1 text-xs text-muted">
                  {persona.name} hasn&apos;t saved any facts about you yet. As you chat, she automatically notes down important details here!
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {memories.map((m) => (
                  <li
                    key={m.id}
                    className={`group flex items-start gap-2.5 rounded-2xl border-2 border-border bg-card p-3 transition-all hover:border-indigo-ai/40 ${
                      deletingId === m.id ? "opacity-40" : ""
                    }`}
                  >
                    <span className="mt-0.5 text-base shrink-0">
                      {CATEGORY_EMOJI[m.category] ?? "📌"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-jp text-xs font-medium text-foreground leading-relaxed">
                        {m.content}
                      </p>
                      <span className="mt-1 block text-[10px] uppercase font-bold text-muted/60">
                        {m.category}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-muted/60 transition-colors hover:text-sakura group-hover:opacity-100"
                      title="Forget this memory"
                      aria-label="Forget this memory"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between border-t-2 border-border bg-bg/50 px-5 py-3 text-xs">
          <span className="font-semibold text-muted">
            Memories are saved automatically
          </span>
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-1 text-indigo-ai hover:underline font-bold"
          >
            <Gear size={14} />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
