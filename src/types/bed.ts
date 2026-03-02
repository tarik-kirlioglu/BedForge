/** BED format variants by column count */
export type BedFormat = "bed3" | "bed4" | "bed6" | "bed12";

/** BED3: chrom, chromStart, chromEnd (0-based half-open) */
export interface Bed3Row {
  chrom: string;
  chromStart: number;
  chromEnd: number;
}

/** BED4: + name */
export interface Bed4Row extends Bed3Row {
  name: string;
}

/** BED6: + score, strand */
export interface Bed6Row extends Bed4Row {
  score: number;
  strand: "+" | "-" | ".";
}

/** BED12: full BED with block fields */
export interface Bed12Row extends Bed6Row {
  thickStart: number;
  thickEnd: number;
  itemRgb: string;
  blockCount: number;
  blockSizes: string;
  blockStarts: string;
}

/** Union of all BED row types */
export type BedRow = Bed3Row | Bed4Row | Bed6Row | Bed12Row;

/** Column names for each BED format */
export const BED_COLUMNS: Record<BedFormat, string[]> = {
  bed3: ["chrom", "chromStart", "chromEnd"],
  bed4: ["chrom", "chromStart", "chromEnd", "name"],
  bed6: ["chrom", "chromStart", "chromEnd", "name", "score", "strand"],
  bed12: [
    "chrom",
    "chromStart",
    "chromEnd",
    "name",
    "score",
    "strand",
    "thickStart",
    "thickEnd",
    "itemRgb",
    "blockCount",
    "blockSizes",
    "blockStarts",
  ],
};
