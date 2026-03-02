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
