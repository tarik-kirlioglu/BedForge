import { ensemblFetch } from "./ensembl-client";
import { toEnsemblChrom } from "../utils/chromosome";
import { toEnsemblStart, toEnsemblEnd } from "../utils/format-helpers";
import type { Assembly, FileFormat } from "../types/genomic";

interface SequenceResponse {
  id: string;
  seq: string;
  molecule: string;
}

/**
 * Fetch DNA sequence for a region.
 * Accepts BED-style 0-based half-open coords for BED, 1-based for VCF.
 */
export async function getSequence(
  chrom: string,
  start: number,
  end: number,
  _assembly: Assembly,
  format: FileFormat,
): Promise<string> {
  const ensemblChrom = toEnsemblChrom(chrom);
  const ensemblStart = toEnsemblStart(start, format);
  const ensemblEnd = toEnsemblEnd(end, format);

  const path = `/sequence/region/human/${ensemblChrom}:${ensemblStart}..${ensemblEnd}?content-type=application/json`;

  const data = await ensemblFetch<SequenceResponse>(path);
  return data.seq;
}
