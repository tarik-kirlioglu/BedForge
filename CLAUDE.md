# BedForge

Visual genomic editor for BED, VCF, and GFF3 files. No backend — all bioinformatics operations run via the Ensembl REST API. All data stays in the browser.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Build | Vite | 6.x |
| Language | TypeScript | 5.7+ (strict mode) |
| Table | @tanstack/react-table | 8.x |
| Virtual Scroll | @tanstack/react-virtual | 3.x |
| State | Zustand + Immer | 5.x / 10.x |
| Styling | Tailwind CSS | 4.x (@tailwindcss/vite plugin) |
| Toasts | Sonner | 2.x |
| Testing | Vitest | 3.x |

## Commands

```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Production build (dist/)
npm run preview    # Preview production build
npm run test       # Run unit tests via Vitest
npm run test:watch # Vitest in watch mode
npm run lint       # Run ESLint
```

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Root component + Sonner toaster
├── index.css                 # Tailwind + design system tokens + animations
├── types/                    # TypeScript type definitions
├── stores/                   # Zustand stores (file, selection, operation)
├── parsers/                  # BED/VCF/GFF3 file parsers
├── exporters/                # BED/VCF/GFF3 file exporters
├── api/                      # Ensembl REST API client + rate limiter
├── operations/               # Genomic + BED operation orchestrators
├── components/
│   ├── layout/               # AppShell, Toolbar
│   ├── drop-zone/            # Hero landing + drag & drop + Try Example buttons
│   ├── table/                # DataGrid, EditableCell
│   ├── context-menu/         # Right-click genomic menu + SVG icons
│   ├── operations/           # SlopDialog, FilterColumnDialog, QualFilterDialog, VariantTypeDialog, GenotypeFilterDialog, InfoParserDialog, InfoColumnFilterDialog, FindReplaceDialog, ValidationDialog, IntersectDialog, ComplementDialog, TypeFilterDialog, AttributeParserDialog
│   ├── search/               # SearchBar (Ctrl+F floating search)
│   └── stats/                # StatsPanel, ChromDistribution, SizeDistribution
├── hooks/                    # useKeyboardShortcuts
└── utils/                    # chromosome.ts, gc-calculator.ts, column-stats.ts, chrom-sizes.ts, format-helpers.ts, decompress.ts
```

## Design System — "Genomic Instrument"

### Typography
- **UI / Headings**: Sora (Google Fonts) — geometric, scientific feel
- **Data / Code**: JetBrains Mono (Google Fonts) — monospace for genomic coordinates
- Never use Inter, Roboto, Arial, or system fonts

### Color Palette (CSS custom properties in `index.css`)

| Token | Hex | Usage |
|-------|-----|-------|
| `void` | #060a13 | Deepest background |
| `abyss` | #0a1020 | Secondary background |
| `deep` | #0f1729 | Table header, input backgrounds |
| `surface` | #151d30 | Cards, elevated panels |
| `raised` | #1c2640 | Buttons, interactive elements |
| `elevated` | #2e3d56 | Borders, separators |
| `cyan-glow` | #06d6a0 | Primary accent — selections, active states, brand |
| `electric` | #4361ee | Secondary accent — chromosomes, VCF badges |
| `nt-a` | #10b981 | Nucleotide A (Adenine) |
| `nt-t` | #f43f5e | Nucleotide T (Thymine) |
| `nt-c` | #3b82f6 | Nucleotide C (Cytosine) |
| `nt-g` | #f59e0b | Nucleotide G (Guanine) / GC content |
| `text-primary` | #e8edf5 | Main text |
| `text-secondary` | #8892a8 | Secondary text, table cells |
| `text-muted` | #64748b | Dimmed labels, secondary info |
| `text-ghost` | #4a5568 | Subtle hints, footers |

### Visual Effects (CSS classes in `index.css`)
- `.glass` / `.glass-strong` — Frosted glass morphism with blur + gradient
- `.glow-cyan` / `.glow-cyan-subtle` — Bioluminescent box-shadow effects
- `.glow-border` — Glowing border for active drop zones
- `.bg-grid` — Subtle genomic grid background pattern
- `.noise` — Film grain overlay via SVG filter
- `.animate-fade-in-up` / `.animate-slide-in` / `.animate-fade-in` — Entry animations
- `.stagger` — Cascading animation delays for child elements

### Icon System
- SVG icons inline in components (no icon library dependency)
- Ensembl API operations: colored strokes (cyan, blue, amber, rose)
- Client-side operations: `currentColor` stroke (inherits text color)
- Size: 14×14 for menu items, 18×18 for feature cards, 20×20 for dialogs

## Code Rules

### General
- **Language**: All source code in TypeScript with strict mode. `any` is forbidden — use `unknown` and narrow.
- **Exports**: Named exports only, no default exports.
- **File naming**: Components use `PascalCase.tsx`, everything else uses `kebab-case.ts`.
- **Function style**: Prefer `function` declarations over arrow functions.
- **Import order**: React → external libs → internal absolute → relative. Separate with blank lines.

### React Components
- Functional components only, no `React.FC`.
- Props interfaces defined in the same file.
- Event handlers use `handle` prefix.
- Components read from Zustand stores directly — no prop drilling.

### Styling
- Tailwind utility classes using the custom design tokens above.
- Inline `style={}` only for dynamic positioning (context menu x/y, virtual scroll heights).
- No responsive design — desktop-only application.
- Glass morphism via `.glass` / `.glass-strong` CSS classes, not inline backdrop-filter.

### Testing
- Unit tests mandatory for parsers and utilities.
- Test files in `__tests__/` directories next to source.

## Coordinate Systems (CRITICAL)

| Format | System | Example (100bp region) |
|--------|--------|------------------------|
| BED | 0-based, half-open [start, end) | chr1 100 200 |
| VCF | 1-based, inclusive | chr1 101 (POS) |
| GFF3 | 1-based, inclusive [start, end] | chr1 101 200 |
| Ensembl API | 1-based, inclusive [start, end] | 1:101..200 |

**Conversion rules**:
- BED → Ensembl: `ensemblStart = bedStart + 1`, `ensemblEnd = bedEnd`
- Ensembl → BED: `bedStart = ensemblStart - 1`, `bedEnd = ensemblEnd`
- VCF → Ensembl: Direct mapping (both 1-based)
- GFF3 → Ensembl: Direct mapping (both 1-based inclusive)

**Format-aware helpers** (`utils/format-helpers.ts`): `getChromColumn()`, `getStartColumn()`, `getEndColumn()`, `isZeroBased()`, `toEnsemblStart()`, `toEnsemblEnd()`, `isBedFamily()`. All operations and API functions use `format: FileFormat` instead of `isBed: boolean`.

## Chromosome Naming

- BED/VCF/GFF3: `chr1`, `chrX`, `chrM` / Ensembl: `1`, `X`, `MT`
- `chr` prefix detected on file load, stripped for API, restored in results
- Special case: `chrM` ↔ `MT`
- S. cerevisiae: Roman numerals `I`–`XVI` + `Mito` (UCSC uses `chrI`–`chrXVI`)
- A. thaliana: `1`–`5` + `Mt` (mitochondria) + `Pt` (plastid/chloroplast)
- `CHROM_ORDER` supports numeric (1–22), Roman (I–XVI), and special chromosomes for sorting

## Multi-Species Support

BedForge supports 8 model organisms via configurable `SpeciesConfig` in `types/genomic.ts`:

| Species | Ensembl Name | Assemblies |
|---------|-------------|------------|
| Human | human | GRCh38, GRCh37 |
| Mouse | mouse | GRCm39, GRCm38 |
| Rat | rattus_norvegicus | GRCr8 |
| Zebrafish | zebrafish | GRCz11 |
| Fruit fly | drosophila_melanogaster | BDGP6.46 |
| C. elegans | caenorhabditis_elegans | WBcel235 |
| A. thaliana | arabidopsis_thaliana | TAIR10 |
| S. cerevisiae | saccharomyces_cerevisiae | R64-1-1 |

- Two-step picker on file load: species → assembly (single-assembly species skip second step)
- `species` and `assembly` stored in `useFileStore`
- All API operations receive `speciesName` parameter (default: `"human"`)
- LiftOver only shown for species with 2+ assemblies
- UCSC links resolve db name from `SpeciesConfig.assemblies[].ucscDb`

## Ensembl REST API

- Base URL: `https://rest.ensembl.org`
- Rate limit: **15 req/s** (we use 14 for safety margin)
- Content-Type: `application/json`
- On 429: read `Retry-After` header and wait
- Batch concurrency: 5
- Species parameter: all endpoints use configurable species name (not hardcoded `"human"`)

