import type { MemoryCategory } from "./types";

export type MemorySuggestion = {
  content: string;
  category: MemoryCategory;
  importance: number;
};

const CATEGORIES: MemoryCategory[] = [
  "profile",
  "preference",
  "fact",
  "goal",
  "relationship",
];

function asCategory(v: unknown): MemoryCategory {
  return CATEGORIES.includes(v as MemoryCategory)
    ? (v as MemoryCategory)
    : "fact";
}

function asImportance(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Coerce model memorySuggestions (string[] or object[]) into a clean list. */
export function normalizeMemorySuggestions(raw: unknown): MemorySuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: MemorySuggestion[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let content = "";
    let category: MemoryCategory = "fact";
    let importance = 1;

    if (typeof item === "string") {
      content = item.trim();
    } else if (item && typeof item === "object") {
      const r = item as Record<string, unknown>;
      content = typeof r.content === "string" ? r.content.trim() : "";
      category = asCategory(r.category);
      importance = asImportance(r.importance);
    }

    if (!content) continue;
    const key = content.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ content, category, importance });
  }

  return out;
}

/** Normalize for near-duplicate comparison. */
export function memoryDedupeKey(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard-ish token overlap for near-duplicate detection. */
export function memorySimilarity(a: string, b: string): number {
  const ta = new Set(memoryDedupeKey(a).split(" ").filter(Boolean));
  const tb = new Set(memoryDedupeKey(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
