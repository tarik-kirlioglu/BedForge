import type { BedFormat } from "../types/bed";
import { BED_COLUMNS } from "../types/bed";
import type { GenomicRow } from "../types/genomic";

/** Export GenomicRow array to BED text format */
export function exportBed(rows: GenomicRow[], format: BedFormat): string {
  const columns = BED_COLUMNS[format];

  return rows
    .map((row) =>
      columns.map((col) => String(row[col] ?? ".")).join("\t"),
    )
    .join("\n");
}
