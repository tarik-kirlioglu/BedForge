import { useState, useEffect } from "react";

import {
  scanInfoFields,
  runExtractInfoFields,
  type InfoFieldSummary,
} from "../../operations/info-parser";

interface InfoParserDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function InfoParserDialog(props: InfoParserDialogProps): React.ReactElement | null {
  const { visible, onClose } = props;
  const [fields, setFields] = useState<InfoFieldSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      const scanned = scanInfoFields();
      setFields(scanned);
      // Pre-select top 5 non-flag fields
      const initial = new Set(
        scanned
          .filter((f) => !f.isFlag)
          .slice(0, 5)
          .map((f) => f.key),
      );
      setSelected(initial);
    }
  }, [visible]);

  if (!visible) return null;

  function toggleField(key: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    runExtractInfoFields(Array.from(selected));
    onClose();
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        onSubmit={handleSubmit}
        className="glass animate-slide-in w-[520px] rounded-2xl p-7 shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nt-g/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Parse INFO Fields</h2>
            <p className="text-xs text-text-muted">
              {fields.length} unique field{fields.length !== 1 ? "s" : ""} found in INFO column
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelected(new Set(fields.map((f) => f.key)))}
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
            onClick={() =>
              setSelected(new Set(fields.filter((f) => !f.isFlag).map((f) => f.key)))
            }
            className="rounded-lg border border-nt-g/20 bg-nt-g/5 px-2.5 py-1 font-mono text-[10px] font-medium text-nt-g transition-colors hover:bg-nt-g/10"
          >
            Values Only
          </button>
        </div>

        {/* Field list */}
        <div className="scrollbar-thin mb-4 max-h-[300px] overflow-y-auto rounded-xl border border-elevated bg-deep/50 p-1">
          {fields.map((item) => {
            const isChecked = selected.has(item.key);
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface/60 ${
                  isChecked ? "" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleField(item.key)}
                  className="genomic-checkbox"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-semibold text-nt-g">
                      {item.key}
                    </span>
                    {item.isFlag && (
                      <span className="rounded bg-text-muted/15 px-1.5 py-0.5 font-mono text-[8px] uppercase text-text-muted">
                        flag
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-text-muted">
                    {item.isFlag ? "Boolean flag" : item.example}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-text-muted">
                  {item.count.toLocaleString()}
                </span>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-lg border border-elevated/60 bg-surface/30 px-4 py-2.5 font-mono text-[11px] text-text-secondary">
          Will add{" "}
          <span className="font-semibold text-nt-g">{selected.size}</span> new
          column{selected.size !== 1 ? "s" : ""}
          {selected.size > 0 && (
            <span className="text-text-muted">
              {" "}({Array.from(selected).slice(0, 3).map((k) => `INFO_${k}`).join(", ")}
              {selected.size > 3 ? `, +${selected.size - 3} more` : ""})
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
            disabled={selected.size === 0}
            className="rounded-xl bg-nt-g px-5 py-2 text-sm font-semibold text-void transition-all hover:shadow-lg hover:shadow-nt-g/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Extract Fields
          </button>
        </div>
      </form>
    </div>
  );
}
