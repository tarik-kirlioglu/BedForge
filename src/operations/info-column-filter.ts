import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

export type InfoColumnType = "numeric" | "categorical";

export type NumericOperator = ">=" | "<=" | "==" | "!=";

export interface InfoColumnProfile {
  columnName: string;
  type: InfoColumnType;
  uniqueValues: Array<{ value: string; count: number }>;
  numericStats: { min: number; max: number; median: number } | null;
  totalRows: number;
  missingCount: number;
}

export interface NumericFilterConfig {
  operator: NumericOperator;
  threshold: number;
  keepMissing: boolean;
}

export interface CategoricalFilterConfig {
  keepValues: Set<string>;
  keepMissing: boolean;
}

/** Get all INFO_* and ATTR_* column names from current file */
export function getInfoColumns(): string[] {
  const columns = useFileStore.getState().columns;
  return columns.filter((c) => c.startsWith("INFO_") || c.startsWith("ATTR_"));
}

/** Profile a single INFO_* column: detect type, compute stats or unique values */
export function profileInfoColumn(columnName: string): InfoColumnProfile {
  const rows = useFileStore.getState().rows;
  const valueCounts = new Map<string, number>();
  let missingCount = 0;
  const numericValues: number[] = [];
  let nonMissingCount = 0;

  for (const row of rows) {
    const raw = String(row[columnName] ?? ".");
    if (raw === "." || raw === "") {
      missingCount++;
      continue;
    }
    nonMissingCount++;
    valueCounts.set(raw, (valueCounts.get(raw) ?? 0) + 1);
    const num = Number(raw);
    if (!isNaN(num)) {
      numericValues.push(num);
    }
  }

  const isNumeric =
    nonMissingCount > 0 && numericValues.length / nonMissingCount >= 0.8;

  let numericStats: InfoColumnProfile["numericStats"] = null;
  if (isNumeric && numericValues.length > 0) {
    numericValues.sort((a, b) => a - b);
    const mid = Math.floor(numericValues.length / 2);
    const median =
      numericValues.length % 2 === 0
        ? (numericValues[mid - 1]! + numericValues[mid]!) / 2
        : numericValues[mid]!;
    numericStats = {
      min: numericValues[0]!,
      max: numericValues[numericValues.length - 1]!,
      median: Math.round(median * 1000) / 1000,
    };
  }

  const uniqueValues = Array.from(valueCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  return {
    columnName,
    type: isNumeric ? "numeric" : "categorical",
    uniqueValues,
    numericStats,
    totalRows: rows.length,
    missingCount,
  };
}

/** Filter rows by a numeric INFO_* column value */
export function runInfoColumnNumericFilter(
  columnName: string,
  config: NumericFilterConfig,
): void {
  const store = useFileStore.getState();
  const before = store.rows.length;
  const toRemove = new Set<number>();

  for (const row of store.rows) {
    const raw = String(row[columnName] ?? ".");
    if (raw === "." || raw === "") {
      if (!config.keepMissing) {
        toRemove.add(row._index);
      }
      continue;
    }
    const num = Number(raw);
    if (isNaN(num)) {
      if (!config.keepMissing) {
        toRemove.add(row._index);
      }
      continue;
    }
    let passes = false;
    switch (config.operator) {
      case ">=":
        passes = num >= config.threshold;
        break;
      case "<=":
        passes = num <= config.threshold;
        break;
      case "==":
        passes = num === config.threshold;
        break;
      case "!=":
        passes = num !== config.threshold;
        break;
    }
    if (!passes) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: `All rows pass the ${columnName} filter`,
    });
    return;
  }

  store.deleteRows(toRemove);
  const kept = before - toRemove.size;
  toast.success(`Filtered by ${columnName}`, {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}

/** Filter rows by categorical INFO_* column values */
export function runInfoColumnCategoricalFilter(
  columnName: string,
  config: CategoricalFilterConfig,
): void {
  const store = useFileStore.getState();
  const before = store.rows.length;
  const toRemove = new Set<number>();

  for (const row of store.rows) {
    const raw = String(row[columnName] ?? ".");
    if (raw === "." || raw === "") {
      if (!config.keepMissing) {
        toRemove.add(row._index);
      }
      continue;
    }
    if (!config.keepValues.has(raw)) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: `All rows pass the ${columnName} filter`,
    });
    return;
  }

  store.deleteRows(toRemove);
  const kept = before - toRemove.size;
  toast.success(`Filtered by ${columnName}`, {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}
