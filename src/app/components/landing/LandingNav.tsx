import Link from "next/link";
import Kai from "../../Kai";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type LandingNavProps = {
  isLoggedIn: boolean;
};

export default function LandingNav({ isLoggedIn }: LandingNavProps) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between border-b border-border/70 px-4 py-3 sm:px-7 2xl:max-w-[1500px]">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight 2xl:text-2xl">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-ai shadow-sm shadow-indigo-ai/30 2xl:h-9 2xl:w-9">
          <Kai size={24} />
        </span>
        <span>Kaiwa<span className="text-indigo-ai">AI</span></span>
        <span className="rounded bg-indigo-ai/10 px-1 py-0.5 text-[9px] font-bold text-indigo-ai">会話</span>
      </Link>

      <nav className="hidden items-center gap-7 text-xs font-semibold text-muted lg:flex 2xl:text-[13px]">
        <a href="#how" className="transition-colors hover:text-indigo-ai">How it works</a>
        <a href="#features" className="transition-colors hover:text-indigo-ai">Features</a>
        <a href="#demo" className="transition-colors hover:text-indigo-ai">Interactive Demo</a>
        <a href="#levels" className="transition-colors hover:text-indigo-ai">JLPT N5–N1</a>
        <a href="#pricing" className="transition-colors hover:text-indigo-ai">Pricing</a>
      </nav>

      <div className="flex items-center gap-3 text-xs font-bold 2xl:text-[13px]">
        {isLoggedIn ? (
          <Link href="/chat" className="rounded-full bg-indigo-ai px-4 py-2 text-white shadow-md shadow-indigo-ai/25 transition-transform hover:-translate-y-0.5 2xl:px-5 2xl:py-2.5">
            Open Chat
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden text-muted transition-colors hover:text-foreground sm:inline">Log in</Link>
            <Link href="/register" className="inline-flex items-center gap-1 rounded-full bg-indigo-ai px-4 py-2 text-white shadow-md shadow-indigo-ai/25 transition-transform hover:-translate-y-0.5 2xl:px-5 2xl:py-2.5">
              Get Started <ArrowRight size={13} weight="bold" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
