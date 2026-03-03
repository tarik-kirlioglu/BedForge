import type { GenomicRow } from "../types/genomic";

export interface NumericStats {
  type: "numeric";
  count: number;
  missing: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

export interface CategoricalStats {
  type: "categorical";
  count: number;
  missing: number;
  uniqueCount: number;
  topValues: Array<{ value: string; count: number }>;
}

export type ColumnStats = NumericStats | CategoricalStats;

/** Compute statistics for a single column */
export function computeColumnStats(
  rows: readonly GenomicRow[],
  colKey: string,
): ColumnStats {
  const values: string[] = [];
  let missing = 0;

  for (const row of rows) {
    const val = row[colKey];
    if (val === undefined || val === null || val === "" || val === ".") {
      missing++;
    } else {
      values.push(String(val));
    }
  }

  // Determine if numeric: >80% of non-missing values parse as numbers
  let numericCount = 0;
  const numericValues: number[] = [];
  for (const v of values) {
    const n = Number(v);
    if (!isNaN(n) && v.trim() !== "") {
      numericCount++;
      numericValues.push(n);
    }
  }

  const isNumeric = values.length > 0 && numericCount / values.length > 0.8;

  if (isNumeric && numericValues.length > 0) {
    numericValues.sort((a, b) => a - b);
    const sum = numericValues.reduce((acc, n) => acc + n, 0);
    const mid = Math.floor(numericValues.length / 2);
    const median =
      numericValues.length % 2 === 0
        ? (numericValues[mid - 1]! + numericValues[mid]!) / 2
        : numericValues[mid]!;

    return {
      type: "numeric",
      count: numericValues.length,
      missing,
      min: numericValues[0]!,
      max: numericValues[numericValues.length - 1]!,
      mean: Math.round((sum / numericValues.length) * 100) / 100,
      median: Math.round(median * 100) / 100,
    };
  }

  // Categorical
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const topValues = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  return {
    type: "categorical",
    count: values.length,
    missing,
    uniqueCount: counts.size,
    topValues,
  };
}
