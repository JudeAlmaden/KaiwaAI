"use client";

import React, { useMemo, useState } from "react";
import { SpeakerHigh, Info, BookOpen, Shuffle } from "@phosphor-icons/react";
import { speakJa, canSpeak } from "@/lib/speak";
import {
  buildGodan,
  buildIchidan,
  buildIAdj,
  buildNaAdj,
  type FormRow,
  type GodanEnding,
} from "@/lib/review/conjugation";

/* ── Pure conjugation helpers ─────────────────────────────────────────────── */

const GODAN_EX: Record<string, string> = {
  う: "会う (あう / meet)",
  く: "書く (かく / write)",
  ぐ: "泳ぐ (およぐ / swim)",
  す: "話す (はなす / speak)",
  つ: "持つ (もつ / hold)",
  ぬ: "死ぬ (しぬ / die)",
  ぶ: "飛ぶ (とぶ / fly)",
  む: "飲む (のむ / drink)",
  る: "切る (きる / cut)",
};

type Category = "godan" | "ichidan" | "i-adj" | "na-adj";

/* ── Sample dictionaries ──────────────────────────────────────────────────── */

const SAMPLES: Record<Category, { dict: string; meaning: string }[]> = {
  godan: [
    { dict: "会う", meaning: "to meet" },
    { dict: "書く", meaning: "to write" },
    { dict: "泳ぐ", meaning: "to swim" },
    { dict: "話す", meaning: "to speak" },
    { dict: "持つ", meaning: "to hold" },
    { dict: "飲む", meaning: "to drink" },
    { dict: "切る", meaning: "to cut" },
    { dict: "買う", meaning: "to buy" },
  ],
  ichidan: [
    { dict: "食べる", meaning: "to eat" },
    { dict: "見る", meaning: "to see / look" },
    { dict: "起きる", meaning: "to wake up" },
    { dict: "寝る", meaning: "to sleep" },
    { dict: "借りる", meaning: "to borrow" },
    { dict: "教える", meaning: "to teach / tell" },
  ],
  "i-adj": [
    { dict: "高い", meaning: "tall / expensive" },
    { dict: "新しい", meaning: "new" },
    { dict: "安い", meaning: "cheap" },
    { dict: "大きい", meaning: "big" },
    { dict: "小さい", meaning: "small" },
    { dict: "可愛い", meaning: "cute" },
    { dict: "難しい", meaning: "difficult" },
  ],
  "na-adj": [
    { dict: "綺麗", meaning: "pretty / clean" },
    { dict: "静か", meaning: "quiet" },
    { dict: "有名", meaning: "famous" },
    { dict: "元気", meaning: "healthy / energetic" },
    { dict: "簡単", meaning: "simple / easy" },
    { dict: "丁寧", meaning: "polite / careful" },
  ],
};

const CATEGORIES: { id: Category; title: string; subtitle: string; accent: string }[] = [
  { id: "godan",     title: "Godan (u-verbs)",   subtitle: "Consonant-stem · 5-row inflection", accent: "bg-indigo-ai/10 text-indigo-ai border-indigo-ai/20" },
  { id: "ichidan",   title: "Ichidan (ru-verbs)", subtitle: "Vowel-stem · drop る and add endings", accent: "bg-mint/10 text-mint border-mint/20" },
  { id: "i-adj",     title: "I-adjectives",       subtitle: "Ends in い · ~くない / ~かった",    accent: "bg-sakura/10 text-sakura border-sakura/20" },
  { id: "na-adj",    title: "Na-adjectives",      subtitle: "Stem · add な (noun), だ (copula)",  accent: "bg-amber/10 text-amber border-amber/20" },
];

/* ── UI ───────────────────────────────────────────────────────────────────── */

function Speaker({ text }: { text: string }) {
  if (!canSpeak() || !text) return null;
  return (
    <button
      type="button"
      onClick={() => speakJa(text)}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface/60 text-muted hover:text-indigo-ai hover:bg-indigo-ai/10 transition-colors"
      title={`Play ${text}`}
    >
      <SpeakerHigh size={14} />
    </button>
  );
}

function HighlightedWord({ stem, ending, stemClass = "text-foreground" }: { stem: string; ending: string; stemClass?: string }) {
  return (
    <span className="font-jp">
      <span className={stemClass}>{stem}</span>
      <span className="text-indigo-ai font-bold">{ending}</span>
    </span>
  );
}

