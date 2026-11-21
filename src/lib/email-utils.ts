/**
 * Simple email validation check for UI input fields.
 */
export function looksLikeEmail(val: string): boolean {
  if (!val) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}
