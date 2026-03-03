import { useState, useMemo } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { computeColumnStats, type ColumnStats } from "../../utils/column-stats";
import { ChromDistribution } from "./ChromDistribution";
import { SizeDistribution } from "./SizeDistribution";

export function StatsPanel(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const columns = useFileStore((s) => s.columns);
  const fileFormat = useFileStore((s) => s.fileFormat);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isBed = fileFormat !== "vcf";

  const stats = useMemo<ColumnStats | null>(() => {
    if (!selectedCol) return null;
    return computeColumnStats(rows, selectedCol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCol, rows, refreshKey]);

  return (
    <div className="glass-strong scrollbar-thin flex h-full w-[320px] flex-col overflow-y-auto border-l border-elevated/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Statistics</h3>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-raised hover:text-text-primary"
          title="Refresh stats"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="border-t border-elevated/30" />

      {/* Chromosome Distribution */}
      <ChromDistribution />

      {/* Size Distribution (BED only) */}
      {isBed && <SizeDistribution />}

      <div className="border-t border-elevated/30" />

      {/* Column selector */}
      <div className="px-4 py-3">
        <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Column Stats
        </label>
        <select
          value={selectedCol ?? ""}
          onChange={(e) => setSelectedCol(e.target.value || null)}
          className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-cyan-glow/40"
        >
          <option value="">Select a column...</option>
          {columns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      {/* Stats display */}
      {stats && (
        <div className="px-4 pb-4">
          {stats.type === "numeric" ? (
            <NumericStatsView stats={stats} />
          ) : (
            <CategoricalStatsView stats={stats} />
          )}
        </div>
      )}
    </div>
  );
}

function NumericStatsView(props: { stats: Extract<ColumnStats, { type: "numeric" }> }): React.ReactElement {
  const { stats } = props;
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-elevated/60 bg-surface/30 p-3">
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Min" value={stats.min.toLocaleString()} />
          <StatBox label="Max" value={stats.max.toLocaleString()} />
          <StatBox label="Mean" value={stats.mean.toLocaleString()} />
          <StatBox label="Median" value={stats.median.toLocaleString()} />
          <StatBox label="Count" value={stats.count.toLocaleString()} />
          <StatBox label="Missing" value={stats.missing.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}

function CategoricalStatsView(props: { stats: Extract<ColumnStats, { type: "categorical" }> }): React.ReactElement {
  const { stats } = props;
  const maxCount = stats.topValues.length > 0 ? stats.topValues[0]!.count : 1;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-elevated/60 bg-surface/30 p-3">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatBox label="Unique" value={stats.uniqueCount.toLocaleString()} />
          <StatBox label="Count" value={stats.count.toLocaleString()} />
          <StatBox label="Missing" value={stats.missing.toLocaleString()} />
        </div>

        <div className="space-y-1.5">
          {stats.topValues.map((item) => (
            <div key={item.value} className="flex items-center gap-2">
              <span className="min-w-[60px] truncate font-mono text-[10px] text-text-secondary" title={item.value}>
                {item.value}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-glow/60 to-electric/40"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[9px] text-text-muted">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox(props: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-md bg-deep/50 px-2 py-1.5">
      <div className="font-mono text-[8px] uppercase tracking-widest text-text-muted">
        {props.label}
      </div>
      <div className="font-mono text-[12px] font-medium text-text-primary">
        {props.value}
      </div>
    </div>
  );
}
