# hooks/

Custom React hooks for reusable UI logic.

## Module Structure

| File | Purpose |
|------|---------|
| `useFileDrop.ts` | Handles drag & drop events, reads file via FileReader, dispatches to parser, updates store |
| `useContextMenu.ts` | Manages right-click menu state: position (x, y), visibility, target row index. Closes on outside click/scroll |
| `useTableColumns.ts` | Generates TanStack Table column definitions dynamically from detected file format (BED3/4/6/12 or VCF) |
| `useKeyboardShortcuts.ts` | Global keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+S export, Ctrl+A select all, Delete rows |

## Rules

- All hooks start with `use` prefix.
- Hooks are pure logic — no JSX rendering.
- Each hook is in its own file.
- Hooks may read from Zustand stores.
- `useEffect` cleanup is mandatory for event listeners (especially in `useContextMenu` and `useKeyboardShortcuts`).
