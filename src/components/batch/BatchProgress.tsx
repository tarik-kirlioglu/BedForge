import { useBatchStore } from "../../stores/useBatchStore";
import type { BatchFileStatus } from "../../types/batch";

function StatusIcon({ status }: { status: BatchFileStatus }): React.ReactElement {
  switch (status) {
    case "processing":
      return (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-glow/30 border-t-cyan-glow" />
      );
    case "done":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-nt-a">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "error":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-nt-t">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "skipped":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-text-ghost">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <div className="h-3 w-3 rounded-full border border-elevated bg-raised" />
      );
  }
}

export function BatchProgress(): React.ReactElement {
  const files = useBatchStore((s) => s.files);
  const progress = useBatchStore((s) => s.progress);
  const isRunning = useBatchStore((s) => s.isRunning);
  const results = useBatchStore((s) => s.results);
  const step = useBatchStore((s) => s.step);
  const cancelProcessing = useBatchStore((s) => s.cancelProcessing);
  const exportZip = useBatchStore((s) => s.exportZip);
  const exitBatchMode = useBatchStore((s) => s.exitBatchMode);

  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const isDone = step === "done";

  const overallProgress = progress
    ? ((progress.currentFileIndex + (isRunning ? 0 : 1)) / progress.totalFiles) * 100
    : 0;

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center">
      <div className="w-[520px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-text-primary">
            {isDone ? "Processing Complete" : "Processing Files"}
          </h2>
          {progress && !isDone && (
            <p className="mt-1 text-sm text-text-secondary">
              File {progress.currentFileIndex + 1} of {progress.totalFiles}
              {progress.totalSteps > 1 && (
                <span className="ml-2 text-text-muted">
                  — Step {progress.currentStepIndex + 1}/{progress.totalSteps}: {progress.currentStepName}
                </span>
              )}
              {progress.totalSteps === 1 && progress.currentStepName && (
                <span className="ml-2 text-text-muted">
                  — {progress.currentStepName}
                </span>
              )}
              {progress.fileProgress.total > 0 && (
                <span className="ml-2 font-mono text-text-muted">
                  ({progress.fileProgress.completed}/{progress.fileProgress.total} rows)
                </span>
              )}
            </p>
          )}
          {isDone && (
            <p className="mt-1 text-sm text-text-secondary">
              {doneCount} completed{errorCount > 0 ? `, ${errorCount} failed` : ""}
            </p>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="mb-6">
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-cyan-glow transition-all duration-300"
              style={{ width: `${isDone ? 100 : overallProgress}%` }}
            />
          </div>
        </div>

        {/* File list */}
        <div className="glass max-h-[320px] overflow-y-auto rounded-xl">
          {files.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between border-b border-elevated/30 px-4 py-2.5 last:border-b-0 ${
                entry.status === "processing" ? "bg-cyan-glow/[0.03]" : ""
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <StatusIcon status={entry.status} />
                <span className="truncate font-mono text-xs text-text-primary">
                  {entry.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {entry.rowCount !== undefined && (
                  <span className="font-mono text-[10px] text-text-muted">
                    {entry.rowCount.toLocaleString()}
                  </span>
                )}
                {entry.resultRowCount !== undefined && entry.resultRowCount !== entry.rowCount && (
                  <>
                    <span className="text-[10px] text-text-ghost">→</span>
                    <span className="font-mono text-[10px] text-cyan-glow">
                      {entry.resultRowCount.toLocaleString()}
                    </span>
                  </>
                )}
                {entry.error && (
                  <span className="max-w-[120px] truncate text-[10px] text-nt-t" title={entry.error}>
                    {entry.error}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-between">
          {isRunning ? (
            <>
              <div />
              <button
                onClick={cancelProcessing}
                className="rounded-lg border border-nt-t/30 bg-nt-t/10 px-6 py-2 text-sm font-medium text-nt-t transition-colors hover:bg-nt-t/20"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={exitBatchMode}
                className="rounded-lg border border-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
              >
                Done
              </button>
              {results.length > 0 && (
                <button
                  onClick={() => { exportZip(); }}
                  className="flex items-center gap-2 rounded-lg bg-cyan-glow px-6 py-2 text-sm font-medium text-void transition-colors hover:bg-cyan-glow/90"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Download ZIP ({results.length} file{results.length !== 1 ? "s" : ""})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