## Important Notes

1. **Large files**: BED files can have 1M+ rows. TanStack Virtual renders only visible rows.
2. **Undo history**: Snapshot-based, max 20 entries.
3. **VCF meta lines**: `##` lines preserved verbatim for round-trip export. GFF3 directives (`##gff-version`, `##sequence-region`, etc.) also preserved.
4. **API errors**: 400 → skip row. 429 → wait, retry. 503 → notify user.
5. **File size limits**: Soft limit at 50MB (warning toast), hard limit at 500MB (blocked). For `.gz` files, limits apply to decompressed size. Streaming decompression aborts early if hard limit exceeded.
6. **BED formats**: BED3, BED4, BED6, BED12 — auto-detected by column count.
7. **Gene annotation**: Ensembl overlap API, protein_coding preferred, auto-upgrades BED3 → BED4.
8. **File-type-aware context menu**: BED files get Annotate Genes, GC Content, Merge, Extend/Slop, Validate, Intersect, Complement. VCF files get Filter by FILTER/QUAL/Variant Type/Genotype, Parse INFO, Filter by INFO Column. GFF3 files get Filter by Type, Parse Attributes, Filter by Attribute Column. Shared: LiftOver, Clean Intergenic, Sort, Dedup, Add Row, UCSC Link, Delete, Copy.
9. **VCF FILTER filtering**: Shows unique FILTER values with counts, "PASS Only" shortcut. Uses `deleteRows` for undo support.
10. **VCF QUAL filtering**: Min threshold with presets (Q10–Q60). Rows with QUAL="." (missing) are always kept.
11. **Search (Ctrl+F)**: Floating search bar, 300ms debounce, searches all visible columns. Matches highlighted in `<mark>` tags. Navigate with Enter/Shift+Enter.
12. **Find & Replace (Ctrl+H)**: Dialog with scope (all/selected/column), case-sensitive toggle, preview (50 matches). Numeric column validation.
13. **Add Row**: Context menu → Edit → Add Row. Inserts after selection or appends. Default values: `.` for strings, `0` for numbers.
14. **Variant Type Filter**: Classifies variants as SNP/INDEL/MNP/MIXED/OTHER. Multi-allelic ALT detection. Quick actions: SNP Only, INDEL Only.
15. **Genotype Filter**: Parses GT from FORMAT/sample fields. Phase normalization (0|1 → 0/1). Quick actions: Het Only, Hom Alt Only, No Missing.
16. **INFO Field Parser**: Scans INFO column, extracts key=value pairs to `INFO_*` columns. Flags → 1/0. VCF exporter excludes `INFO_*` columns.
17. **Statistics Panel**: Toggle via toolbar button. Column stats (numeric/categorical), chromosome distribution (horizontal bars), region size distribution (log-scale histogram, BED and GFF3).
18. **Validate Coordinates (BED)**: Checks swapped start/end, negative coords, zero-length, invalid chrom, duplicates. Auto-fix for swapped/negative/duplicate.
19. **Intersect / Subtract (BED)**: Load second BED file, binary search overlap detection O(N log M). Intersect (keep overlapping) or Subtract (remove overlapping).
20. **Complement (BED)**: Generates gap regions. Requires chrom sizes (GRCh37/GRCh38 built-in or custom). REPLACES all rows with BED3 complement.
21. **UCSC Genome Browser**: Opens selected regions in UCSC. Single region: direct link. Multiple: bounding region + 10% padding. UCSC db resolved from species config.
22. **CHROM_ORDER**: Shared natural chromosome ordering in `utils/chromosome.ts`. Used by sort-rows.ts and ChromDistribution.
23. **INFO Column Filter**: Filter rows by parsed `INFO_*` column values. Auto-detects numeric vs categorical. Numeric: operator (>=, <=, ==, !=) + threshold. Categorical: unique value checklist. Missing (`.`) toggle. Only shown in context menu when INFO_* columns exist.
24. **GFF3 format**: 9-column TSV (seqid, source, type, start, end, score, strand, phase, attributes). 1-based inclusive coordinates. `##` directives preserved for round-trip. Attributes are semicolon-separated key=value pairs (URL-encoded).
25. **GFF3 Type Filter**: Scans `type` column for unique feature types with counts. Quick actions: Gene Only, Exon Only, CDS Only.
26. **GFF3 Attribute Parser**: Scans `attributes` column, extracts key=value pairs to `ATTR_*` columns. URL-decodes values. GFF3 exporter excludes `ATTR_*` columns.
27. **GFF3 Attribute Column Filter**: Reuses `InfoColumnFilterDialog` — `getInfoColumns()` returns both `INFO_*` and `ATTR_*` columns. Only shown when `ATTR_*` columns exist (after Parse Attributes).
28. **Gzip (.gz) support**: `.vcf.gz`, `.gff3.gz`, `.bed.gz` files are decompressed in-browser using native `DecompressionStream` API (streaming, zero dependencies). Extension stripped for format detection. Loading toast shown during decompression. Size limits enforced on decompressed content.
