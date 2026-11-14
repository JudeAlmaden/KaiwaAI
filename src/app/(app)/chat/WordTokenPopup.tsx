"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ── Popup positioning ─────────────────────────────────────────────────────────
//
// We portal the popup to document.body so it's never clipped by overflow:hidden
// ancestors and `position:fixed` is always relative to the true viewport (no
// CSS-transform ancestor interference).
//
// Layout: popup sits ABOVE the anchor word.
//   bottom = window.innerHeight - rect.top + GAP   →  popup's bottom edge lines
//   up just above the word. No need to know popup height.
//
// Horizontal: centred on the anchor, clamped to viewport.

export const POPUP_W = 340;
const GAP = 8;
const EDGE = 12;
export const POPUP_MAX_H = 440;

export interface PopupPos {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export function calcPos(anchor: HTMLElement): PopupPos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const spaceAbove = Math.max(0, r.top - GAP - EDGE);
  const spaceBelow = Math.max(0, window.innerHeight - r.bottom - GAP - EDGE);
  const openBelow = spaceBelow >= POPUP_MAX_H || spaceBelow > spaceAbove;
  const availableHeight = openBelow ? spaceBelow : spaceAbove;
  let left = r.left + r.width / 2 - POPUP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - POPUP_W - EDGE));
  return openBelow
    ? { top: r.bottom + GAP, left, maxHeight: Math.min(POPUP_MAX_H, availableHeight) }
    : {
        bottom: window.innerHeight - r.top + GAP,
        left,
        maxHeight: Math.min(POPUP_MAX_H, availableHeight),
      };
}

// ── Portal wrapper ────────────────────────────────────────────────────────────

export function PopupPortal({
  pos,
  children,
  onClose,
  selectionUi = false,
  anchorRef,
}: {
  pos: PopupPos;
  children: React.ReactNode;
  onClose: () => void;
  selectionUi?: boolean;
  /** Button/anchor that opened the popup — clicks on it must not close. */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const openedAtRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openedAtRef.current = performance.now();

    function handle(e: Event) {
      // Ignore the same tap/click gesture that opened the popup (80ms grace is plenty;
      // we use capture phase so we fire before onClick handlers).
      if (performance.now() - openedAtRef.current < 80) return;

      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-token-selection-ui], [data-kanji-modal]")) return;
      onCloseRef.current();
    }

    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handle, true);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handle, true);
    };
  }, [anchorRef]);

  const el = (
    <div
      ref={ref}
      data-token-selection-ui={selectionUi || undefined}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: POPUP_W,
        maxHeight: pos.maxHeight,
        zIndex: 9999,
        overflowY: "auto",
      }}
      className="rounded-2xl border-2 border-border bg-card shadow-2xl text-left"
    >
      {children}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(el, document.body);
}
