import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type SimpleLandingHeroProps = {
  isLoggedIn: boolean;
};

export default function SimpleLandingHero({ isLoggedIn }: SimpleLandingHeroProps) {
  return (
    <main className="relative w-full overflow-hidden">
      {/* Hero Container - Full viewport height on desktop, auto on mobile */}
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1920px] flex-col items-center justify-center px-4 py-8 sm:px-6 md:min-h-[calc(100vh-5rem)] md:px-8 lg:flex-row lg:gap-8 lg:px-12 xl:px-16">
        
        {/* Content Section */}
        <div className="relative z-10 w-full max-w-2xl text-center lg:w-1/2 lg:text-left">
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
            Learn Japanese by{" "}
            <span className="text-indigo-ai">chatting with Kai</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg md:text-xl lg:mx-0">
            Have natural conversations in Japanese. Tap any word to understand it instantly. 
            Every interaction becomes a learning moment.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href={isLoggedIn ? "/chat" : "/register"}
              className="group inline-flex items-center gap-2 rounded-full bg-indigo-ai px-8 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-ai/30 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-ai/40"
            >
              {isLoggedIn ? "Start Chatting" : "Get Started Free"}
              <ArrowRight 
                size={20} 
                weight="bold" 
                className="transition-transform group-hover:translate-x-1" 
              />
            </Link>

            <div className="flex items-center gap-2 rounded-full border-2 border-border bg-white/90 px-6 py-3 text-sm font-semibold text-muted">
              <span className="flex h-2 w-2 rounded-full bg-mint" />
              Free · No credit card required
            </div>
          </div>

          <p className="mt-8 font-jp text-sm text-muted md:text-base">
            「<span className="font-bold text-foreground">一緒に日本語を話そう</span>」
            <span className="ml-2 text-xs">— Let&apos;s speak Japanese together</span>
          </p>
        </div>

        {/* Banner Image Section */}
        <div className="relative mt-8 w-full max-w-3xl lg:mt-0 lg:w-1/2">
          {/* Decorative gradient background */}
          <div 
            aria-hidden 
            className="absolute inset-0 -inset-x-[10%] rounded-full bg-gradient-to-br from-indigo-ai/15 via-sakura/10 to-transparent blur-3xl"
          />
          
          {/* Main Banner Image */}
          <div className="relative">
            <Image
              src="/images/kai/banners/banner_.png"
              alt="Kai - Your Japanese learning companion"
              width={1200}
              height={800}
              priority
              className="relative z-10 h-auto w-full rounded-2xl object-contain drop-shadow-2xl"
            />
          </div>

          {/* Floating accent - Chat bubble */}
          <div className="absolute -bottom-4 left-4 z-20 hidden rounded-2xl border-2 border-white bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm sm:block md:px-6 md:py-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-mint md:text-sm">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-mint" />
              Live conversation
            </div>
            <p className="font-jp text-base font-medium text-foreground md:text-lg">
              今日は何をしたの？
            </p>
            <p className="mt-1 text-xs text-muted">What did you do today?</p>
          </div>

          {/* Floating accent - Word card */}
          <div className="absolute -right-4 top-8 z-20 hidden rounded-xl border-2 border-border bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm md:block md:px-4 md:py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-ai">
              ✓ Saved
            </p>
            <p className="mt-1 font-jp text-lg font-bold text-foreground md:text-xl">
              勉強
            </p>
            <p className="text-xs text-muted">benkyō · to study</p>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fffaf8] to-transparent" />
    </main>
  );
}
