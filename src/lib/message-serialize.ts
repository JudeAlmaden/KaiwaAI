import { truncateReplyPreview } from "@/lib/reply-preview";

export type MessageRow = {
  id: string;
  senderName: string;
  senderKind: string;
  content: string;
  english: string | null;
  tokens: string | null;
  correction: string | null;
  userCorrection: string | null;
  senderUserId: string | null;
  createdAt: Date;
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToContent?: string | null;
  replyToSenderKind?: string | null;
  replyToSenderUserId?: string | null;
};

/** Serialize a DB message row for the chat client, including reply preview. */
export function serializeMessage(m: MessageRow, meId: string) {
  const replyTo =
    m.replyToId && m.replyToContent
      ? {
          id: m.replyToId,
          senderName: m.replyToSenderName || "Unknown",
          content: m.replyToContent,
          senderKind: m.replyToSenderKind || "user",
          isMe: m.replyToSenderUserId === meId,
        }
      : null;

  return {
    id: m.id,
    senderName: m.senderName,
    senderKind: m.senderKind,
    content: m.content,
    english: m.english,
    tokens: m.tokens,
    correction: m.correction,
    userCorrection: m.userCorrection,
    isMe: m.senderUserId === meId,
    createdAt: m.createdAt,
    replyTo,
  };
}

export type ReplyFields = {
  replyToId: string;
  replyToSenderName: string;
  replyToContent: string;
  replyToSenderKind: string;
  replyToSenderUserId: string | null;
};

/** Resolve a quoted message id into denormalized reply fields (same chat only). */
export async function resolveReplyFields(
  findQuoted: (id: string) => Promise<{
    id: string;
    chatId: string;
    senderName: string;
    senderKind: string;
    senderUserId: string | null;
    content: string;
  } | null>,
  chatId: string,
  quotedMessageId: string | undefined | null
): Promise<ReplyFields | null> {
  if (!quotedMessageId) return null;
  const quoted = await findQuoted(quotedMessageId);
  if (!quoted || quoted.chatId !== chatId) return null;
  return {
    replyToId: quoted.id,
    replyToSenderName: quoted.senderName,
    replyToContent: truncateReplyPreview(quoted.content),
    replyToSenderKind: quoted.senderKind,
    replyToSenderUserId: quoted.senderUserId,
  };
}
