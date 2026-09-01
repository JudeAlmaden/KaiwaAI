"use client";

import { useState } from "react";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import {
  ArrowsDownUp,
  DownloadSimple,
  X,
  CheckCircle,
  Info,
} from "@phosphor-icons/react";

export default function AppUpdateBanner() {
  const { status, installed, latest, dismiss } = useAppUpdates({ autoCheck: true });

  const [hidden, setHidden] = useState(false);

  if (hidden) return null;
  if (installed.platform === "web") return null;
  if (status !== "update-available" || !latest) return null;

  const downloadUrl = latest.apkUrl || latest.htmlUrl;
  const latestLabel = latest.tagName;

  return (
    <div className="w-full border-b border-indigo-ai/20 bg-indigo-ai/10 px-3.5 py-2 text-xs backdrop-blur-md animate-in fade-in">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
        {/* Left info badge */}
        <div className="flex items-center gap-2 min-w-0">
          <ArrowsDownUp size={16} weight="bold" className="text-indigo-ai shrink-0" />
          <span className="font-bold text-foreground truncate text-xs">
            Update available <span className="font-mono text-[11px] font-bold text-indigo-ai">({latestLabel})</span>
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-indigo-ai px-3 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-ai/90 active:scale-95 transition-all"
          >
            <DownloadSimple size={13} weight="bold" />
            <span>Update APK</span>
          </a>
          <button
            type="button"
            onClick={() => {
              dismiss();
              setHidden(true);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-border/40 hover:text-foreground transition-all"
            aria-label="Dismiss banner"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppUpdateIndicatorCompact() {
  const { status, installed, latest } = useAppUpdates({
    autoCheck: true,
  });

  const isWeb = installed.platform === "web";
  const tag = latest?.tagName || "—";
  const installedLabel = isWeb
    ? `${installed.version} (Web)`
    : installed.build
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
            {status === "loading" && !latest ? "Checking…" : tag}
          </strong>
        </span>
        {status === "update-available" && latest && (
          <>
            <span aria-hidden className="opacity-50">•</span>
            <a
              href={latest.apkUrl || latest.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-ai/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-all hover:bg-indigo-ai/25"
            >
              <DownloadSimple size={12} weight="bold" />
              Download APK
            </a>
          </>
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
