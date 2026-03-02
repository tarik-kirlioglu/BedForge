import { useState, useRef, useEffect, useCallback } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";

interface EditableCellProps {
  rowIndex: number;
  colKey: string;
  value: string;
}

export function EditableCell(props: EditableCellProps): React.ReactElement {
  const { rowIndex, colKey, value } = props;
  const updateCell = useFileStore((s) => s.updateCell);
  const activeCell = useSelectionStore((s) => s.activeCell);
  const setActiveCell = useSelectionStore((s) => s.setActiveCell);

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
      const numericColumns = [
        "chromStart", "chromEnd", "POS", "score",
        "thickStart", "thickEnd", "blockCount",
      ];
      if (numericColumns.includes(colKey)) {
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
        className="w-full bg-zinc-700 px-1 py-0.5 text-xs text-zinc-100 outline-none ring-1 ring-genome-blue rounded"
      />
    );
  }

  return (
    <span
      className="block w-full cursor-text truncate"
      onDoubleClick={handleDoubleClick}
      title={value}
    >
      {value}
    </span>
  );
}
