"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Focus Guard only exists on Android: interception needs the native AppBlocker
 * plugin plus Usage Access / Display Over Apps permissions, and
 * `/settings/app-blocker` has nothing to talk to in a desktop browser.
 *
 * `NEXT_PUBLIC_APP_BLOCKER_DEBUG` keeps it reachable on a PC for development
 * and QA; local `next dev` stays open for the same reason.
 */
export function isAppBlockerSupported(): boolean {
  if (process.env.NEXT_PUBLIC_APP_BLOCKER_DEBUG === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

/**
 * Mount-safe variant. The platform is only known in the browser, so the server
 * snapshot is `false` and the real value arrives with hydration — which also
 * keeps the prerendered navigation from disagreeing with the Android WebView.
 * `useSyncExternalStore` is how React does this without a setState-in-effect
 * cascade (and without a hydration mismatch from a client-only initial state).
 */
const subscribe = () => () => {};

export function useAppBlockerSupported(): boolean {
  return useSyncExternalStore(subscribe, isAppBlockerSupported, () => false);
}
