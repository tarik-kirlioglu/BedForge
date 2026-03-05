import { useState, useEffect } from "react";

import { scanFeatureTypes, runTypeFilter } from "../../operations/type-filter";

interface TypeFilterDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function TypeFilterDialog(props: TypeFilterDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const [typeValues, setTypeValues] = useState<Array<{ value: string; count: number }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      const counts = scanFeatureTypes();
      const values = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
      setTypeValues(values);
      setSelected(new Set(values.map((v) => v.value)));
    }
  }, [visible]);

  if (!visible) return null;

  const totalRows = typeValues.reduce((sum, v) => sum + v.count, 0);
  const selectedRows = typeValues
    .filter((v) => selected.has(v.value))
    .reduce((sum, v) => sum + v.count, 0);
  const removedRows = totalRows - selectedRows;

  function toggleValue(value: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function selectAll(): void {
    setSelected(new Set(typeValues.map((v) => v.value)));
  }

  function deselectAll(): void {
    setSelected(new Set());
  }

  function selectOnly(type: string): void {
    const matching = new Set<string>();
    for (const v of typeValues) {
      if (v.value === type) matching.add(v.value);
    }
    setSelected(matching);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runTypeFilter(selected);
    onClose();
  }

  function pct(count: number): string {
    if (totalRows === 0) return "0%";
    return `${((count / totalRows) * 100).toFixed(1)}%`;
  }

  const noneSelected = selected.size === 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[460px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nt-g/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Filter by Feature Type
            </h2>
            <p className="text-xs text-text-muted">
              {typeValues.length} unique type{typeValues.length !== 1 ? "s" : ""} across {totalRows.toLocaleString()} rows
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <QuickButton label="Select All" onClick={selectAll} />
          <QuickButton label="Deselect All" onClick={deselectAll} />
          <div className="mx-1 h-6 w-px bg-elevated" />
          <QuickButton label="Gene Only" accent onClick={() => selectOnly("gene")} />
          <QuickButton label="Exon Only" accent onClick={() => selectOnly("exon")} />
          <QuickButton label="CDS Only" accent onClick={() => selectOnly("CDS")} />
        </div>

        {/* Type value list */}
        <div className="scrollbar-thin mb-4 max-h-[280px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
          {typeValues.map((item) => {
            const isChecked = selected.has(item.value);

            return (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface/60 ${
                  isChecked ? "" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleValue(item.value)}
                  className="genomic-checkbox"
                />
                <span className="font-mono text-[13px] font-medium text-nt-g">
                  {item.value}
                </span>

                <div className="ml-auto flex items-center gap-2.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated/60">
                    <div
                      className="h-full rounded-full bg-nt-g/50"
                      style={{ width: pct(item.count) }}
                    />
                  </div>
                  <span className="min-w-[3.5rem] text-right font-mono text-[10px] text-text-muted">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="min-w-[2.5rem] text-right font-mono text-[10px] text-text-muted">
                    {pct(item.count)}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px]">
          <span className="text-text-secondary">
            Keeping{" "}
            <span className="font-semibold text-nt-g">
              {selectedRows.toLocaleString()}
            </span>
            {" "}of {totalRows.toLocaleString()}
          </span>
          {removedRows > 0 && (
            <span className="text-nt-t">
              -{removedRows.toLocaleString()} rows
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={noneSelected}
            className="rounded-xl bg-nt-g px-5 py-2 text-sm font-semibold text-void transition-all hover:bg-nt-g/90 hover:shadow-lg hover:shadow-nt-g/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}

function QuickButton(props: { label: string; accent?: boolean; onClick: () => void }): React.ReactElement {
  const { label, accent, onClick } = props;

  if (accent) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-nt-g/20 bg-nt-g/5 px-2.5 py-1 font-mono text-[10px] font-medium text-nt-g transition-colors hover:bg-nt-g/10"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
    >
      {label}
    </button>
  );
}
