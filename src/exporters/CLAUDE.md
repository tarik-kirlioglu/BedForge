# exporters/

Converts in-memory row data back to BED/VCF text format and triggers browser download.

## Module Structure

| File | Purpose |
|------|---------|
| `bed-exporter.ts` | `exportBed(rows, format)` → tab-separated BED string matching detected format |
| `vcf-exporter.ts` | `exportVcf(rows, meta, headerColumns, sampleNames)` → complete VCF with preserved `##` headers |
| `download.ts` | `downloadFile(content, fileName)` → triggers browser download via Blob + programmatic `<a>` click |

## Rules

- BED export: tab-separated output matching the detected format (BED3/4/6/12).
- VCF export: `##` meta lines verbatim → `#CHROM` header → data rows. `INFO_*` columns (from Parse INFO feature) are automatically excluded from export.
- Missing BED fields: `.` for strings, `0` for numbers.
- Export filenames: `{original}_modified.{ext}` or `{original}_{assembly}.{ext}` after LiftOver.
- Toolbar export dropdown supports: "Export all" and "Export selected" (if selection exists).

## Round-Trip Guarantee

`parse(export(parse(text)))` should produce identical data to `parse(text)`.
