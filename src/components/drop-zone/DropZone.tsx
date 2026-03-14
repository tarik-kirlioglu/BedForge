import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { useFileStore } from "../../stores/useFileStore";
import { parseFileFromDisk, parseContent } from "../../parsers/parse-file";
import { isGzipped, formatBytes, SOFT_SIZE_LIMIT } from "../../utils/decompress";
import { SPECIES_LIST } from "../../types/genomic";
import type { SpeciesConfig } from "../../types/genomic";
import type { ParsedFile } from "../../types/batch";

export function DropZone(): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAssemblyPicker, setShowAssemblyPicker] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFile = useFileStore((s) => s.loadFile);
  const setSpeciesAndAssembly = useFileStore((s) => s.setSpeciesAndAssembly);
  const pendingLoadRef = useRef<ParsedFile | null>(null);

  const processFile = useCallback(
    (file: File) => {
      const toastId = isGzipped(file.name)
        ? toast.loading("Decompressing .gz file...")
        : undefined;

      parseFileFromDisk(file)
        .then((parsed) => {
          if (toastId !== undefined) toast.dismiss(toastId);

          if (file.size > SOFT_SIZE_LIMIT) {
            toast.warning("Large file detected", {
              description: `File is ${formatBytes(file.size)}. Performance may be affected.`,
            });
          }

          pendingLoadRef.current = parsed;
          setShowAssemblyPicker(true);
        })
        .catch((err) => {
          if (toastId !== undefined) toast.dismiss(toastId);
          toast.error("Failed to load file", {
            description: String(err instanceof Error ? err.message : err),
          });
        });
    },
    [],
  );

  function handleSpeciesSelect(sp: SpeciesConfig): void {
    if (sp.assemblies.length === 1) {
      // Single assembly — skip assembly step
      handleAssemblySelect(sp, sp.assemblies[0]!.name);
    } else {
      setSelectedSpecies(sp);
    }
  }

  function handleAssemblySelect(sp: SpeciesConfig, assembly: string): void {
    if (pendingLoadRef.current) {
      loadFile(pendingLoadRef.current);
      setSpeciesAndAssembly(sp, assembly);
      toast.success(
        `Loaded ${pendingLoadRef.current.fileName}: ${pendingLoadRef.current.rows.length.toLocaleString()} rows`,
      );
      pendingLoadRef.current = null;
    }
    setShowAssemblyPicker(false);
    setSelectedSpecies(null);
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleClick(): void {
    fileInputRef.current?.click();
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function loadExample(path: string): void {
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((content) => {
        const fileName = path.split("/").pop() ?? "example";
        const parsed = parseContent(content, fileName);

        const humanSpecies = SPECIES_LIST.find((s) => s.id === "human")!;
        loadFile(parsed);
        setSpeciesAndAssembly(humanSpecies, "GRCh38");
        toast.success(
          `Loaded ${parsed.fileName}: ${parsed.rows.length.toLocaleString()} rows`,
        );
      })
      .catch((err) => {
        toast.error("Failed to load example", { description: String(err) });
      });
  }

  // ── Assembly Picker Screen ──
  if (showAssemblyPicker) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-void">
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/50 to-void" />

        <div className="animate-fade-in-up glass relative z-10 w-[460px] rounded-2xl p-8 text-center shadow-2xl">
          {/* DNA icon */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-cyan-glow">
              <path d="M12 2v20M8 4c0 3 8 5 8 8s-8 5-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 4c0 3-8 5-8 8s8 5 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="8" r="1.5" fill="#10b981" />
              <circle cx="16" cy="8" r="1.5" fill="#f43f5e" />
              <circle cx="8" cy="16" r="1.5" fill="#3b82f6" />
              <circle cx="16" cy="16" r="1.5" fill="#f59e0b" />
            </svg>
          </div>

          {selectedSpecies ? (
            <>
              <h2 className="mb-1 text-lg font-semibold text-text-primary">
                Reference Assembly
              </h2>
              <p className="mb-5 text-sm text-text-secondary">
                <span className="font-medium text-cyan-glow">{selectedSpecies.displayName}</span> — which genome build?
              </p>

              <div className="flex gap-3">
                {selectedSpecies.assemblies.map((asm, i) => (
                  <button
                    key={asm.name}
                    onClick={() => handleAssemblySelect(selectedSpecies, asm.name)}
                    className={`group flex-1 rounded-xl border px-4 py-4 text-center transition-all ${
                      i === 0
                        ? "border-cyan-glow/20 bg-cyan-glow/5 hover:border-cyan-glow/40 hover:bg-cyan-glow/10"
                        : "border-elevated bg-raised/50 hover:border-cyan-glow/30 hover:bg-raised"
                    }`}
                  >
                    <div className={`text-base font-semibold transition-colors ${i === 0 ? "text-cyan-glow" : "text-text-primary group-hover:text-cyan-glow"}`}>{asm.name}</div>
                    <div className="mt-1 font-mono text-xs text-text-muted">{asm.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedSpecies(null)}
                className="mt-4 text-xs text-text-muted transition-colors hover:text-text-secondary"
              >
                ← Back to species
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold text-text-primary">
                Select Species
              </h2>
              <p className="mb-5 text-sm text-text-secondary">
                Which organism does this file belong to?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {SPECIES_LIST.map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => handleSpeciesSelect(sp)}
                    className="group rounded-xl border border-elevated bg-raised/50 px-4 py-3 text-left transition-all hover:border-cyan-glow/30 hover:bg-raised"
                  >
                    <div className="text-sm font-semibold text-text-primary transition-colors group-hover:text-cyan-glow">
                      {sp.displayName}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-text-muted">
                      {sp.assemblies.map((a) => a.name).join(" / ")}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main Landing Screen ──
  return (
    <div
      className="relative flex h-screen flex-col items-center overflow-hidden bg-void"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Background layers */}
      <div className="bg-grid absolute inset-0 opacity-20" />

      {/* Radial glow behind the chamber */}
      <div className="absolute left-1/2 top-[35%] h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-glow/[0.03] blur-[100px]" />
      <div className="absolute left-1/2 top-[35%] h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/[0.04] blur-[80px]" />

      {/* Noise overlay */}
      <div className="noise absolute inset-0" />

      {/* Gradient fade at edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-void to-transparent" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-void to-transparent" />

      {/* ── Hero Section ── */}
      <div className="stagger relative z-10 mt-[12vh] flex flex-col items-center">
        {/* Brand */}
        <div className="animate-fade-in-up mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-glow/20 to-electric/20 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="#06d6a0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="18" r="2.5" fill="#4361ee" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Bed<span className="text-cyan-glow">Forge</span>
          </h1>
        </div>

        <p className="animate-fade-in-up mb-10 max-w-md text-center text-[15px] leading-relaxed text-text-secondary">
          Visual genomic editor for <span className="font-mono text-cyan-glow/80 text-sm">BED</span>, <span className="font-mono text-electric text-sm">VCF</span> and <span className="font-mono text-nt-g text-sm">GFF3</span> files.
          LiftOver, annotate, merge — without writing a single line of code.
        </p>

        {/* ── Drop Chamber ── */}
        <button
          onClick={handleClick}
          className={`animate-fade-in-up group relative flex w-[520px] cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-12 py-14 transition-all duration-500 ${
            isDragOver
              ? "glow-border border-cyan-glow bg-cyan-glow/[0.04] scale-[1.01]"
              : "border-elevated/60 bg-surface/30 hover:border-text-muted/40 hover:bg-surface/50"
          }`}
        >
          {/* Animated ring */}
          <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-500 ${
            isDragOver
              ? "bg-cyan-glow/15 shadow-lg shadow-cyan-glow/20"
              : "bg-raised group-hover:bg-elevated"
          }`}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-all duration-500 ${
                isDragOver ? "text-cyan-glow scale-110" : "text-text-muted group-hover:text-text-secondary"
              }`}
            >
              <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <span className={`text-base font-medium transition-colors ${
            isDragOver ? "text-cyan-glow" : "text-text-primary"
          }`}>
            {isDragOver ? "Release to load" : "Drop your genomic file"}
          </span>
          <span className="mt-1.5 text-sm text-text-muted">
            or click to browse
          </span>

          {/* Format badges */}
          <div className="mt-6 flex items-center gap-2">
            {[
              { label: "BED3–12", color: "cyan" },
              { label: "VCF 4.x", color: "electric" },
              { label: "GFF3", color: "amber" },
              { label: ".gz", color: "muted" },
            ].map((fmt) => (
              <span
                key={fmt.label}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide ${
                  fmt.color === "cyan"
                    ? "border-cyan-glow/15 bg-cyan-glow/5 text-cyan-glow/70"
                    : fmt.color === "electric"
                      ? "border-electric/15 bg-electric/5 text-electric/70"
                      : fmt.color === "amber"
                        ? "border-nt-g/15 bg-nt-g/5 text-nt-g/70"
                        : "border-elevated bg-raised/50 text-text-muted"
                }`}
              >
                {fmt.label}
              </span>
            ))}
          </div>
        </button>

        {/* ── Try Example ── */}
        <div className="animate-fade-in-up mt-6 flex flex-col items-center gap-2.5">
          <span className="text-[12px] text-text-muted">or try an example <span className="text-text-ghost">· Human (GRCh38)</span></span>
          <div className="flex gap-2">
            <button
              onClick={() => loadExample("/samples/example.bed")}
              className="rounded-lg border border-cyan-glow/15 bg-cyan-glow/5 px-3.5 py-1.5 font-mono text-[11px] font-medium text-cyan-glow/80 transition-colors hover:bg-cyan-glow/10 hover:text-cyan-glow"
            >
              BED Example
            </button>
            <button
              onClick={() => loadExample("/samples/example.vcf")}
              className="rounded-lg border border-electric/15 bg-electric/5 px-3.5 py-1.5 font-mono text-[11px] font-medium text-electric/80 transition-colors hover:bg-electric/10 hover:text-electric"
            >
              VCF Example
            </button>
            <button
              onClick={() => loadExample("/samples/example.gff3")}
              className="rounded-lg border border-nt-g/15 bg-nt-g/5 px-3.5 py-1.5 font-mono text-[11px] font-medium text-nt-g/80 transition-colors hover:bg-nt-g/10 hover:text-nt-g"
            >
              GFF3 Example
            </button>
          </div>
        </div>

        {/* ── Feature Cards ── */}
        <div className="animate-fade-in-up mt-10 grid w-[640px] grid-cols-3 gap-3">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
                  <path d="M12 2v20M8 4c0 3 8 5 8 8s-8 5-8 8" strokeLinecap="round" />
                  <path d="M16 4c0 3-8 5-8 8s8 5 8 8" strokeLinecap="round" />
                </svg>
              ),
              title: "LiftOver",
              desc: "Cross-assembly coordinate conversion",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
                  <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
                  <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" />
                  <path d="M17.5 14v7m-3.5-3.5h7" strokeLinecap="round" />
                </svg>
              ),
              title: "Merge & Sort",
              desc: "Deduplicate, merge, extend regions",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                  <path d="M4 6h16M4 10h16M4 14h10M4 18h6" strokeLinecap="round" />
                  <circle cx="18" cy="16" r="4" />
                  <path d="M18 14v4l2-1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
              title: "Annotate",
              desc: "Gene names, GC content, filtering",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-elevated/60 bg-surface/30 px-4 py-4 transition-colors hover:border-elevated hover:bg-surface/60"
            >
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-raised">
                {card.icon}
              </div>
              <div className="text-[13px] font-medium text-text-primary">{card.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-text-muted">{card.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Batch Mode ── */}
        <button
          onClick={() => {
            import("../../stores/useBatchStore").then((m) => {
              m.useBatchStore.getState().enterBatchMode();
            });
          }}
          className="animate-fade-in-up mt-6 flex items-center gap-2.5 rounded-xl border border-elevated/60 bg-surface/30 px-5 py-3 transition-all hover:border-cyan-glow/30 hover:bg-surface/60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-glow">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="text-left">
            <div className="text-[13px] font-medium text-text-primary">Batch Mode</div>
            <div className="text-[11px] text-text-muted">Process multiple files at once</div>
          </div>
        </button>
      </div>

      {/* ── Footer ── */}
      <div className="absolute bottom-6 z-10 flex items-center gap-2.5 text-[11px] text-text-ghost">
        <span>Built for bioinformaticians. No backend — your data stays in the browser.</span>
        <span className="text-elevated">·</span>
        <a
          href="https://github.com/tarik-kirlioglu/BedForge"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 transition-colors hover:text-text-secondary"
          title="View on GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bed,.bed3,.bed4,.bed6,.bed12,.vcf,.gff3,.gff,.txt,.tsv,.gz"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
