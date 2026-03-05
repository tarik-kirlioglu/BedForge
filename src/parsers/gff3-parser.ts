import type { GenomicRow } from "../types/genomic";
import type { Gff3Directive } from "../types/gff3";
import { GFF3_COLUMNS } from "../types/gff3";

export interface Gff3ParseResult {
  directives: Gff3Directive[];
  rows: GenomicRow[];
  columns: string[];
}

/** Parse GFF3 text into directives and typed rows */
export function parseGff3(text: string): Gff3ParseResult {
  const lines = text.split("\n");
  const directives: Gff3Directive[] = [];
  const rows: GenomicRow[] = [];
  let rowIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    // Empty lines
    if (!line.trim()) continue;

    // Directive lines (##)
    if (line.startsWith("##")) {
      const content = line.slice(2).trim();
      const spaceIdx = content.indexOf(" ");
      const key = spaceIdx === -1 ? content : content.slice(0, spaceIdx);
      const value = spaceIdx === -1 ? "" : content.slice(spaceIdx + 1).trim();
      directives.push({ raw: line, key, value });
      continue;
    }

    // Comment lines (#) — skip
    if (line.startsWith("#")) continue;

    // Data lines — expect 9 tab-separated columns
    const fields = line.split("\t");
    if (fields.length < 9) continue;

    const row: GenomicRow = {
      _index: rowIndex,
      _rowId: `gff3-${rowIndex}`,
      seqid: fields[0]!,
      source: fields[1]!,
      type: fields[2]!,
      start: parseInt(fields[3]!, 10) || 0,
      end: parseInt(fields[4]!, 10) || 0,
      score: fields[5]!,
      strand: fields[6]!,
      phase: fields[7]!,
      attributes: fields[8]!,
    };

    rows.push(row);
    rowIndex++;
  }

  return {
    directives,
    rows,
    columns: [...GFF3_COLUMNS],
  };
}
