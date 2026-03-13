import { useState } from "react";

import { useBatchStore } from "../../stores/useBatchStore";
import { isBedFamily } from "../../utils/format-helpers";
import type { BatchOperationId, BatchPipelineStep } from "../../types/batch";
import type { FileFormat } from "../../types/genomic";

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

/** Given a format, return which operations are valid */
function getAvailableOpsForFormat(
  format: FileFormat | null,
  species: { assemblies: Array<{ name: string; label: string }> } | null,
): OperationDef[] {
  if (!format) return [];
  const formatKey = isBedFamily(format) ? "bed" : format;
  return OPERATIONS.filter((op) => {
    if (!op.formats.includes(formatKey as "bed" | "vcf" | "gff3")) return false;
    if (op.id === "liftover" && species && species.assemblies.length < 2) return false;
    return true;
  });
}

/** Determine what format an operation produces given its input format */
function getOutputFormat(operationId: BatchOperationId, inputFormat: FileFormat): FileFormat {
  if (operationId === "merge" || operationId === "complement") return "bed3";
  return inputFormat;
}

/** Get the effective format at a given pipeline position */
function getFormatAtStep(pipeline: BatchPipelineStep[], stepIndex: number, baseFormat: FileFormat): FileFormat {
  let format = baseFormat;
  for (let i = 0; i < stepIndex; i++) {
    format = getOutputFormat(pipeline[i]!.operationId, format);
  }
  return format;
}

/** Get a short summary of step params */
function getParamSummary(operationId: BatchOperationId, params: Record<string, unknown>): string {
  switch (operationId) {
    case "extend": {
      const up = (params.upstream as number) ?? 0;
      const down = (params.downstream as number) ?? 0;
      return `±${up === down ? up : `${up}/${down}`}bp`;
    }
    case "filter-qual":
      return `Q≥${(params.minQual as number) ?? 30}`;
    case "filter-filter":
      return (params.keepValuesStr as string) ?? "PASS";
    case "filter-variant-type":
    case "filter-type":
      return (params.keepTypesStr as string) ?? "";
    case "filter-chrom":
      return (params.keepChromsStr as string) ?? "";
    case "find-replace":
      return `"${(params.search as string) ?? ""}" → "${(params.replace as string) ?? ""}"`;
    case "liftover":
      return (params.targetAssembly as string) ?? "";
    default:
      return "";
  }
}

const OP_LABEL_MAP: Record<string, string> = Object.fromEntries(
  OPERATIONS.map((op) => [op.id, op.label]),
);

