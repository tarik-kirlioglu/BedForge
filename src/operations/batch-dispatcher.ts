import type { FileFormat, GenomicRow } from "../types/genomic";
import type { BatchOperationId, ParsedFile } from "../types/batch";

export interface OperationResult {
  rows: GenomicRow[];
  columns: string[];
  format: FileFormat;
}

export async function dispatchOperation(
  config: { operationId: BatchOperationId; params: Record<string, unknown> },
  rows: GenomicRow[],
  columns: string[],
  format: FileFormat,
  _parsed: ParsedFile,
  assembly: string,
  useChrPrefix: boolean,
  speciesName: string,
  speciesId: string | undefined,
  onProgress: (completed: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<OperationResult> {
  const { operationId, params } = config;

  switch (operationId) {
    case "sort": {
      const { sortRows } = await import("./sort-rows");
      return { rows: sortRows(rows, format, speciesId), columns, format };
    }

    case "dedup": {
      const { removeDuplicateRows } = await import("./remove-duplicates");
      return { rows: removeDuplicateRows(rows, format), columns, format };
    }

    case "merge": {
      const { mergeRegionRows } = await import("./merge-regions");
      return {
        rows: mergeRegionRows(rows),
        columns: ["chrom", "chromStart", "chromEnd"],
        format: "bed3",
      };
    }

    case "validate": {
      const { validateAndFixRows } = await import("./validate-coordinates");
      return { rows: validateAndFixRows(rows), columns, format };
    }

    case "extend": {
      const upstream = (params.upstream as number) ?? 0;
      const downstream = (params.downstream as number) ?? 0;
      const { extendRegionRows } = await import("./extend-regions");
      return { rows: extendRegionRows(rows, upstream, downstream, format), columns, format };
    }

    case "filter-chrom": {
      const keepChroms = params.keepChroms as Set<string>;
      const { filterByChromValues } = await import("./chrom-filter");
      return { rows: filterByChromValues(rows, keepChroms, format), columns, format };
    }

    case "filter-qual": {
      const minQual = (params.minQual as number) ?? 0;
      const { filterByQual } = await import("./filter-vcf");
      return { rows: filterByQual(rows, minQual), columns, format };
    }

    case "filter-filter": {
      const keepValues = params.keepValues as Set<string>;
      const { filterByFilterValues } = await import("./filter-vcf");
      return { rows: filterByFilterValues(rows, keepValues), columns, format };
    }

    case "filter-variant-type": {
      const keepTypes = params.keepTypes as Set<string>;
      const { filterByVariantTypes } = await import("./variant-type-filter");
      return { rows: filterByVariantTypes(rows, keepTypes as never), columns, format };
    }

    case "filter-genotype": {
      const sampleName = params.sampleName as string;
      const keepGTs = params.keepGTs as Set<string>;
      const { filterByGenotypes } = await import("./genotype-filter");
      return { rows: filterByGenotypes(rows, sampleName, keepGTs), columns, format };
    }

    case "filter-type": {
      const keepTypes = params.keepTypes as Set<string>;
      const { filterByTypeValues } = await import("./type-filter");
      return { rows: filterByTypeValues(rows, keepTypes), columns, format };
    }

    case "parse-info": {
      const keys = params.keys as string[] | undefined;
      const allKeys = keys ?? extractAllInfoKeys(rows);
      const { parseInfoFields } = await import("./info-parser");
      const result = parseInfoFields(rows, allKeys);
      return {
        rows: result.rows,
        columns: [...columns, ...result.newColumns],
        format,
      };
    }

    case "parse-attributes": {
      const keys = params.keys as string[] | undefined;
      const allKeys = keys ?? extractAllAttributeKeys(rows);
      const { parseAttributeFields } = await import("./gff3-attribute-parser");
      const result = parseAttributeFields(rows, allKeys);
      return {
        rows: result.rows,
        columns: [...columns, ...result.newColumns],
        format,
      };
    }

    case "intersect": {
      const targetRows = params.targetRows as GenomicRow[];
      const targetFormat = params.targetFormat as FileFormat;
      const action = params.action as "keep" | "remove";
      const matchType = params.matchType as "overlap" | "exact";
      const { intersectRows } = await import("./intersect");
      return {
        rows: intersectRows(rows, format, targetRows, targetFormat, action, matchType),
        columns,
        format,
      };
    }

    case "complement": {
      const chromSizes = params.chromSizes as Map<string, number>;
      const { computeComplement } = await import("./complement");
      return {
        rows: computeComplement(rows, chromSizes),
        columns: ["chrom", "chromStart", "chromEnd"],
        format: "bed3",
      };
    }

    case "find-replace": {
      const search = params.search as string;
      const replace = params.replace as string;
      const caseSensitive = (params.caseSensitive as boolean) ?? false;
      const { findAndReplace } = await import("./find-replace");
      return {
        rows: findAndReplace(rows, columns, { search, replace, caseSensitive }),
        columns,
        format,
      };
    }

    // API operations
    case "annotate": {
      const { batchAnnotateGenes } = await import("./batch-api-runners");
      const result = await batchAnnotateGenes(
        rows, columns, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result.rows, columns: result.columns, format: result.format };
    }

    case "gc-content": {
      const { batchGCContent } = await import("./batch-api-runners");
      const result = await batchGCContent(
        rows, columns, assembly, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result.rows, columns: result.columns, format };
    }

    case "liftover": {
      const targetAssembly = params.targetAssembly as string;
      const { batchLiftOver } = await import("./batch-api-runners");
      const result = await batchLiftOver(
        rows, format, assembly, targetAssembly, useChrPrefix, speciesName, onProgress, isCancelled,
      );
      return { rows: result, columns, format };
    }

    case "clean-intergenic": {
      const { batchCleanIntergenic } = await import("./batch-api-runners");
      const result = await batchCleanIntergenic(
        rows, assembly, format, speciesName, onProgress, isCancelled,
      );
      return { rows: result, columns, format };
    }

    default:
      return { rows, columns, format };
  }
}

/** Extract all INFO field keys from rows for auto-scan */
function extractAllInfoKeys(rows: GenomicRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const info = String(row.INFO ?? ".");
    if (info === "." || info === "") continue;
    for (const pair of info.split(";")) {
      const eqIdx = pair.indexOf("=");
      const key = eqIdx === -1 ? pair.trim() : pair.slice(0, eqIdx).trim();
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

/** Extract all attribute keys from GFF3 rows for auto-scan */
function extractAllAttributeKeys(rows: GenomicRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const attrs = String(row.attributes ?? "");
    if (!attrs || attrs === ".") continue;
    for (const pair of attrs.split(";")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const key = pair.slice(0, eqIdx).trim();
      if (key) keys.add(key);
    }
  }
  return [...keys];
}
