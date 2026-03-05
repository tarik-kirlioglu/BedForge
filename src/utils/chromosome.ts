/**
 * Natural chromosome ordering:
 * Numeric: chr1–chr22, X, Y, M/MT
 * Roman numerals (S. cerevisiae): I–XVI, Mito
 * A. thaliana: 1–5, Mt, Pt
 */
export const CHROM_ORDER: Record<string, number> = {};

// Standard numeric chromosomes (human, mouse, rat, etc.)
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

// S. cerevisiae: Roman numeral chromosomes I–XVI + Mito
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI"];
for (let i = 0; i < ROMAN.length; i++) {
  CHROM_ORDER[ROMAN[i]!] = i + 1;
  CHROM_ORDER[`chr${ROMAN[i]!}`] = i + 1;
}
CHROM_ORDER["Mito"] = 17;
CHROM_ORDER["chrMito"] = 17;

// A. thaliana: Mt (mitochondria), Pt (plastid/chloroplast)
CHROM_ORDER["Mt"] = 26;
CHROM_ORDER["Pt"] = 27;

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
