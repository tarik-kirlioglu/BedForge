import type { VcfMetaLine, VcfRow, VcfFile } from "../types/vcf";
import { VCF_FIXED_COLUMNS } from "../types/vcf";
import type { GenomicRow } from "../types/genomic";

export interface VcfParseResult {
  vcfFile: VcfFile;
  rows: GenomicRow[];
  columns: string[];
}

/** Parse VCF file text into typed rows and metadata */
export function parseVcf(text: string): VcfParseResult {
  const lines = text.split("\n");
  const meta: VcfMetaLine[] = [];
  let headerColumns: string[] = [];
  const vcfRows: VcfRow[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;

    if (line.startsWith("##")) {
      meta.push(parseMetaLine(line));
    } else if (line.startsWith("#CHROM") || line.startsWith("#chrom")) {
      headerColumns = line.substring(1).split("\t");
    } else {
      const row = parseVcfDataLine(line, headerColumns);
      if (row) vcfRows.push(row);
    }
  }

  const sampleNames = headerColumns.slice(9);

  // Build display columns: fixed VCF columns + FORMAT (if present) + sample names
  const columns: string[] = [...VCF_FIXED_COLUMNS];
  if (sampleNames.length > 0) {
    columns.push("FORMAT");
    columns.push(...sampleNames);
  }

  // Convert to GenomicRow for the table
  const rows: GenomicRow[] = vcfRows.map((vcfRow, i) => {
    const row: GenomicRow = {
      _index: i,
      _rowId: `${vcfRow.CHROM}:${vcfRow.POS}:${vcfRow.REF}>${vcfRow.ALT}:${i}`,
      CHROM: vcfRow.CHROM,
      POS: vcfRow.POS,
      ID: vcfRow.ID,
      REF: vcfRow.REF,
      ALT: vcfRow.ALT,
      QUAL: vcfRow.QUAL,
      FILTER: vcfRow.FILTER,
      INFO: vcfRow.INFO,
    };

    if (vcfRow.FORMAT) {
      row.FORMAT = vcfRow.FORMAT;
    }

    for (const sample of sampleNames) {
      row[sample] = vcfRow.samples[sample] ?? ".";
    }

    return row;
  });

  const vcfFile: VcfFile = {
    meta,
    headerColumns,
    sampleNames,
    rows: vcfRows,
  };

  return { vcfFile, rows, columns };
}

function parseMetaLine(line: string): VcfMetaLine {
  const content = line.substring(2); // Strip ##
  const eqIndex = content.indexOf("=");
  if (eqIndex === -1) {
    return { raw: line, key: content, value: "" };
  }
  return {
    raw: line,
    key: content.substring(0, eqIndex),
    value: content.substring(eqIndex + 1),
  };
}

function parseVcfDataLine(
  line: string,
  headerColumns: string[],
): VcfRow | null {
  const cols = line.split("\t");
  if (cols.length < 8) return null;

  const sampleNames = headerColumns.slice(9);
  const samples: Record<string, string> = {};

  for (let i = 0; i < sampleNames.length; i++) {
    const name = sampleNames[i];
    if (name) {
      samples[name] = cols[9 + i] ?? ".";
    }
  }

  return {
    CHROM: cols[0]!,
    POS: parseInt(cols[1]!, 10),
    ID: cols[2] ?? ".",
    REF: cols[3] ?? ".",
    ALT: cols[4] ?? ".",
    QUAL: cols[5] ?? ".",
    FILTER: cols[6] ?? ".",
    INFO: cols[7] ?? ".",
    FORMAT: cols[8],
    samples,
  };
}
