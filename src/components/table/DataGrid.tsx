import { useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useContextMenuStore } from "../context-menu/GenomicContextMenu";
import { EditableCell } from "./EditableCell";
import type { GenomicRow } from "../../types/genomic";

const ROW_HEIGHT = 32;

export function DataGrid(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const columns = useFileStore((s) => s.columns);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const toggleRow = useSelectionStore((s) => s.toggleRow);
  const setSelectedRows = useSelectionStore((s) => s.setSelectedRows);
  const openContextMenu = useContextMenuStore((s) => s.open);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const lastClickedRowRef = useRef<number | null>(null);

  const columnDefs = useMemo<ColumnDef<GenomicRow>[]>(() => {
    const defs: ColumnDef<GenomicRow>[] = [
      {
        id: "_select",
        header: () => (
          <input
            type="checkbox"
            checked={selectedRowIndices.size === rows.length && rows.length > 0}
            onChange={() => {
              if (selectedRowIndices.size === rows.length) {
                setSelectedRows(new Set());
              } else {
                setSelectedRows(new Set(rows.map((r) => r._index)));
              }
            }}
            className="accent-genome-blue"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedRowIndices.has(row.original._index)}
            onChange={() => toggleRow(row.original._index)}
            className="accent-genome-blue"
          />
        ),
        size: 36,
        enableSorting: false,
        enableColumnFilter: false,
      },
    ];

    for (const col of columns) {
      defs.push({
        accessorKey: col,
        header: col,
        cell: (info) => (
          <EditableCell
            rowIndex={info.row.original._index}
            colKey={col}
            value={String(info.getValue() ?? "")}
          />
        ),
        size: col === "INFO" ? 250 : col === "chrom" || col === "CHROM" ? 90 : 120,
      });
    }

    return defs;
  }, [columns, rows, selectedRowIndices, toggleRow, setSelectedRows]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row._rowId,
  });

  const tableRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleRowClick = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      if (e.shiftKey && lastClickedRowRef.current !== null) {
        const start = lastClickedRowRef.current;
        const end = rowIndex;
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        const indices = new Set<number>();
        for (let i = lo; i <= hi; i++) {
          const row = tableRows[i];
          if (row) indices.add(row.original._index);
        }
        setSelectedRows(indices);
      } else if (e.ctrlKey || e.metaKey) {
        toggleRow(rowIndex);
      }
      lastClickedRowRef.current = rowIndex;
    },
    [tableRows, setSelectedRows, toggleRow],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, rowOriginalIndex: number) => {
      e.preventDefault();
      // Auto-select the row if not already selected
      if (!selectedRowIndices.has(rowOriginalIndex)) {
        setSelectedRows(new Set([rowOriginalIndex]));
      }
      openContextMenu(e.clientX, e.clientY);
    },
    [selectedRowIndices, setSelectedRows, openContextMenu],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Table container */}
      <div
        ref={parentRef}
        className="scrollbar-thin flex-1 overflow-auto"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-zinc-700 px-2 py-1.5 text-left text-xs font-medium text-zinc-400"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "flex cursor-pointer select-none items-center gap-1 hover:text-zinc-200"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" && (
                          <span className="text-genome-blue">&#9650;</span>
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <span className="text-genome-blue">&#9660;</span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {/* Spacer for virtual scroll */}
            <tr>
              <td
                colSpan={columnDefs.length}
                style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}
              />
            </tr>

            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              if (!row) return null;
              const isSelected = selectedRowIndices.has(row.original._index);

              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  className={`border-b border-zinc-800/50 transition-colors ${
                    isSelected
                      ? "bg-genome-blue/10"
                      : "hover:bg-zinc-800/50"
                  }`}
                  onClick={(e) => handleRowClick(e, virtualRow.index)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, row.original._index)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-0.5 font-mono text-xs text-zinc-300"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Bottom spacer */}
            <tr>
              <td
                colSpan={columnDefs.length}
                style={{
                  height:
                    virtualizer.getTotalSize() -
                    (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                }}
              />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 border-t border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-500">
        <span>{tableRows.length.toLocaleString()} rows</span>
        {selectedRowIndices.size > 0 && (
          <span className="text-genome-blue">
            {selectedRowIndices.size} selected
          </span>
        )}
      </div>
    </div>
  );
}
