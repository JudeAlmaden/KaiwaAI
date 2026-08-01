"use client";

import { GithubLogo, DownloadSimple, ArrowSquareOut, DeviceMobileCamera } from "@phosphor-icons/react";
import { GITHUB_DOWNLOAD_URLS } from "@/lib/app-updates";
import { AppUpdateIndicatorCompact } from "@/components/AppUpdateBanner";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import { Capacitor } from "@capacitor/core";

export default function MobileAppDownloadCard() {
  const { installed, latest, status } = useAppUpdates({ autoCheck: true });
  const isAndroid = Capacitor.getPlatform() === "android";

  const primaryLabel = isAndroid ? "Update APK" : "Download APK";
  const primaryHint =
    isAndroid && status === "update-available" && latest ? latest.apkUrl || latest.htmlUrl : GITHUB_DOWNLOAD_URLS.latest;

  const downloaded = isAndroid;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/10 text-indigo-ai">
            {downloaded ? (
              <DeviceMobileCamera size={28} weight="duotone" />
            ) : (
                <GithubLogo size={28} weight="duotone" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">
              {downloaded ? "KaiwaAI for Android" : "Get KaiwaAI for Android"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {downloaded
                ? "You have KaiwaAI installed. Updates are published to GitHub Releases — recheck here or wait for the in-app banner."
                : "Install the signed APK to use focus-blocking features and review notifications directly from your device."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/30 p-3 sm:p-4">
          <AppUpdateIndicatorCompact />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={primaryHint}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-2xl bg-indigo-ai px-6 text-base font-bold text-white shadow-sm transition-all hover:bg-indigo-ai/90 active:scale-[0.98]"
          >
            <DownloadSimple size={20} weight="bold" />
            {primaryLabel}
            <ArrowSquareOut
              size={18}
              weight="bold"
              className="opacity-70 transition-opacity group-hover:opacity-100"
            />
          </a>
          <a
            href={GITHUB_DOWNLOAD_URLS.all}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-2xl border-2 border-border bg-card px-6 text-base font-bold text-foreground transition-all hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
          >
            <GithubLogo size={20} weight="bold" />
            All Releases
          </a>
        </div>

        {/* Installation / Update Guide */}
        <div className="mt-5 rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold text-xs shrink-0">
              ℹ
            </div>
            <h3 className="font-display text-sm font-bold text-foreground">
              {downloaded ? "How to Update" : "How to Install"}
            </h3>
          </div>

          <div className="space-y-2.5 pt-1">
            {downloaded ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-foreground/90">
                    Installed version: <strong className="font-semibold text-foreground">{installed.version}</strong>
                    {installed.build ? <> (build {installed.build})</> : null}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-foreground/90 leading-snug">
                    Download the latest <code className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">.apk</code> and tap to upgrade. Your local settings and account remain intact.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-foreground/90 leading-snug">
                    In-app banner also notifies you whenever new updates are released on <code className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">main</code>.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-foreground/90 leading-snug">
                    Tap <strong className="font-semibold text-foreground">Download APK</strong> above to get the signed <code className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">.apk</code> file.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-foreground/90 leading-snug">
                    Tap the downloaded file to install. Allow <strong className="font-semibold text-foreground">&ldquo;Install from this source&rdquo;</strong> in Android Settings if prompted.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-ai/10 text-indigo-ai font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-foreground/90 leading-snug">
                    Log in with your existing KaiwaAI account to sync your flashcards and study progress.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
