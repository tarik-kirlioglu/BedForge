import { describe, it, expect } from "vitest";

import { parseGff3 } from "../gff3-parser";

const BASIC_GFF3 = `##gff-version 3
##sequence-region chr1 1 1000
chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1;Name=BRCA1;biotype=protein_coding
chr1\tEnsembl\tmRNA\t100\t500\t.\t+\t.\tID=mRNA1;Parent=gene1;Name=BRCA1-201
chr1\tEnsembl\texon\t100\t200\t.\t+\t.\tID=exon1;Parent=mRNA1
chr1\tEnsembl\tCDS\t100\t200\t.\t+\t0\tID=cds1;Parent=mRNA1
`;

describe("parseGff3", () => {
  it("parses basic GFF3 with directives and data rows", () => {
    const result = parseGff3(BASIC_GFF3);
    expect(result.directives).toHaveLength(2);
    expect(result.rows).toHaveLength(4);
    expect(result.columns).toHaveLength(9);
  });

  it("preserves directives verbatim", () => {
    const result = parseGff3(BASIC_GFF3);
    expect(result.directives[0]!.raw).toBe("##gff-version 3");
    expect(result.directives[0]!.key).toBe("gff-version");
    expect(result.directives[0]!.value).toBe("3");
    expect(result.directives[1]!.raw).toBe("##sequence-region chr1 1 1000");
    expect(result.directives[1]!.key).toBe("sequence-region");
    expect(result.directives[1]!.value).toBe("chr1 1 1000");
  });

  it("parses 9 standard columns correctly", () => {
    const result = parseGff3(BASIC_GFF3);
    const gene = result.rows[0]!;
    expect(gene.seqid).toBe("chr1");
    expect(gene.source).toBe("Ensembl");
    expect(gene.type).toBe("gene");
    expect(gene.start).toBe(100);
    expect(gene.end).toBe(500);
    expect(gene.score).toBe(".");
    expect(gene.strand).toBe("+");
    expect(gene.phase).toBe(".");
    expect(gene.attributes).toBe("ID=gene1;Name=BRCA1;biotype=protein_coding");
  });

  it("parses start and end as integers", () => {
    const result = parseGff3(BASIC_GFF3);
    expect(typeof result.rows[0]!.start).toBe("number");
    expect(typeof result.rows[0]!.end).toBe("number");
  });

  it("assigns sequential _index and unique _rowId", () => {
    const result = parseGff3(BASIC_GFF3);
    expect(result.rows[0]!._index).toBe(0);
    expect(result.rows[1]!._index).toBe(1);
    expect(result.rows[2]!._index).toBe(2);
    expect(result.rows[0]!._rowId).toBe("gff3-0");
    expect(result.rows[3]!._rowId).toBe("gff3-3");
  });

  it("skips comment lines (single #)", () => {
    const text = `##gff-version 3
# This is a comment
chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1`;
    const result = parseGff3(text);
    expect(result.directives).toHaveLength(1);
    expect(result.rows).toHaveLength(1);
  });

  it("handles Windows line endings", () => {
    const text = "##gff-version 3\r\nchr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1\r\n";
    const result = parseGff3(text);
    expect(result.directives).toHaveLength(1);
    expect(result.rows).toHaveLength(1);
    expect(result.directives[0]!.raw).toBe("##gff-version 3");
  });

  it("skips empty lines", () => {
    const text = `##gff-version 3

chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1

chr2\tEnsembl\texon\t200\t300\t.\t-\t.\tID=exon1
`;
    const result = parseGff3(text);
    expect(result.rows).toHaveLength(2);
  });

  it("skips lines with fewer than 9 columns", () => {
    const text = `##gff-version 3
chr1\tEnsembl\tgene\t100
chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1`;
    const result = parseGff3(text);
    expect(result.rows).toHaveLength(1);
  });

  it("handles score as dot (missing)", () => {
    const text = "chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1";
    const result = parseGff3(text);
    expect(result.rows[0]!.score).toBe(".");
  });

  it("handles numeric score", () => {
    const text = "chr1\tEnsembl\tgene\t100\t500\t95.5\t+\t.\tID=gene1";
    const result = parseGff3(text);
    expect(result.rows[0]!.score).toBe("95.5");
  });

  it("handles various phase values", () => {
    const lines = [
      "chr1\tEnsembl\tCDS\t100\t500\t.\t+\t0\tID=cds1",
      "chr1\tEnsembl\tCDS\t501\t800\t.\t+\t1\tID=cds2",
      "chr1\tEnsembl\tCDS\t801\t1000\t.\t+\t2\tID=cds3",
      "chr1\tEnsembl\tgene\t100\t1000\t.\t+\t.\tID=gene1",
    ].join("\n");
    const result = parseGff3(lines);
    expect(result.rows[0]!.phase).toBe("0");
    expect(result.rows[1]!.phase).toBe("1");
    expect(result.rows[2]!.phase).toBe("2");
    expect(result.rows[3]!.phase).toBe(".");
  });

  it("handles flush directive (###)", () => {
    const text = `##gff-version 3
chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1
###
chr2\tEnsembl\tgene\t200\t600\t.\t-\t.\tID=gene2`;
    const result = parseGff3(text);
    expect(result.directives).toHaveLength(2);
    expect(result.directives[1]!.key).toBe("#");
    expect(result.rows).toHaveLength(2);
  });

  it("returns all 9 column names", () => {
    const result = parseGff3("chr1\tEnsembl\tgene\t100\t500\t.\t+\t.\tID=gene1");
    expect(result.columns).toEqual([
      "seqid", "source", "type", "start", "end",
      "score", "strand", "phase", "attributes",
    ]);
  });
});
