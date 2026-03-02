# utils/

Pure helper functions with no side effects and no React dependencies.

## Module Structure

| File | Purpose |
|------|---------|
| `chromosome.ts` | `toEnsemblChrom(chrom)`: strip `chr`, `chrM`→`MT`. `fromEnsemblChrom(chrom, useChrPrefix)`: restore. `detectChrPrefix(chrom)`: check if chr-prefixed |
| `gc-calculator.ts` | `calculateGCContent(sequence)`: returns 0.0–1.0. Counts G+C / (A+T+G+C), skips N/ambiguous. Uses charCode comparison for performance |

## Rules

- All functions are pure — no side effects, no global state, no API calls.
- All functions must be unit tested.
- No React imports in this directory.
