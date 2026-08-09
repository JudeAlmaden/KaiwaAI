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
import { getCurrentUser } from "@/lib/auth-helpers";
import { Sparkle, Key, ArrowRight, ChatCircleDots } from "@phosphor-icons/react/dist/ssr";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-bg text-foreground">
      <Petals />

      {/* Ambient background glow effects */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-ai/15 via-purple-500/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-[900px] h-[500px] w-[500px] rounded-full bg-sakura/10 blur-3xl" />

      {/* giant ghost kanji background artwork */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-32 select-none font-jp text-[22rem] font-bold leading-none text-indigo-ai/[0.04] sm:text-[34rem]"
      >
        話
      </span>

      {/* Top Navigation Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
          <Kai size={36} />
          KaiwaAI
        </span>
        <div className="flex items-center gap-3">
          {user ? (
            <PopLink href="/chat" variant="primary" size="md" className="gap-2 font-extrabold">
              <ChatCircleDots size={18} weight="fill" />
              <span>Open Chat</span>
            </PopLink>
          ) : (
            <>
              <PopLink href="/login" variant="secondary" size="md" className="font-extrabold">
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

      {/* Hero Section — copy left, live interactive demo right */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:gap-8">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-ai/30 bg-indigo-ai/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-ai backdrop-blur-md">
            <Sparkle size={14} weight="fill" /> Your AI friend who only speaks Japanese
          </span>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Stop{" "}
            <span className="relative whitespace-nowrap text-muted/60 line-through decoration-sakura decoration-4">
              studying
            </span>
            .
            <br />
            Start{" "}
            <span className="text-indigo-ai">talking</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-md text-lg leading-7 text-muted lg:mx-0">
            Kai texts you in Japanese calibrated to your level. Tap any word to understand it, and it quietly becomes a flashcard. You learn by having a friend, not doing homework.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <PopLink href={user ? "/chat" : "/register"} className="gap-2">
              <span>{user ? "Go to Chat" : "Meet Kai"}</span>
              <ArrowRight size={18} weight="bold" />
            </PopLink>
            <span className="text-sm font-semibold text-muted">
              Free · bring your own Gemini key
            </span>
          </div>

          {/* Personality subtitle */}
          <p className="mt-8 font-jp text-sm text-muted">
            「<span className="text-foreground font-bold">またね</span>」— see you tomorrow, right?
          </p>
        </div>

        {/* Live, interactive demo */}
        <div className="flex justify-center lg:justify-end">
          <HeroDemo />
        </div>
      </main>

      {/* 1. Interactive App Canvas with Orbiting Nodes */}
      <LandingInteractiveCanvas />

      {/* 2. AR-style Augmented Typography Lookup Experience */}
      <LandingLookupExperience />

      {/* 3. In-Chat Persona Memory Story */}
      <LandingMemoryStory />

      {/* 4. RPG-style Roleplay Scenario Encounter */}
      <LandingQuestRPG />

      {/* 5. Cascading Auto-Extracted Kanji Deck */}
      <LandingDeckCascade />

      {/* 6. Simple 3-Step Routine */}
      <LandingHowItWorks />

      {/* BYO Gemini Key & Privacy Section */}
      <section className="relative z-10 border-t-2 border-b-2 border-border bg-card/40 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-ai/10 text-indigo-ai ring-1 ring-indigo-ai/20 shadow-lg">
            <Key size={30} weight="duotone" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Powered by Your Own Google Gemini API Key
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-muted max-w-xl mx-auto">
            KaiwaAI connects directly using your free Google Gemini API key. Enjoy unlimited Japanese practice without costly monthly subscription paywalls. Compatible with Gemini 3.5 Flash, 3.6 Flash, and Pro.
          </p>
        </div>
      </section>

      {/* Big CTA Banner */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 text-center sm:px-10">
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-ai/30 bg-gradient-to-br from-indigo-ai/10 via-card to-purple-500/10 p-10 shadow-2xl sm:p-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-ai/20 blur-3xl" />
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ready to speak Japanese naturally?
          </h2>
          <p className="mt-4 text-sm text-muted max-w-md mx-auto">
            Join learners who practice with Kai every day. Free, private, and tailored to your pace.
          </p>
          <div className="mt-8 flex justify-center">
            <PopLink href={user ? "/chat" : "/register"} className="gap-2">
              <span>{user ? "Open Chat" : "Start Talking in Japanese"}</span>
              <ArrowRight size={20} weight="bold" />
            </PopLink>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t-2 border-border px-6 py-6 text-center text-sm text-muted">
        <span className="font-jp font-bold">KaiwaAI</span> · 会話 — made for people who want a friend, not a teacher.
      </footer>
    </div>
  );
}
