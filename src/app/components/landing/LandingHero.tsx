import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type LandingHeroProps = {
  isLoggedIn: boolean;
};

export default function LandingHero({ isLoggedIn }: LandingHeroProps) {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-9 sm:px-7 sm:py-11 md:min-h-[calc(100svh-13.5rem)] md:py-6 xl:min-h-[calc(100svh-11.5rem)] xl:py-8 2xl:min-h-[calc(100svh-12rem)] 2xl:max-w-[1500px]">
      <div className="grid w-full items-center gap-8 md:grid-cols-[1fr_0.9fr] md:gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:gap-5 2xl:grid-cols-[0.82fr_1.18fr] 2xl:gap-8">
        <HeroContent isLoggedIn={isLoggedIn} />
        <HeroVisual />
      </div>
    </main>
  );
}

function HeroContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="relative z-10 max-w-xl text-center md:text-left 2xl:max-w-2xl">
      <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.045em] text-foreground sm:text-[4.1rem] md:text-[3.75rem] xl:text-[4.75rem] 2xl:text-[6rem]">
        Stop <span className="text-muted/55 line-through decoration-sakura decoration-[3px]">studying</span>.<br />
        Start <span className="text-indigo-ai">talking</span>.
      </h1>

      <p className="mx-auto mt-5 max-w-[35rem] text-base leading-[1.5] text-muted sm:text-lg md:mx-0 md:text-base xl:text-xl 2xl:max-w-[39rem] 2xl:text-[1.4rem]">
        Kai texts you in Japanese calibrated precisely to your level. Tap any word to understand it, and it quietly becomes a flashcard. You learn by having a friend, not doing homework.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start xl:justify-start">
        <Link
          href={isLoggedIn ? "/chat" : "/register"}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-ai px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-indigo-ai/25 transition-transform hover:-translate-y-0.5 2xl:px-7 2xl:py-4 2xl:text-xl"
        >
          {isLoggedIn ? "Open Chat" : "Meet Kai"}
          <ArrowRight size={16} weight="bold" />
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-5 py-3 text-base font-bold text-muted 2xl:px-7 2xl:py-4 2xl:text-xl">
          Free · Powered by Gemini Flash
        </span>
      </div>
      
      <p className="mt-5 font-jp text-xs text-muted sm:text-sm md:text-xs 2xl:text-base">
        「<span className="font-bold text-foreground">またね</span>」— see you tomorrow, right?
      </p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-3xl md:max-w-none md:scale-125 xl:-mr-5 xl:scale-100 2xl:max-w-[900px] 2xl:scale-110">
      <div aria-hidden className="absolute inset-[12%] rounded-full bg-gradient-to-br from-indigo-ai/18 via-sakura/8 to-transparent blur-3xl" />
      
      <Image
        src="/images/kai/banners/banner_2.1.png"
        alt="Kai helping a learner chat in Japanese"
        width={1700}
        height={900}
        priority
        className="relative z-10 h-auto w-full select-none object-contain"
      />
      
      <div className="absolute right-[7%] top-[8%] z-20 hidden rounded-lg border border-white bg-white/95 px-3 py-2 text-[9px] font-bold text-muted shadow-lg sm:block 2xl:px-4 2xl:py-3 2xl:text-[10px]">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-foreground 2xl:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Kai is chatting
        </div>
        こんにちは、きょうは何をしたの？
      </div>
      
      <div className="absolute bottom-[11%] left-[8%] z-20 hidden rounded-xl border border-border bg-white/95 px-3 py-2 shadow-lg sm:block 2xl:px-4 2xl:py-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-mint 2xl:text-[10px]">
          ✓ tapped &amp; saved to SRS
        </p>
        <p className="mt-1 text-sm font-bold text-foreground 2xl:text-base">さくら · sakura</p>
        <p className="text-[9px] text-muted 2xl:text-[10px]">Cherry blossom · naturally</p>
      </div>
    </div>
  );
}
