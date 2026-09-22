/** Truncate quoted message preview for storage / UI. */
export function truncateReplyPreview(content: string, max = 100): string {
  const t = content.trim().replace(/\s+/g, " ");
  if ([...t].length <= max) return t;
  return [...t].slice(0, max).join("") + "…";
}

export type ReplyToPreview = {
  id: string;
  senderName: string;
  content: string;
  senderKind: string;
  isMe: boolean;
};

/** Messenger-style label above a reply bubble. */
export function replyIndicatorLabel(args: {
  isMe: boolean;
  senderName: string;
  replyTo: Pick<ReplyToPreview, "senderName" | "isMe">;
}): string {
  const { isMe, senderName, replyTo } = args;
  if (isMe) {
    return replyTo.isMe
      ? "You replied to yourself"
      : `You replied to ${replyTo.senderName}`;
  }
  if (replyTo.isMe) return `${senderName} replied to you`;
  if (replyTo.senderName === senderName) {
    return `${senderName} replied to themselves`;
  }
  return `${senderName} replied to ${replyTo.senderName}`;
}
