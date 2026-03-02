# api/

Ensembl REST API client layer with rate limiting, retry logic, and typed endpoints.

## Module Structure

| File | Purpose |
|------|---------|
| `throttle.ts` | Token-bucket rate limiter (14 req/s with safety margin under Ensembl's 15/s limit) |
| `ensembl-client.ts` | Base HTTP client: `ensemblFetch<T>(path)` with throttle, retry on 429, error handling |
| `liftover.ts` | `liftOverRegion(chrom, start, end, source, target)` → coordinate mappings |
| `overlap.ts` | `getGeneOverlaps(chrom, start, end)` → gene features overlapping the region |
| `sequence.ts` | `getSequence(chrom, start, end)` → DNA sequence string |

## API Base

- URL: `https://rest.ensembl.org`
- All requests send `Content-Type: application/json`
- Rate limit: 14 requests/second (token-bucket in `throttle.ts`)

## Endpoints Used

| Operation | Endpoint | Separator |
|-----------|----------|-----------|
| LiftOver | `GET /map/human/{source}/{chr}:{start}..{end}/{target}` | `..` (double dot) |
| Gene Overlap | `GET /overlap/region/human/{chr}:{start}-{end}?feature=gene` | `-` (dash) |
| Sequence | `GET /sequence/region/human/{chr}:{start}..{end}` | `..` (double dot) |

**Note the different separators** — LiftOver and Sequence use `..`, Overlap uses `-`.

## Coordinate Conversion (CRITICAL)

All API functions receive BED-style coordinates (0-based half-open) and handle conversion internally:
- `ensemblStart = bedStart + 1`
- `ensemblEnd = bedEnd`

Results are converted back to BED coordinates before returning.

## Chromosome Normalization

All API functions strip `chr` prefix before calling Ensembl and handle `chrM` → `MT`.
The `useChrPrefix` flag (detected on file load) determines whether to restore it in results.

## Error Handling

| HTTP Status | Action |
|-------------|--------|
| 200 | Parse JSON, return typed result |
| 400 | Throw `EnsemblApiError` — caller skips the row |
| 404 | Region not found — return empty result |
| 429 | Read `Retry-After` header, sleep, retry (max 3 retries) |
| 503 | Throw — surface to user via toast |

## Rules

- Never call `fetch()` directly outside this directory — always go through `ensemblFetch`.
- Every exported function must handle coordinate conversion internally.
- The throttler is a singleton module — imported by `ensembl-client.ts` only.