export function BatchPipelineBuilder(): React.ReactElement {
  const fileFormat = useBatchStore((s) => s.fileFormat);
  const species = useBatchStore((s) => s.species);
  const pipeline = useBatchStore((s) => s.pipeline);
  const addPipelineStep = useBatchStore((s) => s.addPipelineStep);
  const removePipelineStep = useBatchStore((s) => s.removePipelineStep);
  const reorderPipeline = useBatchStore((s) => s.reorderPipeline);
  const startProcessing = useBatchStore((s) => s.startProcessing);
  const setStep = useBatchStore((s) => s.setStep);
  const filesCount = useBatchStore((s) => s.files.length);

  const [addingOp, setAddingOp] = useState<BatchOperationId | null>(null);
  const [addingParams, setAddingParams] = useState<Record<string, unknown>>({});

  // Determine the current format at the end of the pipeline
  const currentFormat = fileFormat
    ? getFormatAtStep(pipeline, pipeline.length, fileFormat)
    : null;

  const availableOps = getAvailableOpsForFormat(currentFormat, species);
  const addingDef = availableOps.find((op) => op.id === addingOp);

  function handleAddStep(): void {
    if (!addingOp) return;
    addPipelineStep(addingOp, addingParams);
    setAddingOp(null);
    setAddingParams({});
  }

  function handleMoveUp(idx: number): void {
    if (idx <= 0) return;
    reorderPipeline(idx, idx - 1);
  }

  function handleMoveDown(idx: number): void {
    if (idx >= pipeline.length - 1) return;
    reorderPipeline(idx, idx + 1);
  }

  function handleStart(): void {
    if (pipeline.length === 0) return;
    startProcessing();
  }

  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-text-primary">Build Pipeline</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Chain operations for all {filesCount} file{filesCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="w-[660px]">
        {/* Pipeline step list */}
        {pipeline.length > 0 && (
          <div className="glass mb-4 rounded-xl">
            {pipeline.map((step, idx) => {
              const summary = getParamSummary(step.operationId, step.params);
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-3 border-b border-elevated/30 px-4 py-2.5 last:border-b-0"
                >
                  {/* Step number */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-glow/10 font-mono text-[11px] font-semibold text-cyan-glow">
                    {idx + 1}
                  </span>

                  {/* Label + params */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-text-primary">
                      {OP_LABEL_MAP[step.operationId] ?? step.operationId}
                    </span>
                    {summary && (
                      <span className="ml-2 font-mono text-[10px] text-text-muted">
                        {summary}
                      </span>
                    )}
                  </div>

                  {/* Reorder + remove buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="rounded p-1 text-text-ghost transition-colors hover:bg-raised hover:text-text-secondary disabled:opacity-20"
                      title="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === pipeline.length - 1}
                      className="rounded p-1 text-text-ghost transition-colors hover:bg-raised hover:text-text-secondary disabled:opacity-20"
                      title="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removePipelineStep(step.id)}
                      className="rounded p-1 text-text-ghost transition-colors hover:bg-nt-t/10 hover:text-nt-t"
                      title="Remove step"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pipeline connector */}
        {pipeline.length > 0 && (
          <div className="flex justify-center py-1">
            <svg width="14" height="20" viewBox="0 0 14 20" className="text-cyan-glow/40">
              <path d="M7 0v16M3 12l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Add step section */}
        <div className="rounded-xl border border-dashed border-elevated/60 p-4">
          <div className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
            {pipeline.length === 0 ? "Add First Step" : "Add Next Step"}
          </div>

          {/* Operation grid */}
          <div className="grid grid-cols-3 gap-2">
            {availableOps.map((op) => (
              <button
                key={op.id}
                onClick={() => {
                  setAddingOp(op.id);
                  setAddingParams({});
                }}
                className={`group rounded-xl border px-3 py-2.5 text-left transition-all ${
                  addingOp === op.id
                    ? "border-cyan-glow/40 bg-cyan-glow/[0.06]"
                    : "border-elevated/60 bg-surface/30 hover:border-elevated hover:bg-surface/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-medium transition-colors ${
                    addingOp === op.id ? "text-cyan-glow" : "text-text-primary group-hover:text-cyan-glow"
                  }`}>
                    {op.label}
                  </span>
                  {op.isApi && (
                    <span className="rounded-full border border-electric/20 bg-electric/5 px-1.5 py-0.5 text-[8px] font-medium uppercase text-electric">
                      API
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-text-muted">{op.description}</div>
              </button>
            ))}
          </div>

          {/* Parameter configuration for selected operation */}
          {addingDef?.hasParams && (
            <div className="glass mt-3 rounded-xl p-4">
              <OperationParams
                operationId={addingOp!}
                params={addingParams}
                onChange={setAddingParams}
                species={species}
              />
            </div>
          )}

          {/* Add to Pipeline button */}
          {addingOp && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAddStep}
                className="rounded-lg border border-cyan-glow/30 bg-cyan-glow/10 px-4 py-1.5 text-[13px] font-medium text-cyan-glow transition-colors hover:bg-cyan-glow/20"
              >
                + Add to Pipeline
              </button>
            </div>
          )}
        </div>

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
            disabled={pipeline.length === 0}
            className="rounded-lg bg-cyan-glow px-6 py-2 text-sm font-medium text-void transition-colors hover:bg-cyan-glow/90 disabled:opacity-40"
          >
            Run Pipeline ({pipeline.length} step{pipeline.length !== 1 ? "s" : ""}) on {filesCount} file{filesCount !== 1 ? "s" : ""}
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
