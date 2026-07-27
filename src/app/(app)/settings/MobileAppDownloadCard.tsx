"use client";

import { GithubLogo, DownloadSimple, ArrowSquareOut } from "@phosphor-icons/react";

const GITHUB_RELEASES_URL = "https://github.com/judealmaden/KaiwaAI/releases/latest";

export default function MobileAppDownloadCard() {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/10 text-indigo-ai">
            <GithubLogo size={28} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">Get KaiwaAI for Android</h2>
            <p className="mt-1 text-sm text-muted">
              Install the signed APK to use focus-blocking features and review notifications
              directly from your device.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-ai px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
          >
            <DownloadSimple size={18} weight="bold" />
            Download APK
            <ArrowSquareOut
              size={16}
              weight="bold"
              className="opacity-70 transition-opacity group-hover:opacity-100"
            />
          </a>
          <a
            href="https://github.com/judealmaden/KaiwaAI/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 text-sm font-bold text-foreground transition-all hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
          >
            <GithubLogo size={18} weight="bold" />
            All Releases
          </a>
        </div>

        <div className="mt-5 space-y-2 rounded-2xl bg-muted/30 p-4 text-xs text-muted">
          <p className="font-semibold text-foreground/80">Installation notes</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tap the downloaded <code className="rounded bg-card px-1 py-0.5 text-[11px]">.apk</code> file to install.</li>
            <li>You may need to allow &ldquo;Install from this source&rdquo; in Settings.</li>
            <li>On newer Android versions, you can also install via ADB or your file manager.</li>
            <li>Use the same account you use here to log in on the app.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
