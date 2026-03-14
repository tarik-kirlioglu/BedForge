import { useState, lazy, Suspense } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { useBatchStore } from "../../stores/useBatchStore";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { DropZone } from "../drop-zone/DropZone";

const BatchShell = lazy(() =>
  import("../batch/BatchShell").then((m) => ({ default: m.BatchShell }))
);
const Toolbar = lazy(() =>
  import("./Toolbar").then((m) => ({ default: m.Toolbar }))
);
const DataGrid = lazy(() =>
  import("../table/DataGrid").then((m) => ({ default: m.DataGrid }))
);
const GenomicContextMenu = lazy(() =>
  import("../context-menu/GenomicContextMenu").then((m) => ({ default: m.GenomicContextMenu }))
);
const SearchBar = lazy(() =>
  import("../search/SearchBar").then((m) => ({ default: m.SearchBar }))
);
const FindReplaceDialog = lazy(() =>
  import("../operations/FindReplaceDialog").then((m) => ({ default: m.FindReplaceDialog }))
);
const StatsPanel = lazy(() =>
  import("../stats/StatsPanel").then((m) => ({ default: m.StatsPanel }))
);

function EditorFallback(): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-elevated border-t-cyan-glow" />
        <span className="font-mono text-xs text-text-muted">Loading editor...</span>
      </div>
    </div>
  );
}

export function AppShell(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const hasFile = rows.length > 0;
  const isBatchActive = useBatchStore((s) => s.isActive);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useKeyboardShortcuts({ onOpenFindReplace: () => setShowFindReplace(true) });

  if (isBatchActive) {
    return (
      <Suspense fallback={<EditorFallback />}>
        <BatchShell />
      </Suspense>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-void">
      {/* Subtle background grid for editor mode */}
      {hasFile && (
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.04]" />
      )}

      {hasFile ? (
        <Suspense fallback={<EditorFallback />}>
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
        </Suspense>
      ) : (
        <DropZone />
      )}
    </div>
  );
}
