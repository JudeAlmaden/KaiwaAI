"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChatCircleText,
  Cards,
  ArrowRight,
  Fire,
} from "@phosphor-icons/react";
import type { DashboardStats } from "@/lib/dashboard-stats";

function getKaiSpeech(stats: DashboardStats | null, hour: number) {
  if (!stats) return "Loading your progress…";
  if (stats.dueNow > 0) {
    const lateNight = hour < 5 || hour >= 22;
    if (lateNight) {
      return `${stats.dueNow} card${stats.dueNow === 1 ? "" : "s"} in your queue — quick review or save for tomorrow.`;
    }
    return `You have ${stats.dueNow} review${stats.dueNow === 1 ? "" : "s"} ready!`;
  }
  if (stats.streak > 3) return `${stats.streak} day streak! Amazing consistency! 🔥`;
  return "Ready for a conversation today?";
}

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

function greetingForHour(h: number) {
  if (h < 5) return "おやすみなさい";
  if (h < 11) return "おはよう";
  if (h < 17) return "こんにちは";
  return "こんばんは";
}

const cardShell =
  "p-3 sm:p-3.5 lg:p-5 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg transition-all flex flex-col justify-between min-h-[88px] sm:min-h-[110px] lg:min-h-[130px]";

export default function HomeClient({ initialStats }: { initialStats: DashboardStats }) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
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

  const ready = stats !== null;
  const known = stats?.vocab.known ?? 0;
  const kanjiKnown = stats?.kanji.known ?? 0;
  const streak = stats?.streak ?? 0;
  const dueNow = stats?.dueNow ?? 0;
  const reviewFirst = ready && dueNow > 0;
  const kaiSpeech = getKaiSpeech(stats, hour);
  const firstName = stats?.name?.trim().split(" ")[0];

  const reviewCard = (
    <Link href="/review" className={`group ${reviewFirst ? "order-1" : "order-2"}`}>
      <div
        className={`${cardShell} hover:shadow-xl hover:-translate-y-0.5 ${
          !ready
            ? "animate-pulse border border-border/80 bg-white"
            : reviewFirst
              ? "bg-gradient-to-br from-indigo-ai to-indigo-ai/80 text-white ring-2 ring-indigo-ai/30"
              : "bg-white text-foreground shadow-md border border-border/80"
        }`}
      >
        <div>
          <Cards
            size={20}
            weight={reviewFirst ? "fill" : "duotone"}
            className={`${reviewFirst ? "" : "text-mint"} sm:w-6 sm:h-6 lg:w-8 lg:h-8`}
          />
          <h2 className="font-display text-sm lg:text-base font-bold mb-0.5 mt-1 sm:mt-1.5 leading-tight">
            Review Cards
          </h2>
          <p
            className={`text-xs lg:text-sm leading-snug ${!ready ? "text-transparent bg-muted/20 rounded" : reviewFirst ? "text-white/85" : "text-muted"}`}
          >
            {ready ? (dueNow > 0 ? `${dueNow} waiting` : "All caught up!") : "—"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs lg:text-sm font-semibold mt-1.5">
          <span>{dueNow > 0 ? "Review" : "Practice"}</span>
          <ArrowRight
            size={12}
            weight="bold"
            className="group-hover:translate-x-1 transition-transform sm:w-3 sm:h-3 lg:w-4 lg:h-4"
          />
        </div>
      </div>
    </Link>
  );

  const chatCard = (
    <Link href="/chat" className={`group ${reviewFirst ? "order-2" : "order-1"}`}>
      <div
        className={`${cardShell} hover:shadow-xl hover:-translate-y-0.5 ${
          !ready
            ? "animate-pulse border border-border/80 bg-white"
            : reviewFirst
              ? "bg-white text-foreground border border-border/80 shadow-md"
              : "bg-gradient-to-br from-indigo-ai to-indigo-ai/80 text-white ring-2 ring-indigo-ai/20"
        }`}
      >
        <div>
          <ChatCircleText
            size={20}
            weight="fill"
            className={`mb-1 sm:mb-1.5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 ${reviewFirst ? "text-indigo-ai" : ""}`}
          />
          <h2 className="font-display text-sm lg:text-base font-bold mb-0.5 leading-tight">
            Chat with Kai
          </h2>
          <p
            className={`text-xs lg:text-sm leading-snug ${reviewFirst ? "text-muted" : ready ? "text-white/80" : "text-transparent bg-muted/20 rounded"}`}
          >
            Practice conversation
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs lg:text-sm font-semibold mt-1.5">
          <span>Start</span>
          <ArrowRight
            size={12}
            weight="bold"
            className="group-hover:translate-x-1 transition-transform sm:w-3 sm:h-3 lg:w-4 lg:h-4"
          />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="relative flex flex-1 flex-col min-h-full bg-gradient-to-b from-[#fffaf8] via-white to-[#fffaf8] lg:min-h-0 lg:overflow-hidden">
      <div className="relative flex flex-1 flex-col justify-center min-h-0 px-2 sm:px-4 lg:px-8">
        <div className="relative w-full max-w-7xl mx-auto flex flex-1 flex-col justify-center min-h-0 py-2 sm:py-4">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-ai/10 via-sakura/5 to-transparent blur-3xl -z-10" />

          <div className="relative flex-1 flex items-center justify-center min-h-[140px] sm:min-h-[200px] lg:min-h-0">
            <Image
              src="/images/kai/banners/banner_.png"
              alt="Kai - Your Japanese learning companion"
              width={1400}
              height={700}
              priority
              className="w-full h-auto max-h-[min(42vh,420px)] sm:max-h-[min(48vh,520px)] lg:max-h-full object-contain drop-shadow-2xl scale-110 sm:scale-105 lg:scale-100"
            />
          </div>

          <div className="relative z-20 flex-shrink-0 px-2 -mt-4 sm:-mt-10 lg:-mt-16">
            <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl px-3 sm:px-5 lg:px-6 py-2.5 lg:py-3 text-center border border-indigo-ai/20 mx-auto max-w-sm sm:max-w-md lg:max-w-lg">
              <p className="text-sm lg:text-base font-bold text-foreground leading-tight">
                {firstName ? `${greeting}、${firstName}さん!` : `${greeting}!`}
              </p>
              <p className="text-xs lg:text-sm text-muted mt-1 leading-snug">{kaiSpeech}</p>

              <div className="mt-2.5 hidden lg:flex flex-col gap-2 sm:flex-row sm:justify-center">
                {reviewFirst ? (
                  <>
                    <Link
                      href="/review"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-ai px-4 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-[0.98]"
                    >
                      Review {dueNow} now
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                    <Link
                      href="/chat"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-4 py-2 text-xs font-bold text-foreground transition-transform active:scale-[0.98]"
                    >
                      Chat with Kai
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/chat"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-ai px-4 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-[0.98]"
                    >
                      Talk to Kai
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                    <Link
                      href="/review"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg px-4 py-2 text-xs font-bold text-foreground transition-transform active:scale-[0.98]"
                    >
                      Review cards
                    </Link>
                  </>
                )}
              </div>

              {streak > 0 && (
                <div className="hidden lg:inline-flex items-center gap-1.5 bg-indigo-ai/15 px-3 py-1 rounded-full mt-2">
                  <Fire size={14} weight="fill" className="text-indigo-ai shrink-0" />
                  <span className="text-xs font-bold text-indigo-ai whitespace-nowrap">{streak} day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-shrink-0 px-2 sm:px-4 lg:px-8 pt-1 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-4 mb-2">{reviewCard}{chatCard}</div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-ai" />
              <span className="font-bold text-foreground">
                <CountUp target={known} />
              </span>
              <span>vocab</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-mint" />
              {kanjiKnown === 0 ? (
                <Link href="/study?tab=kanji" className="font-bold text-mint hover:underline">
                  Start kanji
                </Link>
              ) : (
                <>
                  <span className="font-bold text-foreground">
                    <CountUp target={kanjiKnown} />
                  </span>
                  <span>kanji</span>
                </>
              )}
            </div>
            {stats?.masteredCount && stats.masteredCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber" />
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
