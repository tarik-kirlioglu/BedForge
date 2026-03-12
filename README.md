# BedForge

**Visual genomic editor for BED, VCF, and GFF3 files.**
All bioinformatics operations run in the browser via the [Ensembl REST API](https://rest.ensembl.org). No backend, no uploads — your data never leaves your machine.

---

## Why BedForge?

Working with BED, VCF, and GFF3 files usually means switching between command-line tools (`bedtools`, `bcftools`, `awk`), writing one-off scripts, and losing track of intermediate files. BedForge puts the most common genomic operations behind a right-click menu with full undo/redo, live preview, and instant feedback.

- **Drag & drop** a BED, VCF, or GFF3 file, pick your species and assembly, and start editing.
- **Right-click** any row for context-aware operations (different menus for BED, VCF, and GFF3).
- **Undo everything** with Ctrl+Z — every operation is reversible (up to 20 steps).
- **Export** your cleaned file and move on.

---

## Features

### BED Operations

| Operation | Description | Source |
|-----------|-------------|--------|
| **LiftOver** | Convert coordinates between assemblies (e.g. GRCh37 ↔ GRCh38) | Ensembl API |
| **Annotate Genes** | Fetch gene names from Ensembl overlap endpoint; auto-upgrades BED3 to BED4 | Ensembl API |
| **GC Content** | Calculate GC% for each region; adds `gc_content` column | Ensembl API |
| **Clean Intergenic** | Remove rows with no gene overlap | Ensembl API |
| **Sort** | Natural chromosome order (1-22, X, Y, M) + start + end | Client |
| **Remove Duplicates** | Deduplicate by chrom:start:end (keeps first) | Client |
| **Merge Overlapping** | Merge overlapping/adjacent regions (like `bedtools merge`) | Client |
| **Extend / Slop** | Extend regions upstream/downstream (strand-aware) with presets | Client |
| **Validate Coordinates** | Detect swapped start/end, negative coords, zero-length, invalid chrom, duplicates. Auto-fix available | Client |
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

### GFF3 Operations

| Operation | Description |
|-----------|-------------|
| **Filter by Type** | Filter features by type (gene, mRNA, exon, CDS, etc.) with row counts. Quick actions: Gene Only, Exon Only, CDS Only |
| **Parse Attributes** | Extract key=value pairs from attributes column into `ATTR_*` columns with URL-decoding |
| **Filter by Attribute Column** | Filter by any parsed ATTR_* column. Auto-detects numeric vs categorical (same as INFO Column Filter) |

### Shared Operations

| Operation | Description |
|-----------|-------------|
| **Filter by Chromosome** | Filter rows by chromosome with checkbox list, natural ordering, and quick actions (Autosomes, chr1 Only) |
| **Intersect / Subtract** | Compare with a second file (BED/VCF/GFF3). Two-axis controls: Action (keep or remove matching rows) × Match Type (any overlap or exact chrom+start+end). Binary search O(N log M) |
| **LiftOver** | Convert coordinates between assemblies (species with 2+ assemblies) |
| **Clean Intergenic** | Remove rows with no gene overlap |
| **Sort** | Natural chromosome order + start + end |
| **Remove Duplicates** | Deduplicate by coordinates |
| **Find & Replace** | Scope (all/selected/column), case-sensitive, numeric validation |
| **Add Row / Delete / Copy** | Basic row editing operations |
| **Open in Ensembl** | Open selected regions in Ensembl Genome Browser |

### Search & Replace

- **Ctrl+F** : Floating search bar with match counter and navigation (Enter / Shift+Enter)
- **Ctrl+H** : Find & Replace dialog with scope (all rows / selected / column), case-sensitive toggle, and live preview

### Statistics Panel

Toggle from the toolbar to see:
- **Column stats** : count, min, max, median, mean, std dev (numeric) or unique values (categorical)
- **Chromosome distribution** : horizontal bar chart with natural ordering
- **Region size distribution** : log-scale histogram (BED and GFF3)

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

**Input:** `.bed`, `.bed3`-`.bed12`, `.vcf`, `.gff3`, `.gff`, `.txt`, `.tsv` — plus gzip-compressed versions (`.bed.gz`, `.vcf.gz`, `.gff3.gz`)
**Output:** BED (preserves original format), VCF (preserves `##` meta lines), or GFF3 (preserves `##` directives) — all round-trip safe

### Coordinate Systems

| Format | System | Example |
|--------|--------|---------|
| BED | 0-based, half-open [start, end) | `chr1  100  200` |
| VCF | 1-based, inclusive | `chr1  101` (POS) |
| GFF3 | 1-based, inclusive [start, end] | `chr1  101  200` |
| Ensembl API | 1-based, inclusive [start, end] | `1:101..200` |

Conversions between these systems are handled automatically.

### Supported Species

| Species | Assemblies |
|---------|------------|
| Human | GRCh38 (hg38), GRCh37 (hg19) |
| Mouse | GRCm39 (mm39), GRCm38 (mm10) |
| Zebrafish | GRCz11 (danRer11) |
| Fruit fly | BDGP6 (dm6) |
| C. elegans | WBcel235 (ce11) |
| A. thaliana | TAIR10 (araTha1) |
| S. cerevisiae | R64-1-1 (sacCer3) |

All Ensembl API operations (LiftOver, Annotate Genes, GC Content, Clean Intergenic) work with any supported species. LiftOver is available for species with multiple assemblies (Human, Mouse). Ensembl Genome Browser links automatically resolve the correct species and subdomain.

---

## Getting Started

```bash
git clone https://github.com/tarik-kirlioglu/BedForge.git
cd BedForge
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drop a BED, VCF, or GFF3 file (gzip-compressed files also accepted), select your species and assembly, and right-click to explore operations. You can also click **Try Example** to instantly load a Human (GRCh38) sample file.

Or visit the live app at **[bedforge.pages.dev](https://bedforge.pages.dev)**.

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
- **Gzip decompression**: Native `DecompressionStream` API — streaming, zero dependencies
- **File size limits**: Soft warning at 50 MB, hard block at 500 MB (decompressed size). Streaming decompression aborts early if limit is exceeded to protect browser memory

---

## Privacy

BedForge is a fully client-side application. Genomic data is processed entirely in your browser. The only network requests go to the [Ensembl REST API](https://rest.ensembl.org) for operations like LiftOver, gene annotation, GC content, and intergenic filtering. No data is stored or transmitted to any other server.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
