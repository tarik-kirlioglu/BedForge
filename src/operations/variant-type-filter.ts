import { toast } from "sonner";

import { useFileStore } from "../stores/useFileStore";

export type VariantType = "SNP" | "INDEL" | "MNP" | "MIXED" | "OTHER";

/** Classify a single alt allele relative to ref */
function classifySingleAllele(ref: string, alt: string): VariantType {
  if (alt === "." || alt === "*") return "OTHER";
  if (ref.length === 1 && alt.length === 1) return "SNP";
  if (ref.length === alt.length && ref.length > 1) return "MNP";
  return "INDEL";
}

/** Classify variant type from REF and ALT fields */
export function classifyVariant(ref: string, alt: string): VariantType {
  if (!ref || !alt || ref === "." || alt === ".") return "OTHER";

  const alts = alt.split(",");
  if (alts.length === 1) {
    return classifySingleAllele(ref, alts[0]!);
  }

  const types = new Set(alts.map((a) => classifySingleAllele(ref, a)));
  if (types.size === 1) return types.values().next().value as VariantType;
  return "MIXED";
}

/** Get variant type summary counts for current rows */
export function getVariantTypeSummary(): Array<{ type: VariantType; count: number }> {
  const rows = useFileStore.getState().rows;
  const counts = new Map<VariantType, number>();

  for (const row of rows) {
    const ref = String(row.REF ?? ".");
    const alt = String(row.ALT ?? ".");
    const vtype = classifyVariant(ref, alt);
    counts.set(vtype, (counts.get(vtype) ?? 0) + 1);
  }

  const order: VariantType[] = ["SNP", "INDEL", "MNP", "MIXED", "OTHER"];
  return order
    .filter((t) => counts.has(t))
    .map((t) => ({ type: t, count: counts.get(t)! }));
}

/** Filter rows by variant types — keep only matching types */
export function runVariantTypeFilter(keepTypes: Set<VariantType>): void {
  const store = useFileStore.getState();
  const before = store.rows.length;

  const toRemove = new Set<number>();
  for (const row of store.rows) {
    const ref = String(row.REF ?? ".");
    const alt = String(row.ALT ?? ".");
    const vtype = classifyVariant(ref, alt);
    if (!keepTypes.has(vtype)) {
      toRemove.add(row._index);
    }
  }

  if (toRemove.size === 0) {
    toast.info("No rows removed", {
      description: "All rows match the selected variant types",
    });
    return;
  }

  store.deleteRows(toRemove);

  const kept = before - toRemove.size;
  toast.success("Filtered by variant type", {
    description: `Kept ${kept} rows, removed ${toRemove.size}`,
  });
}
