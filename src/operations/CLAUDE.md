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

## API Operation Pattern

1. Call `useOperationStore.startOperation(name, total)`
2. Show Sonner loading toast with progress
3. Subscribe to `useOperationStore` for live progress updates
4. Call `runBatchOperation` with concurrency=5
5. Apply results to `useFileStore` (updateRows / deleteRows / addColumn)
6. Call `useOperationStore.completeOperation()`
7. Update toast to success/error with summary

## Client-Side Operations (No API)

Sort, Remove Duplicates, Merge, and Extend/Slop run entirely in the browser:
- No `useOperationStore` progress tracking — they complete instantly.
- Push to undo history before modifying, so Ctrl+Z works.
- Merge reduces to BED3 format (name/score/strand cannot be meaningfully merged).
- Extend/Slop is strand-aware: minus strand reverses upstream/downstream.
- Sort uses natural chromosome ordering: numeric chromosomes by value, then X=23, Y=24, M=25.

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
