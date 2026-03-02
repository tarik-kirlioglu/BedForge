# types/

TypeScript type definitions shared across the entire application.

## Module Structure

| File | Purpose |
|------|---------|
| `bed.ts` | BED row types: `Bed3Row`, `Bed4Row`, `Bed6Row`, `Bed12Row`, union `BedRow`, `BedFormat`, `BED_COLUMNS` constant |
| `vcf.ts` | VCF types: `VcfMetaLine`, `VcfRow`, `VcfFile`, `VCF_FIXED_COLUMNS` constant |
| `genomic.ts` | Shared types: `GenomicRow` (universal table row), `Assembly`, `FileFormat`, `GenomicRegion` |
| `table.ts` | Table UI types: `CellPosition`, `SortDirection` |

## Rules

- All types are interfaces or type aliases — no classes.
- No runtime code except `BED_COLUMNS` and `VCF_FIXED_COLUMNS` constants.
- `GenomicRow` is the universal row type: `Record<string, string | number>` with `_index` and `_rowId` metadata.
- BED types use 0-based half-open coordinates. VCF types use 1-based. Documented in JSDoc.
- Named exports from individual files. No barrel `index.ts`.
