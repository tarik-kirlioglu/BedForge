import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

export type IssueType = "swapped" | "negative" | "zero-length" | "invalid-chrom" | "duplicate";

export interface ValidationIssue {
  type: IssueType;
  rowIndex: number;
  message: string;
  fixable: boolean;
}

const VALID_CHROMS = new Set<string>();
for (let i = 1; i <= 22; i++) {
  VALID_CHROMS.add(String(i));
  VALID_CHROMS.add(`chr${i}`);
}
for (const c of ["X", "Y", "M", "MT", "chrX", "chrY", "chrM", "chrMT"]) {
  VALID_CHROMS.add(c);
}

/** Validate all BED rows and return list of issues */
export function validateCoordinates(): ValidationIssue[] {
  const rows = useFileStore.getState().rows;
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const chrom = String(row.chrom ?? "");
    const start = Number(row.chromStart);
    const end = Number(row.chromEnd);

    // Swapped coordinates
    if (!isNaN(start) && !isNaN(end) && start > end) {
      issues.push({
        type: "swapped",
        rowIndex: row._index,
        message: `start (${start}) > end (${end})`,
        fixable: true,
      });
    }

    // Negative coordinates
    if (!isNaN(start) && start < 0) {
      issues.push({
        type: "negative",
        rowIndex: row._index,
        message: `Negative start: ${start}`,
        fixable: true,
      });
    }
    if (!isNaN(end) && end < 0) {
      issues.push({
        type: "negative",
        rowIndex: row._index,
        message: `Negative end: ${end}`,
        fixable: true,
      });
    }

    // Zero-length region
    if (!isNaN(start) && !isNaN(end) && start === end) {
      issues.push({
        type: "zero-length",
        rowIndex: row._index,
        message: `Zero-length region at ${start}`,
        fixable: false,
      });
    }

    // Invalid chromosome
    if (chrom && chrom !== "." && !VALID_CHROMS.has(chrom)) {
      issues.push({
        type: "invalid-chrom",
        rowIndex: row._index,
        message: `Unknown chromosome: ${chrom}`,
        fixable: false,
      });
    }

    // Duplicate check
    const key = `${chrom}:${start}:${end}`;
    if (seen.has(key)) {
      issues.push({
        type: "duplicate",
        rowIndex: row._index,
        message: `Duplicate: ${key}`,
        fixable: true,
      });
    }
    seen.add(key);
  }

  return issues;
}

/** Apply fixes for selected issue types */
export function applyFixes(fixTypes: Set<IssueType>): void {
  const store = useFileStore.getState();
  const issues = validateCoordinates();
  const relevantIssues = issues.filter((i) => i.fixable && fixTypes.has(i.type));

  if (relevantIssues.length === 0) {
    toast.info("No fixable issues found");
    return;
  }

  const swappedIndices = new Set<number>();
  const negativeIndices = new Set<number>();
  const duplicateIndices = new Set<number>();

  for (const issue of relevantIssues) {
    if (issue.type === "swapped") swappedIndices.add(issue.rowIndex);
    if (issue.type === "negative") negativeIndices.add(issue.rowIndex);
    if (issue.type === "duplicate") duplicateIndices.add(issue.rowIndex);
  }

  // Apply swapped + negative fixes via updateRows
  const updates: Array<{ index: number; row: Record<string, string | number> }> = [];

  for (const row of store.rows) {
    const changes: Record<string, string | number> = {};
    let hasChange = false;

    if (swappedIndices.has(row._index)) {
      const start = Number(row.chromStart);
      const end = Number(row.chromEnd);
      changes.chromStart = Math.min(start, end);
      changes.chromEnd = Math.max(start, end);
      hasChange = true;
    }

    if (negativeIndices.has(row._index)) {
      const start = Number(row.chromStart);
      const end = Number(row.chromEnd);
      if (start < 0) {
        changes.chromStart = 0;
        hasChange = true;
      }
      if (end < 0) {
        changes.chromEnd = 0;
        hasChange = true;
      }
    }

    if (hasChange) {
      updates.push({ index: row._index, row: changes });
    }
  }

  if (updates.length > 0) {
    store.updateRows(updates);
  }

  // Remove duplicates
  if (duplicateIndices.size > 0) {
    store.deleteRows(duplicateIndices);
  }

  const fixCount = updates.length + duplicateIndices.size;
  toast.success(`Fixed ${fixCount} issue${fixCount !== 1 ? "s" : ""}`, {
    description: [
      swappedIndices.size > 0 ? `${swappedIndices.size} swapped` : "",
      negativeIndices.size > 0 ? `${negativeIndices.size} negative` : "",
      duplicateIndices.size > 0 ? `${duplicateIndices.size} duplicate` : "",
    ]
      .filter(Boolean)
      .join(", "),
  });
}
