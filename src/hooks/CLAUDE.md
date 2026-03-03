# hooks/

Custom React hooks for reusable UI logic.

## Module Structure

| File | Purpose |
|------|---------|
| `useKeyboardShortcuts.ts` | Global keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z/Ctrl+Y redo, Ctrl+A select all, Delete/Backspace remove rows, Escape clear selection, Ctrl+F open search, Ctrl+H open find & replace |

## Notes

- File drop logic is handled directly in `DropZone.tsx` (not a separate hook).
- Context menu state is managed via `useContextMenuStore` Zustand store in `GenomicContextMenu.tsx`.
- Table column definitions are built inline in `DataGrid.tsx` via `useMemo`.

## Rules

- All hooks start with `use` prefix.
- Hooks are pure logic — no JSX rendering.
- Each hook is in its own file.
- Hooks may read from Zustand stores.
- `useEffect` cleanup is mandatory for event listeners.
- Keyboard shortcuts must check `e.target.tagName` to avoid intercepting input/textarea editing.
