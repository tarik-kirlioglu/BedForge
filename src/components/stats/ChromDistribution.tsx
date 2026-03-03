import { useMemo } from "react";

import { useFileStore } from "../../stores/useFileStore";
import { chromRank } from "../../utils/chromosome";

export function ChromDistribution(): React.ReactElement {
  const rows = useFileStore((s) => s.rows);
  const fileFormat = useFileStore((s) => s.fileFormat);
  const isBed = fileFormat !== "vcf";

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const chrom = String(isBed ? row.chrom : row.CHROM) ?? "";
      if (!chrom || chrom === ".") continue;
      counts.set(chrom, (counts.get(chrom) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([chrom, count]) => ({ chrom, count }))
      .sort((a, b) => chromRank(a.chrom) - chromRank(b.chrom));
  }, [rows, isBed]);

  if (distribution.length === 0) return <></>;

  const maxCount = Math.max(...distribution.map((d) => d.count));

  return (
    <div className="px-4 py-3">
      <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Chromosome Distribution
      </div>
      <div className="space-y-1">
        {distribution.map((item) => (
          <div key={item.chrom} className="flex items-center gap-2">
            <span className="w-10 text-right font-mono text-[10px] font-medium text-electric">
              {item.chrom}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-r-full bg-elevated/30">
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-cyan-glow/60 to-electric/40"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="min-w-[2.5rem] text-right font-mono text-[9px] text-text-muted">
              {item.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
