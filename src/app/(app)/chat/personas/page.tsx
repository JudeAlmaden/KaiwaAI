import { redirect } from "next/navigation";

// Persona editing moved into the People sheet (AI personas section). Keep the
// old URL working for links handed out before the merge.
export default function PersonasPage() {
  redirect("/chat?panel=personas");
}
