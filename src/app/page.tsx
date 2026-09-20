import Kai from "./Kai";
import { PopLink } from "./PopButton";
import HeroDemo from "./HeroDemo";
import Petals from "./Petals";
import LandingInteractiveCanvas from "./LandingInteractiveCanvas";
import LandingLookupExperience from "./LandingLookupExperience";
import LandingMemoryStory from "./LandingMemoryStory";
import LandingQuestRPG from "./LandingQuestRPG";
import LandingDeckCascade from "./LandingDeckCascade";
import LandingHowItWorks from "./LandingHowItWorks";
import LandingFeatureGrid from "./LandingFeatureGrid";
import LandingKanjiOrbit from "./LandingKanjiOrbit";
import LandingStatsTicker from "./LandingStatsTicker";
import LandingFooter from "./LandingFooter";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  Sparkle,
  Key,
  ArrowRight,
  ChatCircleDots,
  Fire,
  Users,
  Star,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-bg text-foreground">
      <Petals />

      {/* Ambient background glow effects */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-ai/12 via-purple-500/4 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-[1000px] h-[600px] w-[600px] rounded-full bg-sakura/8 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-[2000px] h-[400px] w-[400px] rounded-full bg-indigo-ai/6 blur-3xl" />

      {/* Giant ghost kanji background artwork */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-28 select-none font-jp text-[22rem] font-bold leading-none text-indigo-ai/[0.035] sm:text-[34rem]"
      >
        話
      </span>

      {/* ── TOP NAVIGATION ──────────────────────────────────────────── */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <span className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
          <Kai size={36} />
          KaiwaAI
        </span>

        {/* Nav links (desktop) */}
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#privacy" className="transition-colors hover:text-foreground">Privacy</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <PopLink href="/chat" variant="primary" size="md" className="gap-2 font-extrabold">
              <ChatCircleDots size={18} weight="fill" />
              <span>Open Chat</span>
            </PopLink>
          ) : (
            <>
              <PopLink href="/login" variant="secondary" size="md" className="font-extrabold hidden sm:inline-flex">
                Log In
              </PopLink>
              <PopLink href="/register" variant="primary" size="md" className="gap-1.5 font-extrabold">
                <span>Get Started</span>
                <ArrowRight size={16} weight="bold" />
              </PopLink>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6 sm:px-10 sm:py-8 lg:py-10 flex flex-col justify-center min-h-[calc(100vh-5.5rem)]">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left copy */}
          <div className="text-center lg:text-left">
            {/* Tagline badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md">
              <Sparkle size={14} weight="fill" /> Your AI friend who only speaks Japanese
            </span>

            {/* Headline */}
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
              Stop{" "}
              <span className="text-muted/50 line-through decoration-sakura decoration-4">
                studying
              </span>
              .<br />
              Start{" "}
              <span className="relative text-indigo-ai">
                talking
              </span>
              .
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted sm:text-lg lg:mx-0">
              Kai texts you in Japanese calibrated to your level. Tap any word to
              understand it, and it quietly becomes a flashcard. You learn by
              having a friend, not doing homework.
            </p>

            {/* CTA */}
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <PopLink href={user ? "/chat" : "/register"} className="gap-2">
                <span>{user ? "Go to Chat" : "Meet Kai"}</span>
                <ArrowRight size={18} weight="bold" />
              </PopLink>
              <span className="text-sm font-semibold text-muted">
                Free · bring your own Gemini key
              </span>
            </div>

            {/* Social proof chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 border border-amber/25 px-3 py-1 text-xs font-bold text-amber">
                <Fire size={13} weight="fill" /> Daily streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 border border-mint/25 px-3 py-1 text-xs font-bold text-mint">
                <Star size={13} weight="fill" /> N5 → N1 calibration
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-ai/10 border border-indigo-ai/25 px-3 py-1 text-xs font-bold text-indigo-ai">
                <Trophy size={13} weight="fill" /> Focus Guard
              </span>
            </div>

            <p className="mt-4 font-jp text-sm text-muted">
              「<span className="font-bold text-foreground">またね</span>」— see you tomorrow, right?
            </p>
          </div>

          {/* Right: Hero Demo framed by ambient orbiting Kanji */}
          <div className="relative flex items-center justify-center w-full max-w-md mx-auto">
            {/* Ambient Kanji orbit centered behind the demo */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-25 dark:opacity-40 scale-110 sm:scale-125 z-0">
              <LandingKanjiOrbit size={380} />
            </div>
            <div className="relative z-10 w-full">
              <HeroDemo />
            </div>
          </div>
        </div>
      </main>

      {/* ── STATS TICKER ─────────────────────────────────────────────── */}
      <LandingStatsTicker />

      {/* ── FEATURE GRID ─────────────────────────────────────────────── */}
      <div id="features">
        <LandingFeatureGrid />
      </div>

      {/* ── INTERACTIVE APP CANVAS ───────────────────────────────────── */}
      <LandingInteractiveCanvas />

      {/* ── TAP-TO-LOOKUP EXPERIENCE ─────────────────────────────────── */}
      <LandingLookupExperience />

      {/* ── IN-CHAT PERSONA MEMORY ───────────────────────────────────── */}
      <LandingMemoryStory />

      {/* ── RPG ROLEPLAY QUEST ───────────────────────────────────────── */}
      <LandingQuestRPG />

      {/* ── DECK CASCADE ─────────────────────────────────────────────── */}
      <LandingDeckCascade />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <div id="how">
        <LandingHowItWorks />
      </div>

      {/* ── BYO KEY & PRIVACY ────────────────────────────────────────── */}
      <section
        id="privacy"
        className="relative z-10 border-y-2 border-border bg-card/40 py-16 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
          {/* Animated icon container */}
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-3xl bg-indigo-ai/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-ai/10 text-indigo-ai ring-1 ring-indigo-ai/20 shadow-lg">
              <Key size={32} weight="duotone" />
            </div>
          </div>
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Powered by Your Own Google Gemini API Key
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            KaiwaAI connects directly to Google Gemini using your personal API key.
            Enjoy unlimited, private Japanese practice tailored to your level. Compatible with Gemini Flash and Pro.
          </p>

          {/* Key features pills */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              { icon: "🔑", text: "Your key, your data" },
              { icon: "⚡", text: "Direct Gemini connection" },
              { icon: "🔒", text: "100% private" },
              { icon: "🎯", text: "Zero tracking" },
            ].map((p) => (
              <span
                key={p.text}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground"
              >
                <span>{p.icon}</span>
                {p.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BIG CTA BANNER ───────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 text-center sm:px-10">
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-ai/30 bg-gradient-to-br from-indigo-ai/10 via-card to-purple-500/10 p-10 shadow-2xl sm:p-14">
          {/* Corner glow blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-ai/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sakura/15 blur-3xl" />

          {/* Floating kanji decorations */}
          <span aria-hidden className="pointer-events-none absolute right-10 top-8 font-jp text-6xl font-bold text-indigo-ai/10 select-none">
            日
          </span>
          <span aria-hidden className="pointer-events-none absolute left-12 bottom-8 font-jp text-4xl font-bold text-sakura/10 select-none">
            本
          </span>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai">
              <Users size={14} weight="fill" /> Free forever · No credit card
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Ready to speak Japanese naturally?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted">
              Join learners who practice with Kai every day. Free, private, and
              tailored to your pace.
            </p>
            <div className="mt-8 flex justify-center">
              <PopLink href={user ? "/chat" : "/register"} className="gap-2">
                <span>
                  {user ? "Open Chat" : "Start Talking in Japanese"}
                </span>
                <ArrowRight size={20} weight="bold" />
              </PopLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
}
