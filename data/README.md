# `data/`

## Data Files

**`ppb2026_unique_mandates_with_metadata.json`**
- Main mandate data file (stored in Git LFS due to size)
- Contains all UN mandates with metadata (paragraphs, citations, entities, subject headings)
- Used by: `/api/mandates`, `/mandate/[...segments]`, mandate explorer pages
- Loaded via `DataService.getMandates()` in `data-service.ts`

**`all_resolutions_dashboard.json`**
- All UN resolutions data for the dashboard
- Contains: symbol, year, title, length, recurrence, previous resolutions, similarity scores
- Used by: `/resolutions` page, `/api/resolutions`
- Configuration in `resolutionsConfig` in `document-configs.ts`

**`all_reports_dashboard.json`**
- All UN reports data (2020-2025)
- Contains: symbol, year, title, length, recurrence, previous reports, similarity scores
- Used by: `/reports` page, `/api/reports`
- Configuration in `reportsConfig` in `document-configs.ts`

**`mandate_entities.csv`**
- Entity metadata (short name, long name, links, descriptions)
- Maps entity abbreviations to full names and additional info
- Used by: entity filter dropdowns, `/entity/[entity]` pages
- Loaded via `DataService.getEntities()` in `data-service.ts`

**`organs.json`**
- UN organ information (short name, long name, website links)
- Contains: General Assembly, Security Council, ECOSOC, HRC, etc.
- Used by: organ filter dropdowns, `/organ/[organ]` pages
- Loaded via `DataService.getOrgans()` in `data-service.ts`