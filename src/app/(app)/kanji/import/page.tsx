"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Group = { id: string; name: string };

type ParsedRow = {
  character: string;
  keyword: string;
  frameNumber: number | null;
  mnemonic: string;
};

type RowResult = { character: string; ok: boolean; error?: string };

export default function KanjiImportPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/kanji/groups")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data?.groups)) return;
        setGroups(
          data.groups.map((g: Group) => ({ id: g.id, name: g.name })) as Group[]
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!bulkText.trim()) return [];

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: ParsedRow[] = [];

    for (const line of lines) {
      let parts = line.split("\t");
      if (parts.length === 1 && line.includes("|")) {
        parts = line.split("|").map((p) => p.trim());
      } else if (parts.length === 1 && line.includes(",")) {
        parts = line.split(",").map((p) => p.trim());
      }

      if (parts.length < 1) continue;

      const first = parts[0]?.trim() || "";
      let char = first;
      let keyword = parts[1]?.trim() || "";
      let lesson: number | null = null;
      let frame: number | null = null;
      let mnemonic = "";

      if (/^\d+$/.test(first) && parts.length >= 2) {
        // Format: Frame # | Character | Keyword ...
        frame = parseInt(first);
        char = parts[1]?.trim() || "";
        keyword = parts[2]?.trim() || "";
        if (parts[3] && /^\d+$/.test(parts[3].trim())) {
          lesson = parseInt(parts[3].trim());
          mnemonic = parts.slice(4).join(" ").trim();
        } else {
          mnemonic = parts.slice(3).join(" ").trim();
        }
      } else {
        // Format: Character | Keyword | Lesson | Frame | Mnemonic
        if (parts.length >= 3 && /^\d+$/.test(parts[2].trim())) {
          lesson = parseInt(parts[2].trim());
        }
        if (parts.length >= 4 && /^\d+$/.test(parts[3].trim())) {
          frame = parseInt(parts[3].trim());
          mnemonic = parts.slice(4).join(" ").trim();
        } else if (parts.length >= 3 && !lesson) {
          mnemonic = parts.slice(2).join(" ").trim();
        } else if (parts.length >= 4) {
          mnemonic = parts.slice(3).join(" ").trim();
        }
      }

      if (char) parsed.push({ character: char, keyword, frameNumber: frame, mnemonic });
    }

    return parsed;
  }, [bulkText]);

  const resolveGroupId = async (): Promise<string | null> => {
    if (targetGroupId === "new" && newGroupName.trim()) {
      const res = await fetch("/api/kanji/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.group.id;
      }
      return null;
    }
    return targetGroupId && targetGroupId !== "new" ? targetGroupId : null;
  };

  const handleImport = async () => {
    if (rows.length === 0) return;

    setImporting(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: rows.length });

    try {
      const groupId = await resolveGroupId();
      const collected: RowResult[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const res = await fetch("/api/kanji", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              character: row.character,
              heisigKeyword: row.keyword || undefined,
              heisigNumber: row.frameNumber ?? undefined,
              mnemonic: row.mnemonic || undefined,
              groupId: groupId || undefined,
            }),
          });

          if (res.ok) {
            collected.push({ character: row.character, ok: true });
          } else {
            const data = await res.json().catch(() => ({}));
            collected.push({
              character: row.character,
              ok: false,
              error: data.error || `Request failed (${res.status})`,
            });
          }
        } catch {
          collected.push({ character: row.character, ok: false, error: "Network error" });
        }

        setProgress({ current: i + 1, total: rows.length });
      }

      setResults(collected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error during import");
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const imported = results.filter((r) => r.ok).length;
  const failed = results.length - imported;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/study?tab=kanji"
        className="text-xs font-semibold text-muted transition-colors hover:text-fg"
      >
        ← Back to Kanji
      </Link>

      <h1 className="mt-2 font-display text-2xl font-bold text-fg">Import Kanji</h1>
      <p className="mt-1 text-sm text-muted">
        Paste a table from your RTK notes or a spreadsheet — one kanji per line.
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-500">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-fg">
            Paste raw table or lines
          </label>
          <p className="mb-2 text-xs text-muted">
            Tab-separated (pipe and comma also work). Accepted per line:<br />
            • <code>[Kanji]  [Keyword]  [Lesson]  [Frame#]  [Story...]</code><br />
            • <code>[Frame#]  [Kanji]  [Keyword]  [Story...]</code>
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`12\t日\tsun\t1\tThe sun rising over the horizon\n13\t月\tmoon\t1\tThe moon smiling in the night sky`}
            rows={8}
            className="w-full rounded-2xl border-2 border-border/80 bg-bg/60 p-4 font-mono text-xs outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-fg">
            Assign all to Folder / Lesson (Optional)
          </label>
          <select
            value={targetGroupId}
            onChange={(e) => {
              setTargetGroupId(e.target.value);
              setIsCreatingNewGroup(e.target.value === "new");
            }}
            className="h-12 w-full rounded-2xl border-2 border-border/80 bg-bg/60 px-4 text-sm font-semibold outline-none transition-all focus:border-indigo-ai focus:bg-card focus:ring-4 focus:ring-indigo-ai/10"
          >
            <option value="">None (Unassigned)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                📁 {g.name}
              </option>
            ))}
            <option value="new">📁 + Create New Folder / Lesson for these...</option>
          </select>

          {isCreatingNewGroup && (
            <div className="mt-2.5">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter new folder name (e.g. Lesson 1)"
                className="h-11 w-full rounded-2xl border-2 border-indigo-ai/50 bg-bg px-4 text-sm outline-none focus:border-indigo-ai focus:ring-4 focus:ring-indigo-ai/10"
              />
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-bg/50 p-3.5">
            <p className="text-xs font-bold">Detected {rows.length} kanji to import:</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
              {rows.map((r, i) => (
                <div
                  key={`${r.character}-${i}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-2.5 shadow-xs"
                >
                  <span className="w-8 text-center font-jp text-lg font-bold text-indigo-ai">
                    {r.character}
                  </span>
                  <span className="w-24 truncate font-semibold text-fg">
                    {r.keyword || "(no keyword)"}
                  </span>
                  {r.frameNumber && (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                      #{r.frameNumber}
                    </span>
                  )}
                  <span className="flex-1 truncate text-[11px] text-muted">
                    {r.mnemonic || "No story"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-bg/50 p-3.5 text-xs">
            <p className="font-bold">
              {imported} imported{failed > 0 ? `, ${failed} failed` : ""}.
            </p>
            {failed > 0 && (
              <ul className="space-y-1">
                {results
                  .filter((r) => !r.ok)
                  .map((r, i) => (
                    <li key={`${r.character}-${i}`} className="text-rose-500">
                      ❌ {r.character} — {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || rows.length === 0}
            className="rounded-2xl bg-gradient-to-r from-indigo-ai to-indigo-deep px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-ai/25 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-ai/35 active:scale-[0.98] disabled:opacity-50"
          >
            {importing
              ? `Importing (${progress?.current}/${progress?.total})...`
              : `Import ${rows.length} Kanji`}
          </button>
        </div>
      </div>
    </div>
  );
}
