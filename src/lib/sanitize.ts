/**
 * Strip HTML tags from a string to prevent HTML/XSS injection.
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim();
}
