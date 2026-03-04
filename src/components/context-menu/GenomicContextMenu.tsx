import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

import { useFileStore } from "../../stores/useFileStore";
import { useSelectionStore } from "../../stores/useSelectionStore";
import { useOperationStore } from "../../stores/useOperationStore";
import { runLiftOver } from "../../operations/liftover-operation";
import { runCleanIntergenic } from "../../operations/clean-intergenic";
import { runGCContent } from "../../operations/gc-content";
import { runAnnotateGenes } from "../../operations/annotate-genes";
import { runSort } from "../../operations/sort-rows";
import { runRemoveDuplicates } from "../../operations/remove-duplicates";
import { runMergeRegions } from "../../operations/merge-regions";
import { runExtendRegions } from "../../operations/extend-regions";
import { runFilterByFilter, runFilterByQual } from "../../operations/filter-vcf";
import { SlopDialog } from "../operations/SlopDialog";
import { FilterColumnDialog } from "../operations/FilterColumnDialog";
import { QualFilterDialog } from "../operations/QualFilterDialog";
import { VariantTypeDialog } from "../operations/VariantTypeDialog";
import { GenotypeFilterDialog } from "../operations/GenotypeFilterDialog";
import { InfoParserDialog } from "../operations/InfoParserDialog";
import { ValidationDialog } from "../operations/ValidationDialog";
import { IntersectDialog } from "../operations/IntersectDialog";
import { ComplementDialog } from "../operations/ComplementDialog";
import { InfoColumnFilterDialog } from "../operations/InfoColumnFilterDialog";
import { openInUCSC } from "../../operations/ucsc-link";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  open: (x: number, y: number) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  visible: false,
  x: 0,
  y: 0,
  open: (x, y) => set({ visible: true, x, y }),
  close: () => set({ visible: false }),
}));

