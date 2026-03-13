import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";
import type { GenomicRow } from "../types/genomic";

export interface InfoFieldSummary {
  key: string;
  isFlag: boolean;
  example: string;
  count: number;
}

/** Scan all rows and collect INFO field keys with examples */
export function scanInfoFields(): InfoFieldSummary[] {
  const rows = useFileStore.getState().rows;
  const fieldMap = new Map<
    string,
    { isFlag: boolean; example: string; count: number }
  >();

  for (const row of rows) {
    const info = String(row.INFO ?? ".");
    if (info === "." || info === "") continue;

    const pairs = info.split(";");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) {
        // Flag field (no value)
        const key = pair.trim();
        if (!key) continue;
        const existing = fieldMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          fieldMap.set(key, { isFlag: true, example: "(flag)", count: 1 });
        }
      } else {
        const key = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (!key) continue;
        const existing = fieldMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          fieldMap.set(key, { isFlag: false, example: value, count: 1 });
        }
      }
    }
  }

  return Array.from(fieldMap.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.count - a.count);
}

/** Extract selected INFO fields into new columns */
export function runExtractInfoFields(keys: string[]): void {
  if (keys.length === 0) return;

  const store = useFileStore.getState();
  const fieldSummaries = scanInfoFields();
  const flagKeys = new Set(
    fieldSummaries.filter((f) => f.isFlag).map((f) => f.key),
  );

  // Parse each row and extract values
  const columnValues = new Map<string, Map<number, string>>();
  for (const key of keys) {
    columnValues.set(key, new Map());
  }

  for (const row of store.rows) {
    const info = String(row.INFO ?? ".");
    if (info === "." || info === "") continue;

    const parsed = new Map<string, string>();
    const pairs = info.split(";");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) {
        const key = pair.trim();
        if (key) parsed.set(key, "1");
      } else {
        const key = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        if (key) parsed.set(key, value);
      }
    }

    for (const key of keys) {
      const val = parsed.get(key);
      if (val !== undefined) {
        columnValues.get(key)!.set(row._index, val);
      } else if (flagKeys.has(key)) {
        columnValues.get(key)!.set(row._index, "0");
      } else {
        columnValues.get(key)!.set(row._index, ".");
      }
    }
  }

  // Add each column using the store's addColumn
  // We need to do this in a single history push
  // Use setState directly for atomic multi-column add
  useFileStore.setState((state) => {
    // Push history snapshot
    const snapshot = state.rows.map((r) => ({ ...r }));
    const history = [...state.history.slice(0, state.historyIndex + 1)];
    history.push(snapshot);
    if (history.length > 20) history.shift();

    const newColumns = [...state.columns];
    const newRows = state.rows.map((r) => ({ ...r }));

    for (const key of keys) {
      const colName = `INFO_${key}`;
      if (!newColumns.includes(colName)) {
        newColumns.push(colName);
      }
      const values = columnValues.get(key)!;
      for (const row of newRows) {
        const val = values.get(row._index);
        if (val !== undefined) {
          row[colName] = val;
        }
      }
    }

    return {
      columns: newColumns,
      rows: newRows,
      history,
      historyIndex: history.length - 1,
    };
  });

  toast.success(`Extracted ${keys.length} INFO field${keys.length !== 1 ? "s" : ""}`, {
    description: keys.map((k) => `INFO_${k}`).join(", "),
  });
}

/** Pure variant: parse INFO fields and return new rows with INFO_* columns */
export function parseInfoFields(
  rows: GenomicRow[],
  keys: string[],
): { rows: GenomicRow[]; newColumns: string[] } {
  if (keys.length === 0) return { rows, newColumns: [] };

  // Determine which keys are flags by scanning
  const flagKeys = new Set<string>();
  for (const row of rows) {
    const info = String(row.INFO ?? ".");
    if (info === "." || info === "") continue;
    for (const pair of info.split(";")) {
      if (pair.indexOf("=") === -1) {
        const key = pair.trim();
        if (key) flagKeys.add(key);
      }
    }
  }

  const newColumns: string[] = [];
  for (const key of keys) {
    newColumns.push(`INFO_${key}`);
  }

  const newRows = rows.map((row) => {
    const newRow = { ...row };
    const info = String(row.INFO ?? ".");
    const parsed = new Map<string, string>();

    if (info !== "." && info !== "") {
      for (const pair of info.split(";")) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) {
          const k = pair.trim();
          if (k) parsed.set(k, "1");
        } else {
          const k = pair.slice(0, eqIdx).trim();
          const v = pair.slice(eqIdx + 1).trim();
          if (k) parsed.set(k, v);
        }
      }
    }

    for (const key of keys) {
      const val = parsed.get(key);
      if (val !== undefined) {
        newRow[`INFO_${key}`] = val;
      } else if (flagKeys.has(key)) {
        newRow[`INFO_${key}`] = "0";
      } else {
        newRow[`INFO_${key}`] = ".";
      }
    }

    return newRow;
  });

  return { rows: newRows, newColumns };
}
