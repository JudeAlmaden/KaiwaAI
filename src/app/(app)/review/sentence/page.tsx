import { redirect } from "next/navigation";

/** Sentence Forge split into /review/construction and /review/conjugation. */
export default function SentenceForgeRedirect() {
  redirect("/review/construction");
}
