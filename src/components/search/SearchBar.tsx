import { useEffect, useRef, useCallback } from "react";

import { useSearchStore } from "../../stores/useSearchStore";
import { useFileStore } from "../../stores/useFileStore";

export function SearchBar(): React.ReactElement | null {
  const isOpen = useSearchStore((s) => s.isOpen);
  const query = useSearchStore((s) => s.query);
  const matchIndices = useSearchStore((s) => s.matchIndices);
  const currentMatchIndex = useSearchStore((s) => s.currentMatchIndex);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setMatches = useSearchStore((s) => s.setMatches);
  const nextMatch = useSearchStore((s) => s.nextMatch);
  const prevMatch = useSearchStore((s) => s.prevMatch);
  const close = useSearchStore((s) => s.close);

  const rows = useFileStore((s) => s.rows);
  const columns = useFileStore((s) => s.columns);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setMatches([]);
        return;
      }
      const lower = searchQuery.toLowerCase();
      const indices: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        for (const col of columns) {
          const val = String(row[col] ?? "").toLowerCase();
          if (val.includes(lower)) {
            indices.push(i);
            break;
          }
        }
      }
      setMatches(indices);
    },
    [rows, columns, setMatches],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, performSearch]);

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        prevMatch();
      } else {
        nextMatch();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="glass animate-fade-in fixed right-4 top-14 z-40 flex items-center gap-2 rounded-xl px-3 py-2 shadow-2xl shadow-black/40">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-text-muted"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="w-48 bg-transparent font-mono text-[12px] text-text-primary placeholder-text-muted outline-none"
      />

      {query.trim() && (
        <span className="font-mono text-[10px] text-text-muted">
          {matchIndices.length > 0
            ? `${currentMatchIndex + 1}/${matchIndices.length}`
            : "0 results"}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <button
          onClick={prevMatch}
          disabled={matchIndices.length === 0}
          className="rounded p-1 text-text-secondary transition-colors hover:bg-raised hover:text-text-primary disabled:opacity-30"
          title="Previous (Shift+Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={nextMatch}
          disabled={matchIndices.length === 0}
          className="rounded p-1 text-text-secondary transition-colors hover:bg-raised hover:text-text-primary disabled:opacity-30"
          title="Next (Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <button
        onClick={close}
        className="ml-1 rounded p-1 text-text-muted transition-colors hover:bg-raised hover:text-text-primary"
        title="Close (Esc)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
