import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import { useSelectionStore } from "../stores/useSelectionStore";
import type { GenomicRow } from "../types/genomic";

const NUMERIC_COLUMNS = new Set([
  "chromStart", "chromEnd", "POS", "score",
  "thickStart", "thickEnd", "blockCount",
]);

export interface FindReplaceOptions {
  search: string;
  replace: string;
  scope: "all" | "selected" | string; // string = specific column name
  caseSensitive: boolean;
}

export interface FindReplacePreview {
  rowIndex: number;
  colKey: string;
  before: string;
  after: string;
}

/** Preview what find & replace will change (up to 50 matches) */
export function previewFindReplace(options: FindReplaceOptions): FindReplacePreview[] {
  const { search, replace, scope, caseSensitive } = options;
  if (!search) return [];

  const store = useFileStore.getState();
  const selectedIndices = useSelectionStore.getState().selectedRowIndices;
  const results: FindReplacePreview[] = [];

  const rows =
    scope === "selected"
      ? store.rows.filter((r) => selectedIndices.has(r._index))
      : store.rows;

  const columns =
    scope !== "all" && scope !== "selected"
      ? [scope]
      : store.columns;

  for (const row of rows) {
    if (results.length >= 50) break;
    for (const col of columns) {
      if (results.length >= 50) break;
      const val = String(row[col] ?? "");
      const matches = caseSensitive
        ? val.includes(search)
        : val.toLowerCase().includes(search.toLowerCase());

      if (matches) {
        const after = caseSensitive
          ? val.replaceAll(search, replace)
          : val.replace(new RegExp(escapeRegex(search), "gi"), replace);

        results.push({
          rowIndex: row._index,
          colKey: col,
          before: val,
          after,
        });
      }
    }
  }

  return results;
}

/** Run find & replace on all matching cells */
export function runFindReplace(options: FindReplaceOptions): void {
  const { search, replace, scope, caseSensitive } = options;
  if (!search) return;

  const store = useFileStore.getState();
  const selectedIndices = useSelectionStore.getState().selectedRowIndices;

  const rows =
    scope === "selected"
      ? store.rows.filter((r) => selectedIndices.has(r._index))
      : store.rows;

  const columns =
    scope !== "all" && scope !== "selected"
      ? [scope]
      : store.columns;

  const updates: Array<{ index: number; row: Record<string, string | number> }> = [];
  let skipped = 0;

  for (const row of rows) {
    const rowUpdate: Record<string, string | number> = {};
    let hasChange = false;

    for (const col of columns) {
      const val = String(row[col] ?? "");
      const matches = caseSensitive
        ? val.includes(search)
        : val.toLowerCase().includes(search.toLowerCase());

      if (matches) {
        const newVal = caseSensitive
          ? val.replaceAll(search, replace)
          : val.replace(new RegExp(escapeRegex(search), "gi"), replace);

        if (NUMERIC_COLUMNS.has(col)) {
          const parsed = parseInt(newVal, 10);
          if (isNaN(parsed)) {
            skipped++;
            continue;
          }
          rowUpdate[col] = parsed;
        } else {
          rowUpdate[col] = newVal;
        }
        hasChange = true;
      }
    }

    if (hasChange) {
      updates.push({ index: row._index, row: rowUpdate });
    }
  }

  if (updates.length === 0) {
    toast.info("No replacements made");
    return;
  }

  store.updateRows(updates);

  const msg = `Replaced in ${updates.length} row${updates.length !== 1 ? "s" : ""}`;
  const desc = skipped > 0 ? `Skipped ${skipped} invalid numeric value${skipped !== 1 ? "s" : ""}` : undefined;
  toast.success(msg, { description: desc });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pure variant: find and replace in rows */
export function findAndReplace(
  rows: GenomicRow[],
  columns: string[],
  options: { search: string; replace: string; caseSensitive: boolean },
): GenomicRow[] {
  const { search, replace, caseSensitive } = options;
  if (!search) return rows;

  return rows.map((row) => {
    const newRow = { ...row };
    let hasChange = false;

    for (const col of columns) {
      const val = String(row[col] ?? "");
      const matches = caseSensitive
        ? val.includes(search)
        : val.toLowerCase().includes(search.toLowerCase());

      if (matches) {
        const newVal = caseSensitive
          ? val.replaceAll(search, replace)
          : val.replace(new RegExp(escapeRegex(search), "gi"), replace);

        if (NUMERIC_COLUMNS.has(col)) {
          const parsed = parseInt(newVal, 10);
          if (isNaN(parsed)) continue;
          newRow[col] = parsed;
        } else {
          newRow[col] = newVal;
        }
        hasChange = true;
      }
    }

    return hasChange ? newRow : row;
  });
}
