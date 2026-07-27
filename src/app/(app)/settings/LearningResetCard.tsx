"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Trash,
  ArrowCounterClockwise,
  X,
  BookOpen,
  TextAa,
  Warning,
  Spinner,
  CheckCircle,
} from "@phosphor-icons/react";

type Target = "vocab" | "kanji";
type Action = "resetSrs" | "deleteAll";
type Step = "chooseAction" | "confirm";

interface Counts {
  vocab: number;
  kanji: number;
}

const TARGET_LABEL: Record<Target, string> = {
  vocab: "Vocabulary",
  kanji: "Kanji",
};

const ACTION_LABEL: Record<Action, string> = {
  resetSrs: "Reset SRS progress",
  deleteAll: "Delete all",
};

const ACTION_DESC: Record<Action, string> = {
  resetSrs:
    "Keeps all cards in your deck but returns them to 'new' status — interval, ease factor, and review history are cleared.",
  deleteAll:
    "Completely removes every card from your deck. This cannot be undone and you will have to re-add them from chats or dictionary.",
};

export default function LearningResetCard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("chooseAction");
  const [target, setTarget] = useState<Target | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; target: Target; action: Action } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (loading) return;
    setOpen(false);
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const openModal = async () => {
    setOpen(true);
    setStep("chooseAction");
    setTarget(null);
    setAction(null);
    setConfirmText("");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/learning/reset");
      if (res.ok) {
        const data = await res.json();
        setCounts({ vocab: data.vocab.total, kanji: data.kanji.total });
      }
    } catch {
      setCounts(null);
    }
  };

  const canGoConfirm = target !== null && action !== null;

  const goConfirm = () => {
    if (!canGoConfirm) return;
    setStep("confirm");
    setConfirmText("");
    setError(null);
    setResult(null);
  };

  const backToChoose = () => {
    if (loading) return;
    setStep("chooseAction");
    setConfirmText("");
    setError(null);
  };

  const expectedConfirm =
    action && target
      ? action === "resetSrs"
        ? `RESET ${target.toUpperCase()}`
        : `DELETE ${target.toUpperCase()}`
      : "";

  const execute = async () => {
    if (!target || !action || confirmText !== expectedConfirm) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/learning/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({ count: data.count, target, action });
      if (counts) {
        if (action === "resetSrs") {
          setCounts({ ...counts });
        } else {
          setCounts({
            ...counts,
            [target]: 0,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20">
            <Trash size={24} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">Reset Learning Data</h3>
            <p className="mt-1 text-sm text-muted">
              Reset SRS progress or wipe your entire vocabulary / kanji decks.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border-2 border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-600 transition-all hover:border-rose-500/60 hover:bg-rose-500/20 active:scale-[0.98] dark:text-rose-400"
            >
              <Trash size={16} weight="bold" />
              Manage data
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-reset-title"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 py-5 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border-2 border-border bg-background shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-rose-500/90 via-orange-500/85 to-amber-500/80 px-5 py-5 text-white sm:px-7 sm:py-6">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleClose}
            disabled={loading}
            className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white/80 transition-all hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <X size={18} weight="bold" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <Warning size={26} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                Learning data
              </p>
              <h2 id="learning-reset-title" className="text-lg font-extrabold leading-tight sm:text-xl">
                {step === "chooseAction"
                  ? "Choose what to reset or delete"
                  : result
                  ? "Done"
                  : `Confirm: ${action ? ACTION_LABEL[action] : ""} ${target ? TARGET_LABEL[target] : ""}`}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {step === "chooseAction" && (
            <ChooseActionStep
              target={target}
              setTarget={setTarget}
              action={action}
              setAction={setAction}
              counts={counts}
              onContinue={goConfirm}
              onCancel={handleClose}
            />
          )}

          {step === "confirm" && target && action && (
            <ConfirmStep
              target={target}
              action={action}
              confirmText={confirmText}
              setConfirmText={setConfirmText}
              expectedConfirm={expectedConfirm}
              loading={loading}
              error={error}
              result={result}
              counts={counts}
              onBack={backToChoose}
              onExecute={execute}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChooseActionStep({
  target,
  setTarget,
  action,
  setAction,
  counts,
  onContinue,
  onCancel,
}: {
  target: Target | null;
  setTarget: (t: Target) => void;
  action: Action | null;
  setAction: (a: Action) => void;
  counts: Counts | null;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const targets: { id: Target; label: string; count: number | null; icon: typeof BookOpen; tone: string }[] = [
    {
      id: "vocab",
      label: "Vocabulary",
      count: counts?.vocab ?? null,
      icon: BookOpen,
      tone: "from-sky-500 to-indigo-500",
    },
    {
      id: "kanji",
      label: "Kanji",
      count: counts?.kanji ?? null,
      icon: TextAa,
      tone: "from-fuchsia-500 to-pink-500",
    },
  ];
  const actions: { id: Action; label: string; desc: string; icon: typeof ArrowCounterClockwise; danger?: boolean }[] = [
    {
      id: "resetSrs",
      label: "Reset SRS progress",
      desc: "Keep the cards, restart learning from day 1.",
      icon: ArrowCounterClockwise,
    },
    {
      id: "deleteAll",
      label: "Delete all cards",
      desc: "Remove them from your deck entirely (irreversible).",
      icon: Trash,
      danger: true,
    },
  ];

  const canContinue = target !== null && action !== null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-bold text-foreground mb-2.5">1. What data?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {targets.map((t) => {
            const Icon = t.icon;
            const selected = target === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarget(t.id)}
                className={`group relative text-left rounded-2xl border-2 p-4 transition-all ${
                  selected
                    ? "border-indigo-ai bg-indigo-ai/5 shadow-sm"
                    : "border-border bg-card hover:border-foreground/25 hover:bg-foreground/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.tone} text-white shadow-sm`}
                  >
                    <Icon size={20} weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground leading-tight">{t.label}</p>
                    <p className="mt-1 text-xs text-muted">
                      {t.count === null ? "Loading…" : `${t.count.toLocaleString()} card${t.count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                      selected
                        ? "border-indigo-ai bg-indigo-ai ring-4 ring-indigo-ai/20"
                        : "border-border bg-transparent group-hover:border-foreground/30"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-foreground mb-2.5">2. What should happen?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            const selected = action === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAction(a.id)}
                className={`group relative text-left rounded-2xl border-2 p-4 transition-all ${
                  selected
                    ? a.danger
                      ? "border-rose-500/70 bg-rose-500/5 shadow-sm"
                      : "border-indigo-ai bg-indigo-ai/5 shadow-sm"
                    : "border-border bg-card hover:border-foreground/25 hover:bg-foreground/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      a.danger
                        ? "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20"
                        : "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                    }`}
                  >
                    <Icon size={20} weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold leading-tight ${
                        a.danger ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                      }`}
                    >
                      {a.label}
                    </p>
                    <p className="mt-1 text-xs text-muted">{a.desc}</p>
                  </div>
                  <div
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                      selected
                        ? a.danger
                          ? "border-rose-500 bg-rose-500 ring-4 ring-rose-500/20"
                          : "border-indigo-ai bg-indigo-ai ring-4 ring-indigo-ai/20"
                        : "border-border bg-transparent group-hover:border-foreground/30"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-bold text-muted transition-all hover:bg-foreground/[0.04] hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-ai/92 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-ai"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({
  target,
  action,
  confirmText,
  setConfirmText,
  expectedConfirm,
  loading,
  error,
  result,
  counts,
  onBack,
  onExecute,
  onClose,
}: {
  target: Target;
  action: Action;
  confirmText: string;
  setConfirmText: (s: string) => void;
  expectedConfirm: string;
  loading: boolean;
  error: string | null;
  result: { count: number; target: Target; action: Action } | null;
  counts: Counts | null;
  onBack: () => void;
  onExecute: () => void;
  onClose: () => void;
}) {
  const totalForTarget = target === "vocab" ? counts?.vocab : counts?.kanji;
  const matches = confirmText === expectedConfirm;

  if (result) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
          <CheckCircle size={34} weight="duotone" />
        </div>
        <div>
          <p className="text-lg font-extrabold text-foreground">
            {ACTION_LABEL[result.action]} complete
          </p>
          <p className="mt-1 text-sm text-muted">
            {result.action === "resetSrs"
              ? `SRS progress was reset for ${result.count.toLocaleString()} ${TARGET_LABEL[result.target]} card${
                  result.count === 1 ? "" : "s"
                }.`
              : `${result.count.toLocaleString()} ${TARGET_LABEL[result.target]} card${
                  result.count === 1 ? " has" : "s have"
                } been deleted.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-ai/92 active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    );
  }

  const ActionIcon = action === "resetSrs" ? ArrowCounterClockwise : Trash;
  const TargetIcon = target === "vocab" ? BookOpen : TextAa;
  const danger = action === "deleteAll";

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border-2 p-4 ${
          danger ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              danger ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-500"
            }`}
          >
            <ActionIcon size={22} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold ${danger ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              {ACTION_LABEL[action]}
            </p>
            <p className="text-xs text-muted mt-0.5">{ACTION_DESC[action]}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2 border border-border">
          <TargetIcon size={18} className="text-indigo-ai shrink-0" weight="bold" />
          <p className="text-sm font-bold text-foreground">{TARGET_LABEL[target]}</p>
          <span className="ml-auto text-xs text-muted">
            {totalForTarget == null
              ? "—"
              : `${totalForTarget.toLocaleString()} card${totalForTarget === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-foreground block mb-1.5" htmlFor="confirm-input">
          Type <code className={`rounded-md px-1.5 py-0.5 text-[11px] ${danger ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"} font-mono`}>{expectedConfirm}</code> to confirm
        </label>
        <input
          id="confirm-input"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={loading}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder={expectedConfirm}
          className={`w-full rounded-2xl border-2 bg-background px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-indigo-ai/40 transition-all ${
            confirmText && !matches
              ? "border-rose-500/60 focus:ring-rose-500/30"
              : "border-border"
          }`}
        />
        {confirmText && !matches && (
          <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            Must exactly match <span className="font-mono">{expectedConfirm}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 font-semibold">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-bold text-muted transition-all hover:bg-foreground/[0.04] hover:text-foreground disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={!matches || loading}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
            danger
              ? "bg-rose-500 hover:bg-rose-500/92 disabled:hover:bg-rose-500"
              : "bg-amber-500 hover:bg-amber-500/92 disabled:hover:bg-amber-500"
          }`}
        >
          {loading ? (
            <>
              <Spinner size={16} weight="bold" className="animate-spin" />
              Working…
            </>
          ) : (
            <>
              <ActionIcon size={16} weight="bold" />
              {action === "resetSrs" ? "Reset SRS" : "Delete all"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
