import { exportBed } from "./bed-exporter";
import { exportVcf } from "./vcf-exporter";
import { exportGff3 } from "./gff3-exporter";
import { isBedFamily } from "../utils/format-helpers";
import type { BedFormat } from "../types/bed";
import type { ParsedFile } from "../types/batch";
import type { GenomicRow } from "../types/genomic";

/** Export rows to text content based on the parsed file's format and metadata */
export function exportFileContent(
  parsed: ParsedFile,
  rows: GenomicRow[],
  columns: string[],
): string {
  const format = parsed.fileFormat;

  if (format === "vcf") {
    return exportVcf(rows, parsed.vcfMeta, columns, parsed.vcfSampleNames);
  }

  if (format === "gff3") {
    return exportGff3(rows, parsed.gff3Directives);
  }

  if (isBedFamily(format)) {
    return exportBed(rows, format as BedFormat);
  }

  // Fallback: tab-separated
  return rows
    .map((row) => columns.map((col) => String(row[col] ?? ".")).join("\t"))
    .join("\n");
}

/** Generate a filename for the exported file */
export function getBatchExportFileName(
  originalName: string,
  operationSuffix: string,
): string {
  // Strip extension
  const lastDot = originalName.lastIndexOf(".");
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  // Get extension (handle .gz suffix)
  let ext = lastDot > 0 ? originalName.slice(lastDot) : "";
  if (ext.toLowerCase() === ".gz") {
    const innerDot = base.lastIndexOf(".");
    if (innerDot > 0) {
      ext = base.slice(innerDot);
      return base.slice(0, innerDot) + operationSuffix + ext;
    }
  }
  return base + operationSuffix + ext;
}

/** Create and download a ZIP file from batch results */
export async function downloadBatchZip(
  results: Array<{ content: string; fileName: string }>,
  zipName: string,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const { content, fileName } of results) {
    zip.file(fileName, content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
