# components/

React components organized by feature area.

## Module Structure

| Directory | Components | Purpose |
|-----------|-----------|---------|
| `layout/` | `AppShell.tsx`, `Toolbar.tsx` | Top-level layout, toolbar with file name, assembly badge, export, undo/redo |
| `drop-zone/` | `DropZone.tsx` | Drag & drop file landing area, shown when no file is loaded |
| `table/` | `DataGrid.tsx`, `EditableCell.tsx`, `TableHeader.tsx`, `ColumnFilter.tsx` | Core spreadsheet: virtualized table, cell editing, sorting, filtering |
| `context-menu/` | `GenomicContextMenu.tsx` | Right-click menu with LiftOver, Clean Intergenic, GC Content, Delete, Copy |
| `operations/` | `OperationProgress.tsx` | Progress toast/overlay during long-running genomic operations |

## Component Rules

- Functional components only, no `React.FC`.
- Props interface defined in the same file as the component.
- Named exports only: `export function DataGrid(props: DataGridProps)`.
- Event handlers use `handle` prefix: `handleCellDoubleClick`, `handleContextMenu`.
- Components read from Zustand stores directly via hooks — no prop drilling for global state.
- Tailwind utility classes for all styling. No inline styles.

## Key Component Details

### DataGrid (most complex component)
- Uses `@tanstack/react-table` for column defs, sorting, filtering, row selection.
- Uses `@tanstack/react-virtual` for virtualized row rendering (~50 visible rows).
- Columns are dynamically generated from the detected file format via `useTableColumns` hook.
- First column is always a row selection checkbox.

### EditableCell
- Read mode: displays cell value as plain text.
- Edit mode (double-click): renders an `<input>`, commits on Enter, cancels on Escape, moves on Tab.
- Validates numeric fields (chromStart, chromEnd, POS) on commit.

### GenomicContextMenu
- Custom implementation (no Radix) — rendered via React Portal at document body.
- Positioned at mouse coordinates, flips to stay within viewport bounds.
- Menu items are conditional: LiftOver direction depends on current assembly.
- Closes on outside click, Escape key, or scroll.

### DropZone
- Dashed border area with drag-over highlight (blue border).
- Accepts: `.bed`, `.bed3`–`.bed12`, `.vcf`, `.txt`, `.tsv`.
- Also supports click-to-browse via hidden `<input type="file">`.
- After successful drop: triggers assembly selection (GRCh37 / GRCh38).
