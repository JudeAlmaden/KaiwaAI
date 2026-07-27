"use client";

import { useState } from "react";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import {
  ArrowsDownUp,
  DownloadSimple,
  X,
  ArrowSquareOut,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";

export default function AppUpdateBanner() {
  const { status, installed, latest, dismiss } = useAppUpdates({ autoCheck: true });

  const [hidden, setHidden] = useState(false);

  if (hidden) return null;
  if (installed.platform === "web") return null;
  if (status !== "update-available" || !latest) return null;

  const downloadUrl = latest.apkUrl || latest.htmlUrl;
  const installedLabel = installed.build
    ? `${installed.version} (build ${installed.build})`
    : installed.version;
  const latestLabel = latest.version === latest.tagName ? latest.tagName : `${latest.tagName} (${latest.version})`;

  return (
    <div className="w-full bg-indigo-500/15 border-b-2 border-indigo-500/30 px-3.5 py-2.5 text-xs text-indigo-900 dark:text-indigo-100 shadow-xs animate-in fade-in">
      <div className="flex items-start gap-3 mx-auto max-w-3xl">
        <div className="shrink-0 mt-0.5 hidden sm:block">
          <ArrowsDownUp size={20} weight="duotone" className="text-indigo-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold flex items-center gap-2">
            <span className="inline-flex sm:hidden">
              <ArrowsDownUp size={16} weight="bold" className="text-indigo-600 dark:text-indigo-300" />
            </span>
            Update available
          </p>
          <p className="mt-1 opacity-95 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span>
              Installed <strong className="font-semibold">{installedLabel}</strong>
            </span>
            <span aria-hidden>→</span>
            <span>
              Latest <strong className="font-semibold">{latestLabel}</strong>
            </span>
          </p>
          {latest.publishedAt && (
            <p className="mt-1 opacity-75">
              <Info size={12} className="inline align-text-bottom mr-1 opacity-80" />
              Released {new Date(latest.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-ai px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
            >
              <DownloadSimple size={16} weight="bold" />
              Download update APK
              <ArrowSquareOut size={14} weight="bold" className="opacity-80" />
            </a>
            <a
              href={latest.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-4 text-xs font-bold text-foreground transition-all hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
            >
              View release notes
            </a>
            <button
              type="button"
              onClick={() => {
                dismiss();
                setHidden(true);
              }}
              className="ml-auto inline-flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-xs font-semibold text-indigo-900/70 dark:text-indigo-100/70 transition-all hover:bg-indigo-500/10 hover:text-foreground"
            >
              <X size={15} weight="bold" />
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppUpdateIndicatorCompact() {
  const { status, installed, latest, refresh, openModal } = useAppUpdates({
    autoCheck: true,
  });

  if (installed.platform === "web") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted">
        <CheckCircle size={14} weight="fill" className="text-emerald-500" />
        <span>Checking for updates is only available in the Android app.</span>
      </div>
    );
  }

  const tag = latest?.tagName || "—";
  const installedLabel = installed.build
    ? `${installed.version} (b${installed.build})`
    : installed.version;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2 text-muted">
        <span>
          Installed: <strong className="font-semibold text-foreground">{installedLabel}</strong>
        </span>
        <span aria-hidden className="opacity-50">•</span>
        <span>
          Latest:{" "}
          <strong className="font-semibold text-foreground">
            {status === "loading" ? "Checking…" : tag}
          </strong>
        </span>
        <span aria-hidden className="opacity-50">•</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-0.5 font-semibold text-muted/90 transition-all hover:border-indigo-ai/40 hover:text-foreground disabled:opacity-50"
          disabled={status === "loading"}
        >
          <ArrowsDownUp size={12} weight="bold" />
          Recheck
        </button>
        {status === "update-available" && (
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-ai/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-all hover:bg-indigo-ai/25"
          >
            View update screen
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status === "update-available" && latest && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
            <ArrowsDownUp size={12} weight="bold" />
            Update available
          </span>
        )}
        {status === "up-to-date" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={12} weight="fill" />
            You are on the latest release
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
            <Info size={12} weight="bold" />
            Could not check for updates
          </span>
        )}
        {status === "loading" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-bold text-muted animate-pulse">
            Checking GitHub releases…
          </span>
        )}
      </div>
    </div>
  );
}
