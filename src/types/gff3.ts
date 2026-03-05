/** GFF3 standard column names (9 columns) */
export const GFF3_COLUMNS = [
  "seqid",
  "source",
  "type",
  "start",
  "end",
  "score",
  "strand",
  "phase",
  "attributes",
] as const;

/** A GFF3 directive line (## prefix), preserved verbatim for round-trip export */
export interface Gff3Directive {
  raw: string;
  key: string;
  value: string;
}
