import { describe, it, expect } from "vitest";

import { stripGzExtension, isGzipped, formatBytes } from "../decompress";

describe("stripGzExtension", () => {
  it("strips .gz from filename", () => {
    expect(stripGzExtension("genes.gff3.gz")).toBe("genes.gff3");
    expect(stripGzExtension("variants.vcf.gz")).toBe("variants.vcf");
    expect(stripGzExtension("regions.bed.gz")).toBe("regions.bed");
  });

  it("is case-insensitive", () => {
    expect(stripGzExtension("file.VCF.GZ")).toBe("file.VCF");
    expect(stripGzExtension("file.gff3.Gz")).toBe("file.gff3");
  });

  it("returns filename unchanged if not .gz", () => {
    expect(stripGzExtension("genes.gff3")).toBe("genes.gff3");
    expect(stripGzExtension("variants.vcf")).toBe("variants.vcf");
    expect(stripGzExtension("regions.bed")).toBe("regions.bed");
  });
});

describe("isGzipped", () => {
  it("detects .gz files", () => {
    expect(isGzipped("file.vcf.gz")).toBe(true);
    expect(isGzipped("file.gff3.gz")).toBe(true);
    expect(isGzipped("FILE.BED.GZ")).toBe(true);
  });

  it("returns false for non-gz files", () => {
    expect(isGzipped("file.vcf")).toBe(false);
    expect(isGzipped("file.gzip")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(52_428_800)).toBe("50 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1_073_741_824)).toBe("1.0 GB");
  });
});
