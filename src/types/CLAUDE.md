# types/

TypeScript type definitions shared across the entire application.

## Module Structure

| File | Purpose |
|------|---------|
| `bed.ts` | BED row types: `Bed3Row`, `Bed4Row`, `Bed6Row`, `Bed12Row`, union `BedRow`, `BedFormat` |
| `vcf.ts` | VCF types: `VcfMetaLine`, `VcfRow`, `VcfFile` |
| `genomic.ts` | Shared types: `GenomicRow` (flat Record for table), `Assembly`, `FileFormat`, `GenomicRegion` |
| `table.ts` | Table state types: `CellPosition`, `SelectionState`, `SortDirection` |

## Rules

- All types are interfaces or type aliases — no classes.
- No runtime code in this directory, only type definitions.
- `GenomicRow` is the universal row type used by the table — it's a `Record<string, string | number>` with `_index` and `_rowId` metadata fields.
- BED types use 0-based half-open coordinates. VCF types use 1-based coordinates. This distinction is encoded in the type names and documented in JSDoc comments.
- Export everything as named exports from individual files. No barrel `index.ts` file.
