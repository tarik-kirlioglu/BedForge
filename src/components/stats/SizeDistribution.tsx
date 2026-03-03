import { useMemo } from "react";

import { useFileStore } from "../../stores/useFileStore";

export function SizeDistribution(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);

  const { bins, stats } = useMemo(() => {
    const sizes: number[] = [];
    for (const row of rows) {
      const start = Number(row.chromStart);
      const end = Number(row.chromEnd);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        sizes.push(end - start);
      }
    }

    if (sizes.length === 0) {
      return { bins: [], stats: null };
    }

    sizes.sort((a, b) => a - b);
    const min = sizes[0]!;
    const max = sizes[sizes.length - 1]!;
    const mid = Math.floor(sizes.length / 2);
    const p50 = sizes.length % 2 === 0
      ? (sizes[mid - 1]! + sizes[mid]!) / 2
      : sizes[mid]!;
    const p25idx = Math.floor(sizes.length * 0.25);
    const p75idx = Math.floor(sizes.length * 0.75);
    const p25 = sizes[p25idx]!;
    const p75 = sizes[p75idx]!;

    // Log-scale bins for genomic regions (100bp–1Mbp)
    const numBins = 16;
    const logMin = Math.log10(Math.max(1, min));
    const logMax = Math.log10(Math.max(1, max));
    const binWidth = (logMax - logMin) / numBins || 1;

    const binCounts = new Array<number>(numBins).fill(0);
    const binLabels: string[] = [];

    for (let i = 0; i < numBins; i++) {
      const lo = Math.pow(10, logMin + i * binWidth);
      binLabels.push(formatSize(lo));
    }

    for (const s of sizes) {
      const logVal = Math.log10(Math.max(1, s));
      let idx = Math.floor((logVal - logMin) / binWidth);
      if (idx >= numBins) idx = numBins - 1;
      if (idx < 0) idx = 0;
      binCounts[idx]!++;
    }

    return {
      bins: binCounts.map((count, i) => ({
        count,
        label: binLabels[i]!,
      })),
      stats: { min, max, p25, p50, p75 },
    };
  }, [rows]);

  if (!stats || bins.length === 0) return <></>;

  const maxBinCount = Math.max(...bins.map((b) => b.count));

  return (
    <div className="px-4 py-3">
      <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Region Size Distribution
      </div>

      {/* Histogram */}
      <div className="mb-3 flex h-[100px] items-end gap-px">
        {bins.map((bin, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-cyan-glow/50 to-electric/30 transition-all hover:from-cyan-glow/70 hover:to-electric/50"
            style={{ height: `${maxBinCount > 0 ? (bin.count / maxBinCount) * 100 : 0}%` }}
            title={`${bin.label}: ${bin.count} regions`}
          />
        ))}
      </div>

      {/* Stats boxes */}
      <div className="grid grid-cols-5 gap-1">
        <MiniStat label="Min" value={formatSize(stats.min)} />
        <MiniStat label="P25" value={formatSize(stats.p25)} />
        <MiniStat label="P50" value={formatSize(stats.p50)} />
        <MiniStat label="P75" value={formatSize(stats.p75)} />
        <MiniStat label="Max" value={formatSize(stats.max)} />
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-md bg-deep/50 px-1.5 py-1 text-center">
      <div className="font-mono text-[7px] uppercase tracking-widest text-text-muted">
        {props.label}
      </div>
      <div className="font-mono text-[10px] font-medium text-text-primary">
        {props.value}
      </div>
    </div>
  );
}

function formatSize(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)}M`;
  if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)}k`;
  return `${Math.round(bp)}`;
}
