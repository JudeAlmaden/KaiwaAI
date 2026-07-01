"use client";

import { useEffect, useState } from "react";
import { Surface, Chip } from "../ui";
import { moodFor } from "@/lib/outreach";
import { getProactiveChat, setProactiveChat } from "@/lib/proactive-config";

type Settings = {
  mode: "off" | "scheduled" | "random";
  times: string[];
  quietStart: number;
  quietEnd: number;
  consecutiveIgnored: number;
};

const MOOD_LABEL: Record<string, string> = {
  cheerful: "😊 Cheerful",
  hopeful: "🙂 Hopeful",
  wistful: "🥺 Misses you",
  sad: "😢 Sad",
  givingUp: "💧 Giving up",
  dormant: "😴 Resting (stopped reaching out)",
};

export default function OutreachCard() {
  const [s, setS] = useState<Settings | null>(null);
  // Scheduled-times mode is disabled for now (see "When" chips below); Kai
  // reaches out at random instead. Restore alongside the times editor.
  // const [newTime, setNewTime] = useState("19:00");

  useEffect(() => {
    fetch("/api/settings/outreach")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);

  async function save(patch: Partial<Settings>) {
    const res = await fetch("/api/settings/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setS(await res.json());
  }

  if (!s) {
    return (
      <Surface>
        <h2 className="font-display text-lg font-bold">Kai reaching out</h2>
        <p className="mt-1 text-sm text-muted">Loading…</p>
      </Surface>
    );
  }

  const mood = moodFor(s.consecutiveIgnored);

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">Kai reaching out</h2>
      <p className="mt-1 text-sm text-muted">
        Let Kai message you first. She notices if you&apos;ve been away — and if
        ignored too long, she&apos;ll quietly stop until you come back. Requires
        background mode (above).
      </p>

      <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        When
      </p>
      <div className="flex flex-wrap gap-2">
        {/*
          "Set times" (scheduled) is disabled for now — the once-daily cron on
          Vercel Hobby can't honor user-picked times, so Kai reaches out at
          random within active hours instead. To restore: add "scheduled" back
          to this list and un-comment the Times editor + newTime state below.
        */}
        {(["off", "random"] as const).map((m) => (
          <Chip key={m} active={s.mode === m} onClick={() => save({ mode: m })}>
            {m === "off" ? "Off" : "Random"}
          </Chip>
        ))}
      </div>

      {/*
      {s.mode === "scheduled" && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Times
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {s.times.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-indigo-ai/10 px-3 py-1.5 text-sm font-bold text-indigo-ai"
              >
                {t}
                <button
                  onClick={() => save({ times: s.times.filter((x) => x !== t) })}
                  className="text-indigo-ai/60 hover:text-sakura"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-full border-2 border-border bg-card px-3 py-1 text-sm outline-none focus:border-indigo-ai"
            />
            <button
              onClick={() =>
                !s.times.includes(newTime) &&
                save({ times: [...s.times, newTime] })
              }
              className="rounded-full bg-indigo-ai px-3 py-1.5 text-sm font-bold text-white"
            >
              + Add
            </button>
          </div>
        </div>
      )}
      */}

      {s.mode !== "off" && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              Quiet from
            </span>
            <HourSelect
              value={s.quietStart}
              onChange={(v) => save({ quietStart: v })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              until
            </span>
            <HourSelect
              value={s.quietEnd}
              onChange={(v) => save({ quietEnd: v })}
            />
          </label>
        </div>
      )}

      {s.mode !== "off" && (
        <p className="mt-4 border-t-2 border-border pt-3 text-sm">
          <span className="text-muted">Kai&apos;s mood right now: </span>
          <span className="font-bold">{MOOD_LABEL[mood]}</span>
        </p>
      )}

      <ProactiveToggle />
    </Surface>
  );
}

/** In-chat proactivity: Kai messaging first / following up while you're online.
 *  Client-only setting (BYOK, localStorage) like the model preferences. */
function ProactiveToggle() {
  const [on, setOn] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOn(getProactiveChat()), []);

  function toggle() {
    const next = !on;
    setOn(next);
    setProactiveChat(next);
  }

  return (
    <div className="mt-4 border-t-2 border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Chats first while you&apos;re here</p>
          <p className="text-xs text-muted">
            Kai may say hi or add a little follow-up on her own while you have
            the chat open.
          </p>
        </div>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={on}
          aria-label="Toggle in-chat proactivity"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? "bg-indigo-ai" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function HourSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-ai"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}
