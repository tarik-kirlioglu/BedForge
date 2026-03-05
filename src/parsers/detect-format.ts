import type { FileFormat } from "../types/genomic";

/** Detect file format from filename extension and content */
export function detectFormat(
  fileName: string,
  content: string,
): FileFormat | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  // Extension-based detection
  if (ext === "vcf") return "vcf";
  if (ext === "gff3" || ext === "gff") return "gff3";
  if (/^bed\d*$/.test(ext)) return detectBedFormat(content);

  // Content sniffing for .txt / .tsv / unknown extensions
  const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("#"));
  if (!firstLine) return null;

  // VCF files always start with ##fileformat=VCF
  if (content.startsWith("##fileformat=VCF")) return "vcf";

  // GFF3 files start with ##gff-version
  if (content.startsWith("##gff-version")) return "gff3";

  // Try BED detection
  return detectBedFormat(content);
}

/** Detect BED sub-format by counting columns in the first data line */
function detectBedFormat(content: string): FileFormat | null {
  const lines = content.split("\n");
  const dataLine = lines.find(
    (l) =>
      l.trim() &&
      !l.startsWith("#") &&
      !l.startsWith("track") &&
      !l.startsWith("browser"),
  );

  if (!dataLine) return null;

  const cols = dataLine.split(/\t/).length;
  if (cols >= 12) return "bed12";
  if (cols >= 6) return "bed6";
  if (cols >= 4) return "bed4";
  if (cols >= 3) return "bed3";

  return null;
}
