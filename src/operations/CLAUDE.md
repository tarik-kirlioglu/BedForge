# operations/

Genomic operation orchestrators. Each operation processes selected rows through the API layer and updates the store.

## Module Structure

| File | Purpose |
|------|---------|
| `operation-runner.ts` | Generic batch processor: `runBatchOperation(rows, processor, options)` with concurrency, progress, cancellation |
| `liftover-operation.ts` | LiftOver: converts coordinates from source to target assembly, updates rows in-place |
| `clean-intergenic.ts` | Intergenic cleanup: checks gene overlap per row, removes rows with no gene overlap |
| `gc-content.ts` | GC content: fetches sequence per row, calculates GC%, adds `gc_content` column |
| `sort-rows.ts` | Sort rows by natural chromosome order (chr1..22, X, Y, M) then start, then end. Client-side, instant |
| `remove-duplicates.ts` | Remove duplicate rows by chrom:start:end key. Keeps first occurrence. Client-side, instant |
| `merge-regions.ts` | Merge overlapping/adjacent BED regions per chromosome. Like `bedtools merge`. BED-only, client-side |
| `extend-regions.ts` | Extend/Slop regions by N bases upstream/downstream. Strand-aware. Client-side, instant |

## Operation Runner Pattern

All operations follow the same pattern:
1. Get selected rows from `useSelectionStore`
2. Call `useOperationStore.startOperation(name, total)`
3. Call `runBatchOperation` with concurrency=5
4. On each batch completion, call `useOperationStore.incrementProgress()`
5. On finish, call `useFileStore.updateRows()` or `useFileStore.deleteRows()` or `useFileStore.addColumn()`
6. Call `useOperationStore.completeOperation()`
7. Show result toast via Sonner

## Concurrency

- `runBatchOperation` processes rows in chunks of 5 concurrent requests.
- The token-bucket throttler (14 req/s) ensures we stay under Ensembl's rate limit.
- `Promise.allSettled` is used so failed rows don't abort the batch.

## Cancellation

- `useOperationStore.isCancelled` flag is checked between batches.
- Setting it to `true` stops processing after the current batch completes.
- Partial results are still applied to the store.

## Client-Side Operations (No API)

Sort, Remove Duplicates, Merge, and Extend/Slop run entirely in the browser:
- They modify the store directly (no `useOperationStore` progress tracking needed).
- They push to undo history before modifying, so Ctrl+Z works.
- Merge reduces to BED3 format since name/score/strand cannot be meaningfully merged.
- Extend/Slop is strand-aware: on minus strand, upstream extends towards higher coordinates.

## Rules

- API-based operations must never call `fetch()` directly — use functions from `api/`.
- Operations must update the store atomically (single `updateRows` call with all changes).
- Failed rows are counted and reported in the completion toast, not thrown as errors.
- Each operation is a standalone function, not a class.
