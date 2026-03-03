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
      setSelected(new Set(values.map((v) => v.value)));
    }
  }, [visible]);

  if (!visible) return null;

  const totalRows = filterValues.reduce((sum, v) => sum + v.count, 0);
  const selectedRows = filterValues
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
    setSelected(new Set(filterValues.map((v) => v.value)));
  }

  function deselectAll(): void {
    setSelected(new Set());
  }

  function invertSelection(): void {
    const inverted = new Set<string>();
    for (const v of filterValues) {
      if (!selected.has(v.value)) {
        inverted.add(v.value);
      }
    }
    setSelected(inverted);
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

  function selectFailedOnly(): void {
    const failedValues = new Set<string>();
    for (const v of filterValues) {
      if (v.value !== "PASS" && v.value !== ".") {
        failedValues.add(v.value);
      }
    }
    setSelected(failedValues);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onConfirm(selected);
  }

  function pct(count: number): string {
    if (totalRows === 0) return "0%";
    return `${((count / totalRows) * 100).toFixed(1)}%`;
  }

  const allSelected = selected.size === filterValues.length;
  const noneSelected = selected.size === 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[460px] rounded-2xl p-7 shadow-2xl shadow-black/50"
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
              {filterValues.length} unique value{filterValues.length !== 1 ? "s" : ""} across {totalRows.toLocaleString()} rows
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <QuickButton
            label="Select All"
            active={allSelected}
            onClick={selectAll}
          />
          <QuickButton
            label="Deselect All"
            active={noneSelected}
            onClick={deselectAll}
          />
          <QuickButton
            label="Invert"
            onClick={invertSelection}
          />
          <div className="mx-1 h-6 w-px bg-elevated" />
          <QuickButton
            label="PASS Only"
            accent="cyan"
            onClick={selectPassOnly}
          />
          <QuickButton
            label="Failed Only"
            accent="amber"
            onClick={selectFailedOnly}
          />
        </div>

        {/* Filter value list */}
        <div className="scrollbar-thin mb-4 max-h-[280px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
          {filterValues.map((item) => {
            const isPass = item.value === "PASS";
            const isMissing = item.value === ".";
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
                <span className={`font-mono text-[13px] font-medium ${
                  isPass
                    ? "text-cyan-glow"
                    : isMissing
                      ? "text-text-muted"
                      : "text-nt-t"
                }`}>
                  {item.value}
                </span>

                {/* Count + percentage */}
                <div className="ml-auto flex items-center gap-2.5">
                  {/* Mini bar */}
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated/60">
                    <div
                      className={`h-full rounded-full ${
                        isPass ? "bg-cyan-glow/60" : isMissing ? "bg-text-muted/40" : "bg-nt-t/50"
                      }`}
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
            <span className="font-semibold text-cyan-glow">
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
            onClick={onCancel}
            className="rounded-xl px-5 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={noneSelected}
            className="rounded-xl bg-electric px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-electric/90 hover:shadow-lg hover:shadow-electric/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Quick action button ──

interface QuickButtonProps {
  label: string;
  active?: boolean;
  accent?: "cyan" | "amber";
  onClick: () => void;
}

function QuickButton(props: QuickButtonProps): React.ReactElement {
  const { label, active, accent, onClick } = props;

  if (accent === "cyan") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-cyan-glow/20 bg-cyan-glow/5 px-2.5 py-1 font-mono text-[10px] font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/10"
      >
        {label}
      </button>
    );
  }

  if (accent === "amber") {
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
      className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-medium transition-colors ${
        active
          ? "border-electric/30 bg-electric/10 text-electric"
          : "border-elevated bg-raised text-text-secondary hover:bg-elevated hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}
