import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

/** Extract GT value from a sample field (e.g., "0/1:30:99" → "0/1") */
function extractGT(formatStr: string, sampleStr: string): string {
  const formatFields = formatStr.split(":");
  const sampleFields = sampleStr.split(":");

  const gtIdx = formatFields.indexOf("GT");
  if (gtIdx === -1) return "./.";

  const raw = sampleFields[gtIdx] ?? "./.";
  // Normalize phased to unphased: 0|1 → 0/1
  return raw.replace(/\|/g, "/");
}

/** Get genotype summary for a given sample */
export function getGenotypeSummary(
  sampleName: string,
): Array<{ gt: string; count: number }> {
  const store = useFileStore.getState();
  const counts = new Map<string, number>();

  for (const row of store.rows) {
    const format = String(row.FORMAT ?? "GT");
    const sample = String(row[sampleName] ?? "./.");
    const gt = extractGT(format, sample);
    counts.set(gt, (counts.get(gt) ?? 0) + 1);
  }

  // Sort: 0/0, 0/1, 1/1, ./., then rest
  const order: Record<string, number> = {
    "0/0": 0,
    "0/1": 1,
    "1/0": 1,
    "1/1": 2,
    "./.": 3,
  };

  return Array.from(counts.entries())
    .map(([gt, count]) => ({ gt, count }))
    .sort((a, b) => (order[a.gt] ?? 99) - (order[b.gt] ?? 99));
}

/** Filter rows by genotype for a given sample */
export function runGenotypeFilter(
  sampleName: string,
  keepGTs: Set<string>,
): void {
  const store = useFileStore.getState();
  const before = store.rows.length;

  const toRemove = new Set<number>();
  for (const row of store.rows) {
    const format = String(row.FORMAT ?? "GT");
    const sample = String(row[sampleName] ?? "./.");
    const gt = extractGT(format, sample);
    if (!keepGTs.has(gt)) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: "All rows match the selected genotypes",
    });
    return;
  }

  store.deleteRows(toRemove);

  const kept = before - toRemove.size;
  toast.success("Filtered by genotype", {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}
