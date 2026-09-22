"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Shared viewport-clamped portal popup for WordToken and LookupToken.
// Portaled to document.body so overflow:hidden ancestors never clip it.

const POPUP_W = 340;
const GAP = 8;
const EDGE = 12;
const POPUP_MAX_H = 440;

export interface PopupPos {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export function calcPopupPos(anchor: HTMLElement, maxW = POPUP_W): PopupPos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const spaceAbove = Math.max(0, r.top - GAP - EDGE);
  const spaceBelow = Math.max(0, window.innerHeight - r.bottom - GAP - EDGE);
  const openBelow = spaceBelow >= POPUP_MAX_H || spaceBelow > spaceAbove;
  const availableHeight = openBelow ? spaceBelow : spaceAbove;
  const width = Math.min(maxW, vw - EDGE * 2);
  let left = r.left + r.width / 2 - width / 2;
  left = Math.max(EDGE, Math.min(left, vw - width - EDGE));
  return openBelow
    ? { top: r.bottom + GAP, left, maxHeight: Math.min(POPUP_MAX_H, availableHeight) }
    : {
        bottom: window.innerHeight - r.top + GAP,
        left,
        maxHeight: Math.min(POPUP_MAX_H, availableHeight),
      };
}

export function TokenPopup({
  pos,
  width = POPUP_W,
  children,
  onClose,
}: {
  pos: PopupPos;
  width?: number;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handle);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width,
        maxHeight: pos.maxHeight,
        zIndex: 9999,
        overflowY: "auto",
      }}
      className="rounded-2xl border-2 border-border bg-card shadow-2xl text-left"
    >
      {children}
    </div>,
    document.body
  );
}
