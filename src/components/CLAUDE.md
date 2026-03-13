# components/

React components organized by feature area. All styled with the "Genomic Instrument" design system.

## Module Structure

| Directory | Components | Purpose |
|-----------|-----------|---------|
| `layout/` | `AppShell.tsx`, `Toolbar.tsx` | Top-level layout with triple routing (batch/editor/dropzone), glass-strong toolbar, brand mark, operation progress, export dropdown |
| `batch/` | `BatchShell.tsx`, `BatchDropZone.tsx`, `BatchPipelineBuilder.tsx`, `BatchProgress.tsx` | Batch mode wizard: multi-file upload → pipeline builder → progress → ZIP export |
| `drop-zone/` | `DropZone.tsx` | Hero landing page with animated grid, radial glow, feature cards, assembly picker modal, Batch Mode button |
| `table/` | `DataGrid.tsx`, `EditableCell.tsx` | Virtualized spreadsheet with glass surfaces, chromosome color-coding, status bar |
| `context-menu/` | `GenomicContextMenu.tsx` | Frosted glass right-click menu with SVG icons, section labels, slide-in animation |
| `operations/` | `SlopDialog.tsx`, `FilterColumnDialog.tsx`, `QualFilterDialog.tsx`, `VariantTypeDialog.tsx`, `GenotypeFilterDialog.tsx`, `InfoParserDialog.tsx`, `InfoColumnFilterDialog.tsx`, `FindReplaceDialog.tsx`, `ValidationDialog.tsx`, `IntersectDialog.tsx`, `ComplementDialog.tsx`, `TypeFilterDialog.tsx`, `AttributeParserDialog.tsx`, `ChromFilterDialog.tsx` | Operation parameter dialogs |
| `search/` | `SearchBar.tsx` | Floating Ctrl+F search bar with match counter and navigation |
| `stats/` | `StatsPanel.tsx`, `ChromDistribution.tsx`, `SizeDistribution.tsx` | Statistics sidebar with column stats, chromosome distribution, and region size histogram |

## Component Rules

- Functional components only, no `React.FC`.
- Props interfaces defined in the same file.
- Named exports: `export function DataGrid(...)`.
- Event handlers use `handle` prefix.
- Components read from Zustand stores directly — no prop drilling.
- Styling: Tailwind utility classes with design system tokens (void, surface, cyan-glow, etc.).
- Inline `style={}` only for dynamic values (context menu position, virtual scroll offsets).

## Key Component Details

### DropZone (Landing Page)
- Full-screen hero with `.bg-grid` animated background and radial glow effects
- Brand mark: "BedForge" with cyan-glow accent
- Drop chamber: Dashed border area with `.glow-border` on drag-over, scale transition
- "Try Example" buttons: BED Example (cyan-glow) + VCF Example (electric) + GFF3 Example (nt-g amber), fetches from `public/samples/`. All examples are Human (GRCh38) — species picker is skipped, loads directly
- 3 feature cards: LiftOver, Merge & Sort, Annotate
- Species & assembly picker: Two-step glass modal — species grid (8 organisms) → assembly buttons. Single-assembly species skip second step
- Accepts: `.bed`, `.bed3`–`.bed12`, `.vcf`, `.gff3`, `.gff`, `.txt`, `.tsv`, `.gz` (gzip-compressed variants)
- Gzip support: `.vcf.gz`, `.gff3.gz`, `.bed.gz` decompressed via native `DecompressionStream` with BGZF fallback (block-by-block decompression for bgzip files). Loading toast shown
- File size limits: soft warning at 50MB, hard block at 500MB (decompressed size). Streaming decompression aborts early if hard limit exceeded
- "Batch Mode" button: enters batch wizard via `useBatchStore.enterBatchMode()`
- Footer: "Built for bioinformaticians. No backend." + GitHub link icon
- File parsing delegated to `parseFileFromDisk()` / `parseContent()` from `parsers/parse-file.ts`

### Toolbar
- `.glass-strong` surface with brand mark on left
- GitHub link icon (14x14) after brand mark
- File info: name (mono font), format badge (cyan for BED, electric for VCF, nt-g amber for GFF3), species badge (electric blue), assembly badge (nt-a green), row count
- Live operation progress: pulsing dot + operation name + count (shown during Ensembl API calls)
- Actions: undo/redo SVG icons, export dropdown (glass menu), close button (danger hover)

### DataGrid
- TanStack Table + TanStack Virtual, ROW_HEIGHT = 30px
- Header: `.bg-deep`, mono uppercase column names, cyan sort indicators
- Custom checkboxes: `.genomic-checkbox` class (index.css) — visible border, hover highlight, cyan-glow checked state with ✓ tick mark via `::after`
- Row hover: `bg-surface/60`, selected: `bg-cyan-glow/[0.06]` with cyan border
- Cell color-coding: chromosomes = electric blue, coordinates = tabular-nums, gc_content = nt-g amber
- Status bar: `.glass-strong`, row count, selection count with cyan dot, "Right-click for operations" hint

### EditableCell
- Read mode: truncated text with color-coding by column type
- Edit mode: `border-cyan-glow/40` input with `ring-cyan-glow/20` focus ring
- Numeric validation for: chromStart, chromEnd, POS, score, thickStart, thickEnd, blockCount

