# components/

React components organized by feature area. All styled with the "Genomic Instrument" design system.

## Module Structure

| Directory | Components | Purpose |
|-----------|-----------|---------|
| `layout/` | `AppShell.tsx`, `Toolbar.tsx` | Top-level layout with glass-strong toolbar, brand mark, operation progress, export dropdown |
| `drop-zone/` | `DropZone.tsx` | Hero landing page with animated grid, radial glow, feature cards, assembly picker modal |
| `table/` | `DataGrid.tsx`, `EditableCell.tsx` | Virtualized spreadsheet with glass surfaces, chromosome color-coding, status bar |
| `context-menu/` | `GenomicContextMenu.tsx` | Frosted glass right-click menu with SVG icons, section labels, slide-in animation |
| `operations/` | `SlopDialog.tsx`, `FilterColumnDialog.tsx`, `QualFilterDialog.tsx` | Operation parameter dialogs: slop, VCF FILTER picker, VCF QUAL threshold |

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
- 3 feature cards: LiftOver, Merge & Sort, Annotate
- Assembly picker: Glass modal with GRCh37/GRCh38 buttons
- Accepts: `.bed`, `.bed3`–`.bed12`, `.vcf`, `.txt`, `.tsv`
- Footer: "Built for bioinformaticians. No backend."

### Toolbar
- `.glass-strong` surface with brand mark on left
- File info: name (mono font), format badge (cyan for BED, electric for VCF), assembly badge (nt-a green), row count
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
- **File-type-aware menu**: shows different operations for BED vs VCF
  - **BED**: Ensembl API (LiftOver, Annotate Genes, GC Content, Clean Intergenic) → Transform (Sort, Dedup, Merge, Extend) → Edit
  - **VCF**: Ensembl API (LiftOver, Clean Intergenic) → VCF Filter (by FILTER column, by QUAL score) → Transform (Sort, Dedup) → Edit
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

### SlopDialog
- Glass morphism modal with black/70 backdrop
- Custom toggle switch (peer-checked pattern, not native checkbox)
- Monospace number inputs with cyan focus ring
- Preset buttons: 100bp, 500bp, 1kb, 2kb, 5kb — active state highlighted with cyan
- CTA button: solid cyan-glow background, void text
