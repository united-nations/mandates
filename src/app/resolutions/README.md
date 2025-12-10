# Resolutions Page - Infrastructure Guide

## Overview

The resolutions page displays UN resolutions in two views: **Treemap** (default) and **Table**. It uses a shared infrastructure for filtering, data fetching, and visualization.

## Tech Stack

- **Next.js 15** (App Router, Server Components, Route Handlers)
- **React 18** (Client Components with hooks)
- **Tailwind CSS v3** + **shadcn/ui** components
- **TypeScript** (strict mode)

---

## File Structure

### 📄 Page Component

**`src/app/resolutions/page.tsx`**

- Client component that manages view state (treemap/table)
- URL-based state management (all filters/view stored in search params)
- Renders `ResolutionsTreemapView` OR `DocumentTable` based on `?view=` param
- Handles filter controls and view switching

### 🔌 API Route

**`src/app/api/resolutions/route.ts`**

```typescript
export const GET = createDocumentHandler<Resolution>(
  "all_resolutions_dashboard.json",
  "resolutions",
);
```

- Single-line implementation using shared handler
- Serves both table data (paginated) and aggregate data (for treemap)
- Supports `?mode=aggregate` for treemap buckets

### 📊 Data Source

**`data/all_resolutions_dashboard.json`**

- Cached in-memory on first read (permanent cache)
- Contains all UN resolutions with metadata (organ, year, word_count, similarity_to_previous, etc.)

---

## Key Components

### Treemap View

**`src/components/resolutions-treemap-view.tsx`**

- Fetches aggregate bucket data from `/api/resolutions?mode=aggregate`
- Visualizes resolutions by **length** (word count) or **similarity** (to previous version)
- Uses squarified treemap algorithm (`src/lib/treemap-utils.ts`)
- Click on cell → filters table view to that bucket

### Table View

**`src/components/document-table.tsx`**

- Generic component used by both resolutions and reports pages
- **URL-based state**: All filters read from and synced to URL search params (single source of truth)
- Fetches paginated data from `/api/resolutions` when URL changes
- Single `useEffect` watches `searchParams` and automatically refetches
- Sortable columns, pagination controls
- **Column filters**: In-header PrimeReact Dropdown that directly updates URL (no intermediate state)
- Configured via `resolutionsConfig` (see configs below)

---

## Infrastructure Details

### 🔧 API Handler (Shared Logic)

**`src/lib/document-api-handler.ts`**

- Factory function: `createDocumentHandler<T>(dataFile, docType)`
- Handles two modes:
  - **Paginated mode** (default): Returns filtered/sorted/paginated documents
  - **Aggregate mode** (`?mode=aggregate`): Returns bucket counts for treemap
- Supports filters: `organ`, `is_recurring_series`, `length_bucket`, `similarity_bucket`
- In-memory cache: Data loaded once on first request

### 📐 Treemap Configuration

**`src/lib/treemap-config.ts`**

- Defines bucket definitions for:
  - **Length buckets**: `<0.5K`, `0.5K⎼1K`, `1K⎼2K`, `2K⎼5K`, `>5K`, `Unknown`
  - **Similarity buckets**: `<30%`, `30%⎼70%`, `70%⎼90%`, `>90%`, `New/First`
- Color palettes for each dimension
- Helper function: `getBucketForValue(value, buckets)` → assigns documents to buckets

### 🛠️ Treemap Utilities

**`src/lib/treemap-utils.ts`**

- `squarify()`: Implements squarified treemap layout algorithm
- Formatting helpers: `formatNumber()`, `formatPercentage()`, `formatApproximate()`

### ⚙️ Document Configuration

**`src/lib/document-configs.ts`**

```typescript
export const resolutionsConfig: DocumentConfig<Resolution> = {
  type: 'resolutions',
  apiEndpoint: '/api/resolutions',
  dataFile: 'all_resolutions_dashboard.json',
  organOptions: [...],
  columns: { symbol: true, year: true, title: true, ... }
};
```

- Centralizes page-specific settings
- Defines which columns to show in table
- Used by `DocumentTable` component

---

## Data Flow

### Treemap Flow

```
User visits /resolutions
  → page.tsx renders ResolutionsTreemapView
    → Fetches /api/resolutions?mode=aggregate&organ=...&...
      → API handler buckets ALL documents (no pagination)
        → Returns bucket counts + percentages
    → Component calculates treemap layout
    → Renders interactive cells
  → User clicks cell
    → Updates URL: ?view=table&length_bucket=1k-2k
    → Page re-renders with DocumentTable
```

### Table Flow

