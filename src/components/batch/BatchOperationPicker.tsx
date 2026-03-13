import { useState } from "react";

import { useBatchStore } from "../../stores/useBatchStore";
import { isBedFamily } from "../../utils/format-helpers";
import type { BatchOperationId } from "../../types/batch";

interface OperationDef {
  id: BatchOperationId;
  label: string;
  description: string;
  formats: Array<"bed" | "vcf" | "gff3">;
  isApi: boolean;
  hasParams: boolean;
}

const OPERATIONS: OperationDef[] = [
  // Client-side — no params
  { id: "sort", label: "Sort", description: "Natural chromosome order", formats: ["bed", "vcf", "gff3"], isApi: false, hasParams: false },
  { id: "dedup", label: "Remove Duplicates", description: "By chrom:start:end", formats: ["bed", "vcf", "gff3"], isApi: false, hasParams: false },
  { id: "merge", label: "Merge Regions", description: "Overlapping intervals", formats: ["bed"], isApi: false, hasParams: false },
  { id: "validate", label: "Validate & Fix", description: "Auto-fix coordinates", formats: ["bed"], isApi: false, hasParams: false },

  // Client-side — with params
  { id: "extend", label: "Extend/Slop", description: "Add flanking bases", formats: ["bed"], isApi: false, hasParams: true },
  { id: "filter-chrom", label: "Filter Chromosomes", description: "Keep selected chroms", formats: ["bed", "vcf", "gff3"], isApi: false, hasParams: true },
  { id: "filter-qual", label: "Filter by QUAL", description: "Min quality threshold", formats: ["vcf"], isApi: false, hasParams: true },
  { id: "filter-filter", label: "Filter by FILTER", description: "PASS or specific values", formats: ["vcf"], isApi: false, hasParams: true },
  { id: "filter-variant-type", label: "Filter Variant Type", description: "SNP, INDEL, MNP...", formats: ["vcf"], isApi: false, hasParams: true },
  { id: "filter-type", label: "Filter by Type", description: "Gene, exon, CDS...", formats: ["gff3"], isApi: false, hasParams: true },
  { id: "parse-info", label: "Parse INFO", description: "Extract all fields", formats: ["vcf"], isApi: false, hasParams: false },
  { id: "parse-attributes", label: "Parse Attributes", description: "Extract all fields", formats: ["gff3"], isApi: false, hasParams: false },
  { id: "find-replace", label: "Find & Replace", description: "Text replacement", formats: ["bed", "vcf", "gff3"], isApi: false, hasParams: true },

  // API-based
  { id: "annotate", label: "Annotate Genes", description: "Ensembl gene names", formats: ["bed"], isApi: true, hasParams: false },
  { id: "gc-content", label: "GC Content", description: "Calculate GC%", formats: ["bed"], isApi: true, hasParams: false },
  { id: "liftover", label: "LiftOver", description: "Convert assembly", formats: ["bed", "vcf", "gff3"], isApi: true, hasParams: true },
  { id: "clean-intergenic", label: "Clean Intergenic", description: "Remove non-genic", formats: ["bed", "vcf", "gff3"], isApi: true, hasParams: false },
];

