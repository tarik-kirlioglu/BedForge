import type { Gff3Directive } from "../types/gff3";
import type { GenomicRow } from "../types/genomic";
import { GFF3_COLUMNS } from "../types/gff3";

/** Export back to GFF3 text format, preserving directives verbatim */
export function exportGff3(
  rows: GenomicRow[],
  directives: Gff3Directive[],
): string {
  const lines: string[] = [];

  // Directives (## headers) preserved verbatim
  for (const d of directives) {
    lines.push(d.raw);
  }

  // Data rows — only the 9 standard columns (exclude ATTR_* columns)
  for (const row of rows) {
    const fields = GFF3_COLUMNS.map((col) => String(row[col] ?? "."));
    lines.push(fields.join("\t"));
  }

  return lines.join("\n");
}
