/**
 * Natural chromosome ordering:
 * Standard: chr1–chr22, X, Y, M/MT (sex + mito at end)
 * Roman numerals (S. cerevisiae): I–XVI, Mito (X = Roman 10)
 * A. thaliana: 1–5, Mt, Pt
 */

/** Standard ordering: numeric chroms 1–22, then X=23, Y=24, M=25 */
const STANDARD_ORDER: Record<string, number> = {};
for (let i = 1; i <= 22; i++) {
  STANDARD_ORDER[String(i)] = i;
  STANDARD_ORDER[`chr${i}`] = i;
}
STANDARD_ORDER["X"] = 23;
STANDARD_ORDER["chrX"] = 23;
STANDARD_ORDER["Y"] = 24;
STANDARD_ORDER["chrY"] = 24;
STANDARD_ORDER["M"] = 25;
STANDARD_ORDER["chrM"] = 25;
STANDARD_ORDER["MT"] = 25;
STANDARD_ORDER["chrMT"] = 25;

// A. thaliana: Mt (mitochondria), Pt (plastid/chloroplast)
STANDARD_ORDER["Mt"] = 26;
STANDARD_ORDER["Pt"] = 27;

/** Roman numeral ordering for S. cerevisiae: I–XVI (X = 10), Mito = 17 */
const ROMAN_ORDER: Record<string, number> = {};
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI"];
for (let i = 0; i < ROMAN.length; i++) {
  ROMAN_ORDER[ROMAN[i]!] = i + 1;
  ROMAN_ORDER[`chr${ROMAN[i]!}`] = i + 1;
}
ROMAN_ORDER["Mito"] = 17;
ROMAN_ORDER["chrMito"] = 17;

/**
 * Combined map for backward compat — standard takes priority over Roman for ambiguous keys (X).
 * Use chromRank() with useRomanOrder flag instead for correct species-aware ordering.
 */
export const CHROM_ORDER: Record<string, number> = {
  ...ROMAN_ORDER,
  ...STANDARD_ORDER,
};

/**
 * Get natural chromosome rank.
 * @param chrom - Chromosome name (e.g. "chr1", "X", "III")
 * @param useRomanOrder - If true, uses Roman numeral ordering (S. cerevisiae: X = 10)
 * @returns Rank number (1-27, 99 for unknown)
 */
export function chromRank(chrom: string, useRomanOrder?: boolean): number {
  if (useRomanOrder) {
    return ROMAN_ORDER[chrom] ?? STANDARD_ORDER[chrom] ?? 99;
  }
  return STANDARD_ORDER[chrom] ?? ROMAN_ORDER[chrom] ?? 99;
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
