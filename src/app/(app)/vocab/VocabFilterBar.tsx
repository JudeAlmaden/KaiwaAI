"use client";

import { Chip } from "../ui";
import {
  FILTERS,
  SORT_OPTIONS,
  type ContentTab,
  type Filter,
  type SortBy,
} from "./types";

export default function VocabFilterBar({
  contentTab,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
}: {
  contentTab: ContentTab;
  query: string;
  onQueryChange: (value: string) => void;
  filter: Filter;
  onFilterChange: (value: Filter) => void;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-3 sm:px-8">
      {/* Search */}
      <div className="relative mx-auto w-full max-w-3xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/50">
          🔍
        </span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={`Filter your ${contentTab}...`}
          className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-indigo-ai"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-border/50 text-xs text-muted hover:bg-border"
          >
            ✕
          </button>
        )}
      </div>
      {/* Filter chips + sort on one row */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => onFilterChange(f)}>
            {f}
          </Chip>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold text-muted">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="rounded-xl border-2 border-border bg-card px-2.5 py-1 text-xs font-bold text-fg outline-none focus:border-indigo-ai"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
