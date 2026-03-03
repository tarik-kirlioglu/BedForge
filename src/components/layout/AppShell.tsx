import { useState } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { DropZone } from "../drop-zone/DropZone";
import { Toolbar } from "./Toolbar";
import { DataGrid } from "../table/DataGrid";
import { GenomicContextMenu } from "../context-menu/GenomicContextMenu";
import { SearchBar } from "../search/SearchBar";
import { FindReplaceDialog } from "../operations/FindReplaceDialog";
import { StatsPanel } from "../stats/StatsPanel";

export function AppShell(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const hasFile = rows.length > 0;
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useKeyboardShortcuts({ onOpenFindReplace: () => setShowFindReplace(true) });

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-void">
      {/* Subtle background grid for editor mode */}
      {hasFile && (
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.04]" />
      )}

      {hasFile ? (
        <>
          <Toolbar showStats={showStats} onToggleStats={() => setShowStats((v) => !v)} />
          <div className="relative flex flex-1 overflow-hidden">
            <div className="relative flex-1 overflow-hidden">
              <DataGrid />
              <GenomicContextMenu />
              <SearchBar />
            </div>
            {showStats && <StatsPanel />}
          </div>
          <FindReplaceDialog
            visible={showFindReplace}
            onClose={() => setShowFindReplace(false)}
          />
        </>
      ) : (
        <DropZone />
      )}
    </div>
  );
}
