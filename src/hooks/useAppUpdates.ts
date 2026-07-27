"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchLatestRelease,
  getInstalledAppInfo,
  isUpdateAvailable,
  type InstalledAppInfo,
  type LatestRelease,
  type UpdateStatus,
} from "@/lib/app-updates";

const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 6; // 6h between automated checks
const LAST_CHECK_KEY = "kaiwa:app-updates:last-check";
const CACHED_LATEST_KEY = "kaiwa:app-updates:cached-latest";
const DISMISSED_VERSION_KEY = "kaiwa:app-updates:dismissed-version";
const MODAL_SEEN_FOR_VERSION_KEY = "kaiwa:app-updates:modal-seen-version";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage errors */
  }
}

export interface UseAppUpdatesResult extends UpdateStatus {
  dismiss: () => void;
  refresh: () => Promise<void>;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: (opts?: { rememberAsSeen?: boolean }) => void;
}

export function useAppUpdates({
  autoCheck = true,
  force = false,
}: { autoCheck?: boolean; force?: boolean } = {}): UseAppUpdatesResult {
  const [installed, setInstalled] = useState<InstalledAppInfo>(() => ({
    version: "0.0.0",
    build: 0,
    platform: "web",
  }));
  const [latest, setLatest] = useState<LatestRelease | null>(() =>
    typeof window === "undefined"
      ? null
      : readJSON<LatestRelease | null>(CACHED_LATEST_KEY, null)
  );
  const [status, setStatus] = useState<UpdateStatus["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(DISMISSED_VERSION_KEY)
  );
  const [modalSeenVersion, setModalSeenVersion] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(MODAL_SEEN_FOR_VERSION_KEY)
  );
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoOpenedThisVersionRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getInstalledAppInfo()
      .then((info) => {
        if (cancelled) return;
        setInstalled(info);
      })
      .catch(() => {
        /* never throw */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = async (opts: { force?: boolean } = {}): Promise<void> => {
    if (installed.platform === "web") {
      return; // Plain browser users don't need APK update checks; use GitHub UI
    }

    const now = Date.now();
    const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
    const due = opts.force || force || now - lastCheck > CHECK_INTERVAL_MS;

    if (!due) {
      const cached = readJSON<LatestRelease | null>(CACHED_LATEST_KEY, null);
      if (cached) {
        setLatest(cached);
        setStatus(
          isUpdateAvailable(installed.version, cached.version) ? "update-available" : "up-to-date"
        );
      }
      return;
    }

    setStatus("loading");
    setError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const release = await fetchLatestRelease(ac.signal);
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      writeJSON(CACHED_LATEST_KEY, release);
      setLatest(release);
      const available = isUpdateAvailable(installed.version, release.version);
      setStatus(available ? "update-available" : "up-to-date");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  useEffect(() => {
    if (!autoCheck) return;
    if (installed.version === "0.0.0") return; // Not ready
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void runCheck();
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck, installed.platform, installed.version, force]);

  const dismiss = (): void => {
    if (!latest) return;
    localStorage.setItem(DISMISSED_VERSION_KEY, latest.version);
    setDismissedVersion(latest.version);
  };

  const openModal = (): void => {
    if (installed.platform === "web") return;
    setModalOpen(true);
  };

  const closeModal = (opts: { rememberAsSeen?: boolean } = {}): void => {
    setModalOpen(false);
    if (opts.rememberAsSeen !== false && latest) {
      localStorage.setItem(MODAL_SEEN_FOR_VERSION_KEY, latest.version);
      setModalSeenVersion(latest.version);
    }
  };

  // Auto-pop the modal exactly once per new update version per install.
  // If the user already dismissed the banner for this version, skip auto-pop too.
  useEffect(() => {
    if (installed.platform === "web") return;
    if (!latest) return;
    if (status !== "update-available") return;
    if (dismissedVersion === latest.version) return;
    if (modalSeenVersion === latest.version) return;
    if (autoOpenedThisVersionRef.current) return;
    autoOpenedThisVersionRef.current = true;
    const t = window.setTimeout(() => setModalOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [installed.platform, latest, status, dismissedVersion, modalSeenVersion]);

  // If version changes (new update arrives later), allow the new one to auto-pop again.
  useEffect(() => {
    autoOpenedThisVersionRef.current = false;
  }, [latest?.version]);

  const returnStatus: UpdateStatus["status"] = (() => {
    if (latest && isUpdateAvailable(installed.version, latest.version)) {
      return dismissedVersion === latest.version ? "up-to-date" : "update-available";
    }
    return status;
  })();

  return {
    status: returnStatus,
    installed,
    latest,
    error,
    dismiss,
    refresh: () => runCheck({ force: true }),
    modalOpen,
    openModal,
    closeModal,
  } satisfies UseAppUpdatesResult;
}
