import { Suspense } from "react";
import KanjiClient from "./KanjiClient";

export default function KanjiPage() {
  return (
    <Suspense fallback={<div>Loading kanji...</div>}>
      <KanjiClient />
    </Suspense>
  );
}
