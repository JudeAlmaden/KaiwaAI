import PageHeader from "../../PageHeader";
import GrammarConstruction from "./GrammarConstruction";

export default function ConstructionPage() {
  return (
    <div className="flex flex-1 flex-col pb-32 px-4 sm:px-8">
      <PageHeader
        title="Construction"
        jp="組立"
        subtitle="Build sentences from your weakest grammar, one exercise at a time."
        back={{ href: "/review", label: "Back to review" }}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 pt-4">
        <GrammarConstruction />
      </div>
    </div>
  );
}
