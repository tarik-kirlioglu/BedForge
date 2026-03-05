# types/

TypeScript type definitions shared across the entire application.

## Module Structure

| File | Purpose |
|------|---------|
| `bed.ts` | BED row types: `Bed3Row`, `Bed4Row`, `Bed6Row`, `Bed12Row`, union `BedRow`, `BedFormat`, `BED_COLUMNS` constant |
| `vcf.ts` | VCF types: `VcfMetaLine`, `VcfRow`, `VcfFile`, `VCF_FIXED_COLUMNS` constant |
| `gff3.ts` | GFF3 types: `GFF3_COLUMNS` constant, `Gff3Directive` interface |
| `genomic.ts` | Shared types: `GenomicRow` (universal table row), `Assembly`, `FileFormat` (includes `"gff3"`), `GenomicRegion` |
| `table.ts` | Table UI types: `CellPosition`, `SortDirection` |

## Rules

- All types are interfaces or type aliases — no classes.
- No runtime code except `BED_COLUMNS`, `VCF_FIXED_COLUMNS`, and `GFF3_COLUMNS` constants.
- `GenomicRow` is the universal row type: `Record<string, string | number>` with `_index` and `_rowId` metadata.
- BED types use 0-based half-open coordinates. VCF types use 1-based. GFF3 uses 1-based inclusive. Documented in JSDoc.
- Named exports from individual files. No barrel `index.ts`.
