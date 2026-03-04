import { useState, useEffect, useMemo } from "react";

import { useFileStore } from "../../stores/useFileStore";
import {
  getInfoColumns,
  profileInfoColumn,
  runInfoColumnNumericFilter,
  runInfoColumnCategoricalFilter,
} from "../../operations/info-column-filter";
import type {
  InfoColumnProfile,
  NumericOperator,
} from "../../operations/info-column-filter";

interface InfoColumnFilterDialogProps {
  visible: boolean;
  onClose: () => void;
}

const OPERATORS: Array<{ op: NumericOperator; label: string }> = [
  { op: ">=", label: "\u2265" },
  { op: "<=", label: "\u2264" },
  { op: "==", label: "=" },
  { op: "!=", label: "\u2260" },
];

export function InfoColumnFilterDialog(
  props: InfoColumnFilterDialogProps,
): React.ReactElement | null {
  const { visible, onClose } = props;
  const rows = useFileStore((s) => s.rows);

  const [infoColumns, setInfoColumns] = useState<string[]>([]);
  const [activeColumn, setActiveColumn] = useState("");
  const [profile, setProfile] = useState<InfoColumnProfile | null>(null);

  // Numeric mode
  const [operator, setOperator] = useState<NumericOperator>(">=");
  const [threshold, setThreshold] = useState("");
  const [keepMissing, setKeepMissing] = useState(true);

  // Categorical mode
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      const cols = getInfoColumns();
      setInfoColumns(cols);
      if (cols.length > 0) {
        const first = cols[0]!;
        setActiveColumn(first);
        applyProfile(first);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function applyProfile(columnName: string): void {
    const p = profileInfoColumn(columnName);
    setProfile(p);
    if (p.type === "numeric") {
      setOperator(">=");
      setThreshold("");
      setKeepMissing(true);
    } else {
      setSelected(new Set(p.uniqueValues.map((v) => v.value)));
      setKeepMissing(true);
    }
  }

  function handleColumnChange(col: string): void {
    setActiveColumn(col);
    applyProfile(col);
  }

  // ── Preview calculations ──

  const numericPreview = useMemo(() => {
    if (!profile || profile.type !== "numeric") {
      return { kept: 0, removed: 0, total: 0 };
    }
    const th = parseFloat(threshold);
    if (threshold === "" || isNaN(th)) {
      const kept = rows.length;
      return { kept, removed: 0, total: rows.length };
    }
    let kept = 0;
    for (const row of rows) {
      const raw = String(row[activeColumn] ?? ".");
      if (raw === "." || raw === "") {
        if (keepMissing) kept++;
        continue;
      }
      const num = Number(raw);
      if (isNaN(num)) {
        if (keepMissing) kept++;
        continue;
      }
      let passes = false;
      switch (operator) {
        case ">=":
          passes = num >= th;
          break;
        case "<=":
          passes = num <= th;
          break;
        case "==":
          passes = num === th;
          break;
        case "!=":
          passes = num !== th;
          break;
      }
      if (passes) kept++;
    }
    return { kept, removed: rows.length - kept, total: rows.length };
  }, [profile, threshold, operator, keepMissing, activeColumn, rows]);

  const categoricalPreview = useMemo(() => {
    if (!profile || profile.type !== "categorical") {
      return { kept: 0, removed: 0, total: 0 };
    }
    let kept = 0;
    if (keepMissing) kept += profile.missingCount;
    for (const item of profile.uniqueValues) {
      if (selected.has(item.value)) kept += item.count;
    }
    return { kept, removed: profile.totalRows - kept, total: profile.totalRows };
  }, [profile, selected, keepMissing]);

  const preview =
    profile?.type === "numeric" ? numericPreview : categoricalPreview;

  // ── Handlers ──

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

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!profile) return;

    if (profile.type === "numeric") {
      const th = parseFloat(threshold);
      if (isNaN(th)) return;
      runInfoColumnNumericFilter(activeColumn, {
        operator,
        threshold: th,
        keepMissing,
      });
    } else {
      runInfoColumnCategoricalFilter(activeColumn, {
        keepValues: selected,
        keepMissing,
      });
    }
    onClose();
  }

  if (!visible) return null;

  const totalRows = profile?.totalRows ?? 0;

  function pct(count: number): string {
    if (totalRows === 0) return "0%";
    return `${((count / totalRows) * 100).toFixed(1)}%`;
  }

  const isSubmitDisabled =
    profile?.type === "numeric"
      ? threshold === "" || isNaN(parseFloat(threshold))
      : selected.size === 0 && !keepMissing;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[500px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nt-c/10">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
            >
              <path
                d="M3 6h18M7 12h10M10 18h4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Filter by INFO Column
            </h2>
            <p className="text-xs text-text-muted">
              {infoColumns.length} INFO column{infoColumns.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Column picker */}
        <div className="mb-4">
          <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Column
          </label>
          <select
            value={activeColumn}
            onChange={(e) => handleColumnChange(e.target.value)}
            className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-[12px] text-text-primary outline-none transition-all focus:border-nt-c/40"
          >
            {infoColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Type badge */}
        {profile && (
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                profile.type === "numeric"
                  ? "bg-nt-c/10 text-nt-c"
                  : "bg-nt-g/10 text-nt-g"
              }`}
            >
              {profile.type}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {profile.uniqueValues.length} unique value{profile.uniqueValues.length !== 1 ? "s" : ""}
              {profile.missingCount > 0 &&
                ` · ${profile.missingCount.toLocaleString()} missing`}
            </span>
          </div>
        )}

        {/* ── Numeric mode ── */}
        {profile?.type === "numeric" && profile.numericStats && (
          <>
            {/* Stats bar */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: "Min", value: profile.numericStats.min },
                { label: "Median", value: profile.numericStats.median },
                { label: "Max", value: profile.numericStats.max },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-elevated/60 bg-surface/30 px-3 py-2 text-center"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                    {s.label}
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-medium text-text-primary">
                    {s.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Operator selector */}
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Operator
              </label>
              <div className="flex gap-1.5">
                {OPERATORS.map((o) => (
                  <button
                    key={o.op}
                    type="button"
                    onClick={() => setOperator(o.op)}
                    className={`flex-1 rounded-lg border py-1.5 font-mono text-[13px] font-semibold transition-all ${
                      operator === o.op
                        ? "border-nt-c/30 bg-nt-c/10 text-nt-c"
                        : "border-elevated bg-raised text-text-muted hover:bg-elevated hover:text-text-secondary"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Threshold
              </label>
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-xl border border-elevated bg-deep px-4 py-2.5 font-mono text-sm text-text-primary outline-none transition-all focus:border-nt-c/30 focus:ring-1 focus:ring-nt-c/20"
                placeholder={
                  profile.numericStats
                    ? String(profile.numericStats.median)
                    : "0"
                }
                autoFocus
              />
            </div>
          </>
        )}

        {/* ── Categorical mode ── */}
        {profile?.type === "categorical" && (
          <>
            {/* Quick actions */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setSelected(new Set(profile.uniqueValues.map((v) => v.value)))
                }
                className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => {
                  const inverted = new Set<string>();
                  for (const item of profile.uniqueValues) {
                    if (!selected.has(item.value)) {
                      inverted.add(item.value);
                    }
                  }
                  setSelected(inverted);
                }}
                className="rounded-lg border border-elevated bg-raised px-2.5 py-1 font-mono text-[10px] font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
              >
                Invert
              </button>
            </div>

            {/* Value list */}
            <div className="scrollbar-thin mb-4 max-h-[300px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
              {profile.uniqueValues.map((item) => {
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
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text-primary">
                      {item.value}
                    </span>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated/60">
                        <div
                          className="h-full rounded-full bg-nt-c/50"
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
          </>
        )}

        {/* Keep missing toggle */}
        {profile && profile.missingCount > 0 && (
          <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5">
            <input
              type="checkbox"
              checked={keepMissing}
              onChange={() => setKeepMissing(!keepMissing)}
              className="genomic-checkbox"
            />
            <span className="text-[12px] text-text-secondary">
              Keep missing values (.)
            </span>
            <span className="ml-auto font-mono text-[10px] text-text-muted">
              {profile.missingCount.toLocaleString()} rows
            </span>
          </label>
        )}

        {/* Summary */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px]">
          <span className="text-text-secondary">
            Keeping{" "}
            <span className="font-semibold text-cyan-glow">
              {preview.kept.toLocaleString()}
            </span>{" "}
            of {preview.total.toLocaleString()}
          </span>
          {preview.removed > 0 && (
            <span className="text-nt-t">
              -{preview.removed.toLocaleString()} rows
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
            disabled={isSubmitDisabled}
            className="rounded-xl bg-nt-c px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-nt-c/90 hover:shadow-lg hover:shadow-nt-c/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply Filter
          </button>
        </div>
      </form>
    </div>
  );
}
