import Kai from "./Kai";
import { PopLink } from "./PopButton";
import HeroDemo from "./HeroDemo";
import Petals from "./Petals";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Petals />

      {/* giant ghost kanji behind everything */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-32 select-none font-jp text-[22rem] font-bold leading-none text-indigo-ai/[0.04] sm:text-[34rem]"
      >
        話
      </span>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
          <Kai size={34} />
          KaiwaAI
        </span>
        <PopLink href="/login" variant="secondary" className="h-11 px-6 text-sm">
          I have an account
        </PopLink>
      </header>

      {/* Hero — copy left, live demo right */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:gap-8">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-bold text-indigo-ai">
            🌸 Your AI friend who only speaks Japanese
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
            Kai texts you in Japanese you can actually follow. Tap any word to
            understand it, and it quietly becomes a flashcard. You learn by
            having a friend, not doing homework.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <PopLink href="/register">Meet Kai →</PopLink>
            <span className="text-sm text-muted">
              Free · bring your own Gemini key
            </span>
          </div>

          {/* tiny social-proof-ish line with personality */}
          <p className="mt-8 font-jp text-sm text-muted">
            「<span className="text-foreground">またね</span>」— see you
            tomorrow, right?
          </p>
        </div>

        {/* live, interactive demo */}
        <div className="flex justify-center lg:justify-end">
          <HeroDemo />
        </div>
      </main>

      {/* the "why" strip — three sharp statements, not generic cards */}
      <section className="relative z-10 border-t-2 border-border bg-card/50">
        <div className="mx-auto grid w-full max-w-5xl gap-px px-6 py-12 sm:grid-cols-3 sm:px-10">
          <Stat
            big="N5 → ∞"
            label="Kai starts where you are and grows as you do. Every word you learn, she starts using."
          />
          <Stat
            big="1 tap"
            label="Reading, romaji, meaning. Understand any word without leaving the conversation."
          />
          <Stat
            big="0 cram"
            label="Saved words resurface right before you'd forget them. Spaced repetition, no flashcard chores."
          />
        </div>
      </section>

      <footer className="relative z-10 px-6 py-6 text-center text-sm text-muted">
        <span className="font-jp">KaiwaAI</span> · 会話 — made for people who
        want a friend, not a teacher.
      </footer>
    </div>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="px-4 py-2 text-center sm:text-left">
      <p className="font-display text-3xl font-extrabold text-indigo-ai">
        {big}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{label}</p>
    </div>
  );
}
