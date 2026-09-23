import Kai from "../../Kai";
import { PopLink } from "../../PopButton";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

type LandingCTAProps = {
  isLoggedIn: boolean;
};

export default function LandingCTA({ isLoggedIn }: LandingCTAProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 text-center sm:px-10">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-ai p-12 sm:p-16 shadow-2xl">
        {/* Decorative background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute right-0 bottom-0 w-80 h-80">
            <Kai size={320} className="opacity-20" />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-bold uppercase tracking-wider text-white border border-white/30">
              Your Japanese Journey Starts Today
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
            Kai is waiting to say hello.
          </h2>

          {/* Description */}
          <p className="mx-auto max-w-xl text-base sm:text-lg text-white/90 leading-relaxed">
            No textbooks, no intimidating grammar tables. Just genuine conversations tailored to where you are right now.
          </p>

          {/* CTA Button */}
          <div className="pt-4 flex justify-center">
            <PopLink
              href={isLoggedIn ? "/chat" : "/register"}
              variant="secondary"
              size="lg"
              className="gap-2 bg-white text-indigo-ai hover:bg-white/95 shadow-xl hover:scale-105 transition-transform"
            >
              <span>Start Chatting Free</span>
              <ArrowRight size={20} weight="bold" />
            </PopLink>
          </div>

          {/* Platform info */}
          <p className="text-sm text-white/70 pt-2">
            Works on iOS, Android, and Desktop Browser · No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}
