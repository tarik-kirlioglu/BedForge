# utils/

Pure helper functions with no side effects and no React dependencies.

## Module Structure

| File | Purpose |
|------|---------|
| `chromosome.ts` | `CHROM_ORDER` (shared), `chromRank(chrom)`, `toEnsemblChrom(chrom)`: strip `chr`, `chrM`→`MT`. `fromEnsemblChrom(chrom, useChrPrefix)`: restore. `detectChrPrefix(chrom)`: check if chr-prefixed |
| `gc-calculator.ts` | `calculateGCContent(sequence)`: returns 0.0–1.0. Counts G+C / (A+T+G+C), skips N/ambiguous. Uses charCode comparison for performance |
| `column-stats.ts` | `computeColumnStats(rows, colKey)`: returns `NumericStats` or `CategoricalStats`. Auto-detects type (>80% numeric → numeric). Numeric: min/max/mean/median. Categorical: unique count, top 10 values |
| `chrom-sizes.ts` | `getChromSizes(assembly, useChrPrefix)`: GRCh37/GRCh38 hardcoded sizes. `parseChromSizes(text)`: custom tab-separated chrom sizes |

## Rules

- All functions are pure — no side effects, no global state, no API calls.
- All functions must be unit tested.
- No React imports in this directory.
