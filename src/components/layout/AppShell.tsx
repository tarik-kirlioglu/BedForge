import { useFileStore } from "../../stores/useFileStore";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { DropZone } from "../drop-zone/DropZone";
import { Toolbar } from "./Toolbar";
import { DataGrid } from "../table/DataGrid";
import { GenomicContextMenu } from "../context-menu/GenomicContextMenu";

export function AppShell(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const hasFile = rows.length > 0;

  useKeyboardShortcuts();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-void">
      {/* Subtle background grid for editor mode */}
      {hasFile && (
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.04]" />
      )}

      {hasFile ? (
        <>
          <Toolbar />
          <div className="relative flex-1 overflow-hidden">
            <DataGrid />
            <GenomicContextMenu />
          </div>
        </>
      ) : (
        <DropZone />
      )}
    </div>
  );
}
