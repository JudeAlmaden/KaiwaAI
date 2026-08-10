export const SWIPE_START_PX = 10;
export const REPLY_SWIPE_PX = 50;
export const MAX_SWIPE_OFFSET_PX = 80;

export function replySwipeOffset({
  deltaX,
  deltaY,
  isOwnMessage,
}: {
  deltaX: number;
  deltaY: number;
  isOwnMessage: boolean;
}): number {
  if (Math.abs(deltaX) <= SWIPE_START_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
    return 0;
  }

  const correctDirection = isOwnMessage ? deltaX < 0 : deltaX > 0;
  if (!correctDirection) return 0;

  const offset = Math.min(Math.abs(deltaX), MAX_SWIPE_OFFSET_PX);
  return isOwnMessage ? -offset : offset;
}

export function shouldReplyFromSwipe(offset: number): boolean {
  return Math.abs(offset) > REPLY_SWIPE_PX;
}
