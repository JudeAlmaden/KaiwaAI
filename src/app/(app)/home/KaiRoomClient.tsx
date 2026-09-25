"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cards,
  ChatCircleText,
  Fire,
  Sparkle,
} from "@phosphor-icons/react";
import type { DashboardStats } from "@/lib/dashboard-stats";
import {
  MOOD_PORTRAIT,
  consumeCelebration,
  greetingForHour,
  isLateNight,
  kaiLineFor,
  roomMoodFor,
  transientLineFor,
} from "@/lib/kai-mood";
import KaiAvatar, { type KaiAvatarHandle } from "./KaiAvatar";
import KaiSpeechBubble from "./KaiSpeechBubble";

type Phase = "greeting" | "base" | "transient";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(target);
  useEffect(() => {
    let started = false;
    const step = Math.ceil(Math.max(target, 0) / 30);
    const id = setInterval(() => {
      if (!started) {
        started = true;
        setCount(0);
        return;
      }
      setCount((c) => {
        const next = c + step;
        if (next >= target) {
          clearInterval(id);
          return target;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [target]);
  return (
    <>
      {count}
      {suffix}
    </>
  );
}

function LevelRing({ level, progress }: { level: string; progress: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const shortLevel = level.split(" ")[0];
  return (
    <div className="flex items-center gap-2 rounded-full border border-indigo-ai/25 bg-white/90 py-1 pl-1 pr-3 shadow-md backdrop-blur">
      <div className="relative h-9 w-9">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(124,92,255,0.18)" strokeWidth="3.5" />
          <motion.circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="var(--indigo)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - progress / 100) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-[10px] font-black text-indigo-ai">
          {shortLevel.slice(0, 2)}
        </span>
      </div>
      <div className="leading-tight">
        <p className="font-display text-[11px] font-black text-foreground">{level}</p>
        <p className="text-[10px] font-semibold text-muted">{progress}% to next</p>
      </div>
    </div>
  );
}

function HudPill({
  icon,
  value,
  label,
  href,
  tone = "indigo",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  href?: string;
  tone?: "indigo" | "amber";
}) {
  const body = (
    <div
      className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-3 shadow-md backdrop-blur transition-transform active:scale-95 ${
        tone === "amber"
          ? "border-amber/30 bg-white/90"
          : "border-indigo-ai/25 bg-white/90"
      }`}
    >
      {icon}
      <div className="flex items-baseline gap-1 leading-none">
        <span className="font-display text-sm font-black text-foreground">
          <CountUp target={typeof value === "number" ? value : 0} />
          {typeof value === "string" ? value : ""}
        </span>
        <span className="text-[10px] font-bold text-muted">{label}</span>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** One daily quest row. */
function Quest({
  done,
  label,
  href,
  cta,
}: {
  done: boolean;
  label: string;
  href: string;
  cta: string;
}) {
  const inner = (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${
        done
          ? "border-mint/40 bg-mint/10"
          : "border-border bg-white/90 hover:border-indigo-ai/40"
      }`}
    >
      <span
        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 ${
          done ? "border-mint bg-mint text-white" : "border-muted/40 bg-white"
        }`}
      >
        {done ? <span className="text-[9px] font-black">✓</span> : null}
      </span>
      <span
        className={`min-w-0 truncate text-[11px] font-bold sm:text-xs ${
          done ? "text-mint" : "text-foreground"
        }`}
      >
        {label}
      </span>
      {!done && (
        <span className="ml-auto hidden shrink-0 items-center gap-0.5 text-[10px] font-black text-indigo-ai sm:flex">
          {cta}
          <ArrowRight size={10} weight="bold" />
        </span>
      )}
    </div>
  );
  // Always wrap in the same Link so both columns flex identically
  // (an <A> + <DIV> pair splits unequally in the flex row).
  return (
    <Link href={href} className="min-w-0 flex-1">
      {inner}
    </Link>
  );
}

/** Chunky Duolingo-style game button. */
function GameButton({
  href,
  title,
  subtitle,
  icon,
  primary,
  onClick,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="group min-w-0 flex-1">
      <div
        className={`btn-pop flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 ${
          primary
            ? "bg-indigo-ai text-white shadow-[0_4px_0_0_var(--indigo-deep)]"
            : "border border-border bg-white text-foreground shadow-[0_4px_0_0_#e5ddf0]"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
            primary ? "bg-white/20" : "bg-indigo-ai/10"
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-display text-[13px] font-black sm:text-base">{title}</span>
          <span
            className={`block truncate text-[11px] font-semibold sm:text-xs ${
              primary ? "text-white/85" : "text-muted"
            }`}
          >
            {subtitle}
          </span>
        </span>
        <ArrowRight
          size={16}
          weight="bold"
          className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
            primary ? "text-white/90" : "text-indigo-ai"
          }`}
        />
      </div>
    </Link>
  );
}

export default function KaiRoomClient({ initialStats }: { initialStats: DashboardStats }) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
  const [phase, setPhase] = useState<Phase>("greeting");
  const [transient, setTransient] = useState<{ mood: "celebrate" | "poke" | "pet"; id: number } | null>(null);
  const transientId = useRef(0);
  const avatar = useRef<KaiAvatarHandle | null>(null);

  const { greeting, hour } = useMemo(() => {
    const h = new Date().getHours();
    return { hour: h, greeting: greetingForHour(h) };
  }, []);

  useEffect(() => {
    fetch("/api/activity", { method: "POST" }).catch(() => {});
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  // Greeting → base transition on mount; play a queued celebration if present.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const celebrated = consumeCelebration();
    timers.push(
      setTimeout(() => {
        avatar.current?.greet();
        setPhase("base");
      }, 1600)
    );
    if (celebrated) {
      setTransient({ mood: "celebrate", id: ++transientId.current });
      timers.push(
        setTimeout(() => {
          setPhase("base");
          setTransient(null);
        }, 3400)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const ready = stats !== null;
  const dueNow = stats?.dueNow ?? 0;
  const streak = stats?.streak ?? 0;
  const activeToday = stats?.activeToday ?? false;
  const reviewFirst = ready && dueNow > 0;

  const mood = roomMoodFor(stats, hour);
  const baseLine = kaiLineFor(mood, stats);
  const tempo = isLateNight(hour) ? 0.6 : mood === "proud" ? 1.35 : 1;

  const onAvatarChange = useCallback((handle: KaiAvatarHandle) => {
    avatar.current = handle;
  }, []);

  const bubble =
    phase === "greeting" ? (
      { title: `${greeting}!`, line: "…" }
    ) : transient ? (
      (() => {
        const t = transientLineFor(transient.mood, stats?.name);
        return { title: greeting, line: t.line };
      })()
    ) : (
      { title: greeting, line: baseLine }
    );

  const portraitOverride =
    transient
      ? MOOD_PORTRAIT[transient.mood]
      : phase === "greeting"
        ? MOOD_PORTRAIT.greeting
        : null;

  const titleName = stats?.name?.trim().split(" ")[0];
  const bubbleTitle =
    phase === "greeting"
      ? `${greeting}、${titleName ? `${titleName}さん` : ""}!`
      : bubble.title === greeting
        ? greeting
        : bubble.title;

  const questReviewDone = ready && dueNow === 0;
  const questChatDone = (stats?.messagesSent ?? 0) > 0 && activeToday;

  return (
    <div className="relative flex flex-1 flex-col min-h-full overflow-hidden bg-gradient-to-b from-[#fffaf8] via-white to-[#fff1f5] lg:min-h-0 lg:overflow-hidden">
      {/* Kai IS the room: full-bleed portrait at every breakpoint, tappable */}
      <div className="absolute inset-0">
        <KaiAvatar
          portrait={portraitOverride ?? MOOD_PORTRAIT[mood]}
          tempo={tempo}
          onChange={onAvatarChange}
        />
        {/* readability scrim so HUD, bubble, and quests stay legible */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/75 via-white/35 to-white/85"
        />
      </div>

      {/* pointer-events-none lets open areas tap through to the room;
          each interactive block re-enables events below. */}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0 px-3 pt-3 sm:px-5 lg:max-w-4xl lg:px-8 lg:pt-5">
        {/* ── HUD row ─────────────────────────────────────────────── */}
        <div className="pointer-events-auto flex flex-shrink-0 items-center justify-between gap-2">
          {ready ? (
            <LevelRing level={stats.progressLevel} progress={stats.progress} />
          ) : (
            <div className="h-11 w-36 animate-pulse rounded-full bg-white/80" />
          )}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <HudPill
              tone="amber"
              icon={<Fire size={14} weight="fill" className="text-amber" />}
              value={streak}
              label="streak"
            />
            <HudPill
              icon={<Cards size={14} weight="fill" className="text-indigo-ai" />}
              value={dueNow}
              label="due"
              href="/review"
            />
          </div>
        </div>

        {/* ── Kai (the room itself) ─────────────────────────────── */}
        <div className="min-h-0 w-full flex-1" />

        {/* ── Speech bubble ──────────────────────────────────────── */}
        <div className="relative z-20 w-full flex-shrink-0 pb-1 sm:mx-auto sm:max-w-2xl">
          <KaiSpeechBubble tail="up" title={bubbleTitle} line={bubble.line}>
            {phase !== "greeting" && streak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1">
                <Fire size={12} weight="fill" className="text-amber" />
                <span className="text-[11px] font-black text-amber">{streak} day streak</span>
              </span>
            )}
          </KaiSpeechBubble>
        </div>

        {/* ── Quest bar ──────────────────────────────────────────── */}
        <div className="pointer-events-auto flex-shrink-0 pb-1.5 pt-1">
          <div className="mb-1 flex items-center gap-1 px-1">
            <Sparkle size={11} weight="fill" className="text-amber" />
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              Today&apos;s quests
            </span>
          </div>
          <div className="flex gap-2 sm:gap-2.5 lg:gap-3">
            <Quest
              done={questReviewDone}
              label={dueNow > 0 ? `Review ${dueNow} card${dueNow === 1 ? "" : "s"}` : "Reviews cleared"}
              href="/review"
              cta="Review"
            />
            <Quest
              done={questChatDone}
              label={questChatDone ? "Chatted with Kai" : "Send a message to Kai"}
              href="/chat"
              cta="Chat"
            />
          </div>
        </div>

        {/* ── Game buttons ───────────────────────────────────────── */}
        <div className="pointer-events-auto flex-shrink-0 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="flex gap-2 sm:gap-2.5 lg:gap-3">
            <GameButton
              href="/review"
              primary={reviewFirst}
              title="Review Cards"
              subtitle={ready ? (dueNow > 0 ? `${dueNow} waiting` : "All caught up!") : "—"}
              icon={<Cards size={18} weight="fill" className={reviewFirst ? "text-white" : "text-indigo-ai"} />}
            />
            <GameButton
              href="/chat"
              primary={!reviewFirst}
              title="Chat with Kai"
              subtitle="Practice conversation"
              icon={
                <ChatCircleText
                  size={18}
                  weight="fill"
                  className={reviewFirst ? "text-indigo-ai" : "text-white"}
                />
              }
            />
          </div>

          {/* compact stats footer */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-indigo-ai" />
              <span className="font-bold text-foreground">
                <CountUp target={stats?.vocab.known ?? 0} />
              </span>
              <span>vocab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-mint" />
              <span className="font-bold text-foreground">
                <CountUp target={stats?.kanji.known ?? 0} />
              </span>
              <span>kanji</span>
            </div>
            {stats?.masteredCount && stats.masteredCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber" />
                <span className="font-bold text-foreground">
                  <CountUp target={stats.masteredCount} />
                </span>
                <span>mastered</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