export function BatchOperationPicker(): React.ReactElement {
  const fileFormat = useBatchStore((s) => s.fileFormat);
  const species = useBatchStore((s) => s.species);
  const setOperation = useBatchStore((s) => s.setOperation);
  const startProcessing = useBatchStore((s) => s.startProcessing);
  const setStep = useBatchStore((s) => s.setStep);
  const filesCount = useBatchStore((s) => s.files.length);

  const [selectedOp, setSelectedOp] = useState<BatchOperationId | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});

  const formatKey = fileFormat
    ? isBedFamily(fileFormat) ? "bed" : fileFormat
    : null;

  const availableOps = OPERATIONS.filter((op) => {
    if (!formatKey) return false;
    if (!op.formats.includes(formatKey as "bed" | "vcf" | "gff3")) return false;
    // LiftOver only if species has 2+ assemblies
    if (op.id === "liftover" && species && species.assemblies.length < 2) return false;
    return true;
  });

  const selectedDef = availableOps.find((op) => op.id === selectedOp);

  function handleStart(): void {
    if (!selectedOp) return;
    setOperation({ operationId: selectedOp, params });
    startProcessing();
  }

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-text-primary">Choose Operation</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Will be applied to all {filesCount} file{filesCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="w-[640px]">
        {/* Operation grid */}
        <div className="grid grid-cols-3 gap-2">
          {availableOps.map((op) => (
            <button
              key={op.id}
              onClick={() => {
                setSelectedOp(op.id);
                setParams({});
              }}
              className={`group rounded-xl border px-4 py-3 text-left transition-all ${
                selectedOp === op.id
                  ? "border-cyan-glow/40 bg-cyan-glow/[0.06]"
                  : "border-elevated/60 bg-surface/30 hover:border-elevated hover:bg-surface/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-medium transition-colors ${
                  selectedOp === op.id ? "text-cyan-glow" : "text-text-primary group-hover:text-cyan-glow"
                }`}>
                  {op.label}
                </span>
                {op.isApi && (
                  <span className="rounded-full border border-electric/20 bg-electric/5 px-1.5 py-0.5 text-[8px] font-medium uppercase text-electric">
                    API
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-text-muted">{op.description}</div>
            </button>
          ))}
        </div>

        {/* Parameter configuration for selected operation */}
        {selectedDef?.hasParams && (
          <div className="glass mt-4 rounded-xl p-4">
            <OperationParams
              operationId={selectedOp!}
              params={params}
              onChange={setParams}
              species={species}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep("files")}
            className="rounded-lg border border-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-raised hover:text-text-primary"
          >
            ← Back
          </button>
          <button
            onClick={handleStart}
            disabled={!selectedOp}
            className="rounded-lg bg-cyan-glow px-6 py-2 text-sm font-medium text-void transition-colors hover:bg-cyan-glow/90 disabled:opacity-40"
          >
            Apply to All ({filesCount})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Parameter inputs for operations that need configuration ──

interface OperationParamsProps {
  operationId: BatchOperationId;
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
  species: { assemblies: Array<{ name: string; label: string }> } | null;
}

function OperationParams({
  operationId,
  params,
  onChange,
  species,
}: OperationParamsProps): React.ReactElement | null {
  switch (operationId) {
    case "extend":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Flanking bases
          </label>
          <div className="flex gap-3">
            <div>
              <span className="mb-1 block text-[11px] text-text-muted">Upstream</span>
              <input
                type="number"
                min={0}
                value={(params.upstream as number) ?? 0}
                onChange={(e) => onChange({ ...params, upstream: parseInt(e.target.value, 10) || 0 })}
                className="w-28 rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-text-muted">Downstream</span>
              <input
                type="number"
                min={0}
                value={(params.downstream as number) ?? 0}
                onChange={(e) => onChange({ ...params, downstream: parseInt(e.target.value, 10) || 0 })}
                className="w-28 rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {[100, 500, 1000, 5000].map((bp) => (
              <button
                key={bp}
                onClick={() => onChange({ upstream: bp, downstream: bp })}
                className="rounded-md border border-elevated bg-raised/50 px-2 py-1 font-mono text-[10px] text-text-muted transition-colors hover:border-cyan-glow/30 hover:text-cyan-glow"
              >
                ±{bp >= 1000 ? `${bp / 1000}kb` : `${bp}bp`}
              </button>
            ))}
          </div>
        </div>
      );

    case "filter-qual":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Min QUAL threshold
          </label>
          <input
            type="number"
            min={0}
            value={(params.minQual as number) ?? 30}
            onChange={(e) => onChange({ ...params, minQual: parseInt(e.target.value, 10) || 0 })}
            className="w-28 rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
          />
          <div className="mt-2 flex gap-2">
            {[10, 20, 30, 40, 60].map((q) => (
              <button
                key={q}
                onClick={() => onChange({ minQual: q })}
                className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                  (params.minQual as number) === q
                    ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                    : "border-elevated bg-raised/50 text-text-muted hover:border-cyan-glow/30 hover:text-cyan-glow"
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>
      );

    case "filter-filter":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Keep FILTER values (comma-separated)
          </label>
          <input
            type="text"
            placeholder="PASS"
            value={(params.keepValuesStr as string) ?? "PASS"}
            onChange={(e) => onChange({
              ...params,
              keepValuesStr: e.target.value,
              keepValues: new Set(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)),
            })}
            className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
          />
        </div>
      );

    case "filter-variant-type":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Keep variant types
          </label>
          <div className="flex gap-2">
            {["SNP", "INDEL", "MNP", "MIXED", "OTHER"].map((vt) => {
              const selected = (params.keepTypes as Set<string>)?.has(vt) ?? (vt === "SNP" || vt === "INDEL");
              return (
                <button
                  key={vt}
                  onClick={() => {
                    const current = new Set((params.keepTypes as Set<string>) ?? new Set(["SNP", "INDEL"]));
                    if (current.has(vt)) current.delete(vt);
                    else current.add(vt);
                    onChange({ ...params, keepTypes: current });
                  }}
                  className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    selected
                      ? "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                      : "border-elevated bg-raised/50 text-text-muted hover:border-cyan-glow/30"
                  }`}
                >
                  {vt}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "filter-type":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Keep feature types (comma-separated)
          </label>
          <input
            type="text"
            placeholder="gene,exon,CDS"
            value={(params.keepTypesStr as string) ?? "gene"}
            onChange={(e) => onChange({
              ...params,
              keepTypesStr: e.target.value,
              keepTypes: new Set(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)),
            })}
            className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
          />
        </div>
      );

    case "filter-chrom":
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Keep chromosomes (comma-separated)
          </label>
          <input
            type="text"
            placeholder="chr1,chr2,chr3"
            value={(params.keepChromsStr as string) ?? ""}
            onChange={(e) => onChange({
              ...params,
              keepChromsStr: e.target.value,
              keepChroms: new Set(e.target.value.split(",").map((s) => s.trim()).filter(Boolean)),
            })}
            className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                const chroms = Array.from({ length: 22 }, (_, i) => `chr${i + 1}`);
                onChange({ keepChromsStr: chroms.join(","), keepChroms: new Set(chroms) });
              }}
              className="rounded-md border border-elevated bg-raised/50 px-2 py-1 text-[10px] text-text-muted transition-colors hover:border-cyan-glow/30 hover:text-cyan-glow"
            >
              Autosomes
            </button>
          </div>
        </div>
      );

    case "find-replace":
      return (
        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-1 block text-[11px] text-text-muted">Find</span>
            <input
              type="text"
              value={(params.search as string) ?? ""}
              onChange={(e) => onChange({ ...params, search: e.target.value })}
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] text-text-muted">Replace</span>
            <input
              type="text"
              value={(params.replace as string) ?? ""}
              onChange={(e) => onChange({ ...params, replace: e.target.value })}
              className="w-full rounded-lg border border-elevated bg-deep px-3 py-2 font-mono text-sm text-text-primary focus:border-cyan-glow/40 focus:outline-none focus:ring-1 focus:ring-cyan-glow/20"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(params.caseSensitive as boolean) ?? false}
              onChange={(e) => onChange({ ...params, caseSensitive: e.target.checked })}
              className="genomic-checkbox"
            />
            <span className="text-xs text-text-secondary">Case sensitive</span>
          </label>
        </div>
      );

    case "liftover": {
      if (!species || species.assemblies.length < 2) return null;
      return (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Target assembly
          </label>
          <div className="flex gap-2">
            {species.assemblies.map((asm) => (
              <button
                key={asm.name}
                onClick={() => onChange({ ...params, targetAssembly: asm.name })}
                className={`rounded-lg border px-4 py-2 text-center transition-all ${
                  (params.targetAssembly as string) === asm.name
                    ? "border-cyan-glow/30 bg-cyan-glow/10"
                    : "border-elevated bg-raised/50 hover:border-cyan-glow/30"
                }`}
              >
                <div className={`text-sm font-semibold ${(params.targetAssembly as string) === asm.name ? "text-cyan-glow" : "text-text-primary"}`}>
                  {asm.name}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-text-muted">{asm.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
