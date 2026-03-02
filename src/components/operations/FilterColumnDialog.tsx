import { useState, useEffect } from "react";

import { getFilterValues } from "../../operations/filter-vcf";

interface FilterColumnDialogProps {
  visible: boolean;
  onConfirm: (keepValues: Set<string>) => void;
  onCancel: () => void;
}

export function FilterColumnDialog(props: FilterColumnDialogProps): React.ReactElement | null {
  const { visible, onConfirm, onCancel } = props;
  const [filterValues, setFilterValues] = useState<Array<{ value: string; count: number }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      const values = getFilterValues();
      setFilterValues(values);
      // Select all by default
      setSelected(new Set(values.map((v) => v.value)));
    }
  }, [visible]);

  if (!visible) return null;

  const totalRows = filterValues.reduce((sum, v) => sum + v.count, 0);
  const selectedRows = filterValues
    .filter((v) => selected.has(v.value))
    .reduce((sum, v) => sum + v.count, 0);

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
    setSelected(new Set(filterValues.map((v) => v.value)));
  }

  function selectPassOnly(): void {
    const passValues = new Set<string>();
    for (const v of filterValues) {
      if (v.value === "PASS" || v.value === ".") {
        passValues.add(v.value);
      }
    }
    setSelected(passValues);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onConfirm(selected);
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[420px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Filter by FILTER Column
            </h2>
            <p className="text-xs text-text-muted">
              Select which FILTER values to keep
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-elevated bg-raised px-3 py-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={selectPassOnly}
            className="rounded-lg border border-cyan-glow/20 bg-cyan-glow/5 px-3 py-1.5 font-mono text-[11px] text-cyan-glow transition-colors hover:bg-cyan-glow/10"
          >
            PASS Only
          </button>
        </div>

        {/* Filter value list */}
        <div className="scrollbar-thin mb-5 max-h-[280px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
          {filterValues.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface/60"
            >
              <input
                type="checkbox"
                checked={selected.has(item.value)}
                onChange={() => toggleValue(item.value)}
                className="genomic-checkbox"
              />
              <span className={`font-mono text-[13px] font-medium ${
                item.value === "PASS"
                  ? "text-cyan-glow"
                  : item.value === "."
                    ? "text-text-muted"
                    : "text-text-secondary"
              }`}>
                {item.value === "." ? "." : item.value}
              </span>
              <span className="ml-auto font-mono text-[11px] text-text-muted">
                {item.count.toLocaleString()}
              </span>
            </label>
          ))}
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-lg border border-elevated/60 bg-surface/30 px-3 py-2 text-center font-mono text-[11px]">
          <span className="text-text-secondary">
            Keeping{" "}
            <span className="font-semibold text-cyan-glow">
              {selectedRows.toLocaleString()}
            </span>
            {" "}of{" "}
            {totalRows.toLocaleString()} rows
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selected.size === 0}
            className="rounded-xl bg-electric px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-electric/90 hover:shadow-lg hover:shadow-electric/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}
