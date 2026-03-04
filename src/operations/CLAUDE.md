# operations/

Genomic operation orchestrators. Two categories: API-based (Ensembl) and client-side (instant).

## Module Structure

| File | Purpose | Type |
|------|---------|------|
| `operation-runner.ts` | Generic batch processor with concurrency, progress, cancellation | Shared |
| `liftover-operation.ts` | Convert coordinates between assemblies (GRCh37 ↔ GRCh38) | API |
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
| `info-column-filter.ts` | Filter rows by parsed `INFO_*` column values (numeric threshold or categorical selection) | Client |
| `find-replace.ts` | Find & replace across rows with scope, case-sensitivity, numeric validation | Client |
| `validate-coordinates.ts` | Validate BED coordinates (swapped, negative, zero-length, invalid chrom, duplicates) | Client |
| `intersect.ts` | Intersect/Subtract with another BED file using binary search overlap detection | Client |
| `complement.ts` | Compute complement (gap) regions given chromosome sizes | Client |
| `ucsc-link.ts` | Open selected regions in UCSC Genome Browser | Client |


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
- INFO Column Filter: profiles `INFO_*` columns (auto-detect numeric ≥80% threshold vs categorical). Numeric: operator + threshold. Categorical: value set. Missing (`.`) kept/removed via toggle. Uses `deleteRows`.
- Find & Replace: supports scope (all/selected/column), case-sensitive, numeric validation.
- Validate: checks swapped, negative, zero-length, invalid-chrom, duplicate. Auto-fix available.
- Intersect/Subtract: binary search O(N log M) overlap detection with second BED file.
- Complement: gap regions from sorted intervals + chrom sizes. REPLACES all rows (BED3).
- UCSC Link: opens `genome.ucsc.edu` in new tab. Single or bounding region.

## Concurrency & Rate Limiting

- `runBatchOperation` processes rows in chunks of 5 concurrent requests.
- Token-bucket throttler (14 req/s) ensures Ensembl's 15/s limit is respected.
- `Promise.allSettled` so failed rows don't abort the batch.

## Cancellation

- `useOperationStore.isCancelled` flag checked between batches.
- Partial results are still applied to the store.

## Rules

- API operations must use functions from `api/` — never call `fetch()` directly.
- Operations update the store atomically (single call with all changes).
- Failed rows counted and reported in toast, not thrown.
- Each operation is a standalone exported function, not a class.
