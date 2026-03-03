import { useState, useRef, useEffect, useCallback } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useSearchStore } from "../../stores/useSearchStore";

interface EditableCellProps {
  rowIndex: number;
  colKey: string;
  value: string;
}

const NUMERIC_COLUMNS = new Set([
  "chromStart", "chromEnd", "POS", "score",
  "thickStart", "thickEnd", "blockCount",
]);

export function EditableCell(props: EditableCellProps): React.ReactElement {
  const { rowIndex, colKey, value } = props;
  const updateCell = useFileStore((s) => s.updateCell);
  const activeCell = useSelectionStore((s) => s.activeCell);
  const setActiveCell = useSelectionStore((s) => s.setActiveCell);
  const searchQuery = useSearchStore((s) => s.query);

  const isEditing =
    activeCell?.rowIndex === rowIndex && activeCell?.colKey === colKey;
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    if (editValue !== value) {
      if (NUMERIC_COLUMNS.has(colKey)) {
        const parsed = parseInt(editValue, 10);
        if (!isNaN(parsed)) {
          updateCell(rowIndex, colKey, parsed);
        }
      } else {
        updateCell(rowIndex, colKey, editValue);
      }
    }
    setActiveCell(null);
  }, [editValue, value, rowIndex, colKey, updateCell, setActiveCell]);

  function handleDoubleClick(): void {
    setEditValue(value);
    setActiveCell({ rowIndex, colKey });
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      setActiveCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      commitEdit();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-cyan-glow/40 bg-deep px-1.5 py-0.5 font-mono text-[12px] text-text-primary outline-none ring-1 ring-cyan-glow/20 transition-all"
      />
    );
  }

  // Color-code chromosome values
  const isChrom = colKey === "chrom" || colKey === "CHROM";
  const isCoord = colKey === "chromStart" || colKey === "chromEnd" || colKey === "POS";
  const isGC = colKey === "gc_content";

  const highlighted = highlightMatch(value, searchQuery);

  return (
    <span
      className={`block w-full cursor-text truncate transition-colors ${
        isChrom
          ? "font-medium text-electric"
          : isCoord
            ? "text-text-secondary tabular-nums"
            : isGC
              ? "text-nt-g"
              : "text-text-secondary"
      } group-hover:text-text-primary`}
      onDoubleClick={handleDoubleClick}
      title={value}
    >
      {highlighted}
    </span>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-nt-g/25 px-px text-inherit">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
