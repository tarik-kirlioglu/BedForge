import type { BedFormat } from "../types/bed";
import { BED_COLUMNS } from "../types/bed";
import type { GenomicRow } from "../types/genomic";

export interface BedParseResult {
  format: BedFormat;
  rows: GenomicRow[];
  columns: string[];
}

/** Parse BED file text into typed rows */
export function parseBed(text: string): BedParseResult {
  const lines = text.split("\n");
  const dataLines: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("track")) continue;
    if (line.startsWith("browser")) continue;
    dataLines.push(line);
  }

  if (dataLines.length === 0) {
    return { format: "bed3", rows: [], columns: BED_COLUMNS.bed3 };
  }

  const format = detectBedFormatFromLine(dataLines[0]!);
  const columns = BED_COLUMNS[format];
  const rows: GenomicRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!;
    // Support both tab and space delimiters
    const cols = line.includes("\t") ? line.split("\t") : line.split(/\s+/);

    if (cols.length < 3) continue;

    const row: GenomicRow = {
      _index: i,
      _rowId: `${cols[0]}:${cols[1]}-${cols[2]}:${i}`,
      chrom: cols[0]!,
      chromStart: parseInt(cols[1]!, 10),
      chromEnd: parseInt(cols[2]!, 10),
    };

    if (format === "bed4" || format === "bed6" || format === "bed12") {
      row.name = cols[3] ?? ".";
    }
    if (format === "bed6" || format === "bed12") {
      row.score = cols[4] ? parseInt(cols[4], 10) : 0;
      row.strand = cols[5] ?? ".";
    }
    if (format === "bed12") {
      row.thickStart = cols[6] ? parseInt(cols[6], 10) : 0;
      row.thickEnd = cols[7] ? parseInt(cols[7], 10) : 0;
      row.itemRgb = cols[8] ?? "0,0,0";
      row.blockCount = cols[9] ? parseInt(cols[9], 10) : 0;
      row.blockSizes = cols[10] ?? "";
      row.blockStarts = cols[11] ?? "";
    }

    rows.push(row);
  }

  return { format, rows, columns };
}

function detectBedFormatFromLine(line: string): BedFormat {
  const cols = line.includes("\t") ? line.split("\t") : line.split(/\s+/);
  const count = cols.length;
  if (count >= 12) return "bed12";
  if (count >= 6) return "bed6";
  if (count >= 4) return "bed4";
  return "bed3";
}
