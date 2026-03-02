import type { VcfMetaLine } from "../types/vcf";
import type { GenomicRow } from "../types/genomic";

/** Export back to VCF text format, preserving meta lines verbatim */
export function exportVcf(
  rows: GenomicRow[],
  meta: VcfMetaLine[],
  headerColumns: string[],
  sampleNames: string[],
): string {
  const lines: string[] = [];

  // Meta lines (## headers) preserved verbatim
  for (const m of meta) {
    lines.push(m.raw);
  }

  // Column header line
  if (headerColumns.length > 0) {
    lines.push("#" + headerColumns.join("\t"));
  }

  // Data rows
  for (const row of rows) {
    const fields = [
      String(row.CHROM ?? "."),
      String(row.POS ?? "."),
      String(row.ID ?? "."),
      String(row.REF ?? "."),
      String(row.ALT ?? "."),
      String(row.QUAL ?? "."),
      String(row.FILTER ?? "."),
      String(row.INFO ?? "."),
    ];

    if (row.FORMAT !== undefined) {
      fields.push(String(row.FORMAT));
      for (const sample of sampleNames) {
        fields.push(String(row[sample] ?? "."));
      }
    }

    lines.push(fields.join("\t"));
  }

  return lines.join("\n");
}