```
User on table view or clicks "Show Table"
  → page.tsx renders DocumentTable
    → Fetches /api/resolutions?page=1&limit=20&organ=...&length_bucket=...
      → API handler filters → sorts → paginates
        → Returns { data: [...], total, page, totalPages }
    → Component renders rows with pagination
    → User clicks column filter dropdown (e.g., Length)
      → Dropdown onChange directly updates URL: ?length_bucket=1k-2k
      → useEffect in DocumentTable watches searchParams
      → Automatically refetches API with new filter
```

---

## URL State Management

All state lives in URL search params (single source of truth):

- `?view=treemap|table` - Current view (default: treemap)
- `?dimension=length|similarity` - Treemap dimension (default: length)
- `?organ=General+Assembly` - Filter by organ
- `?is_recurring_series=true|false` - Filter recurring resolutions
- `?length_bucket=1k-2k` - Filter by word count bucket
- `?similarity_bucket=70-90` - Filter by similarity bucket
- `?page=2` - Current page (table view)
- `?sortField=year&sortOrder=desc` - Sorting (table view)

**Benefits:**

- Shareable links
- Browser back/forward works
- No prop drilling
- Consistent state across components

---

## Filter Logic

Filters are applied **server-side** in the API handler. There are two types of filters:

### External Filters (Outside Table)

- **Organ**: Dropdown in page header
- **Recurring Series**: Dropdown in page header
- Applied to both treemap and table views

### Column Filters (Inside Table)

- **Length Bucket**: PrimeReact Dropdown in table column header
- **Direct URL update**: Dropdown `onChange` calls `updateURL()` (bypasses PrimeReact's filterCallback)
- **Reactive refetch**: URL change triggers `useEffect` in DocumentTable → automatic API refetch
- Can be triggered by Treemap click or manually selected in dropdown
- Filter state synced from URL back to PrimeReact for UI display

### Filter Application Flow:

1. Start with all documents from cached JSON
2. Apply `organ` filter → match `document.organ === organ`
3. Apply `is_recurring_series` filter → match boolean
4. Apply `length_bucket` filter → check if `word_count` falls in bucket range (min/max logic)
5. Apply `similarity_bucket` filter → check if `similarity_to_previous` falls in bucket range
6. Return filtered set (paginated or aggregated)

**Key Implementation Detail:**

- Column filter dropdown uses custom `onChange` handler that updates URL directly
- This ensures filter changes work both from treemap clicks AND dropdown selection
- The `useEffect` pattern creates a unidirectional data flow: URL → API → Data

---

## Adding New Features

### Add a new column filter (in table header):

1. Add bucket definitions in `treemap-config.ts` (if applicable)
2. Add filter logic in `document-api-handler.ts` (GET handler)
3. Update `DocumentFilters` type in `src/types/index.ts`
4. In `document-table.tsx`:
   - Add filter template function (similar to `lengthBucketFilterTemplate`)
   - Ensure `onChange` calls `updateURL()` directly (don't use `filterCallback`)
   - Add to Column definition with `filter={true}` and `filterElement={yourTemplate}`
5. Sync filter state from URL in `useEffect` (read from `searchParams`)

### Add a new external filter (page-level):

1. Update URL params in `page.tsx` (read + update handlers)
2. Add filter logic in `document-api-handler.ts` (GET handler)
3. Update `DocumentFilters` type in `src/types/index.ts`
4. Add UI control in `page.tsx` (dropdown, checkbox, etc.)
5. Connect control to `updateURL()` helper

### Add a new dimension:

1. Define buckets in `treemap-config.ts`
2. Add color palette
3. Update aggregate logic in `document-api-handler.ts`
4. Update `ResolutionsTreemapView` to handle new dimension

### Replicate for another document type:

1. Add JSON file to `data/`
2. Create API route: `src/app/api/{type}/route.ts`
3. Create config in `document-configs.ts`
4. Create page: `src/app/{type}/page.tsx`
5. Reuse `DocumentTable` and treemap components

---

## Performance Notes

- **In-memory cache**: JSON loaded once, persists across requests (restart to refresh)
- **Server-side filtering**: All filtering happens on API, not client
- **Squarify algorithm**: O(n log n) layout calculation, runs client-side
- **No database**: Pure file-based approach for simplicity

---

## Quick Reference

| Task               | File                                          |
| ------------------ | --------------------------------------------- |
| Change page layout | `src/app/resolutions/page.tsx`                |
| Modify API logic   | `src/lib/document-api-handler.ts`             |
| Add/edit buckets   | `src/lib/treemap-config.ts`                   |
| Style treemap      | `src/components/resolutions-treemap-view.tsx` |
| Style table        | `src/components/document-table.tsx`           |
| Change columns     | `src/lib/document-configs.ts`                 |
| Add filters        | Update page.tsx + API handler                 |
| Update data        | Replace `data/all_resolutions_dashboard.json` |
