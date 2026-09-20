"use client";

import Kai from "./Kai";
import Link from "next/link";
import {
  ChatCircleDots,
  Compass,
  BookBookmark,
  ShieldCheck,
  Key,
  DeviceMobile,
  ArrowSquareOut,
  Heart,
  Sparkle,
  Lightning,
} from "@phosphor-icons/react";

export default function LandingFooter() {
  const currentYear = 2026;

  return (
    <footer className="relative z-10 border-t-2 border-border bg-card/60 backdrop-blur-xl text-foreground">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-40 w-full max-w-4xl rounded-full bg-gradient-to-b from-indigo-ai/10 via-sakura/5 to-transparent blur-3xl opacity-50" />

      {/* Decorative ghost kanji */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 bottom-4 select-none font-jp text-8xl font-black text-indigo-ai/[0.03] sm:text-9xl"
      >
        会話
      </span>

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 sm:px-10 sm:pt-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Col (spans 2 on lg) */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-display text-2xl font-extrabold tracking-tight hover:opacity-90 transition-opacity"
            >
              <Kai size={36} />
              <span>KaiwaAI</span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Your AI companion that helps you speak Japanese naturally. Real-time conversations, instant Furigana lookups, Spaced Repetition reviews, and immersive roleplay quests.
            </p>

            <div className="flex items-center gap-2 pt-1 font-jp text-xs text-muted/80">
              <span className="font-bold text-foreground">「言葉は心をつなぐ」</span>
              <span>— Words connect hearts</span>
            </div>

            {/* Live operational status pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-semibold text-mint">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              <span>Gemini 2.5 &amp; 3.0 Compatible · BYOK</span>
            </div>
          </div>

          {/* Col 1: Learning Tools */}
          <div className="space-y-3">
            <p className="font-display text-xs font-extrabold uppercase tracking-wider text-muted">
              App Features
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <ChatCircleDots size={16} weight="duotone" />
                  <span>AI Conversation</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 text-muted hover:text-amber transition-colors font-semibold"
                >
                  <Compass size={16} weight="duotone" />
                  <span>Roleplay Quests</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/vocab"
                  className="inline-flex items-center gap-2 text-muted hover:text-sky transition-colors font-semibold"
                >
                  <BookBookmark size={16} weight="duotone" />
                  <span>Vocabulary Deck</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/kanji"
                  className="inline-flex items-center gap-2 text-muted hover:text-mint transition-colors font-semibold"
                >
                  <Lightning size={16} weight="duotone" />
                  <span>Kanji &amp; RTK Lessons</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/review"
                  className="inline-flex items-center gap-2 text-muted hover:text-sakura transition-colors font-semibold"
                >
                  <Sparkle size={16} weight="duotone" />
                  <span>SRS Flashcards</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Platform & Focus */}
          <div className="space-y-3">
            <p className="font-display text-xs font-extrabold uppercase tracking-wider text-muted">
              Platform &amp; Tools
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/settings/app-blocker"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <ShieldCheck size={16} weight="duotone" />
                  <span>Focus Guard Blocker</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <DeviceMobile size={16} weight="duotone" />
                  <span>Android App &amp; APK</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <Key size={16} weight="duotone" />
                  <span>API Key Config</span>
                </Link>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <span>100% Client Privacy</span>
                </a>
              </li>
              <li>
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 text-muted hover:text-indigo-ai transition-colors font-semibold"
                >
                  <span>How KaiwaAI Works</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="space-y-3">
            <p className="font-display text-xs font-extrabold uppercase tracking-wider text-muted">
              Get Started
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-indigo-ai font-bold hover:underline"
                >
                  <span>Create Account</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted hover:text-foreground transition-colors font-semibold"
                >
                  <span>Log In</span>
                </Link>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-muted hover:text-foreground transition-colors font-semibold"
                >
                  <span>Feature Showcase</span>
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="text-muted hover:text-foreground transition-colors font-semibold"
                >
                  <span>Security &amp; Keys</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span>© {currentYear} KaiwaAI. Made with</span>
            <Heart size={14} weight="fill" className="text-sakura inline-block" />
            <span>for Japanese language learners.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy Guarantee
            </a>
            <span>·</span>
            <a href="#features" className="hover:text-foreground transition-colors">
              Interactive Features
            </a>
            <span>·</span>
            <a href="#how" className="hover:text-foreground transition-colors">
              3-Step Method
            </a>
            <span>·</span>
            <Link href="/settings" className="hover:text-foreground transition-colors">
              Settings &amp; BYOK
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
