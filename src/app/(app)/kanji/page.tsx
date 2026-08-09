import { redirect } from "next/navigation";

export default function KanjiPage() {
  redirect("/study?tab=kanji");
}
