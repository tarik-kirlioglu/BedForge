import { ensemblFetch } from "./ensembl-client";
import { toEnsemblChrom } from "../utils/chromosome";
import type { Assembly } from "../types/genomic";

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
  isBed: boolean,
): Promise<string> {
  const ensemblChrom = toEnsemblChrom(chrom);
  const ensemblStart = isBed ? start + 1 : start;
  const ensemblEnd = isBed ? end : end;

  const path = `/sequence/region/human/${ensemblChrom}:${ensemblStart}..${ensemblEnd}?content-type=application/json`;

  const data = await ensemblFetch<SequenceResponse>(path);
  return data.seq;
}
