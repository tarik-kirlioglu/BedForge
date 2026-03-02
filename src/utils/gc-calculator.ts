/**
 * Calculate GC content from a DNA sequence.
 * Returns a value between 0.0 and 1.0.
 * Skips N and other ambiguous bases.
 */
export function calculateGCContent(sequence: string): number {
  let gc = 0;
  let total = 0;

  for (let i = 0; i < sequence.length; i++) {
    const base = sequence.charCodeAt(i);
    // G=71, g=103, C=67, c=99
    if (base === 71 || base === 103 || base === 67 || base === 99) {
      gc++;
      total++;
    }
    // A=65, a=97, T=84, t=116
    else if (base === 65 || base === 97 || base === 84 || base === 116) {
      total++;
    }
    // Skip N, ambiguous bases, and anything else
  }

  return total === 0 ? 0 : gc / total;
}
