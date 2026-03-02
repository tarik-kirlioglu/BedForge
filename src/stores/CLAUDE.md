# stores/

Zustand stores for application state management.

## Module Structure

| File | Purpose |
|------|---------|
| `useFileStore.ts` | Central store: rows, file metadata, format, assembly, undo/redo history, mutation actions |
| `useSelectionStore.ts` | Row/cell selection: `selectedRowIndices` (Set), `activeCell`, range/toggle/selectAll |
| `useOperationStore.ts` | Running operation state: `isRunning`, `progress`, `operationName`, `isCancelled` |

## Rules

- All stores use Zustand's `create` with Immer middleware for ergonomic immutable updates.
- Store names always start with `use` prefix.
- No cross-store imports — stores must not read from each other. Components compose multiple stores.
- `useFileStore` actions push to undo history before any mutation. History is capped at 20 snapshots.
- `useOperationStore.isCancelled` is a flag checked by the operation runner — setting it to `true` aborts the running batch.

## Data Flow

```
File Drop → useFileStore.loadFile() → parsers → rows stored
Cell Edit → useFileStore.updateCell() → push history → mutate row
Operation → useOperationStore.startOperation() → runner → useFileStore.updateRows()
Selection → useSelectionStore.toggleRow() / selectRange()
```
