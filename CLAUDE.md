# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo with two independent codebases plus shared data/SQL:

- `website/` — the Next.js 16 / React 19 app (the deployed product, https://mandates.un.org/). **All web commands run from inside `website/`, not the repo root.** Uses `pnpm`.
- `data-processing/` — Python 3.13 pipeline (managed with `uv`) that downloads, parses, and extracts UN Programme Budget (PPB) documents into CSV/Excel and seeds the database.
- `sql/` — `schema/` (full re-runnable schema definitions) and `migrations/` (numbered, applied in order).
- `data/` — `downloads/` (raw source docs), `processed/` (pipeline output), `references/` (curated CSVs).
- `docs/`, `website/docs/` — research notes, color spec (`website/docs/COLORS.md`), TODOs.
- `ppb-viewer/` — standalone static HTML viewer (no build).

## Commands

Web app (run from `website/`):

- `pnpm dev` — dev server on **port 3000** (note: README's 9002 is outdated).
- `pnpm build` / `pnpm start` — production build / serve.
- `pnpm lint` — ESLint (flat config, `eslint.config.mjs`).
- `pnpm typecheck` — `tsc --noEmit`. Run this and `lint` before considering work done.
- `pnpm format` / `pnpm format:check` — Prettier (with Tailwind class sorting).
- No test runner is configured.

Data pipeline (run from `data-processing/`):

- `uv run python main.py` — runs the full PPB pipeline end-to-end. Stages are ordered modules in `ppb_processing/`: `a_download` → `b_parse_downloaded` → `c_extract_parsed` → `d_validate_extracted` → `e_export_excel`. The target year/symbol is hardcoded in `main.py`.

Docker (build from **repo root**, context must be the root so the Dockerfile can reach `data/`):

```bash
docker build -f website/Dockerfile -t un-mandates . && docker run -p 3000:3000 un-mandates
```

CI/CD: pushes to `dev` and `main` auto-build and deploy to Azure Web App via `.github/workflows/{dev,main}_un80analytics.yml`. No manual deploy steps.

## Architecture

### Data flow

UN documents → `data-processing` pipeline → CSV/Excel in `data/` + SQL seed migrations (`sql/migrations/00*_seed_*.sql`, `007_import_ppb2027.sql`) → Azure Postgres → Next.js Server Components/Actions → UI.

The DB has two schemas: `ppb2026` (source documents/organs, the budget side) and `mandates` (paragraph-level extracted content and normalized mandate objects). Migration `008_unified_documents_view.sql` joins them. Read `sql/schema/mandates.sql` header before touching mandate data — it documents the deterministic UUID strategy (uuid5 from natural keys for `paragraphs`, do **not** use `gen_random_uuid()` there).

### Database access (strict)

- Azure Postgres via `pg`, single shared `Pool` in `website/src/lib/db/index.ts`, cached on `globalThis` to survive HMR. Never construct another Pool.
- Query through helpers in `website/src/lib/db/query.ts`: `query`, `queryOne`, `queryMany`.
- Domain data-access functions live in `website/src/lib/data/` (`mandates.ts`, `entities.ts`, `organs.ts`, `paragraphs.ts`, `budget-documents.ts`). Add new queries here, not inline in components.
- DB calls only in Server Components / Server Actions — never in Client Components.
- `DATABASE_URL` comes from `.env` (repo root `.env` / `.env.example`); load env before any standalone DB script.

### Next.js app structure (`website/src/`)

- App Router. `app/page.tsx` is the mandate explorer (server entry: `app/_mandateExplorerServer.tsx`).
- Intercepting routes: `app/@modal/(.)mandate/[...segments]` renders a mandate as a modal over the list; `app/mandate/[...segments]` is the full page for the same. Keep both in sync when changing mandate detail rendering.
- Other routes: `methodology/`, `resources/`, `pbi/`, `api/health/`.
- `components/ui/` = shadcn primitives (never edit directly; add via `pnpm dlx shadcn@latest add <component>`). Compose feature components in `components/` and `components/table/`.
- Shared: `lib/utils.ts`, `lib/filter-constants.ts`, `lib/en_text_contents.ts`; `contexts/`, `hooks/`, `types/index.ts`, `messages/`.
- `next.config.ts`: `output: 'standalone'` for Docker; `undifferent` is a `serverExternalPackages`; `/ppb2027` and `/diff` are permanent redirects to external apps.

## Conventions

These project-specific rules matter; standard Next/React/TS best practices are assumed.

- Server Components by default; `"use client"` only for genuinely interactive pieces.
- TypeScript strict; no `any` in new code (DB helpers' generic default is the only exception).
- Component files PascalCase; name related components so they sort together. Other files kebab/snake-case.
- UI: Tailwind CSS **v4.1** syntax only (not older versions). Use the custom UN color palette (esp. `un-blue`) and shadcn design tokens — see `website/docs/COLORS.md`.
- Design: left-align everything, respect margins, clear visual hierarchy, minimal — less is better.
- Do not create parallel infrastructure or hardcode things in hard-to-find places; prefer the existing global solutions (DB pool, `lib/data`, filter constants).
- Prefer the `shadcn` and `context7` MCPs to verify registry/component and library API details when unsure.
