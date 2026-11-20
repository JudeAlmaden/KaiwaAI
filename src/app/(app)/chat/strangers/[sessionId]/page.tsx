import { notFound } from "next/navigation";
import { isStrangerChatEnabled } from "@/lib/stranger/config";
import StrangerRoom from "./StrangerRoom";

export default async function StrangerRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  if (!isStrangerChatEnabled()) notFound();
  const { sessionId } = await params;
  return <StrangerRoom sessionId={sessionId} />;
}
