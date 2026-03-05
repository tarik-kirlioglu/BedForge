# stores/

Zustand stores for application state management.

## Module Structure

| File | Purpose |
|------|---------|
| `useFileStore.ts` | Central store: rows, file metadata, format, species, assembly, useChrPrefix, undo/redo history, VCF meta, GFF3 directives. Actions: loadFile, setSpeciesAndAssembly, updateCell, deleteRows, updateRows, addColumn, addRow, undo, redo, reset |
| `useSelectionStore.ts` | Row/cell selection: `selectedRowIndices` (Set), `activeCell`, toggle/range/selectAll/clear |
| `useOperationStore.ts` | Running operation state: isRunning, operationName, progress {completed, total}, isCancelled |
| `useSearchStore.ts` | Search/Find state: isOpen, query, matchIndices, currentMatchIndex. Actions: open, close, setQuery, setMatches, nextMatch, prevMatch |

## Rules

- All stores use Zustand's `create`. `useFileStore` uses Immer middleware for ergonomic immutable updates.
- Store names always start with `use` prefix.
- No cross-store imports — stores must not read from each other. Components compose multiple stores.
- `useFileStore` actions push to undo history before mutations. History capped at 20 snapshots.
- `useOperationStore.isCancelled` is a flag checked by `operation-runner.ts` between batches.
- Client-side operations (sort, dedup, merge, slop) may use `useFileStore.setState()` directly for bulk replacements.

## Additional Zustand Stores

- `useContextMenuStore` lives in `GenomicContextMenu.tsx` (co-located with its only consumer). Manages context menu visibility and position.

## Data Flow

```
File Drop → useFileStore.loadFile() → parsers (BED/VCF/GFF3) → rows stored
Cell Edit → useFileStore.updateCell() → push history → mutate row
API Operation → useOperationStore.startOperation() → runner → useFileStore.updateRows()
Client Operation → useFileStore.setState() directly (sort, merge, etc.)
Selection → useSelectionStore.toggleRow() / selectRange() / setSelectedRows()
```
