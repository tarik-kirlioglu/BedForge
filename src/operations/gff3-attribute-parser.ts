import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

export interface AttributeFieldSummary {
  key: string;
  count: number;
  example: string;
}

/**
 * Scan the "attributes" column for unique key=value pairs.
 * Returns a summary of each attribute key with its count and an example value.
 */
export function scanAttributeFields(): AttributeFieldSummary[] {
  const rows = useFileStore.getState().rows;
  const keyCounts = new Map<string, number>();
  const keyExamples = new Map<string, string>();

  for (const row of rows) {
    const attrs = String(row.attributes ?? "");
    if (!attrs || attrs === ".") continue;

    for (const pair of attrs.split(";")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;

      const key = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (!key) continue;

      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      if (!keyExamples.has(key)) {
        try {
          keyExamples.set(key, decodeURIComponent(value));
        } catch {
          keyExamples.set(key, value);
        }
      }
    }
  }

  return Array.from(keyCounts.entries())
    .map(([key, count]) => ({
      key,
      count,
      example: keyExamples.get(key) ?? "",
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract selected attribute keys into ATTR_* columns.
 * URL-decodes values during extraction.
 */
export function runExtractAttributes(keys: string[]): void {
  if (keys.length === 0) return;

  const store = useFileStore.getState();
  const rows = store.rows;

  // Build a map of key → (rowIndex → value) for each selected key
  const columnMaps = new Map<string, Map<number, string>>();
  for (const key of keys) {
    columnMaps.set(key, new Map());
  }

  const keySet = new Set(keys);

  for (const row of rows) {
    const attrs = String(row.attributes ?? "");
    if (!attrs || attrs === ".") continue;

    for (const pair of attrs.split(";")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;

      const key = pair.slice(0, eqIdx).trim();
      if (!keySet.has(key)) continue;

      const value = pair.slice(eqIdx + 1).trim();
      let decoded: string;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        decoded = value;
      }

      columnMaps.get(key)!.set(row._index, decoded);
    }
  }

  // Add columns to store
  for (const key of keys) {
    const values = columnMaps.get(key)!;
    // Fill missing values with "."
    for (const row of rows) {
      if (!values.has(row._index)) {
        values.set(row._index, ".");
      }
    }
    store.addColumn(`ATTR_${key}`, values);
  }

  toast.success("Attributes extracted", {
    description: `Added ${keys.length} column${keys.length !== 1 ? "s" : ""}: ${keys.map((k) => `ATTR_${k}`).join(", ")}`,
  });
}
