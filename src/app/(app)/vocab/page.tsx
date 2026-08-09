import { redirect } from "next/navigation";

export default function VocabPage() {
  redirect("/study?tab=vocab");
}
