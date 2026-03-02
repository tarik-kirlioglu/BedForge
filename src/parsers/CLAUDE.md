# parsers/

BED and VCF file parsers. Converts raw text into typed GenomicRow arrays.

## Module Structure

| File | Purpose |
|------|---------|
| `bed-parser.ts` | `parseBed(text)` → `{ format, rows, columns }`. Auto-detects BED3/4/6/12 by column count |
| `vcf-parser.ts` | `parseVcf(text)` → `{ vcfFile, rows, columns }`. Preserves meta lines verbatim |
| `detect-format.ts` | `detectFormat(fileName, content)` → `FileFormat \| null`. Extension-based + content sniffing |

## Critical Rules

- **BED is 0-based half-open** `[start, end)`. `chromStart` and `chromEnd` are parsed as integers.
- **VCF is 1-based**. `POS` is parsed as an integer.
- Strip `\r` from all lines (Windows line ending support).
- Skip lines starting with `track`, `browser`, or empty lines in BED files.
- Preserve VCF `##` meta lines verbatim (store raw text) for re-export.
- Auto-detect BED sub-format by counting tab-separated columns in the first data line.
- Handle both tab and space delimiters in BED (spec says tab, but tools vary).
- Missing optional BED fields default to `.` (name, strand) or `0` (score).
- Each row gets `_index` (sequential integer) and `_rowId` (unique string for TanStack Table keying).

## BED Column Mapping

| Format | Columns |
|--------|---------|
| BED3 | chrom, chromStart, chromEnd |
| BED4 | + name |
| BED6 | + score, strand |
| BED12 | + thickStart, thickEnd, itemRgb, blockCount, blockSizes, blockStarts |

## Testing

Unit tests are mandatory. Cover:
- Each BED sub-format (3, 4, 6, 12)
- Windows line endings (`\r\n`)
- Track/browser header lines
- Empty trailing lines
- Space-delimited files
- VCF with and without sample columns
- Multi-allelic VCF rows
