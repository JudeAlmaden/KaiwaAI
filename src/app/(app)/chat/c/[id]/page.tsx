import GroupChatClient from "@/app/(app)/groups/[id]/GroupChatClient";

// A single conversation (persona chat, friend DM, or group).
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupChatClient groupId={id} />;
}
