"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Kai from "../../Kai";
import PageHeader from "../PageHeader";

type Memory = {
  id: string;
  content: string;
  category: string;
  importance: number;
  createdAt: string;
};

const CATEGORIES = ["profile", "preference", "fact", "goal", "relationship"];

const CATEGORY_EMOJI: Record<string, string> = {
  profile: "🙂",
  preference: "💜",
  fact: "📌",
  goal: "🎯",
  relationship: "🤝",
};

export default function MemoryClient() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState("fact");
  const [personas, setPersonas] = useState<{ id: string; name: string; avatar: string; builtin: boolean }[]>([]);
  // Which persona's memory we're viewing (a real persona id, "" until loaded).
  const [activePersona, setActivePersona] = useState("");
  const searchParams = useSearchParams();
  const requestedPersona = searchParams.get("persona");

  const load = useCallback((personaId: string) => {
    if (!personaId) return;
    fetch(`/api/memory?personaId=${encodeURIComponent(personaId)}`)
      .then((r) => r.json())
      .then((d) => setMemories(d.memories ?? []))
      .catch(() => setMemories([]));
  }, []);

  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        const list = d.personas ?? [];
        setPersonas(list);
        // Honor a ?persona=<id> deep link; else default to Kai, else first.
        setActivePersona((cur) => {
          if (cur) return cur;
          if (
            requestedPersona &&
            list.some((p: { id: string }) => p.id === requestedPersona)
          ) {
            return requestedPersona;
          }
          const kai = list.find(
            (p: { builtin: boolean; name: string }) => p.builtin && p.name === "Kai"
          );
          return kai?.id ?? list[0]?.id ?? "";
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activePersona) return;
    setMemories(null);
    load(activePersona);
  }, [load, activePersona]);

  const activeName =
    personas.find((p) => p.id === activePersona)?.name ?? "Persona";

  async function add() {
    const content = draft.trim();
    if (!content) return;
    setAdding(true);
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        category,
        personaId: activePersona,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setMemories((m) => (m ? [d.memory, ...m] : [d.memory]));
      setDraft("");
    }
    setAdding(false);
  }

  async function remove(id: string) {
    setMemories((m) => m?.filter((x) => x.id !== id) ?? null);
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Persona Memory"
        jp="日記"
        subtitle="What each persona remembers about you. Edit anytime."
      />

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {/* persona switcher */}
          <div className="mb-4 flex flex-wrap gap-2">
            {personas.map((p) => (
              <PersonaTab
                key={p.id}
                active={activePersona === p.id}
                onClick={() => setActivePersona(p.id)}
                label={`${p.avatar} ${p.name}`}
              />
            ))}
          </div>

          {/* diary book */}
          <div className="overflow-hidden rounded-2xl border-2 border-border shadow-md">
            {/* cover header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-ai to-indigo-soft px-5 py-4 text-white">
              <Kai size={36} />
              <div>
                <p className="font-display text-lg font-extrabold">
                  {activeName}&apos;s Diary
                </p>
                <p className="font-jp text-xs text-white/80">
                  あなたのこと、おぼえています
                </p>
              </div>
            </div>

            {/* lined paper */}
            <div className="diary-paper px-5 py-5 sm:pl-14">
              {/* add entry */}
              <div className="mb-5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Tell Kai something to remember… (e.g. I have a cat named Pochi)"
                  rows={2}
                  className="w-full resize-none rounded-xl border-2 border-border bg-white/70 px-3 py-2 font-jp text-sm leading-8 outline-none focus:border-indigo-ai"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-full border-2 border-border bg-white px-3 py-1.5 text-xs font-bold capitalize outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_EMOJI[c]} {c}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={add}
                    disabled={adding || !draft.trim()}
                    className="ml-auto rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-50"
                  >
                    {adding ? "Saving…" : "Add memory"}
                  </button>
                </div>
              </div>

              {/* entries */}
              {memories === null ? (
                <p className="py-6 text-center text-sm text-muted">Loading…</p>
              ) : memories.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-jp text-base text-indigo-ai">
                    まだ何も書いていません
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Kai hasn&apos;t written anything down yet. As you chat, she&apos;ll
                    remember things here — or add one yourself above.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {memories.map((m) => (
                    <li
                      key={m.id}
                      className="group flex items-start gap-3 py-2 leading-8"
                    >
                      <span className="mt-0.5 text-base">
                        {CATEGORY_EMOJI[m.category] ?? "📌"}
                      </span>
                      <p className="flex-1 font-jp text-[15px] text-foreground">
                        {m.content}
                      </p>
                      <button
                        onClick={() => remove(m.id)}
                        className="text-xs text-muted/50 opacity-0 transition-opacity hover:text-sakura group-hover:opacity-100"
                        aria-label="Forget this"
                        title="Forget this"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            {activeName} injects these notes into your conversations to remember
            you.
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonaTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
        active
          ? "border-indigo-ai bg-indigo-ai text-white"
          : "border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
      }`}
    >
      {label}
    </button>
  );
}
