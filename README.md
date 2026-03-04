# BedForge

**Visual genomic editor for BED and VCF files.**
All bioinformatics operations run in the browser via the [Ensembl REST API](https://rest.ensembl.org). No backend, no uploads — your data never leaves your machine.

---

## Why BedForge?

Working with BED and VCF files usually means switching between command-line tools (`bedtools`, `bcftools`, `awk`), writing one-off scripts, and losing track of intermediate files. BedForge puts the most common genomic operations behind a right-click menu with full undo/redo, live preview, and instant feedback.

- **Drag & drop** a BED or VCF file, pick your reference assembly, and start editing.
- **Right-click** any row for context-aware operations (different menus for BED vs VCF).
- **Undo everything** with Ctrl+Z — every operation is reversible (up to 20 steps).
- **Export** your cleaned file and move on.

---

## Features

### BED Operations

| Operation | Description | Source |
|-----------|-------------|--------|
| **LiftOver** | Convert coordinates between GRCh37 and GRCh38 | Ensembl API |
| **Annotate Genes** | Fetch gene names from Ensembl overlap endpoint; auto-upgrades BED3 to BED4 | Ensembl API |
| **GC Content** | Calculate GC% for each region; adds `gc_content` column | Ensembl API |
| **Clean Intergenic** | Remove rows with no gene overlap | Ensembl API |
| **Sort** | Natural chromosome order (1-22, X, Y, M) + start + end | Client |
| **Remove Duplicates** | Deduplicate by chrom:start:end (keeps first) | Client |
| **Merge Overlapping** | Merge overlapping/adjacent regions (like `bedtools merge`) | Client |
| **Extend / Slop** | Extend regions upstream/downstream (strand-aware) with presets | Client |
| **Validate Coordinates** | Detect swapped start/end, negative coords, zero-length, invalid chrom, duplicates. Auto-fix available | Client |
| **Intersect / Subtract** | Overlap detection with a second BED file using binary search O(N log M) | Client |
| **Complement** | Generate gap regions from chromosome sizes (GRCh37/GRCh38 built-in or custom) | Client |

### VCF Operations

| Operation | Description |
|-----------|-------------|
| **Filter by FILTER** | Select which FILTER values to keep (PASS, LowQual, etc.) with row counts |
| **Filter by QUAL** | Threshold-based quality filter with presets (Q10-Q60). Rows with QUAL="." are always kept |
| **Filter by Variant Type** | Classify as SNP / INDEL / MNP / MIXED / OTHER. Quick actions: SNP Only, INDEL Only |
| **Filter by Genotype** | Parse GT field with phase normalization (0\|1 -> 0/1). Quick actions: Het Only, Hom Alt Only |
| **Parse INFO Fields** | Extract key=value pairs from INFO column into `INFO_*` columns. Flags become 1/0 |
| **Filter by INFO Column** | Filter by any parsed INFO_* column. Auto-detects numeric vs categorical. Numeric mode: operators (>=, <=, ==, !=) + threshold. Categorical mode: value checklist |

### Shared Operations

LiftOver, Clean Intergenic, Sort, Remove Duplicates, Find & Replace, Add Row, Delete, Copy to Clipboard, and Open in UCSC Genome Browser work with both BED and VCF files.

### Search & Replace

- **Ctrl+F** : Floating search bar with match counter and navigation (Enter / Shift+Enter)
- **Ctrl+H** : Find & Replace dialog with scope (all rows / selected / column), case-sensitive toggle, and live preview

### Statistics Panel

Toggle from the toolbar to see:
- **Column stats** : count, min, max, median, mean, std dev (numeric) or unique values (categorical)
- **Chromosome distribution** : horizontal bar chart with natural ordering
- **Region size distribution** : log-scale histogram (BED only)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search |
| `Ctrl+H` | Find & Replace |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+A` | Select all rows |
| `Delete` / `Backspace` | Delete selected rows |
| `Escape` | Clear selection / close search |

---

## Supported Formats

**Input:** `.bed`, `.bed3`-`.bed12`, `.vcf`, `.txt`, `.tsv`
**Output:** BED (preserves original format) or VCF (preserves `##` meta lines for round-trip export)

### Coordinate Systems

| Format | System | Example |
|--------|--------|---------|
| BED | 0-based, half-open [start, end) | `chr1  100  200` |
| VCF | 1-based, inclusive | `chr1  101` (POS) |
| Ensembl API | 1-based, inclusive [start, end] | `1:101..200` |

Conversions between these systems are handled automatically.

---

## Getting Started

```bash
git clone https://github.com/tarik-kirlioglu/BedForge.git
cd BedForge
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drop a BED or VCF file, and right-click to explore operations.

### Commands

```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Production build (dist/)
npm run preview    # Preview production build
npm run test       # Run unit tests
npm run lint       # ESLint
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 6 |
| Language | TypeScript (strict mode) |
| Table | TanStack Table + TanStack Virtual |
| State | Zustand + Immer |
| Styling | Tailwind CSS 4 |
| Toasts | Sonner |
| Testing | Vitest |

---

## Performance

- **1M+ rows** rendered smoothly via virtualized scrolling (only visible rows in the DOM)
- **Binary search** overlap detection for intersect/subtract operations
- **Batch API calls** with 5 concurrent requests and token-bucket rate limiting (14 req/s)
- **Ensembl rate limit compliance**: automatic retry on 429 with `Retry-After` header

---

## Privacy

BedForge is a fully client-side application. Genomic data is processed entirely in your browser. The only network requests go to the [Ensembl REST API](https://rest.ensembl.org) for operations like LiftOver, gene annotation, GC content, and intergenic filtering. No data is stored or transmitted to any other server.

---

## License

MIT
