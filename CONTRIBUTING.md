# Contributing to BedForge

Thanks for your interest in contributing to BedForge! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/BedForge.git
   cd BedForge
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (localhost:5173) |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | Run ESLint |

## Tech Stack

- **React 19** + **TypeScript** (strict mode, no `any`)
- **Vite 6** for builds
- **Tailwind CSS 4** for styling
- **Zustand + Immer** for state
- **TanStack Table + Virtual** for the data grid

## Code Guidelines

- **TypeScript strict mode** — `any` is forbidden, use `unknown` and narrow.
- **Named exports only** — no default exports.
- **File naming** — Components: `PascalCase.tsx`, everything else: `kebab-case.ts`.
- **Function declarations** — prefer `function foo()` over `const foo = () =>`.
- **No prop drilling** — components read from Zustand stores directly.
- **Tailwind only** — use design tokens (`void`, `surface`, `cyan-glow`, etc.). No inline `backdrop-filter`.
- **Coordinate systems** — BED is 0-based half-open, VCF/GFF3/Ensembl are 1-based. See `CLAUDE.md` for conversion rules.

## Design System

BedForge uses the "Genomic Instrument" design language:

- **Fonts**: Sora (UI), JetBrains Mono (data/code)
- **Colors**: Dark palette with cyan-glow (#06d6a0) primary accent
- **Effects**: Glass morphism (`.glass`), glow effects (`.glow-cyan`)
- **Icons**: Inline SVGs, 14x14 for menus, no icon libraries

## Adding a New Operation

1. Create `src/operations/your-operation.ts` with scan + run functions
2. Create `src/components/operations/YourDialog.tsx` following existing dialog patterns
3. Add menu item + handler + dialog state to `GenomicContextMenu.tsx`
4. Use `deleteRows()` / `updateRows()` / `addColumn()` from `useFileStore` for undo support
5. Show results via `toast.success()` from Sonner

## Adding a New Filter Dialog

Follow the pattern in `TypeFilterDialog.tsx` or `ChromFilterDialog.tsx`:

1. **Scan function** — reads store, returns `Map<string, number>` of values with counts
2. **Run function** — builds `Set<number>` of `_index` values to remove, calls `store.deleteRows()`
3. **Dialog component** — checkbox list, quick actions, summary bar, Apply/Cancel buttons

## Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes and ensure:
   - `npm run build` passes (no TypeScript errors)
   - `npm run test` passes
   - New parsers/utilities have unit tests
3. Commit with a clear message describing what and why
4. Open a PR against `main`

## Reporting Issues

Open an issue on [GitHub Issues](https://github.com/tarik-kirlioglu/BedForge/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- File format (BED/VCF/GFF3) and sample data if applicable
- Browser and OS

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
