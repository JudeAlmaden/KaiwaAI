"use client";

import { useEffect } from "react";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import {
  ArrowsDownUp,
  DownloadSimple,
  ArrowSquareOut,
  X,
  CheckCircle,
  BookOpen,
  Spinner,
  Warning,
} from "@phosphor-icons/react";

export default function AppUpdateModal() {
  const { status, installed, latest, modalOpen, closeModal } = useAppUpdates({
    autoCheck: true,
  });

  // Lock body scroll while the modal is open (mobile-friendly)
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  if (!modalOpen) return null;
  if (installed.platform === "web") return null;

  const hasUpdate = status === "update-available" && !!latest;
  const installedLabel = installed.build
    ? `${installed.version} (build ${installed.build})`
    : installed.version;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4 py-5 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        aria-hidden="true"
        onClick={() => closeModal()}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-border bg-background shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-indigo-ai/90 via-violet-500/85 to-fuchsia-500/80 px-5 py-6 text-white sm:px-7 sm:py-7">
          <button
            type="button"
            aria-label="Close update prompt"
            onClick={() => closeModal()}
            className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white/80 transition-all hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X size={18} weight="bold" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <ArrowsDownUp size={26} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                KaiwaAI
              </p>
              <h2
                id="app-update-title"
                className="mt-0.5 font-display text-xl font-bold leading-tight"
              >
                {hasUpdate
                  ? "A new version is available"
                  : "Checking for updates…"}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {latest && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border-2 border-border bg-muted/40 px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  Installed
                </p>
                <p className="mt-1 text-sm font-bold text-foreground truncate">
                  {installedLabel}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-indigo-ai/30 bg-indigo-ai/10 px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700/90 dark:text-indigo-300/90">
                  Latest
                </p>
                <p className="mt-1 text-sm font-bold text-indigo-ai truncate">
                  {latest.tagName}
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3 text-sm">
            {status === "loading" && (
              <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-muted">
                <Spinner size={18} weight="bold" className="animate-spin text-indigo-ai" />
                <span>Looking for a newer release on GitHub…</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-500/15 px-4 py-3 text-amber-800 dark:text-amber-200">
                <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Couldn&apos;t reach GitHub releases</p>
                  <p className="mt-0.5 text-xs opacity-90">
                    Check your connection, or tap the button below to open releases manually.
                  </p>
                </div>
              </div>
            )}

            {hasUpdate && latest && (
              <>
                <div className="rounded-2xl border-2 border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">
                        Released{" "}
                        {latest.publishedAt
                          ? new Date(latest.publishedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "recently"}
                      </p>
                      {(latest.name || latest.body) && (
                        <p className="mt-1 text-muted leading-snug">
                          {latest.name && (
                            <span className="font-semibold text-foreground/80">
                              {latest.name}
                            </span>
                          )}
                          {latest.name && latest.body ? <> — </> : null}
                          {latest.body && (
                            <span className="line-clamp-3">
                              {latest.body.replace(/\s+/g, " ").trim()}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <ul className="space-y-1.5 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <CheckCircle
                      size={15}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span>
                      Installed APK stays on your device — the new one installs on top and keeps
                      all your progress and settings.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle
                      size={15}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span>
                      Tap the downloaded <code className="rounded bg-muted px-1 py-0.5 text-[11px]">.apk</code>{" "}
                      and allow &ldquo;Install from this source&rdquo; if prompted.
                    </span>
                  </li>
                </ul>
              </>
            )}

            {status === "up-to-date" && (
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/12 px-4 py-3 text-emerald-800 dark:text-emerald-200">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">You&apos;re already on the latest version.</p>
                  <p className="mt-0.5 text-xs opacity-90">
                    We&apos;ll prompt you again as soon as KaiwaAI publishes a newer release.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {hasUpdate && latest && (
              <a
                href={latest.apkUrl || latest.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-indigo-ai px-5 text-sm font-bold text-white shadow-sm shadow-indigo-ai/30 transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
              >
                <DownloadSimple size={18} weight="bold" />
                Download update APK
                <ArrowSquareOut
                  size={15}
                  weight="bold"
                  className="opacity-80 transition-opacity group-hover:opacity-100"
                />
              </a>
            )}

            {(status === "error" || status === "loading") && (
              <a
                href="https://github.com/judealmaden/KaiwaAI/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-indigo-ai px-5 text-sm font-bold text-white shadow-sm shadow-indigo-ai/30 transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
              >
                <BookOpen size={18} weight="bold" />
                Open releases page
                <ArrowSquareOut
                  size={15}
                  weight="bold"
                  className="opacity-80 transition-opacity group-hover:opacity-100"
                />
              </a>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={latest?.htmlUrl || "https://github.com/judealmaden/KaiwaAI/releases"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 text-sm font-bold text-foreground transition-all hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
              >
                View release notes
              </a>
              <button
                type="button"
                onClick={() => closeModal({ rememberAsSeen: true })}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-muted transition-all hover:bg-muted/40 hover:text-foreground"
              >
                {hasUpdate ? "Later" : "Close"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
