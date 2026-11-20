"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DotsThree } from "@phosphor-icons/react/dist/ssr";
import ModelSwitcher from "../../chat/ModelSwitcher";
import type { KaiModeInfo } from "./group-types";
import { conversationMenuModel } from "./conversation-menu";

// Conversation options: profile, quest, clear, delete.
export default function ConvMenu({
  isOwner,
  personaId,
  chatKind,
  chatId,
  personaKind,
  showModelPicker = false,
  canStartQuest = false,
  onStartQuest,
  onClear,
  onDelete,
  kai,
  mute,
  onOpenSettings,
}: {
  isOwner: boolean;
  personaId?: string | null;
  /** "persona" | "dm" | "group" — decides which controls are valid. */
  chatKind: string;
  chatId: string;
  /** "kai" | "kai_mode" | "custom" — decides how the memory entry reads. */
  personaKind?: string | null;
  /** Group management (name, members, Kai) — groups only. */
  onOpenSettings?: () => void;
  /** Kai's attitude controls; 1:1 Kai chats only (groups use Group settings). */
  kai?: {
    modes: KaiModeInfo[];
    activeMode: KaiModeInfo | null;
    canEdit: boolean;
    canAdd: boolean;
    canRemove: boolean;
    busy: boolean;
    onSelect: (modeId: string | null) => void;
    onAdd: () => void;
    onRemove: () => void;
  } | null;
  /** Per-chat proactive mute; 1:1 Kai chats only. */
  mute?: {
    muted: boolean;
    onToggle: () => void;
  } | null;
  showModelPicker?: boolean;
  canStartQuest?: boolean;
  onStartQuest?: () => void;
  onClear: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "clear" | "delete">(null);
  const [confirm, setConfirm] = useState<null | "clear" | "delete">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function run(kind: "clear" | "delete") {
    setBusy(kind);
    try {
      if (kind === "clear") await onClear();
      else await onDelete();
    } finally {
      setBusy(null);
      setOpen(false);
      setConfirm(null);
    }
  }

  const model = conversationMenuModel({
    kind: chatKind,
    isOwner,
    hasPersona: !!personaId,
    personaKind,
  });
  const isGroup = model.isGroup;
  const canClear = model.canClear;
  const clearTitle = isGroup
    ? "Clear the group's messages?"
    : model.isDm
      ? "Clear the chat's messages?"
      : "Clear all messages?";
  const clearNote = isGroup
    ? "Removes every message for everyone in this group. Saved memories are kept. This can't be undone."
    : model.isDm
      ? "Removes every message for both of you. Saved memories are kept. This can't be undone."
      : "Removes the messages for everyone. Saved memories are kept. This can't be undone.";
  const deleteTitle =
    model.deleteMode === "delete"
      ? isGroup
        ? "Delete this group?"
        : "Delete conversation?"
      : isGroup
        ? "Hide this group?"
        : "Hide conversation?";
  const deleteNote =
    model.deleteMode === "delete"
      ? isGroup
        ? "Permanently deletes the group, its members and every message for everyone. This can't be undone."
        : "Permanently deletes the conversation and all its messages for everyone. This can't be undone."
      : isGroup
        ? "Removes this group from your list only — you stay a member. Leave it from Group settings. Find it in Archived."
        : "Removes this conversation from your list. Find it in Archived.";
  const deleteLabel =
    model.deleteMode === "delete"
      ? isGroup
        ? "Delete group"
        : "Delete conversation"
      : isGroup
        ? "Hide group"
        : "Hide conversation";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
        aria-label="Conversation options"
      >
        <DotsThree size={22} weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border-2 border-border bg-card p-1.5 shadow-xl">
          {showModelPicker && (
            <div className="border-b border-border/60 px-3 py-2.5 sm:hidden">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                Model
              </p>
              <ModelSwitcher />
            </div>
          )}

          {onOpenSettings && model.showGroupSettings && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
            >
              <span className="text-lg">⚙️</span>
              <span>
                <span className="block text-sm font-bold">Group settings</span>
                <span className="block text-xs text-muted">
                  Name, members, and Kai.
                </span>
              </span>
            </button>
          )}

          {kai && model.showKaiAttitude && kai.canEdit && kai.modes.length > 0 && (
            <div className="border-b border-border/60 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                Kai&apos;s attitude
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={kai.busy}
                  onClick={() => {
                    if (!kai.busy && kai.activeMode) kai.onSelect(null);
                  }}
                  className={`flex w-full items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                    !kai.activeMode
                      ? "border-indigo-ai text-indigo-ai"
                      : "border-border text-muted hover:border-indigo-ai"
                  }`}
                >
                  🦊 Default
                </button>
                {kai.modes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={kai.busy}
                    onClick={() => {
                      if (!kai.busy && kai.activeMode?.id !== mode.id)
                        kai.onSelect(mode.id);
                    }}
                    className={`flex w-full items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                      kai.activeMode?.id === mode.id
                        ? "border-indigo-ai text-indigo-ai"
                        : "border-border text-muted hover:border-indigo-ai"
                    }`}
                  >
                    {mode.avatar} {mode.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                Applies to everyone in this chat.
              </p>
            </div>
          )}

          {mute && model.showMuteKai && (
            <button
              type="button"
              onClick={() => {
                mute.onToggle();
                setOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
            >
              <span className="text-lg">{mute.muted ? "🔕" : "🔔"}</span>
              <span>
                <span className="block text-sm font-bold">
                  {mute.muted ? "Unmute Kai" : "Mute Kai"}
                </span>
                <span className="block text-xs text-muted">
                  {mute.muted
                    ? "Kai can speak first again in this chat."
                    : "Kai won't start messages on her own here."}
                </span>
              </span>
            </button>
          )}

          {kai && kai.canAdd && (
            <button
              type="button"
              disabled={kai.busy}
              onClick={() => {
                setOpen(false);
                kai.onAdd();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5 disabled:opacity-60"
            >
              <span className="text-lg">🦊</span>
              <span>
                <span className="block text-sm font-bold">Add Kai to this group</span>
                <span className="block text-xs text-muted">
                  Kai can join the conversation when @mentioned.
                </span>
              </span>
            </button>
          )}

          {kai && kai.canRemove && (
            <button
              type="button"
              disabled={kai.busy}
              onClick={() => {
                setOpen(false);
                kai.onRemove();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5 disabled:opacity-60"
            >
              <span className="text-lg">🚪</span>
              <span>
                <span className="block text-sm font-bold">Remove Kai</span>
                <span className="block text-xs text-muted">
                  Take Kai out of this group; messages are kept.
                </span>
              </span>
            </button>
          )}

          {model.memory.scope !== "persona" && (
            <Link
              href={`/memory?chat=${encodeURIComponent(chatId)}`}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">
                {model.memory.scope === "group" ? "👥" : "💬"}
              </span>
              <span>
                <span className="block text-sm font-bold">{model.memory.title}</span>
                <span className="block text-xs text-muted">
                  {model.memory.description}
                </span>
              </span>
            </Link>
          )}

          {personaId && model.memory.scope !== "chat" && (
            <Link
              href={`/memory?persona=${encodeURIComponent(personaId)}`}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">📔</span>
              <span>
                <span className="block text-sm font-bold">
                  {model.memory.scope === "group"
                    ? personaKind === "kai"
                      ? "Kai's memory"
                      : "Full persona diary"
                    : "Open full diary"}
                </span>
                <span className="block text-xs text-muted">
                  {model.memory.scope === "group"
                    ? personaKind === "kai"
                      ? "Kai's memories across every chat — not just this group."
                      : "This persona's memories across every chat."
                    : "All memories across personas — different from the quick profile above."}
                </span>
              </span>
            </Link>
          )}

          {canStartQuest && model.showQuest && onStartQuest && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onStartQuest();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
            >
              <span className="text-lg">🎭</span>
              <span>
                <span className="block text-sm font-bold">
                  {isGroup ? "Start a quest with Kai" : "Start a quest"}
                </span>
                <span className="block text-xs text-muted">
                  {isGroup
                    ? "Roleplay objectives that run in this group; Kai leads the scene."
                    : "Roleplay scenario in this chat."}
                </span>
              </span>
            </button>
          )}

          {canClear &&
            (confirm === "clear" ? (
              <ConfirmRow
                title={clearTitle}
                note={clearNote}
                actionLabel={busy === "clear" ? "Clearing…" : "Clear"}
                onConfirm={() => run("clear")}
                onCancel={() => setConfirm(null)}
                disabled={busy !== null}
              />
            ) : (
              <button
                onClick={() => setConfirm("clear")}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
              >
                <span className="text-lg">🧹</span>
                <span>
                  <span className="block text-sm font-bold">Clear messages</span>
                  <span className="block text-xs text-muted">
                    {isGroup
                      ? "Empty this group for everyone, keep it in the list."
                      : model.isDm
                        ? "Empty this chat for both of you, keep it in the list."
                        : "Empty this conversation, keep it in your list."}
                  </span>
                </span>
              </button>
            ))}

          {confirm === "delete" ? (
            <ConfirmRow
              title={deleteTitle}
              note={deleteNote}
              actionLabel={
                busy === "delete"
                  ? model.deleteMode === "hide"
                    ? "Hiding…"
                    : "Deleting…"
                  : model.deleteMode === "hide"
                    ? "Hide"
                    : "Delete"
              }
              onConfirm={() => run("delete")}
              onCancel={() => setConfirm(null)}
              disabled={busy !== null}
            />
          ) : (
            <button
              onClick={() => setConfirm("delete")}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sakura/5"
            >
              <span className="text-lg">🗑️</span>
              <span>
                <span className="block text-sm font-bold text-sakura">
                  {deleteLabel}
                </span>
                <span className="block text-xs text-muted">
                  {model.deleteMode === "delete"
                    ? isGroup
                      ? "Remove the group for everyone, permanently."
                      : "Remove it for everyone, permanently."
                    : isGroup
                      ? "Removes it from your list; you stay a member."
                      : "Removes it from your list. Find it in Archived."}
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmRow({
  title,
  note,
  actionLabel,
  onConfirm,
  onCancel,
  disabled,
}: {
  title: string;
  note: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl bg-sakura/5 px-3 py-2.5">
      <p className="text-sm font-bold text-sakura">{title}</p>
      <p className="mb-2 text-xs text-muted">{note}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-full bg-sakura px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {actionLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
