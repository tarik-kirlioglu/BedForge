import { useState, useRef, useEffect } from "react";

interface SlopDialogProps {
  visible: boolean;
  onConfirm: (upstream: number, downstream: number) => void;
  onCancel: () => void;
  regionCount: number;
}

export function SlopDialog(props: SlopDialogProps): React.ReactElement | null {
  const { visible, onConfirm, onCancel, regionCount } = props;
  const [upstream, setUpstream] = useState("200");
  const [downstream, setDownstream] = useState("200");
  const [symmetric, setSymmetric] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const up = parseInt(upstream, 10) || 0;
    const down = symmetric ? up : parseInt(downstream, 10) || 0;
    onConfirm(up, down);
  }

  function handleUpstreamChange(val: string): void {
    setUpstream(val);
    if (symmetric) setDownstream(val);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-96 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <h2 className="mb-1 text-base font-semibold text-zinc-100">
          Extend Regions
        </h2>
        <p className="mb-5 text-sm text-zinc-400">
          Expand {regionCount} region{regionCount !== 1 ? "s" : ""} by N bases
        </p>

        {/* Symmetric toggle */}
        <label className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={symmetric}
            onChange={(e) => {
              setSymmetric(e.target.checked);
              if (e.target.checked) setDownstream(upstream);
            }}
            className="accent-genome-blue"
          />
          Symmetric (same upstream & downstream)
        </label>

        {/* Upstream */}
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            {symmetric ? "Bases (both directions)" : "Upstream (bp)"}
          </label>
          <input
            ref={inputRef}
            type="number"
            min="0"
            max="10000000"
            value={upstream}
            onChange={(e) => handleUpstreamChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-genome-blue"
            placeholder="200"
          />
        </div>

        {/* Downstream (only if not symmetric) */}
        {!symmetric && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Downstream (bp)
            </label>
            <input
              type="number"
              min="0"
              max="10000000"
              value={downstream}
              onChange={(e) => setDownstream(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-genome-blue"
              placeholder="200"
            />
          </div>
        )}

        {/* Quick presets */}
        <div className="mb-5 flex gap-2">
          {[100, 500, 1000, 2000, 5000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                const s = String(val);
                setUpstream(s);
                if (symmetric) setDownstream(s);
              }}
              className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              {val >= 1000 ? `${val / 1000}kb` : `${val}bp`}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-genome-blue px-4 py-2 text-sm font-medium text-white hover:bg-genome-blue/80"
          >
            Extend
          </button>
        </div>
      </form>
    </div>
  );
}
