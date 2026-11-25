import PageHeader from "../../PageHeader";
import ConjugatePractice from "./ConjugatePractice";

export default function ConjugationPage() {
  return (
    <div className="flex flex-1 flex-col pb-32 px-4 sm:px-8">
      <PageHeader
        title="Fill the blank"
        jp="活用"
        subtitle="Recognise the form, learn the rule, then produce it yourself."
        back={{ href: "/review", label: "Back to review" }}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 pt-4">
        <ConjugatePractice />
      </div>
    </div>
  );
}
