import { 
  ChatCircleText, 
  Cards, 
  Translate, 
  Lightning 
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps, IconWeight } from "@phosphor-icons/react";

const features = [
  {
    icon: ChatCircleText,
    title: "Natural Conversations",
    description: "Chat with Kai in Japanese at your exact skill level. No boring textbooks, just real conversations.",
  },
  {
    icon: Translate,
    title: "Instant Understanding",
    description: "Tap any word to see its meaning, pronunciation, and usage. Learning happens in context.",
  },
  {
    icon: Cards,
    title: "Smart Flashcards",
    description: "Words you look up automatically become flashcards. Review them with spaced repetition.",
  },
  {
    icon: Lightning,
    title: "Powered by AI",
    description: "Gemini Flash adapts to your level and interests. Always relevant, always engaging.",
  },
];

export default function SimpleLandingFeatures() {
  return (
    <section className="relative w-full bg-white py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
        
        {/* Section Header */}
        <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything you need to learn Japanese
          </h2>
          <p className="mt-4 text-lg text-muted md:text-xl">
            Simple, effective, and completely free
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>

        {/* Bottom CTA hint */}
        <div className="mt-16 text-center">
          <p className="text-base font-medium text-muted md:text-lg">
            Join thousands learning Japanese the natural way
          </p>
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  icon: React.ComponentType<IconProps>;
  title: string;
  description: string;
};
type FeatureCardIconProps = { size?: number; weight?: IconWeight; className?: string };

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative rounded-2xl border-2 border-border bg-[#fffaf8] p-6 transition-all hover:-translate-y-1 hover:border-indigo-ai/30 hover:shadow-xl md:p-8">
      {/* Icon */}
      <div className="mb-4 inline-flex rounded-xl bg-indigo-ai/10 p-3 transition-colors group-hover:bg-indigo-ai/20">
        <Icon 
          {...{
            size: 32,
            weight: "duotone",
            className: "text-indigo-ai",
          } as FeatureCardIconProps}
        />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-xl font-bold text-foreground md:text-2xl">
        {title}
      </h3>
      <p className="leading-relaxed text-muted">
        {description}
      </p>

      {/* Hover accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-indigo-ai to-sakura opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
