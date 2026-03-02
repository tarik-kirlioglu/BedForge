# utils/

Pure helper functions with no side effects and no React dependencies.

## Module Structure

| File | Purpose |
|------|---------|
| `chromosome.ts` | `toEnsemblChrom(chrom)`: strip `chr` prefix, `chrM`→`MT`. `fromEnsemblChrom(chrom, useChrPrefix)`: restore prefix |
| `gc-calculator.ts` | `calculateGCContent(sequence: string)`: returns 0.0–1.0. Counts G+C / (A+T+G+C), skips N and ambiguous bases |

## Rules

- All functions are pure — no side effects, no global state, no API calls.
- All functions must be unit tested.
- No React imports in this directory.