export default function ConjugationTutorial() {
  const [category, setCategory] = useState<Category>("godan");
  const samples = SAMPLES[category];
  const [sampleIdx, setSampleIdx] = useState(0);
  const [customInput, setCustomInput] = useState("");

  const activeSample = samples[sampleIdx] ?? samples[0];
  const dict = customInput.trim() || activeSample.dict;
  const meaning = customInput.trim() ? "" : activeSample.meaning;

  const rows = useMemo(() => {
    switch (category) {
      case "godan":   return buildGodan(dict);
      case "ichidan": return buildIchidan(dict);
      case "i-adj":   return buildIAdj(dict);
      case "na-adj":  return buildNaAdj(dict);
    }
  }, [category, dict]);

  function randomSample() {
    setCustomInput("");
    setSampleIdx((prev) => {
      let next = Math.floor(Math.random() * samples.length);
      if (samples.length > 1) while (next === prev) next = Math.floor(Math.random() * samples.length);
      return next;
    });
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-10">
      {/* Intro */}
      <div className="rounded-3xl border-2 border-indigo-ai/20 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-indigo-ai/10 p-2 text-indigo-ai">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Conjugation cheat-sheet</h2>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Pick a category, pick a sample word, and every form you&apos;ll see in your SRS reviews
              is laid out below with the transformation rule. Everything lines up with the exact
              <span className="px-1 font-mono text-xs rounded bg-border/40">formType</span>
              names used in the database (Masu-form, Te-form, Plain-past, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* Category picker */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setCustomInput("");
              setSampleIdx(0);
            }}
            className={`rounded-2xl border-2 p-3 text-left transition-all ${
              category === c.id
                ? `${c.accent} shadow-sm -translate-y-0.5`
                : "border-border/60 bg-card text-foreground hover:border-border"
            }`}
          >
            <div className="text-sm font-bold">{c.title}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-muted">{c.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Sample / custom word input */}
      <div className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
              Sample words
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={randomSample}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:text-indigo-ai hover:border-indigo-ai/40"
              title="Random sample"
            >
              <Shuffle size={14} />
              Shuffle
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {samples.map((s, i) => (
            <button
              key={s.dict}
              type="button"
              onClick={() => {
                setCustomInput("");
                setSampleIdx(i);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                !customInput.trim() && i === sampleIdx
                  ? "border-indigo-ai bg-indigo-ai text-white"
                  : "border-border bg-surface/40 text-foreground hover:border-indigo-ai/50"
              }`}
            >
              <span className="font-jp font-semibold">{s.dict}</span>
              <span className="ml-1.5 text-muted opacity-80">· {s.meaning}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-muted font-display mb-1.5">
            … or type your own dictionary form
          </label>
          <div className="flex items-stretch gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={
                category === "godan" ? "e.g. 走る (はしる)" :
                category === "ichidan" ? "e.g. 忘れる (わすれる)" :
                category === "i-adj" ? "e.g. 面白い" :
                "e.g. 好き"
              }
              className="flex-1 rounded-2xl border border-border bg-surface/40 px-4 py-2.5 font-jp text-base text-foreground placeholder:text-muted/50 focus:outline-none focus:border-indigo-ai focus:ring-2 focus:ring-indigo-ai/20"
            />
            {customInput.trim() && (
              <button
                type="button"
                onClick={() => setCustomInput("")}
                className="rounded-2xl border border-border px-3 py-2 text-xs font-bold text-muted hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main card: base word + results */}
      <div className="rounded-3xl border-2 border-indigo-ai/15 bg-card shadow-sm">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-border/50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
              Dictionary form
            </div>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <Speaker text={dict} />
              <span className="font-jp text-3xl sm:text-4xl font-bold text-foreground leading-tight break-all">
                {dict}
              </span>
              {meaning && (
                <span className="ml-1 rounded-full bg-border/40 px-2.5 py-0.5 text-xs font-semibold text-muted whitespace-nowrap">
                  {meaning}
                </span>
              )}
            </div>
            {"error" in rows || rows.length === 0 ? null : (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                <span className={`rounded-full border px-2 py-0.5 ${CATEGORIES.find(c => c.id === category)?.accent}`}>
                  {CATEGORIES.find(c => c.id === category)?.title.split(" ")[0]}
                </span>
                {category === "godan" && (
                  <span className="rounded-full bg-border/40 px-2 py-0.5">
                    Ends in {Array.from(dict).slice(-1)[0]} · pattern: {GODAN_EX[(Array.from(dict).slice(-1)[0]) as GodanEnding] ?? ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {"error" in rows || rows.length === 0 ? null : (
            <div className="flex items-center gap-1 rounded-2xl bg-indigo-ai/5 border border-indigo-ai/15 px-3 py-1.5 text-xs">
              <Info size={14} className="text-indigo-ai" />
              <span className="text-muted">
                Tap the headword or any form to 🔊 play Japanese audio
              </span>
            </div>
          )}
        </div>

        {"error" in rows ? (
          <div className="p-5">
            <div className="rounded-2xl border border-sakura/30 bg-sakura/5 p-3.5 text-sm text-sakura font-semibold">
              {rows.error}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((r) => (
              <div key={r.formType} className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-12 sm:gap-4">
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => speakJa(r.result)}
                    className="flex items-center gap-2 text-left group"
                  >
                    <div className="font-jp text-lg sm:text-xl font-bold text-foreground break-all group-hover:text-indigo-ai transition-colors">
                      {r.result}
                    </div>
                    <SpeakerHigh size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
                <div className="sm:col-span-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
                    Form
                  </div>
                  <div className="text-sm font-semibold text-foreground">{r.label}</div>
                </div>
                <div className="sm:col-span-6">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">
                    Rule
                  </div>
                  <div className="mt-0.5 text-sm text-foreground leading-relaxed">
                    {renderRule(r)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick reminders */}
      {category === "godan" ? (
        <RememberCard title="Reminder · う, つ, る → って (small tsu!)">
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            <li>会う → 会<span className="font-bold text-sakura">って</span>, 持つ → 持<span className="font-bold text-sakura">って</span>, 切る → 切<span className="font-bold text-sakura">って</span></li>
            <li>く→いて、ぐ→いで (sound change for カ/ガ row)</li>
            <li>ぬ/ぶ/む → んで (nasal ん sound + で)</li>
            <li>す → して (easy, just す→し)</li>
          </ul>
        </RememberCard>
      ) : category === "ichidan" ? (
        <RememberCard title="Reminder · All Ichidan forms drop the final る">
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            <li>食べ<span className="line-through opacity-40">る</span> → 食べ<strong className="text-mint">ます</strong> / 食べ<strong className="text-mint">て</strong> / 食べ<strong className="text-mint">た</strong> / 食べ<strong className="text-mint">ない</strong></li>
            <li>No sound changes, no っ/ん surprises — if it looks like it fits, it&apos;s ichidan.</li>
            <li>Edge cases that look like ichidan but are actually godan (走る・切る・帰る…): learn them per-word.</li>
          </ul>
        </RememberCard>
      ) : category === "i-adj" ? (
        <RememberCard title="Reminder · Always drop い first">
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            <li>高<span className="line-through opacity-40">い</span> → 高<strong className="text-sakura">くない</strong> · 高<strong className="text-sakura">かった</strong> · 高<strong className="text-sakura">くなかった</strong></li>
            <li>例外 (irregular): いい (good) → よ<strong className="text-sakura">くない</strong> / よ<strong className="text-sakura">かった</strong>. (Not いくない / いかった !)</li>
            <li>かっこいい conjugates like いい → かっこ<strong>よかった</strong></li>
          </ul>
        </RememberCard>
      ) : (
        <RememberCard title="Reminder · な-adjectives are nouns with personality">
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted">
            <li>Before a noun: add な — 静か<strong className="text-amber">な</strong> 場所 (a quiet place)</li>
            <li>Polite &quot;is X&quot;: stem + です — 静か<strong className="text-amber">です</strong></li>
            <li>Casual &quot;is X&quot;: stem + だ — 静か<strong className="text-amber">だ</strong></li>
            <li>Negation / past: use じゃない / だった / じゃなかった (same patterns as the copula だ)</li>
          </ul>
        </RememberCard>
      )}
    </div>
  );
}

/* ── Small helpers for rendering rules with color accents ─────────────────── */

function renderRule(r: FormRow) {
  // Return JSX that highlights the added suffix in indigo-ai so the "rule change" is visual.
  return <RuleText rule={r.rule} />;
}

function RuleText({ rule }: { rule: string }) {
  // Find and highlight the hiragana suffix portion after an arrow "→ " if present.
  const m = rule.match(/^(.*→\s*)([\p{Script=Hiragana}\p{Script=Katakana}０-９A-Za-zー〜・()\[\]／、「」「」\s]+)(\s?.*)$/u);
  if (!m) return <>{rule}</>;
  return (
    <>
      <span className="text-muted">{m[1]}</span>
      <span className="font-jp font-bold text-indigo-ai">{m[2]}</span>
      <span className="text-muted">{m[3]}</span>
    </>
  );
}

function RememberCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-mint/20 bg-mint/5 p-5">
      <h3 className="text-sm font-bold text-mint flex items-center gap-1.5">
        <Info size={16} /> {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export { HighlightedWord };
