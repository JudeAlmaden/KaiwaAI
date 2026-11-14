"use client";
/* eslint-disable react-hooks/immutability */

import { useCallback, useRef, useState } from "react";
import { RichKaiText } from "../../chat/RichText";
import Avatar from "../../chat/Avatar";
import { replySwipeOffset, shouldReplyFromSwipe } from "@/lib/swipe-reply";
import type { GMsg } from "./group-types";
import { timeLabel } from "./group-format";

/**
 * One message bubble: own-message styling, persona rich text, swipe-to-reply and
 * the grammar correction card.
 */
export default function GroupBubble({
  msg,
  startGroup,
  endGroup,
  onReply,
  savedWords,
  onSavedWord,
}: {
  msg: GMsg;
  startGroup: boolean;
  endGroup: boolean;
  onReply: () => void;
  savedWords?: Set<string>;
  onSavedWord?: (w: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isSelectingText, setIsSelectingText] = useState(false);

  const handleSelectionModeChange = useCallback((isSelecting: boolean) => {
    setIsSelectingText(isSelecting);
    if (isSelecting) {
      isSwipeTrackingRef.current = false;
      swipeOffsetRef.current = 0;
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  }, []);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwipeTrackingRef = useRef(false);
  const swipeOffsetRef = useRef(0);
  const suppressTokenClickRef = useRef(false);
  const isPersona = msg.senderKind === "persona";
  const time = timeLabel(new Date(msg.createdAt));

  // Parse user correction if available
  let userCorrection = null;
  if (msg.userCorrection) {
    try {
      userCorrection = JSON.parse(msg.userCorrection);
    } catch {
      // ignore invalid JSON
    }
  }

  // Handle touch events for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectingText) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipeTrackingRef.current = true;
    swipeOffsetRef.current = 0;
    suppressTokenClickRef.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSelectingText) return;
    if (!isSwipeTrackingRef.current) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    const offset = replySwipeOffset({
      deltaX,
      deltaY,
      isOwnMessage: msg.isMe,
    });
    if (offset !== 0) {
      // A completed swipe must not also activate the word button underneath it.
      suppressTokenClickRef.current = true;
      swipeOffsetRef.current = offset;
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (isSelectingText) return;
    isSwipeTrackingRef.current = false;
    setIsSwiping(false);
    if (shouldReplyFromSwipe(swipeOffsetRef.current)) {
      onReply();
    }
    // Let the synthetic click fire while this remains true, then restore taps.
    if (suppressTokenClickRef.current) {
      setTimeout(() => {
        suppressTokenClickRef.current = false;
      }, 250);
    }
    setTimeout(() => setSwipeOffset(0), 100);
  };

  const handleTouchCancel = () => {
    if (isSelectingText) return;
    isSwipeTrackingRef.current = false;
    setIsSwiping(false);
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
  };

  const suppressTokenClickAfterSwipe = (e: React.MouseEvent) => {
    if (!suppressTokenClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (msg.isMe) {
    return (
      <div
        className={`group flex items-center justify-end gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}
        onMouseEnter={() => setShowReply(true)}
        onMouseLeave={() => setShowReply(false)}
      >
        {/* Reply button on the side - vertically centered, visible during swipe */}
        <button
          onClick={onReply}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai transition-all hover:bg-indigo-ai hover:text-white ${
            showReply || Math.abs(swipeOffset) > 20 || endGroup
              ? "opacity-100 scale-100 sm:opacity-40 sm:group-hover:opacity-100"
              : "opacity-0 scale-75 pointer-events-none sm:opacity-0"
          }`}
          title="Reply"
        >
          ↩
        </button>
        <div
          className="flex max-w-[80%] flex-col items-end touch-pan-y"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? "none" : "transform 0.2s ease-out",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClickCapture={suppressTokenClickAfterSwipe}
        >
          <div
            className={`rounded-3xl bg-indigo-ai px-4 py-2.5 text-white shadow-sm ${
              endGroup ? "rounded-br-md" : ""
            }`}
          >
            <p className="font-jp leading-relaxed">{msg.content}</p>
          </div>
          {endGroup && (
            <span className="mr-1 mt-0.5 text-[10px] text-muted/60">{time}</span>
          )}
          {/* Grammar correction for user's message */}
          {userCorrection && userCorrection.status !== "correct" && userCorrection.status !== "none" && (
            <div className="mt-2 max-w-full rounded-2xl border-2 border-amber/30 bg-amber/5 px-3 py-2 text-left">
              <div className="flex items-start gap-2">
                <span className="text-sm">✏️</span>
                <div className="min-w-0 flex-1 text-xs">
                  {userCorrection.corrected && (
                    <p className="mb-1">
                      <span className="font-jp text-sakura line-through">{msg.content}</span>
                      {" → "}
                      <span className="font-jp font-bold text-mint">{userCorrection.corrected}</span>
                    </p>
                  )}
                  {userCorrection.explanation && (
                    <p className="text-muted">{userCorrection.explanation}</p>
                  )}
                  {userCorrection.natural && userCorrection.natural !== userCorrection.corrected && (
                    <p className="mt-1">
                      <span className="text-muted/70">More natural: </span>
                      <span className="font-jp font-semibold text-foreground">{userCorrection.natural}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}
      onMouseEnter={() => setShowReply(true)}
      onMouseLeave={() => setShowReply(false)}
    >
      {/* avatar slot — rendered only on the last bubble of a run */}
      <div className="w-7 shrink-0">
        {endGroup && <Avatar name={msg.senderName} emoji={undefined} size={28} />}
      </div>
      <div
        className="flex min-w-0 max-w-[82%] flex-col items-start touch-pan-y"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClickCapture={suppressTokenClickAfterSwipe}
      >
        {startGroup && (
          <span
            className={`mb-0.5 ml-1 text-xs font-bold ${isPersona ? "text-indigo-ai" : "text-muted"}`}
          >
            {msg.senderName}
          </span>
        )}
        <div
          className={`max-w-full rounded-3xl bg-card px-4 py-2.5 shadow-sm ${
            endGroup ? "rounded-bl-md" : ""
          }`}
        >
          {isPersona ? (
            <RichKaiText
              content={msg.content}
              tokensJson={msg.tokens}
              english={msg.english}
              correctionJson={msg.correction}
              messageId={msg.id}
              savedWords={savedWords}
              onSavedWord={onSavedWord}
              onSelectionModeChange={handleSelectionModeChange}
            />
          ) : (
            <p className="font-jp leading-relaxed">{msg.content}</p>
          )}
        </div>
        {endGroup && (
          <span className="ml-1 mt-0.5 text-[10px] text-muted/60">{time}</span>
        )}
      </div>
      {/* Reply button on the side - vertically centered, visible during swipe */}
      <button
        onClick={onReply}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai transition-all hover:bg-indigo-ai hover:text-white ${
          showReply || Math.abs(swipeOffset) > 20 || endGroup
            ? "opacity-100 scale-100 sm:opacity-40 sm:group-hover:opacity-100"
            : "opacity-0 scale-75 pointer-events-none sm:opacity-0"
        }`}
        title="Reply"
      >
        ↩
      </button>
    </div>
  );
}
