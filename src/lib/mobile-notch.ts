export const MOBILE_NOTCH_STORAGE_KEY = "kaiwa:mobile-top-notch";
export const DEFAULT_NOTCH_OFFSET = 0;
export const MAX_NOTCH_OFFSET = 80;
export const MIN_NOTCH_OFFSET = 0;

/** Sentinel stored in localStorage meaning "use the device safe-area automatically". */
export const NOTCH_AUTO = "auto" as const;

export const NOTCH_PRESETS = [
  { label: "Off", px: 0 },
  { label: "Subtle", px: 16 },
  { label: "Standard", px: 28 },
  { label: "Notch", px: 38 },
  { label: "Tall", px: 48 },
] as const;

export function clampNotchOffset(val: number): number {
  if (isNaN(val)) return DEFAULT_NOTCH_OFFSET;
  return Math.max(MIN_NOTCH_OFFSET, Math.min(MAX_NOTCH_OFFSET, Math.round(val)));
}

/** Returns the stored manual override in px, or null when set to auto. */
export function getMobileNotchOffset(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOBILE_NOTCH_STORAGE_KEY);
    if (raw === null || raw === NOTCH_AUTO) return null;
    const n = parseInt(raw, 10);
    return clampNotchOffset(n);
  } catch {
    return null;
  }
}

/** Pass null to restore automatic safe-area behaviour. */
export function setMobileNotchOffset(px: number | null): number | null {
  if (typeof window !== "undefined") {
    try {
      if (px === null) {
        window.localStorage.setItem(MOBILE_NOTCH_STORAGE_KEY, NOTCH_AUTO);
        applyMobileNotchOffset(null);
      } else {
        const clamped = clampNotchOffset(px);
        window.localStorage.setItem(MOBILE_NOTCH_STORAGE_KEY, String(clamped));
        applyMobileNotchOffset(clamped);
        return clamped;
      }
    } catch {
      // ignore quota / private mode
    }
  }
  return px === null ? null : clampNotchOffset(px);
}

/**
 * Apply the notch offset CSS variable.
 * - null / undefined  → remove the override so the CSS `env()` fallback takes over
 * - number            → pin to that exact pixel value
 */
export function applyMobileNotchOffset(px?: number | null): void {
  if (typeof document === "undefined") return;
  if (px === null || px === undefined) {
    // Remove any hard-coded value; the CSS will fall back to env(safe-area-inset-top)
    document.documentElement.style.removeProperty("--mobile-notch-offset");
  } else {
    document.documentElement.style.setProperty(
      "--mobile-notch-offset",
      `${clampNotchOffset(px)}px`,
    );
  }
}
