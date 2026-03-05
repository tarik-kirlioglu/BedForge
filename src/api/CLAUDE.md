# api/

Ensembl REST API client layer with rate limiting, retry logic, and typed endpoints.

## Module Structure

| File | Purpose |
|------|---------|
| `throttle.ts` | Token-bucket rate limiter: 14 req/s singleton with queue-based waiting |
| `ensembl-client.ts` | `ensemblFetch<T>(path)`: base HTTP client with throttle, retry on 429, `EnsemblApiError` class |
| `liftover.ts` | `liftOverRegion(chrom, start, end, source, target, format, speciesName)` → mapped coordinates or null |
| `overlap.ts` | `getGeneOverlaps(chrom, start, end, assembly, format, speciesName)` → gene features array |
| `sequence.ts` | `getSequence(chrom, start, end, assembly, format, speciesName)` → DNA sequence string |

## API Base

- URL: `https://rest.ensembl.org`
- All requests: `Content-Type: application/json`
- Rate limit: 14 requests/second (token-bucket in `throttle.ts`)

## Endpoints

| Operation | Endpoint | Separator |
|-----------|----------|-----------|
| LiftOver | `GET /map/{species}/{source}/{chr}:{start}..{end}/{target}` | `..` (double dot) |
| Gene Overlap | `GET /overlap/region/{species}/{chr}:{start}-{end}?feature=gene` | `-` (dash) |
| Sequence | `GET /sequence/region/{species}/{chr}:{start}..{end}` | `..` (double dot) |

**Note different separators**: LiftOver/Sequence use `..`, Overlap uses `-`.
**Species**: `{species}` is the Ensembl species name (e.g., `human`, `mouse`, `drosophila_melanogaster`). Passed as `speciesName` parameter (default: `"human"`).

## Coordinate Conversion (CRITICAL)

All API functions receive coordinates in the file's native format and convert internally using `toEnsemblStart()`/`toEnsemblEnd()` from `utils/format-helpers.ts`:
- BED (0-based half-open): `ensemblStart = start + 1`, `ensemblEnd = end`
- VCF (1-based): direct mapping
- GFF3 (1-based inclusive): direct mapping

The `format: FileFormat` parameter replaced the old `isBed: boolean` parameter. Results are returned in Ensembl's 1-based format — callers convert back.

## Chromosome Normalization

All API functions strip `chr` prefix and handle `chrM` → `MT` internally via `toEnsemblChrom()`.

## Error Handling

| HTTP Status | Action |
|-------------|--------|
| 200 | Parse JSON, return typed result |
| 400 | Throw `EnsemblApiError` — caller skips the row |
| 404 | Region not found — return empty/null |
| 429 | Read `Retry-After`, sleep, retry (max 3) |
| 503 | Throw — surface to user via toast |

## Rules

- Never call `fetch()` directly outside this directory.
- Every exported function handles coordinate conversion internally.
- The throttler is a singleton module imported only by `ensembl-client.ts`.
