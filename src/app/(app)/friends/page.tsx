import { redirect } from "next/navigation";

// Friends are part of the inbox now: requests sit above the conversations and
// the People group holds friends, add-by-email, personas and matching. Keep the
// old URL working for links handed out before the merge.
export default function FriendsPage() {
  redirect("/chat?panel=people");
}
