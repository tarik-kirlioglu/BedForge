import { ensemblFetch } from "./ensembl-client";
import { toEnsemblChrom } from "../utils/chromosome";
import { toEnsemblStart, toEnsemblEnd } from "../utils/format-helpers";
import type { Assembly, FileFormat } from "../types/genomic";

interface GeneOverlap {
  id: string;
  external_name: string;
  biotype: string;
  start: number;
  end: number;
  strand: number;
}

/**
 * Check if a region overlaps with any gene.
 * Returns gene features overlapping the region.
 * Accepts BED-style 0-based half-open coords for BED, 1-based for VCF.
 */
export async function getGeneOverlaps(
  chrom: string,
  start: number,
  end: number,
  _assembly: Assembly,
  format: FileFormat,
  speciesName = "human",
): Promise<GeneOverlap[]> {
  const ensemblChrom = toEnsemblChrom(chrom);
  const ensemblStart = toEnsemblStart(start, format);
  const ensemblEnd = toEnsemblEnd(end, format);

  const path = `/overlap/region/${speciesName}/${ensemblChrom}:${ensemblStart}-${ensemblEnd}?feature=gene;content-type=application/json`;

  return ensemblFetch<GeneOverlap[]>(path);
}
