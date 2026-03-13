# operations/

Genomic operation orchestrators. Two categories: API-based (Ensembl) and client-side (instant).

## Module Structure

| File | Purpose | Type |
|------|---------|------|
| `operation-runner.ts` | Generic batch processor with concurrency, progress, cancellation | Shared |
| `liftover-operation.ts` | Convert coordinates between assemblies (e.g. GRCh37 ↔ GRCh38). Species-aware | API |
| `annotate-genes.ts` | Fetch gene names from Ensembl, write to name column. Auto-upgrades BED3 → BED4 | API |
| `clean-intergenic.ts` | Remove rows with no gene overlap | API |
| `gc-content.ts` | Calculate GC%, add `gc_content` column | API |
| `sort-rows.ts` | Natural chromosome order (chr1..22, X, Y, M) + start + end | Client |
| `remove-duplicates.ts` | Remove rows with duplicate chrom:start:end. Keeps first | Client |
| `merge-regions.ts` | Merge overlapping/adjacent BED regions. Like `bedtools merge` | Client |
| `extend-regions.ts` | Extend/Slop regions N bases upstream/downstream. Strand-aware | Client |
| `filter-vcf.ts` | VCF-specific: filter by FILTER column values, filter by QUAL threshold, stats helpers | Client |
| `variant-type-filter.ts` | Classify variants (SNP/INDEL/MNP/MIXED/OTHER), filter by type | Client |
| `genotype-filter.ts` | Parse GT field from FORMAT/sample, filter by genotype (0/0, 0/1, 1/1, ./.) | Client |
| `info-parser.ts` | Scan INFO fields, extract key=value pairs to `INFO_*` columns | Client |
| `info-column-filter.ts` | Filter rows by parsed `INFO_*` or `ATTR_*` column values (numeric threshold or categorical selection) | Client |
| `type-filter.ts` | GFF3-specific: scan `type` column for unique feature types, filter by type | Client |
| `chrom-filter.ts` | Filter rows by chromosome. Shared across BED/VCF/GFF3. Format-aware via `getChromColumn()` | Client |
| `gff3-attribute-parser.ts` | GFF3-specific: scan `attributes` column, extract key=value pairs to `ATTR_*` columns | Client |
| `find-replace.ts` | Find & replace across rows with scope, case-sensitivity, numeric validation | Client |
| `validate-coordinates.ts` | Validate BED coordinates (swapped, negative, zero-length, invalid chrom, duplicates) | Client |
| `intersect.ts` | Intersect/Subtract/Exact Match with another file (BED/VCF/GFF3). Format-aware, coordinate-normalized | Client |
| `complement.ts` | Compute complement (gap) regions given chromosome sizes | Client |
| `ensembl-link.ts` | Open selected regions in Ensembl Genome Browser | Client |
| `batch-api-runners.ts` | Store-free async API runners for batch mode: `batchAnnotateGenes`, `batchGCContent`, `batchLiftOver`, `batchCleanIntergenic`. Uses internal `runPureBatch` helper with `onProgress`/`isCancelled` callbacks | API (Batch) |


## API Operation Pattern

1. Call `useOperationStore.startOperation(name, total)`
2. Show Sonner loading toast with progress
3. Subscribe to `useOperationStore` for live progress updates
4. Call `runBatchOperation` with concurrency=5
5. Apply results to `useFileStore` (updateRows / deleteRows / addColumn)
6. Call `useOperationStore.completeOperation()`
7. Update toast to success/error with summary

## Client-Side Operations (No API)

