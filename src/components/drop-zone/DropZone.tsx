import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

import { useFileStore } from "../../stores/useFileStore";
import { detectFormat } from "../../parsers/detect-format";
import { parseBed } from "../../parsers/bed-parser";
import { parseVcf } from "../../parsers/vcf-parser";
import { detectChrPrefix } from "../../utils/chromosome";

const ACCEPTED_EXTENSIONS = [
  ".bed", ".bed3", ".bed4", ".bed6", ".bed12",
  ".vcf", ".txt", ".tsv",
];

export function DropZone(): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAssemblyPicker, setShowAssemblyPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFile = useFileStore((s) => s.loadFile);
  const setAssembly = useFileStore((s) => s.setAssembly);
  const pendingLoadRef = useRef<Parameters<typeof loadFile>[0] | null>(null);

  const processFile = useCallback(
    (file: File) => {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
      if (!ACCEPTED_EXTENSIONS.includes(ext) && ext !== ".") {
        toast.error("Unsupported file format", {
          description: `Expected BED or VCF file, got ${ext}`,
        });
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.warning("Large file detected", {
          description: "Files over 50MB may cause performance issues.",
        });
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          toast.error("Failed to read file");
          return;
        }

        const format = detectFormat(file.name, content);
        if (!format) {
          toast.error("Could not detect file format", {
            description: "File does not appear to be a valid BED or VCF file.",
          });
          return;
        }

        if (format === "vcf") {
          const result = parseVcf(content);
          const firstChrom = String(result.rows[0]?.CHROM ?? "chr1");
          pendingLoadRef.current = {
            fileName: file.name,
            fileFormat: "vcf",
            rows: result.rows,
            columns: result.columns,
            vcfMeta: result.vcfFile.meta,
            vcfSampleNames: result.vcfFile.sampleNames,
            useChrPrefix: detectChrPrefix(firstChrom),
          };
        } else {
          const result = parseBed(content);
          const firstChrom = String(result.rows[0]?.chrom ?? "chr1");
          pendingLoadRef.current = {
            fileName: file.name,
            fileFormat: result.format,
            rows: result.rows,
            columns: result.columns,
            useChrPrefix: detectChrPrefix(firstChrom),
          };
        }

        setShowAssemblyPicker(true);
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsText(file);
    },
    [loadFile, setAssembly],
  );

  function handleAssemblySelect(assembly: "GRCh37" | "GRCh38"): void {
    if (pendingLoadRef.current) {
      loadFile(pendingLoadRef.current);
      setAssembly(assembly);
      toast.success(
        `Loaded ${pendingLoadRef.current.fileName}: ${pendingLoadRef.current.rows.length.toLocaleString()} rows`,
      );
      pendingLoadRef.current = null;
    }
    setShowAssemblyPicker(false);
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

  function handleDragLeave(): void {
    setIsDragOver(false);
  }

  function handleClick(): void {
    fileInputRef.current?.click();
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  if (showAssemblyPicker) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="w-96 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mb-2 text-3xl">🧬</div>
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">
            Select Genome Assembly
          </h2>
          <p className="mb-6 text-sm text-zinc-400">
            Which reference genome does this file use?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleAssemblySelect("GRCh37")}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-genome-blue hover:bg-zinc-700"
            >
              <div className="text-base font-semibold">GRCh37</div>
              <div className="mt-0.5 text-xs text-zinc-400">hg19</div>
            </button>
            <button
              onClick={() => handleAssemblySelect("GRCh38")}
              className="flex-1 rounded-lg border border-genome-blue bg-genome-blue/10 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-genome-blue/20"
            >
              <div className="text-base font-semibold">GRCh38</div>
              <div className="mt-0.5 text-xs text-zinc-400">hg38</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen items-center justify-center bg-zinc-950 p-8"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <button
        onClick={handleClick}
        className={`flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-16 transition-all ${
          isDragOver
            ? "border-genome-blue bg-genome-blue/5 shadow-lg shadow-genome-blue/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
        }`}
      >
        {/* DNA helix icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
          <svg className="h-8 w-8 text-genome-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 15c6.667-6 13.333 0 20-6" strokeLinecap="round" />
            <path d="M2 9c6.667 6 13.333 0 20 6" strokeLinecap="round" />
            <path d="M7 9v6M12 6v12M17 9v6" strokeLinecap="round" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-200">
            Drop a BED or VCF file here
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            or click to browse
          </p>
        </div>

        <div className="flex gap-2">
          {["BED3-12", "VCF 4.x"].map((fmt) => (
            <span
              key={fmt}
              className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-mono text-zinc-400"
            >
              {fmt}
            </span>
          ))}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bed,.bed3,.bed4,.bed6,.bed12,.vcf,.txt,.tsv"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