export function GenomicContextMenu(): React.ReactElement | null {
  const { visible, x, y, close } = useContextMenuStore();
  const assembly = useFileStore((s) => s.assembly);
  const fileFormat = useFileStore((s) => s.fileFormat);
  const rows = useFileStore((s) => s.rows);
  const useChrPrefix = useFileStore((s) => s.useChrPrefix);
  const deleteRows = useFileStore((s) => s.deleteRows);
  const addRow = useFileStore((s) => s.addRow);
  const selectedRowIndices = useSelectionStore((s) => s.selectedRowIndices);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const isRunning = useOperationStore((s) => s.isRunning);
  const menuRef = useRef<HTMLDivElement>(null);
  const vcfSampleNames = useFileStore((s) => s.vcfSampleNames);
  const columns = useFileStore((s) => s.columns);
  const [showSlopDialog, setShowSlopDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showQualDialog, setShowQualDialog] = useState(false);
  const [showVariantTypeDialog, setShowVariantTypeDialog] = useState(false);
  const [showGenotypeDialog, setShowGenotypeDialog] = useState(false);
  const [showInfoParserDialog, setShowInfoParserDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showIntersectDialog, setShowIntersectDialog] = useState(false);
  const [showComplementDialog, setShowComplementDialog] = useState(false);
  const [showInfoColumnFilterDialog, setShowInfoColumnFilterDialog] = useState(false);

  useEffect(() => {
    if (!visible) return;
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleScroll(): void {
      close();
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, close]);

  const selectedRows = rows.filter((r) => selectedRowIndices.has(r._index));
  const isBed = fileFormat !== "vcf";
  const isVcf = fileFormat === "vcf";
  const hasInfoColumns = isVcf && columns.some((c) => c.startsWith("INFO_"));
  const targetAssembly = assembly === "GRCh37" ? "GRCh38" : "GRCh37";

  // ── Handlers ──

  function handleLiftOver(): void {
    close();
    if (!assembly) return;
    runLiftOver(selectedRows, assembly, targetAssembly, useChrPrefix, isBed);
  }

  function handleCleanIntergenic(): void {
    close();
    if (!assembly) return;
    runCleanIntergenic(isBed ? rows : selectedRows, assembly, useChrPrefix, isBed);
  }

  function handleGCContent(): void {
    close();
    if (!assembly) return;
    runGCContent(selectedRows, assembly, useChrPrefix, isBed);
  }

  function handleAnnotateGenes(): void {
    close();
    if (!assembly) return;
    const targets = selectedRows.length > 0 ? selectedRows : rows;
    runAnnotateGenes(targets, assembly, isBed);
  }

  function handleSort(): void {
    close();
    runSort(isBed);
  }

  function handleRemoveDuplicates(): void {
    close();
    runRemoveDuplicates(isBed);
  }

  function handleMergeRegions(): void {
    close();
    runMergeRegions();
  }

  function handleExtendRegions(): void {
    close();
    setShowSlopDialog(true);
  }

  function handleSlopConfirm(upstream: number, downstream: number): void {
    setShowSlopDialog(false);
    const targets = selectedRows.length > 0 ? selectedRows : rows;
    runExtendRegions(targets, upstream, downstream, isBed);
  }

  function handleFilterByFilter(): void {
    close();
    setShowFilterDialog(true);
  }

  function handleFilterConfirm(keepValues: Set<string>): void {
    setShowFilterDialog(false);
    runFilterByFilter(keepValues);
  }

  function handleFilterByQual(): void {
    close();
    setShowQualDialog(true);
  }

  function handleQualConfirm(minQual: number): void {
    setShowQualDialog(false);
    runFilterByQual(minQual);
  }

  function handleVariantTypeFilter(): void {
    close();
    setShowVariantTypeDialog(true);
  }

  function handleGenotypeFilter(): void {
    close();
    setShowGenotypeDialog(true);
  }

  function handleParseInfo(): void {
    close();
    setShowInfoParserDialog(true);
  }

  function handleInfoColumnFilter(): void {
    close();
    setShowInfoColumnFilterDialog(true);
  }

  function handleValidate(): void {
    close();
    setShowValidationDialog(true);
  }

  function handleIntersect(): void {
    close();
    setShowIntersectDialog(true);
  }

  function handleComplement(): void {
    close();
    setShowComplementDialog(true);
  }

  function handleUCSCLink(): void {
    close();
    openInUCSC(selectedRows, assembly, isBed);
  }

  function handleAddRow(): void {
    close();
    const lastSelected = selectedRows.length > 0
      ? selectedRows[selectedRows.length - 1]!._index
      : undefined;
    addRow(lastSelected);
  }

  function handleDeleteRows(): void {
    close();
    deleteRows(selectedRowIndices);
    clearSelection();
  }

  function handleCopyRows(): void {
    close();
    const text = selectedRows
      .map((r) => {
        const cols = useFileStore.getState().columns;
        return cols.map((c) => String(r[c] ?? "")).join("\t");
      })
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  const menuWidth = 280;
  const menuHeight = isVcf ? (hasInfoColumns ? 600 : 560) : 700;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <>
      <SlopDialog
        visible={showSlopDialog}
        onConfirm={handleSlopConfirm}
        onCancel={() => setShowSlopDialog(false)}
        regionCount={selectedRows.length > 0 ? selectedRows.length : rows.length}
      />
      <FilterColumnDialog
        visible={showFilterDialog}
        onConfirm={handleFilterConfirm}
        onCancel={() => setShowFilterDialog(false)}
      />
      <QualFilterDialog
        visible={showQualDialog}
        onConfirm={handleQualConfirm}
        onCancel={() => setShowQualDialog(false)}
      />
      <VariantTypeDialog
        visible={showVariantTypeDialog}
        onClose={() => setShowVariantTypeDialog(false)}
      />
      <GenotypeFilterDialog
        visible={showGenotypeDialog}
        onClose={() => setShowGenotypeDialog(false)}
      />
      <InfoParserDialog
        visible={showInfoParserDialog}
        onClose={() => setShowInfoParserDialog(false)}
      />
      <ValidationDialog
        visible={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
      />
      <IntersectDialog
        visible={showIntersectDialog}
        onClose={() => setShowIntersectDialog(false)}
      />
      <ComplementDialog
        visible={showComplementDialog}
        onClose={() => setShowComplementDialog(false)}
      />
      <InfoColumnFilterDialog
        visible={showInfoColumnFilterDialog}
        onClose={() => setShowInfoColumnFilterDialog(false)}
      />

      {visible && (
        <div
          ref={menuRef}
          className="glass animate-slide-in fixed z-50 min-w-[270px] rounded-xl py-1.5 shadow-2xl shadow-black/60"
          style={{ left: adjustedX, top: adjustedY }}
        >
          {/* ── Ensembl API Section ── */}
          <SectionLabel text="Ensembl API" />

          <MenuItem
            label={`LiftOver → ${targetAssembly}`}
            sublabel={`${selectedRows.length} region${selectedRows.length !== 1 ? "s" : ""}`}
            icon={<IconLiftOver />}
            onClick={handleLiftOver}
            disabled={isRunning || selectedRows.length === 0}
          />

          {isBed && (
            <MenuItem
              label="Annotate Gene Names"
              sublabel={selectedRows.length > 0 ? `${selectedRows.length} selected` : "All → name column"}
              icon={<IconDNA />}
              onClick={handleAnnotateGenes}
              disabled={isRunning}
            />
          )}

          {isBed && (
            <MenuItem
              label="Calculate GC Content"
              sublabel={`${selectedRows.length} region${selectedRows.length !== 1 ? "s" : ""}`}
              icon={<IconChart />}
              onClick={handleGCContent}
              disabled={isRunning || selectedRows.length === 0}
            />
          )}

          <MenuItem
            label="Clean Intergenic"
            sublabel={isBed ? "All rows" : "Selected"}
            icon={<IconFilter />}
            onClick={handleCleanIntergenic}
            disabled={isRunning}
          />

          <Divider />

          {/* ── VCF Filter Section ── */}
          {isVcf && (
            <>
              <SectionLabel text="VCF Filter" />

              <MenuItem
                label="Filter by FILTER"
                sublabel="PASS, LowQual, etc."
                icon={<IconFilterColumn />}
                onClick={handleFilterByFilter}
                disabled={rows.length === 0}
              />
              <MenuItem
                label="Filter by QUAL"
                sublabel="Min quality threshold"
                icon={<IconQual />}
                onClick={handleFilterByQual}
                disabled={rows.length === 0}
              />
              <MenuItem
                label="Filter by Variant Type"
                sublabel="SNP, INDEL, MNP"
                icon={<IconVariantType />}
                onClick={handleVariantTypeFilter}
                disabled={rows.length === 0}
              />
              {vcfSampleNames.length > 0 && (
                <MenuItem
                  label="Filter by Genotype"
                  sublabel={vcfSampleNames[0] ?? "GT field"}
                  icon={<IconGenotype />}
                  onClick={handleGenotypeFilter}
                  disabled={rows.length === 0}
                />
              )}
              <MenuItem
                label="Parse INFO Fields"
                sublabel="Extract to columns"
                icon={<IconInfo />}
                onClick={handleParseInfo}
                disabled={rows.length === 0}
              />
              {hasInfoColumns && (
                <MenuItem
                  label="Filter by INFO Column"
                  sublabel="INFO_AF, INFO_DP, ..."
                  icon={<IconInfoColumnFilter />}
                  onClick={handleInfoColumnFilter}
                  disabled={rows.length === 0}
                />
              )}

              <Divider />
            </>
          )}

          {/* ── Transform Section ── */}
          <SectionLabel text="Transform" />

          <MenuItem
            label="Sort by Position"
            sublabel="chr1..22, X, Y, M"
            icon={<IconSort />}
            onClick={handleSort}
            disabled={rows.length === 0}
          />
          <MenuItem
            label="Remove Duplicates"
            sublabel="By coordinates"
            icon={<IconDedup />}
            onClick={handleRemoveDuplicates}
            disabled={rows.length === 0}
          />

          {isBed && (
            <MenuItem
              label="Merge Overlapping"
              sublabel="Combine regions"
              icon={<IconMerge />}
              onClick={handleMergeRegions}
              disabled={rows.length === 0}
            />
          )}

          {isBed && (
            <MenuItem
              label="Extend / Slop"
              sublabel={selectedRows.length > 0 ? `${selectedRows.length} selected` : "All rows"}
              icon={<IconExtend />}
              onClick={handleExtendRegions}
              disabled={rows.length === 0}
            />
          )}

          {isBed && (
            <MenuItem
              label="Validate Coordinates"
              sublabel="Check & fix issues"
              icon={<IconValidate />}
              onClick={handleValidate}
              disabled={rows.length === 0}
            />
          )}

          {isBed && (
            <MenuItem
              label="Intersect / Subtract"
              sublabel="With another BED"
              icon={<IconIntersect />}
              onClick={handleIntersect}
              disabled={rows.length === 0}
            />
          )}

          {isBed && (
            <MenuItem
              label="Complement"
              sublabel="Gap regions"
              icon={<IconComplement />}
              onClick={handleComplement}
              disabled={rows.length === 0}
            />
          )}

          <Divider />

          {/* ── Edit Section ── */}
          <SectionLabel text="Edit" />

          <MenuItem
            label="Add Row"
            sublabel={selectedRows.length > 0 ? "After selection" : "Append to end"}
            icon={<IconAddRow />}
            onClick={handleAddRow}
          />
          <MenuItem
            label="Open in UCSC"
            sublabel={selectedRows.length > 0 ? `${selectedRows.length} region${selectedRows.length !== 1 ? "s" : ""}` : "Select rows first"}
            icon={<IconUCSC />}
            onClick={handleUCSCLink}
            disabled={selectedRows.length === 0}
          />

          <MenuItem
            label="Delete Selected"
            sublabel={`${selectedRows.length} row${selectedRows.length !== 1 ? "s" : ""}`}
            icon={<IconDelete />}
            onClick={handleDeleteRows}
            disabled={selectedRows.length === 0}
            danger
          />
          <MenuItem
            label="Copy to Clipboard"
            icon={<IconCopy />}
            onClick={handleCopyRows}
            disabled={selectedRows.length === 0}
          />
        </div>
      )}
    </>
  );
}

// ── Sub-components ──

function SectionLabel(props: { text: string }): React.ReactElement {
  return (
    <div className="px-3.5 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-text-muted">
      {props.text}
    </div>
  );
}

function Divider(): React.ReactElement {
  return <div className="my-1.5 border-t border-elevated/60" />;
}

interface MenuItemProps {
  label: string;
  sublabel?: string;
  icon: React.ReactElement;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function MenuItem(props: MenuItemProps): React.ReactElement {
  const { label, sublabel, icon, onClick, disabled, danger } = props;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-3.5 py-[7px] text-left transition-all ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : danger
            ? "text-danger hover:bg-danger/8"
            : "text-text-secondary hover:bg-elevated/40 hover:text-text-primary"
      }`}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px]">{label}</div>
        {sublabel && (
          <div className="truncate font-mono text-[10px] text-text-muted">{sublabel}</div>
        )}
      </div>
    </button>
  );
}

// ── SVG Icons ──

function IconLiftOver(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDNA(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
      <path d="M12 2v20M8 4c0 3 8 5 8 8s-8 5-8 8" strokeLinecap="round" />
      <path d="M16 4c0 3-8 5-8 8s8 5 8 8" strokeLinecap="round" />
    </svg>
  );
}

function IconChart(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFilter(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFilterColumn(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
      <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconQual(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconVariantType(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
      <path d="M4 7h16M4 12h10M4 17h6" strokeLinecap="round" />
      <circle cx="19" cy="14" r="3" />
    </svg>
  );
}

function IconGenotype(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4361ee" strokeWidth="1.5">
      <path d="M12 2v10M8 6l8 0M6 12c0 5.5 6 10 6 10s6-4.5 6-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInfoColumnFilter(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
      <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" />
      <circle cx="20" cy="16" r="3" />
    </svg>
  );
}

function IconInfo(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconSort(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h18M3 12h12M3 18h6" strokeLinecap="round" />
    </svg>
  );
}

function IconDedup(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3v6h6M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMerge(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6h13M8 12h9M8 18h5M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconExtend(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12H3m18 0l-4-4m4 4l-4 4M3 12l4-4m-4 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDelete(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconValidate(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconIntersect(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  );
}

function IconComplement(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <path d="M8 8v8M16 8v8" strokeLinecap="round" />
    </svg>
  );
}

function IconUCSC(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAddRow(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCopy(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