Sort, Remove Duplicates, Merge, Extend/Slop, VCF filters, and new features run entirely in the browser:
- No `useOperationStore` progress tracking — they complete instantly.
- Push to undo history before modifying, so Ctrl+Z works.
- Merge reduces to BED3 format (name/score/strand cannot be meaningfully merged).
- Extend/Slop is strand-aware: minus strand reverses upstream/downstream.
- Sort uses shared `chromRank()` from `utils/chromosome.ts`: numeric chromosomes by value, then X=23, Y=24, M=25.
- VCF FILTER: shows unique values with counts, user selects which to keep. Uses `deleteRows`.
- VCF QUAL: threshold-based, rows with QUAL="." (missing) are always kept.
- Variant Type: classifies by REF/ALT length comparison. Multi-allelic → MIXED.
- Genotype: parses GT from FORMAT field, normalizes phased (|) to unphased (/).
- INFO Parser: scans `;`-separated key=value pairs, creates `INFO_*` columns. Flags → 1/0.
- INFO Column Filter: profiles `INFO_*` and `ATTR_*` columns (auto-detect numeric ≥80% threshold vs categorical). Numeric: operator + threshold. Categorical: value set. Missing (`.`) kept/removed via toggle. Uses `deleteRows`.
- Type Filter (GFF3): scans `type` column for unique feature types with counts. Quick actions: Gene Only, Exon Only, CDS Only. Uses `deleteRows`.
- Attribute Parser (GFF3): scans `attributes` column for semicolon-separated key=value pairs. Extracts selected keys to `ATTR_*` columns with URL-decoding. Uses `addColumn`.
- Chromosome Filter: scans chrom column for unique values with counts, sorted by `CHROM_ORDER`. Quick actions: Autosomes (chr1–22), chr1 Only. Format-aware via `getChromColumn()`. Uses `deleteRows`. Shared across BED/VCF/GFF3.
- Find & Replace: supports scope (all/selected/column), case-sensitive, numeric validation.
- Validate: checks swapped, negative, zero-length, invalid-chrom, duplicate. Auto-fix available.
- Intersect/Subtract: two-axis design — Action (`keep`/`remove`) × Match Type (`overlap`/`exact`). Format-aware (BED/VCF/GFF3) via `format-helpers`. Overlap: coordinates normalized to half-open (`toHalfOpen`): BED as-is, VCF `[POS, POS+1)`, GFF3 `[start-1, end)`, binary search O(N log M). Exact: `chrom:start:end` key lookup (Set-based O(1)). All 4 combinations supported: keep+overlap (intersect), remove+overlap (subtract), keep+exact, remove+exact.
- Complement: gap regions from sorted intervals + chrom sizes. REPLACES all rows (BED3).
- Ensembl Link: opens Ensembl Genome Browser in new tab. Single or bounding region. Uses `browserBase` + `browserSpecies` from species config. Coordinates converted to 1-based.

## Concurrency & Rate Limiting

- `runBatchOperation` processes rows in chunks of 5 concurrent requests.
- Token-bucket throttler (14 req/s) ensures Ensembl's 15/s limit is respected.
- `Promise.allSettled` so failed rows don't abort the batch.

## Cancellation

- `useOperationStore.isCancelled` flag checked between batches.
- Partial results are still applied to the store.

## Pure Operation Variants (Batch Mode)

Each operation module exports a **store-free pure function** alongside the existing store-coupled version. These pure variants accept data in and return data out, with no Zustand store dependency. Used by `useBatchStore.applyOperation()` dispatcher.

| Module | Pure Export |
|--------|------------|
| `sort-rows.ts` | `sortRows(rows, format) → GenomicRow[]` |
| `remove-duplicates.ts` | `removeDuplicateRows(rows, format) → GenomicRow[]` |
| `merge-regions.ts` | `mergeRegionRows(rows) → GenomicRow[]` |
| `extend-regions.ts` | `extendRegionRows(rows, upstream, downstream, format) → GenomicRow[]` |
| `validate-coordinates.ts` | `validateAndFixRows(rows) → GenomicRow[]` |
| `complement.ts` | `computeComplement(rows, chromSizes) → GenomicRow[]` |
| `chrom-filter.ts` | `filterByChromValues(rows, keepChroms, format) → GenomicRow[]` |
| `filter-vcf.ts` | `filterByQual(rows, minQual)`, `filterByFilterValues(rows, keepValues)` |
| `variant-type-filter.ts` | `filterByVariantTypes(rows, keepTypes) → GenomicRow[]` |
| `genotype-filter.ts` | `filterByGenotypes(rows, sampleName, keepGTs) → GenomicRow[]` |
| `type-filter.ts` | `filterByTypeValues(rows, keepTypes) → GenomicRow[]` |
| `info-parser.ts` | `parseInfoFields(rows, keys) → { rows, newColumns }` |
| `gff3-attribute-parser.ts` | `parseAttributeFields(rows, keys) → { rows, newColumns }` |
| `intersect.ts` | `intersectRows(rows, format, targets, targetFormat, action, matchType) → GenomicRow[]` |
| `find-replace.ts` | `findAndReplace(rows, columns, options) → GenomicRow[]` |

API operations use `batch-api-runners.ts` with a `runPureBatch` helper that replaces the store-dependent `runBatchOperation`.

## Rules

- API operations must use functions from `api/` — never call `fetch()` directly.
- Operations update the store atomically (single call with all changes).
- Failed rows counted and reported in toast, not thrown.
- Each operation is a standalone exported function, not a class.
- All operations use `format: FileFormat` parameter (not `isBed: boolean`) with helpers from `utils/format-helpers.ts`.
- API operations accept `speciesName` parameter (default: `"human"`) for multi-species Ensembl queries.
- Pure variants must remain store-free — no Zustand imports, no side effects.
