import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { useBatchStore } from "../../stores/useBatchStore";
import { SPECIES_LIST } from "../../types/genomic";
import type { SpeciesConfig } from "../../types/genomic";

export function BatchDropZone(): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files = useBatchStore((s) => s.files);
  const fileFormat = useBatchStore((s) => s.fileFormat);
  const species = useBatchStore((s) => s.species);
  const assembly = useBatchStore((s) => s.assembly);
  const addFiles = useBatchStore((s) => s.addFiles);
  const removeFile = useBatchStore((s) => s.removeFile);
  const setSpeciesAndAssembly = useBatchStore((s) => s.setSpeciesAndAssembly);
  const setStep = useBatchStore((s) => s.setStep);
  const exitBatchMode = useBatchStore((s) => s.exitBatchMode);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const filesArray = Array.from(fileList);
      if (filesArray.length === 0) return;

      const loadingId = toast.loading(`Loading ${filesArray.length} file${filesArray.length !== 1 ? "s" : ""}...`);
      addFiles(filesArray)
        .then(() => {
          toast.dismiss(loadingId);
          const count = useBatchStore.getState().files.length;
          toast.success(`${count} file${count !== 1 ? "s" : ""} loaded`);
        })
        .catch(() => {
          toast.dismiss(loadingId);
          toast.error("Failed to load files");
        });
    },
    [addFiles],
  );

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }

  function handleSpeciesSelect(sp: SpeciesConfig): void {
    if (sp.assemblies.length === 1) {
      setSpeciesAndAssembly(sp, sp.assemblies[0]!.name);
      setShowSpeciesPicker(false);
    } else {
      setSelectedSpecies(sp);
    }
  }

  function handleAssemblySelect(sp: SpeciesConfig, asm: string): void {
    setSpeciesAndAssembly(sp, asm);
    setShowSpeciesPicker(false);
    setSelectedSpecies(null);
  }

  function handleNext(): void {
    if (!species || !assembly) {
      setShowSpeciesPicker(true);
      return;
    }
    setStep("operation");
  }

  const formatBadgeColor = fileFormat === "vcf"
    ? "border-electric/20 bg-electric/5 text-electric"
    : fileFormat === "gff3"
      ? "border-nt-g/20 bg-nt-g/5 text-nt-g"
      : "border-cyan-glow/20 bg-cyan-glow/5 text-cyan-glow";

  // Species picker modal
  if (showSpeciesPicker) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-void">
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/50 to-void" />

        <div className="animate-fade-in-up glass relative z-10 w-[460px] rounded-2xl p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-glow/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-cyan-glow">
              <path d="M12 2v20M8 4c0 3 8 5 8 8s-8 5-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 4c0 3-8 5-8 8s8 5 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {selectedSpecies ? (
            <>
              <h2 className="mb-1 text-lg font-semibold text-text-primary">Reference Assembly</h2>
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
                    <div className={`text-base font-semibold transition-colors ${i === 0 ? "text-cyan-glow" : "text-text-primary group-hover:text-cyan-glow"}`}>
                      {asm.name}
                    </div>
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
              <h2 className="mb-1 text-lg font-semibold text-text-primary">Select Species</h2>
              <p className="mb-5 text-sm text-text-secondary">
                All files in the batch will use this species & assembly.
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
              <button
                onClick={() => setShowSpeciesPicker(false)}
                className="mt-4 text-xs text-text-muted transition-colors hover:text-text-secondary"
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 flex h-full flex-col items-center justify-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-cyan-glow">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <h1 className="text-xl font-bold text-text-primary">Batch Mode</h1>
        </div>
        <p className="text-sm text-text-secondary">
          Process multiple files with the same operation
        </p>
      </div>

      {/* Drop area */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex w-[520px] cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-12 py-10 transition-all duration-500 ${
          isDragOver
            ? "glow-border border-cyan-glow bg-cyan-glow/[0.04] scale-[1.01]"
            : "border-elevated/60 bg-surface/30 hover:border-text-muted/40 hover:bg-surface/50"
        }`}
      >
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-500 ${
          isDragOver ? "bg-cyan-glow/15 shadow-lg shadow-cyan-glow/20" : "bg-raised group-hover:bg-elevated"
        }`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            className={`transition-all duration-500 ${isDragOver ? "text-cyan-glow scale-110" : "text-text-muted group-hover:text-text-secondary"}`}
          >
            <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className={`text-base font-medium transition-colors ${isDragOver ? "text-cyan-glow" : "text-text-primary"}`}>
          {isDragOver ? "Release to add files" : "Drop multiple files"}
        </span>
        <span className="mt-1 text-sm text-text-muted">or click to browse</span>

        {fileFormat && (
          <span className={`mt-4 rounded-full border px-3 py-1 font-mono text-[11px] ${formatBadgeColor}`}>
            {fileFormat.toUpperCase()} files only
          </span>
        )}
      </button>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 w-[520px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {files.length} file{files.length !== 1 ? "s" : ""} loaded
            </span>
            {fileFormat && (
              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${formatBadgeColor}`}>
                {fileFormat.toUpperCase()}
              </span>
            )}
          </div>

          <div className="glass max-h-[240px] overflow-y-auto rounded-xl">
            {files.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-elevated/30 px-4 py-2.5 last:border-b-0"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-cyan-glow">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="truncate font-mono text-xs text-text-primary">{entry.fileName}</span>
                  <span className="shrink-0 font-mono text-[10px] text-text-muted">
                    {entry.rowCount?.toLocaleString()} rows
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(entry.id);
                  }}
                  className="ml-2 shrink-0 rounded p-1 text-text-ghost transition-colors hover:bg-raised hover:text-text-secondary"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Species/Assembly info */}
          {species && assembly && (
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full border border-electric/20 bg-electric/5 px-2 py-0.5 font-mono text-[10px] text-electric">
                {species.displayName}
              </span>
              <span className="rounded-full border border-nt-a/20 bg-nt-a/5 px-2 py-0.5 font-mono text-[10px] text-nt-a">
                {assembly}
              </span>
              <button
                onClick={() => setShowSpeciesPicker(true)}
                className="text-[10px] text-text-ghost transition-colors hover:text-text-secondary"
              >
                Change
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={exitBatchMode}
              className="rounded-lg border border-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={files.length === 0}
              className="rounded-lg bg-cyan-glow px-6 py-2 text-sm font-medium text-void transition-colors hover:bg-cyan-glow/90 disabled:opacity-40"
            >
              {!species || !assembly ? "Select Species" : "Choose Operation"}
            </button>
          </div>
        </div>
      )}

      {/* Back to single file mode */}
      {files.length === 0 && (
        <button
          onClick={exitBatchMode}
          className="mt-6 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          ← Back to single file mode
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".bed,.bed3,.bed4,.bed6,.bed12,.vcf,.gff3,.gff,.txt,.tsv,.gz"
        onChange={handleFileInput}
        multiple
        className="hidden"
      />
    </div>
  );
}
