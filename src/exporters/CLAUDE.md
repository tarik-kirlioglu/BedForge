# exporters/

Converts in-memory row data back to BED/VCF text format and triggers browser download.

## Module Structure

| File | Purpose |
|------|---------|
| `bed-exporter.ts` | `exportBed(rows: BedRow[], format: BedFormat)` → tab-separated BED string |
| `vcf-exporter.ts` | `exportVcf(vcfFile: VcfFile)` → complete VCF string with preserved headers |
| `download.ts` | `downloadFile(content: string, fileName: string)` → triggers browser file download |

## Rules

- BED export must produce tab-separated output matching the detected format (BED3/4/6/12).
- VCF export must write `##` meta lines verbatim from `VcfFile.meta`, then the `#CHROM` header, then data rows.
- Missing fields in BED use `.` for strings and `0` for numbers.
- `download.ts` uses `Blob` → `URL.createObjectURL` → programmatic `<a>` click → `URL.revokeObjectURL`.
- Exported file names follow pattern: `{original}_modified.{ext}` or `{original}_{assembly}.{ext}` after LiftOver.

## Round-Trip Guarantee

`parse(export(parse(text)))` should produce identical data to `parse(text)`. Parsers and exporters must be inverse operations. This is tested in unit tests.
