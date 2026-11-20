import { redirect } from "next/navigation";

// The lobby and its queue dialog are gone: matching is a row at the end of the
// inbox. Keep the old URL working for links handed out before the move.
export default function StrangersRedirect() {
  redirect("/chat?queue=1");
}
