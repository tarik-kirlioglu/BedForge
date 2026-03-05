import { ensemblFetch } from "./ensembl-client";
import { toEnsemblChrom } from "../utils/chromosome";
import { toEnsemblStart, toEnsemblEnd } from "../utils/format-helpers";
import type { Assembly, FileFormat } from "../types/genomic";

interface MappedRegion {
  seq_region_name: string;
  start: number;
  end: number;
  strand: number;
  assembly: string;
}

interface LiftOverMapping {
  original: { start: number; end: number };
  mapped: MappedRegion;
}

interface LiftOverResponse {
  mappings: LiftOverMapping[];
}

export interface LiftOverResult {
  chrom: string;
  start: number;
  end: number;
}

/**
 * LiftOver a single region via Ensembl REST API.
 * Accepts BED-style 0-based half-open coords for BED, 1-based for VCF.
 * Returns Ensembl 1-based coords (caller converts back).
 */
export async function liftOverRegion(
  chrom: string,
  start: number,
  end: number,
  sourceAssembly: Assembly,
  targetAssembly: Assembly,
  format: FileFormat,
): Promise<LiftOverResult | null> {
  const ensemblChrom = toEnsemblChrom(chrom);

  // Convert to Ensembl 1-based inclusive
  const ensemblStart = toEnsemblStart(start, format);
  const ensemblEnd = toEnsemblEnd(end, format);

  const path = `/map/human/${sourceAssembly}/${ensemblChrom}:${ensemblStart}..${ensemblEnd}/${targetAssembly}?content-type=application/json`;

  const data = await ensemblFetch<LiftOverResponse>(path);

  if (data.mappings.length === 0) return null;

  const mapped = data.mappings[0]!.mapped;
  return {
    chrom: mapped.seq_region_name,
    start: mapped.start,
    end: mapped.end,
  };
}
