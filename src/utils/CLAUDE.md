# utils/

Pure helper functions with no side effects and no React dependencies.

## Module Structure

| File | Purpose |
|------|---------|
| `chromosome.ts` | `CHROM_ORDER` (combined), `STANDARD_ORDER` (X=23, Y=24, M=25), `ROMAN_ORDER` (S. cerevisiae: X=10). `chromRank(chrom, useRomanOrder?)`: species-aware ordering. `toEnsemblChrom(chrom)`: strip `chr`, `chrM`→`MT`. `fromEnsemblChrom(chrom, useChrPrefix)`: restore. `detectChrPrefix(chrom)`: check if chr-prefixed |
| `gc-calculator.ts` | `calculateGCContent(sequence)`: returns 0.0–1.0. Counts G+C / (A+T+G+C), skips N/ambiguous. Uses charCode comparison for performance |
| `column-stats.ts` | `computeColumnStats(rows, colKey)`: returns `NumericStats` or `CategoricalStats`. Auto-detects type (>80% numeric → numeric). Numeric: min/max/mean/median. Categorical: unique count, top 10 values |
| `chrom-sizes.ts` | `getChromSizes(assembly, useChrPrefix)`: human GRCh37/GRCh38 built-in sizes, other species use custom input. `parseChromSizes(text)`: custom tab-separated chrom sizes |
| `format-helpers.ts` | Format-aware column/coordinate resolution: `getChromColumn(format)`, `getStartColumn(format)`, `getEndColumn(format)`, `isZeroBased(format)`, `toEnsemblStart(val, format)`, `toEnsemblEnd(val, format)`, `isBedFamily(format)`. Used across operations, API, and stats |
| `decompress.ts` | Gzip decompression: `decompressGz(file)` supports both standard gzip and BGZF (blocked gzip from bgzip/samtools). First tries native `DecompressionStream`, falls back to block-by-block decompression by parsing BGZF headers (BC subfield with BSIZE). `isGzipped(fileName)`, `stripGzExtension(fileName)`, `formatBytes(bytes)`. Internal helpers: `readBgzfBlockSize(data, pos)`, `decompressBlock(data)`. Constants: `SOFT_SIZE_LIMIT` (50MB), `HARD_SIZE_LIMIT` (500MB). Aborts early if decompressed size exceeds hard limit |

## Rules

- All functions are pure — no side effects, no global state, no API calls.
- All functions must be unit tested.
- No React imports in this directory.
