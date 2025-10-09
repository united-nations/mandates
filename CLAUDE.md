# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UN80 Dashboard is a Next.js 15 application for exploring and filtering United Nations mandates. It displays mandate data from UN budget documents, allowing users to search, filter, and analyze mandate citations across UN entities and organs.

## Development Commands

**Development server:**
```bash
npm run dev
```
Runs on `http://localhost:9001` (note: custom port 9001, not default 3000)

**Type checking:**
```bash
npm run typecheck
```
Run before commits to catch TypeScript errors.

**Build and production:**
```bash
npm run build
npm run start
```

**Linting:**
```bash
npm run lint
```

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components (Radix UI + Tailwind)
- **React 18** with client-side state management

## Architecture

### Data Flow

The application uses a **unified API architecture** centered around `/api/mandates/route.ts`:

1. **Single source of truth**: All mandate data flows through one API endpoint
2. **Server-side filtering**: Filtering, sorting, and pagination happen server-side
3. **Lazy enrichment**: Only paginated results are enriched with full details
4. **In-memory caching**: 5-minute TTL cache with precomputed default views

### Core Data Service

`src/lib/data-service.ts` is the **singleton data loader**:
- Loads mandate data from `data/ppb2026_unique_mandates_with_metadata.json`
- Loads entity metadata from `data/entity_details.csv`
- Loads organ data from `data/organs.json`
- Provides in-memory caches with lookup maps

### Filter System

The filter system uses URL-based state management:

- **FilterContext** (`src/contexts/FilterContext.tsx`): Syncs filters with URL parameters
- **Filter constants** (`src/lib/filter-constants.ts`): Central definition of all filter parameters
- **Page-specific filtering**: Main page vs entity/organ pages handle filters differently
  - Main page: All filters in URL
  - Entity/organ pages: Implicit filter from route + additional filters in URL

### Component Structure

**Pages:**
- `src/app/page.tsx` - Main dashboard (all mandates)
- `src/app/entity/[entity]/page.tsx` - Entity-specific view
- `src/app/organ/[organ]/page.tsx` - Organ-specific view
- `src/app/mandate/[...segments]/page.tsx` - Individual mandate detail view
- `src/app/resolutions/page.tsx` - Resolutions document table
- `src/app/reports/page.tsx` - Reports document table

**Core Components:**
- `mandate-explorer.tsx` - Main data explorer (used by all list pages)
- `mandate-list.tsx` - Displays paginated mandate cards
- `filter-controls.tsx` - Search, programme, subject, year filters
- `*-sidebar.tsx` - Entity list, organ list, cross-citations sidebars

**UI Components:**
All in `src/components/ui/` - mostly shadcn/ui components with customizations

### Types

All TypeScript types are defined in `src/types/index.ts`:
- `Mandate` - Core mandate data structure with enriched fields
- `Entity` - Entity metadata with URLs and descriptions
- `Organ` - UN organ information
- `FilterOptions` - All possible filter parameters
- `ApiResponse` - Unified API response structure

## Key Conventions

### Design Principles
- **Left-aligned** layouts
- **Consistent spacing** and hierarchies
- **No drop shadows** on components
- **Minimal boxing** - avoid unnecessary borders/containers
- **Consistent UN colors** from Tailwind palette in `src/app/globals.css`, prefer UN Blue `--un-blue`

### Code Style
- Always check `src/lib/utils.ts` and `src/lib/shared-utils.ts` for existing utility functions
- Filter parameter lists are in `src/lib/filter-constants.ts` - use these constants
- Extend existing infrastructure rather than building parallel structures
- Use shadcn/ui components for UI elements

### API Pattern
When adding new features that need data:
1. Check if `/api/mandates` already provides it
2. If not, extend the unified API rather than creating new endpoints
3. Update `ApiResponse` type in `src/types/index.ts`

### Filtering Pattern
When adding new filters:
1. Add parameter to `FILTER_PARAMS` in `src/lib/filter-constants.ts`
2. Update `FilterOptions` type in `src/types/index.ts`
3. Implement filtering logic in `/api/mandates/route.ts` `filterMandates()` function
4. Update `FilterContext` if needed

## Data Files Location

All data files are in the `data/` directory:
- `ppb2026_unique_mandates_with_metadata.json` - Main mandate data
- `entity_details.csv` - Entity metadata
- `organs.json` - UN organ information
