/** Chromosome sizes for human reference genomes */

const GRCH38_SIZES: Record<string, number> = {
  "1": 248956422, "2": 242193529, "3": 198295559, "4": 190214555,
  "5": 181538259, "6": 170805979, "7": 159345973, "8": 145138636,
  "9": 138394717, "10": 133797422, "11": 135086622, "12": 133275309,
  "13": 114364328, "14": 107043718, "15": 101991189, "16": 90338345,
  "17": 83257441, "18": 80373285, "19": 58617616, "20": 64444167,
  "21": 46709983, "22": 50818468,
  "X": 156040895, "Y": 57227415, "MT": 16569,
};

const GRCH37_SIZES: Record<string, number> = {
  "1": 249250621, "2": 243199373, "3": 198022430, "4": 191154276,
  "5": 180915260, "6": 171115067, "7": 159138663, "8": 146364022,
  "9": 141213431, "10": 135534747, "11": 135006516, "12": 133851895,
  "13": 115169878, "14": 107349540, "15": 102531392, "16": 90354753,
  "17": 81195210, "18": 78077248, "19": 59128983, "20": 63025520,
  "21": 48129895, "22": 51304566,
  "X": 155270560, "Y": 59373566, "MT": 16569,
};

export type Assembly = "GRCh37" | "GRCh38";

/**
 * Get chromosome sizes for a given assembly.
 * Keys are returned with/without chr prefix based on useChrPrefix.
 */
export function getChromSizes(
  assembly: Assembly,
  useChrPrefix: boolean,
): Map<string, number> {
  const source = assembly === "GRCh38" ? GRCH38_SIZES : GRCH37_SIZES;
  const result = new Map<string, number>();

  for (const [chrom, size] of Object.entries(source)) {
    if (useChrPrefix) {
      const key = chrom === "MT" ? "chrM" : `chr${chrom}`;
      result.set(key, size);
    } else {
      result.set(chrom, size);
    }
  }

  return result;
}

/** Parse custom chrom sizes from text (tab-separated: chrom\tsize) */
export function parseChromSizes(text: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\t|\s+/);
    if (parts.length >= 2) {
      const chrom = parts[0]!;
      const size = parseInt(parts[1]!, 10);
      if (!isNaN(size) && size > 0) {
        result.set(chrom, size);
      }
    }
  }
  return result;
}
