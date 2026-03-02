# BedForge

Excel-like web editor for BED and VCF genomic files. No backend — all bioinformatics operations run via the Ensembl REST API.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Build | Vite | 6.x |
| Language | TypeScript | 5.7+ (strict mode) |
| Table | @tanstack/react-table | 8.x |
| Virtual Scroll | @tanstack/react-virtual | 3.x |
| State | Zustand + Immer | 5.x / 10.x |
| Styling | Tailwind CSS | 4.x (@tailwindcss/vite plugin) |
| Toasts | Sonner | 2.x |
| Testing | Vitest | 3.x |

## Commands

```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Production build (dist/)
npm run preview    # Preview production build
npm run test       # Run unit tests via Vitest
npm run test:watch # Vitest in watch mode
npm run lint       # Run ESLint
```

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Root component
├── index.css                 # Tailwind directives + global styles
├── types/                    # TypeScript type definitions
├── stores/                   # Zustand stores
├── parsers/                  # BED/VCF file parsers
├── exporters/                # BED/VCF file exporters
├── api/                      # Ensembl REST API client
├── operations/               # Genomic operation orchestrators
├── components/               # React components
│   ├── layout/               # AppShell, Toolbar
│   ├── drop-zone/            # Drag & drop landing zone
│   ├── table/                # DataGrid, EditableCell, TableHeader
│   ├── context-menu/         # Right-click genomic menu
│   └── operations/           # Operation progress UI
├── hooks/                    # Custom React hooks
└── utils/                    # Helper functions
```

## Code Rules

### General
- **Language**: All source code in TypeScript with strict mode. `any` is forbidden — use `unknown` and narrow.
- **Exports**: Named exports only, no default exports (`export function X`, `export const X`).
- **File naming**: Components use `PascalCase.tsx`, everything else uses `kebab-case.ts`.
- **Function style**: Prefer `function` declarations over arrow functions (hoisting + readability).
- **Import order**: React → external libs → internal absolute → relative. Separate groups with blank lines.

### React Components
- Functional components only, no class components.
- Props interfaces are defined in the same file as the component, not extracted.
- Do not use `React.FC` — write `function Component(props: Props): React.ReactElement` directly.
- Hooks go in `hooks/` directory with `use` prefix.
- Event handlers use `handle` prefix: `handleClick`, `handleDrop`.

### State Management
- Zustand stores use `use` prefix: `useFileStore`, `useSelectionStore`.
- Use Immer middleware for mutable-looking immutable updates.
- No direct cross-store dependencies — components may read from multiple stores.

### Styling
- Use Tailwind utility classes, keep custom CSS minimal.
- No inline styles (`style={}` is forbidden).
- No responsive design needed — desktop-only application.

### Testing
- Unit tests are mandatory for parsers and utility functions.
- Test files live in `__tests__/` directories next to source files.
- Naming convention: `describe('parseBed')` → `it('should parse BED4 with 4 columns')`.

## Coordinate Systems (CRITICAL)

This project deals with two different coordinate systems. Incorrect conversion causes data loss:

| Format | System | Example (100bp region) |
|--------|--------|------------------------|
| BED | 0-based, half-open [start, end) | chr1 100 200 |
| VCF | 1-based, inclusive | chr1 101 (POS) |
| Ensembl API | 1-based, inclusive [start, end] | 1:101..200 |

**Conversion rules**:
- BED → Ensembl: `ensemblStart = bedStart + 1`, `ensemblEnd = bedEnd`
- Ensembl → BED: `bedStart = ensemblStart - 1`, `bedEnd = ensemblEnd`
- VCF → Ensembl: Direct mapping (both 1-based)

## Chromosome Naming

- BED/VCF files typically use `chr1`, `chrX`, `chrM`
- Ensembl API expects `1`, `X`, `MT`
- The `chr` prefix presence is detected on file load and preserved
- Prefix is stripped for API calls, restored when writing results back
- Special case: `chrM` ↔ `MT`

## Ensembl REST API

- Base URL: `https://rest.ensembl.org`
- Rate limit: **15 req/s** (we use 14 for safety margin)
- Content-Type: `application/json`
- On 429 response: read `Retry-After` header and wait
- Batch operation concurrency: 5

## Important Notes

1. **Large files**: BED files can have 1M+ rows. Use TanStack Virtual to render only visible rows.
2. **Undo history**: Snapshot-based, max 20 entries. Memory must be managed carefully for large files.
3. **VCF meta lines**: Lines starting with `##` must be preserved verbatim — written back as-is on export.
4. **API errors**: 400 (invalid region) → skip row, continue. 429 → wait, retry. 503 → notify user.
5. **File size**: Show warning for files >50MB.
6. **BED format variety**: BED3, BED4, BED6, BED12 — auto-detect by column count.
