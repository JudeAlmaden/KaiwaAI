export const MOBILE_NOTCH_STORAGE_KEY = "kaiwa:mobile-top-notch";
export const DEFAULT_NOTCH_OFFSET = 0;
export const MAX_NOTCH_OFFSET = 80;
export const MIN_NOTCH_OFFSET = 0;

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

export function getMobileNotchOffset(): number {
  if (typeof window === "undefined") return DEFAULT_NOTCH_OFFSET;
  try {
    const raw = window.localStorage.getItem(MOBILE_NOTCH_STORAGE_KEY);
    if (raw === null) return DEFAULT_NOTCH_OFFSET;
    const n = parseInt(raw, 10);
    return clampNotchOffset(n);
  } catch {
    return DEFAULT_NOTCH_OFFSET;
  }
}

export function setMobileNotchOffset(px: number): number {
  const clamped = clampNotchOffset(px);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MOBILE_NOTCH_STORAGE_KEY, String(clamped));
      applyMobileNotchOffset(clamped);
    } catch {
      // ignore quota / private mode
    }
  }
  return clamped;
}

export function applyMobileNotchOffset(px?: number): void {
  if (typeof document === "undefined") return;
  const value = px !== undefined ? clampNotchOffset(px) : getMobileNotchOffset();
  document.documentElement.style.setProperty("--mobile-notch-offset", `${value}px`);
}
