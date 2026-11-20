import { redirect } from "next/navigation";

// The lobby moved into `/chat` as a queue dialog (§6.3 in the stranger-chat
// plan). Keep the old URL working for links handed out before the move: the hub
// opens its compose sheet on the Meet tile, and the feature flag still decides
// whether that tile exists.
export default function StrangersRedirect() {
  redirect("/chat?compose=meet");
}
