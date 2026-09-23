import LandingNav from "./components/landing/LandingNav";
import LandingHero from "./components/landing/LandingHero";
import LandingStatsTicker from "./components/landing/LandingStatsTicker";
import LandingFeatureGrid from "./components/landing/LandingFeatureGrid";
import LandingVocabBuilder from "./components/landing/LandingVocabBuilder";
import LandingInteractiveCanvas from "./components/landing/LandingInteractiveCanvas";
import LandingLookupExperience from "./components/landing/LandingLookupExperience";
import LandingQuestRPG from "./components/landing/LandingQuestRPG";
import LandingDeckCascade from "./components/landing/LandingDeckCascade";
import LandingHowItWorks from "./components/landing/LandingHowItWorks";
import LandingCTA from "./components/landing/LandingCTA";
import LandingFooter from "./components/landing/LandingFooter";
import { getCurrentUser } from "@/lib/auth-helpers";

export default async function Home() {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;

  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip border-t border-indigo-ai bg-[#fffaf8] text-foreground">
      <LandingNav isLoggedIn={isLoggedIn} />
      
      <LandingHero isLoggedIn={isLoggedIn} />

      <LandingStatsTicker />

      <div id="features">
        <LandingFeatureGrid />
      </div>

      <LandingVocabBuilder />

      <LandingInteractiveCanvas />

      <LandingLookupExperience />

      <LandingQuestRPG />

      <LandingDeckCascade />

      <div id="how">
        <LandingHowItWorks />
      </div>

      <LandingCTA isLoggedIn={isLoggedIn} />

      <LandingFooter />
    </div>
  );
}
