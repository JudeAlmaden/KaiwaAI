import { Suspense } from "react";
import StudyClient from "./StudyClient";

export const metadata = {
  title: "Study | KaiwaAI",
  description: "Review your vocabulary and kanji collection",
};

export default function StudyPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <StudyClient />
    </Suspense>
  );
}
