/** Position of the active cell in the table */
export interface CellPosition {
  rowIndex: number;
  colKey: string;
}

/** Sort direction for table columns */
export type SortDirection = "asc" | "desc" | null;