### GenomicContextMenu
- `.glass` surface with `.animate-slide-in` entry animation
- Section labels: 9px uppercase tracking-[0.15em] muted text ("Ensembl API", "VCF Filter", "Transform")
- Menu items: 14×14 colored SVG icons, 13px labels, 10px mono sublabels
- Viewport-aware positioning (flips to stay in bounds)
- **File-type-aware menu**: shows different operations for BED vs VCF vs GFF3
  - **BED**: Ensembl API (LiftOver*, Annotate Genes, GC Content, Clean Intergenic) → Transform (Filter by Chromosome, Sort, Dedup, Merge, Extend, Validate, Intersect/Subtract, Complement) → Edit (Add Row, Ensembl, Delete, Copy)
  - **VCF**: Ensembl API (LiftOver*, Clean Intergenic) → VCF Filter (by FILTER, QUAL, Variant Type, Genotype, Parse INFO, Filter by INFO Column) → Transform (Filter by Chromosome, Sort, Dedup, Intersect/Subtract) → Edit (Add Row, Ensembl, Delete, Copy)
  - **GFF3**: Ensembl API (LiftOver*, Clean Intergenic) → GFF3 Filter (Filter by Type, Parse Attributes, Filter by Attribute Column) → Transform (Filter by Chromosome, Sort, Dedup, Intersect/Subtract) → Edit (Add Row, Ensembl, Delete, Copy)
  - *LiftOver only shown for species with 2+ assemblies. All API operations pass `speciesName` from store.
- `useContextMenuStore`: Zustand store for visibility + position

### FilterColumnDialog (VCF)
- Glass morphism modal with electric (#4361ee) accent
- Shows unique FILTER values as checkboxes (`.genomic-checkbox`) with row counts
- Quick actions: "Select All", "PASS Only"
- Summary bar: "Keeping X of Y rows"
- CTA: electric-colored "Apply Filter" button

### QualFilterDialog (VCF)
- Glass morphism modal with amber (#f59e0b) accent
- Stats bar: min/median/max QUAL from current data
- Number input with presets: Q10, Q20, Q30, Q40, Q60
- Note: rows with QUAL="." are always kept
- CTA: amber-colored "Apply Filter" button

### InfoColumnFilterDialog (VCF / GFF3)
- Glass morphism modal with nt-c blue (#3b82f6) accent
- Column picker dropdown for INFO_* columns (VCF) and ATTR_* columns (GFF3)
- Auto-detects numeric vs categorical column type (≥80% parseable → numeric)
- Numeric mode: stats bar (min/median/max), operator buttons (≥, ≤, =, ≠), threshold input
- Categorical mode: quick actions (Select All, Deselect All, Invert), scrollable checklist with counts + percentage bars
- "Keep missing values (.)" checkbox with missing count
- Real-time preview: "Keeping X of Y rows"
- CTA: nt-c blue "Apply Filter" button
- Only shown in context menu when INFO_* or ATTR_* columns exist (after Parse INFO Fields or Parse Attributes)

### TypeFilterDialog (GFF3)
- Glass morphism modal with amber (#f59e0b / nt-g) accent
- Shows unique `type` values as checkboxes with row counts
- Quick actions: "Select All", "Gene Only", "Exon Only", "CDS Only"
- Summary bar: "Keeping X of Y rows"
- CTA: amber-colored "Apply Filter" button

### ChromFilterDialog (Shared)
- Glass morphism modal with cyan-glow (#06d6a0) accent
- Shows unique chromosomes as checkboxes with row counts, sorted by `chromRank()` (species-aware)
- Quick actions: "Select All", "Deselect All", "Autosomes" (chr1–22), "chr1 Only"
- Summary bar: "Keeping X of Y rows"
- CTA: cyan-glow "Apply Filter" button
- Format-aware: works with BED (chrom), VCF (CHROM), GFF3 (seqid)

### AttributeParserDialog (GFF3)
- Glass morphism modal with amber (#f59e0b / nt-g) accent
- Scans `attributes` column for extractable key=value pairs
- Shows keys with count and example values
- Quick action: "Common Keys" (ID, Name, Parent, biotype, Dbxref)
- Extracted columns get `ATTR_` prefix
- CTA: amber-colored "Extract" button

### Batch Components

#### BatchShell
- Multi-step wizard container, renders step component based on `useBatchStore.step`
- Steps: `files` → `operation` → `processing` → `done`
- Full-screen layout with `.bg-grid` background

#### BatchDropZone (files step)
- Multi-file drag & drop with format validation (all same base format)
- File list with row counts and remove buttons
- Species/assembly picker (reused from DropZone pattern)
- `multiple` attribute on file input for multi-select
- "Next" button when files loaded and species selected

#### BatchPipelineBuilder (operation step)
- Pipeline builder for chaining multiple operations sequentially
- Top section: ordered pipeline step list with step number badges, param summaries, move up/down buttons, remove (×) button
- Bottom section: "Add Step" operation grid (format-aware, filters by bed/vcf/gff3)
- Format tracking through pipeline: operations that change format (merge → BED3, complement → BED3) update available ops for next step via `getAvailableOpsForFormat()` / `getOutputFormat()`
- `OperationParams` sub-component for parameter configuration (Extend upstream/downstream, Filter QUAL threshold, LiftOver target assembly, Find & Replace search/replace, etc.)
- "Add to Pipeline" button appends step, "Run Pipeline" CTA starts processing

#### BatchProgress (processing/done steps)
- File list with `StatusIcon` per file (spinner/checkmark/X/dash)
- Overall progress bar
- Step-level progress: "Step 2/4: Extending..." shown during multi-step pipeline processing
- Row count changes displayed (original → result count)
- Cancel button during processing
- "Download ZIP" button when done, "Done" button to exit batch mode

### SlopDialog
- Glass morphism modal with black/70 backdrop
- Custom toggle switch (peer-checked pattern, not native checkbox)
- Monospace number inputs with cyan focus ring
- Preset buttons: 100bp, 500bp, 1kb, 2kb, 5kb — active state highlighted with cyan
- CTA button: solid cyan-glow background, void text
