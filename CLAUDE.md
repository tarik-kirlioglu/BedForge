# BedForge

Visual genomic editor for BED and VCF files. No backend — all bioinformatics operations run via the Ensembl REST API. All data stays in the browser.

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
├── App.tsx                   # Root component + Sonner toaster
├── index.css                 # Tailwind + design system tokens + animations
├── types/                    # TypeScript type definitions
├── stores/                   # Zustand stores (file, selection, operation)
├── parsers/                  # BED/VCF file parsers
├── exporters/                # BED/VCF file exporters
├── api/                      # Ensembl REST API client + rate limiter
├── operations/               # Genomic + BED operation orchestrators
├── components/
│   ├── layout/               # AppShell, Toolbar
│   ├── drop-zone/            # Hero landing + drag & drop
│   ├── table/                # DataGrid, EditableCell
│   ├── context-menu/         # Right-click genomic menu + SVG icons
│   └── operations/           # SlopDialog (extend/slop parameter input)
├── hooks/                    # useKeyboardShortcuts
└── utils/                    # chromosome.ts, gc-calculator.ts
```

## Design System — "Genomic Instrument"

### Typography
- **UI / Headings**: Sora (Google Fonts) — geometric, scientific feel
- **Data / Code**: JetBrains Mono (Google Fonts) — monospace for genomic coordinates
- Never use Inter, Roboto, Arial, or system fonts

### Color Palette (CSS custom properties in `index.css`)

| Token | Hex | Usage |
|-------|-----|-------|
| `void` | #060a13 | Deepest background |
| `abyss` | #0a1020 | Secondary background |
| `deep` | #0f1729 | Table header, input backgrounds |
| `surface` | #151d30 | Cards, elevated panels |
| `raised` | #1c2640 | Buttons, interactive elements |
| `elevated` | #243050 | Borders, separators |
| `cyan-glow` | #06d6a0 | Primary accent — selections, active states, brand |
| `electric` | #4361ee | Secondary accent — chromosomes, VCF badges |
| `nt-a` | #10b981 | Nucleotide A (Adenine) |
| `nt-t` | #f43f5e | Nucleotide T (Thymine) |
| `nt-c` | #3b82f6 | Nucleotide C (Cytosine) |
| `nt-g` | #f59e0b | Nucleotide G (Guanine) / GC content |
| `text-primary` | #e8edf5 | Main text |
| `text-secondary` | #8892a8 | Secondary text, table cells |
| `text-muted` | #4a5568 | Dimmed labels |
| `text-ghost` | #2d3748 | Barely visible hints |

### Visual Effects (CSS classes in `index.css`)
- `.glass` / `.glass-strong` — Frosted glass morphism with blur + gradient
- `.glow-cyan` / `.glow-cyan-subtle` — Bioluminescent box-shadow effects
- `.glow-border` — Glowing border for active drop zones
- `.bg-grid` — Subtle genomic grid background pattern
- `.noise` — Film grain overlay via SVG filter
- `.animate-fade-in-up` / `.animate-slide-in` / `.animate-fade-in` — Entry animations
- `.stagger` — Cascading animation delays for child elements

### Icon System
- SVG icons inline in components (no icon library dependency)
- Ensembl API operations: colored strokes (cyan, blue, amber, rose)
- Client-side operations: `currentColor` stroke (inherits text color)
- Size: 14×14 for menu items, 18×18 for feature cards, 20×20 for dialogs

## Code Rules

### General
- **Language**: All source code in TypeScript with strict mode. `any` is forbidden — use `unknown` and narrow.
- **Exports**: Named exports only, no default exports.
- **File naming**: Components use `PascalCase.tsx`, everything else uses `kebab-case.ts`.
- **Function style**: Prefer `function` declarations over arrow functions.
- **Import order**: React → external libs → internal absolute → relative. Separate with blank lines.

### React Components
- Functional components only, no `React.FC`.
- Props interfaces defined in the same file.
- Event handlers use `handle` prefix.
- Components read from Zustand stores directly — no prop drilling.

### Styling
- Tailwind utility classes using the custom design tokens above.
- Inline `style={}` only for dynamic positioning (context menu x/y, virtual scroll heights).
- No responsive design — desktop-only application.
- Glass morphism via `.glass` / `.glass-strong` CSS classes, not inline backdrop-filter.

### Testing
- Unit tests mandatory for parsers and utilities.
- Test files in `__tests__/` directories next to source.

## Coordinate Systems (CRITICAL)

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

- BED/VCF: `chr1`, `chrX`, `chrM` / Ensembl: `1`, `X`, `MT`
- `chr` prefix detected on file load, stripped for API, restored in results
- Special case: `chrM` ↔ `MT`

## Ensembl REST API

- Base URL: `https://rest.ensembl.org`
- Rate limit: **15 req/s** (we use 14 for safety margin)
- Content-Type: `application/json`
- On 429: read `Retry-After` header and wait
- Batch concurrency: 5

## Important Notes

1. **Large files**: BED files can have 1M+ rows. TanStack Virtual renders only visible rows.
2. **Undo history**: Snapshot-based, max 20 entries.
3. **VCF meta lines**: `##` lines preserved verbatim for round-trip export.
4. **API errors**: 400 → skip row. 429 → wait, retry. 503 → notify user.
5. **File size**: Warning for >50MB files.
6. **BED formats**: BED3, BED4, BED6, BED12 — auto-detected by column count.
7. **Gene annotation**: Ensembl overlap API, protein_coding preferred, auto-upgrades BED3 → BED4.
