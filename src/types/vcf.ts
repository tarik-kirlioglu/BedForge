/** A single VCF meta line (## prefix), preserved verbatim */
export interface VcfMetaLine {
  raw: string;
  key: string;
  value: string;
}

/** A single VCF data row (1-based coordinates) */
export interface VcfRow {
  CHROM: string;
  POS: number;
  ID: string;
  REF: string;
  ALT: string;
  QUAL: string;
  FILTER: string;
  INFO: string;
  FORMAT?: string;
  samples: Record<string, string>;
}

/** Complete parsed VCF file */
export interface VcfFile {
  meta: VcfMetaLine[];
  headerColumns: string[];
  sampleNames: string[];
  rows: VcfRow[];
}

/** Fixed VCF columns (before FORMAT/samples) */
export const VCF_FIXED_COLUMNS = [
  "CHROM",
  "POS",
  "ID",
  "REF",
  "ALT",
  "QUAL",
  "FILTER",
  "INFO",
] as const;
