/**
 * Natural chromosome ordering:
 * chr1, chr2, ... chr9, chr10, ... chr22, chrX, chrY, chrM
 */
export const CHROM_ORDER: Record<string, number> = {};
for (let i = 1; i <= 22; i++) {
  CHROM_ORDER[String(i)] = i;
  CHROM_ORDER[`chr${i}`] = i;
}
CHROM_ORDER["X"] = 23;
CHROM_ORDER["chrX"] = 23;
CHROM_ORDER["Y"] = 24;
CHROM_ORDER["chrY"] = 24;
CHROM_ORDER["M"] = 25;
CHROM_ORDER["chrM"] = 25;
CHROM_ORDER["MT"] = 25;
CHROM_ORDER["chrMT"] = 25;

/** Get natural chromosome rank (1-25, 99 for unknown) */
export function chromRank(chrom: string): number {
  return CHROM_ORDER[chrom] ?? 99;
}

/** Strip chr prefix and normalize for Ensembl API (chrM → MT) */
export function toEnsemblChrom(chrom: string): string {
  let normalized = chrom.replace(/^chr/i, "");
  if (normalized === "M") normalized = "MT";
  return normalized;
}

/** Restore chr prefix to match original file convention */
export function fromEnsemblChrom(
  chrom: string,
  useChrPrefix: boolean,
): string {
  let result = chrom;
  if (useChrPrefix) {
    if (result === "MT") result = "M";
    return `chr${result}`;
  }
  return result;
}

/** Detect whether the file uses chr prefix (e.g. chr1 vs 1) */
export function detectChrPrefix(firstChrom: string): boolean {
  return /^chr/i.test(firstChrom);
}
