# Resolutions Treemap Feature Plan

**Status:** ✅ Ready for Implementation | **Planning Phase:** Complete | **Next:** [HANDOFF.md](HANDOFF.md) → [IMPLEMENTATION_READY.md](IMPLEMENTATION_READY.md)

---

## TL;DR - What We're Building

**Two independent treemaps on /resolutions:**
1. "Resolutions by length" (word_count buckets)
2. "Resolutions by similarity" (similarity_to_previous buckets)

**User flow:** Treemap (default) → click cell → filtered table → "← Back to overview"

**Implementation:** 5 phases, ~15-20 hours total, start with API enhancement

---

## Overview
Add interactive treemap visualizations to the resolutions page to explore resolutions at a higher aggregate level. **Multiple independent treemaps** - one per dimension - allow users to understand patterns in the data before drilling down to individual resolutions.

**Philosophy:** Big picture first, then drill down. Show aggregate patterns → click to explore details.

## Design Inspiration
Three treemap examples in `snippets/`:
- **BudgetTreemap.tsx**: Groups by system grouping, uses squarify algorithm, has hierarchical grouping with small groups combined
- **SDGExpensesTreemap.tsx**: Nested treemap (SDGs > entities), bold labeling for top-level items
- **MemberStatesTreemap.tsx**: Layered opacity for contribution types, shows data breakdowns within cells

**Report example**: Download distribution chart showing informative bucket labels with brackets (e.g., "0.5K-1K", "1K-1.5K")

## Key Facts About the Data

- **Total resolutions**: 41,204 resolutions
- **Current filtering system**: Organ filter (5 organs) + Recurring series filter (all/recurring/one-time)
- **URL-based state management**: All filters stored in URL params, supports back/forward navigation
- **Existing columns**: symbol, year, title, word_count, series info, similarity_to_previous, has_within_existing_resources

### Data Distribution Analysis (Actual Numbers)

**Word Count:**
- **63.8% (26,296) have null word_count** - this will dominate the treemap!
- Only 36.2% have word counts
- Among non-null: median 1,068 words, mean 1,678 words
- Distribution of non-null:
  - <500 words: 2,933 (7.1%)
  - 500-1000: 4,049 (9.8%)
  - 1000-2000: 4,332 (10.5%)
  - 2000-5000: 2,845 (6.9%)
  - 5000-10000: 602 (1.5%)
  - >10000: 147 (0.4%)

**Similarity:**
- **78.1% (32,200) are null (new/first time)** - even more dominant!
- Only 21.9% have similarity scores
- Among non-null: median 0.788, mean 0.736 (most are high similarity)
- Distribution of non-null:
  - <30%: 206 (0.5%)
  - 30-50%: 1,197 (2.9%)
  - 50-70%: 2,022 (4.9%)
  - 70-90%: 3,223 (7.8%)
  - >90%: 2,356 (5.7%)

## Key Design Decisions

### 1. Multiple Independent Treemaps (Not Nested!)

**Initial treemaps (v1):**
1. **Length Distribution** - grouped by word_count
2. **Similarity Distribution** - grouped by similarity_to_previous

**Future treemaps (v2+):**
3. Year distribution
4. Organ distribution
5. Recurrence patterns
6. "Within resources" patterns (for resolutions)

Each treemap is **independent** - they show different facets of the same dataset. User can click any cell in any treemap to filter the table view.

### 2. Aggregation Dimensions

**Treemap 1: Length Distribution (word_count)**

**Approach:**
- Define buckets in a configuration object (easily adjustable)
- Use data statistics to inform initial bucket boundaries
- Each bucket has: label, min/max values, color key
- Include "Unknown" as a bucket (for null values)

**Example structure** (to be refined):
```typescript
const lengthBuckets = [
  { label: 'Unknown', min: null, max: null, colorKey: 'neutral' },
  { label: '<0.5K', min: 0, max: 500, colorKey: 'length-1' },
  { label: '0.5K⎼1K', min: 501, max: 1000, colorKey: 'length-2' },
  // ... more buckets configurable
  // Note: Keep all buckets even if small (e.g., >10K)
  // Can combine/adjust boundaries later for visual balance
]
```

**Treemap 2: Similarity Distribution (similarity_to_previous)**

**Approach:**
- Same configuration pattern
- Buckets for similarity ranges (0.0-1.0)
- Include "New/First" bucket for null values
- Colors map to gradient (low → high similarity)

**Example structure:**
```typescript
const similarityBuckets = [
  { label: 'New/First', min: null, max: null, colorKey: 'neutral' },
  { label: '<30%', min: 0, max: 0.30, colorKey: 'similarity-1' },
  { label: '30%⎼50%', min: 0.30, max: 0.50, colorKey: 'similarity-2' },
  // ... more buckets configurable
  // Note: Keep all buckets even if tiny (e.g., <30% is only 0.5%)
  // Consider combining small adjacent buckets if needed for balance
  // Or use open bounds like "<30%" to group very small categories
]
```

**Design principle:** Keep buckets and colors separate. Make it easy to adjust thresholds and reassign colors for presentation purposes.

### 3. Visual Design

**Layout:**
- **Two separate treemaps** stacked vertically
- Each treemap has a title: **"Resolutions by length"** / **"Resolutions by similarity"**
- Use squarify algorithm for optimal space-filling layout
- Each cell sized proportionally to count of resolutions in bucket
- **Show all buckets, even tiny ones** - don't hide small cells
  - Tiny cells still visible and clickable
  - Can adjust bucket boundaries later to combine small groups if needed

**Responsive/Mobile:**
- Keep it simple - same layout on all screen sizes
- Stack treemaps vertically (mobile and desktop)
- Treemaps scale down but remain interactive
- Touch-friendly cell sizes (ensure tappable areas)
- Labels may be smaller on mobile but tooltips still work

**Color scheme:**
**All colors from `globals.css` only** - use existing UN color palette:
- `--un-blue` (#009edb) - Official UN Blue
- `trout`, `shuttle-gray`, `camouflage-green`, `pale-oyster`, `smoky`, `au-chico`, `faded-jade`
- HSL variables for cards, muted, accent, etc.

**Color assignment approach:**
- Define color mappings in configuration file
- Separate from bucket definitions
- Easy to reassign colors for presentations
- Use semantic names (e.g., `colorKey: 'length-1'` maps to actual color)

**Example color mapping:**
```typescript
const treemapColors = {
  neutral: 'bg-gray-200 text-gray-700',
  'length-1': 'bg-faded-jade text-white',
  'length-2': 'bg-un-blue text-white',
  'length-3': 'bg-camouflage-green text-white',
  // ... easily adjustable for presentations
}
```

**Design principle:** Keep colors configurable and presentation-ready. Don't hardcode specific colors to specific buckets.

**Labels:**
- Bucket label with en dash or similar (e.g., "0.5K⎼1K" or "2K⎼5K")
- Resolution count below label
- Percentage in smaller text
- Tooltips show additional details

**Typography note:** Use en dash (⎼) or similar horizontal bar character for range labels, not hyphen (-)

**Interactivity:**
- Hover: highlight cell, show detailed tooltip with:
  - Full bucket description (e.g., "2K⎼3K words")
  - Exact count of resolutions (e.g., "1,234 resolutions")
  - Percentage of total (e.g., "5.4%")
  - Simple average (rounded, with ~):
    - Length: "~1,234 words avg" (calculate from exact values, display rounded)
    - Similarity: "~0.78 avg similarity"
  - "Click to explore" hint
- Click: filter table to show only resolutions in this bucket
- Smooth transitions on hover (opacity change, subtle scale)

**Number formatting:**
- Always use exact values for calculations
- Round/smooth display values (epistemic humility)
- Use ~ prefix to indicate approximations
- Match existing table rounding conventions

### 4. Page Layout & Navigation

**Top-level structure:**
```
┌─────────────────────────────────────────────────┐
│ [Treemap] [Table]  ← Toggle                     │
│ [Organ Filter ▾] [Recurring Filter ▾] [Reset]   │
└─────────────────────────────────────────────────┘

When Treemap view active:
┌─────────────────────────────────────────────────┐
│ Downloads by length                              │
│ [Treemap visualization]                         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Downloads by similarity                          │
│ [Treemap visualization]                         │
└─────────────────────────────────────────────────┘

When Table view active (after clicking treemap cell):
┌─────────────────────────────────────────────────┐
│ ← Back to overview                               │
│ Filtered by: [2K-5K words ×] [70%-90% similarity ×] │
│ [Table with pagination]                         │
└─────────────────────────────────────────────────┘
```

**View Toggle:**
- Tab-like design at top: `[Treemap (active)] [Table]`
- Treemap is default view
- Table tab shows when user manually switches OR after clicking treemap cell

**Breadcrumb/Back button:**
- When bucket filters are active: show "← Back to overview" button
- Also show filter badges: `[2K-5K words ×]` that can be individually removed
- Clicking back button or removing all filters → returns to treemap view

### 5. Technical Architecture

**Component Structure:**
```
src/app/resolutions/
  page.tsx                        # Server component (simple wrapper)

src/components/
  resolutions-page-wrapper.tsx    # 'use client' - view toggle, URL state
  resolutions-treemap-view.tsx    # Renders both treemaps
  treemap-card.tsx                # Single treemap with title

src/lib/
  treemap-utils.ts                # Squarify algorithm (from examples)
  treemap-config.ts               # Bucket definitions + color mappings
```

**Data Flow:**
1. Page loads → determine view from URL (`view` param)
2. If treemap view (default):
   - Fetch aggregate data: `/api/resolutions?mode=aggregate&organ=X&recurringSeries=Y`
   - Server returns bucketed counts for all dimensions
   - Render multiple treemaps
3. User clicks treemap cell:
   - Add bucket filter to URL (e.g., `length_bucket=2k-5k`)
   - Switch to table view
   - Fetch paginated table data with bucket filter applied
4. User clicks "Back to overview":
   - Remove bucket filters from URL
   - Switch back to treemap view
   - Treemaps update based on other active filters (organ, etc.)

**URL Parameters:**

**View control:**
- `view=treemap|table` (default: treemap)

**Bucket filters (when drilling down):**
- `length_bucket=<0.5k|0.5k-2k|2k-5k|5k-10k|>10k|unknown`
- `similarity_bucket=new|<30|30-70|70-90|>90`

**Existing filters (respected by both views):**
- `organ=` - filter by organ
- `recurringSeries=` - filter by recurring status
- Future: `search=` - search resolution titles

### 6. API Requirements

**Enhance `/api/resolutions` with aggregate mode:**

**Request:**
```
GET /api/resolutions?mode=aggregate&organ=General%20Assembly&recurringSeries=true
```

**Response:**
```json
{
  "totals": {
    "count": 5234,
    "resolutions_with_word_count": 4876,
    "resolutions_with_similarity": 3821
  },
  "buckets": {
    "length": {
      "<0.5k": { "count": 234, "percentage": 4.8, "avg_word_count": 287 },
      "0.5k-2k": { "count": 1456, "percentage": 29.9, "avg_word_count": 1234 },
      "2k-5k": { "count": 2103, "percentage": 43.2, "avg_word_count": 3456 },
      "5k-10k": { "count": 892, "percentage": 18.3, "avg_word_count": 7123 },
      ">10k": { "count": 191, "percentage": 3.9, "avg_word_count": 15678 },
      "unknown": { "count": 358, "percentage": 6.8 }
    },
    "similarity": {
      "new": { "count": 1413, "percentage": 27.0 },
      "<30": { "count": 456, "percentage": 8.7, "avg_similarity": 0.18 },
      "30-70": { "count": 1234, "percentage": 23.6, "avg_similarity": 0.52 },
      "70-90": { "count": 789, "percentage": 15.1, "avg_similarity": 0.81 },
      ">90": { "count": 929, "percentage": 17.7, "avg_similarity": 0.95 }
    }
  }
}
```

**Implementation in `document-api-handler.ts`:**
- Check for `mode=aggregate` query param
- Apply existing filters (organ, recurringSeries) first
- Then bucket the filtered results by each dimension
- Return aggregated counts (no individual documents)

**Caching strategy:**
- Reuse existing permanent in-memory cache pattern (`documentCache`)
- Cache the full dataset on first load (already happens)
- For aggregate mode: compute buckets from cached data (fast - just counting/grouping)
- For filtered aggregates: filter cached data first, then bucket (still fast)
- No separate aggregate cache needed - bucketing is cheap once data is in memory
- Performance target: <100ms for treemap, <200ms for click-to-table

**Table view with bucket filters:**
```
GET /api/resolutions?organ=GA&length_bucket=2k-5k&similarity_bucket=70-90&page=1
```
- Apply organ filter
- Apply length_bucket filter (word_count between 2001-5000)
- Apply similarity_bucket filter (similarity_to_previous between 0.71-0.90)
- Return paginated results

### 7. User Flow (Big Picture First)

**Default experience:**
1. User lands on `/resolutions` → sees **treemap view by default**
2. Page shows two treemaps: "Downloads by length" and "Downloads by similarity"
3. User can change organ/recurring filters → treemaps update dynamically

**Exploration flow:**
1. User hovers over "2K-5K" cell in length treemap
   - Tooltip: "2K-5K words • 2,103 resolutions (43.2%) • Avg: ~3,456 words • Click to explore"
2. User clicks cell
3. → URL becomes `/resolutions?view=table&length_bucket=2k-5k`
4. → Page switches to **table view** filtered to 2K-5K word resolutions
5. → Shows breadcrumb: "← Back to overview" + filter badge "[2K-5K words ×]"

**Multi-filter flow:**
1. User in table view (filtered by length)
2. Clicks "← Back to overview"
3. → Returns to treemap view (length filter removed)
4. Now clicks "70%-90%" in similarity treemap
5. → Table shows only resolutions with 70-90% similarity
6. User could also manually combine: click length cell, then similarity cell
   - URL: `/resolutions?view=table&length_bucket=2k-5k&similarity_bucket=70-90`

**Manual table access:**
1. User clicks [Table] toggle at top
2. → Shows full unfiltered table (all 41K resolutions, paginated)
3. → URL: `/resolutions?view=table`

### 8. Implementation Phases

**Phase 1: API Enhancement**
- [ ] Add aggregate mode to `document-api-handler.ts`
- [ ] Implement bucketing logic for length dimension
- [ ] Implement bucketing logic for similarity dimension
- [ ] Leverage existing permanent cache (no new caching needed)
- [ ] Test API performance (target: <100ms for aggregate)
- [ ] Test API with various filter combinations
- [ ] Analyze actual data distribution to validate bucket thresholds

**Phase 2: Core Treemap Component**
- [ ] Extract squarify algorithm to `treemap-utils.ts` (from snippets/)
- [ ] Create bucket config in `treemap-config.ts` (buckets + inline style colors)
- [ ] Create `treemap-card.tsx` component with mock data
- [ ] Add hover states and tooltips (shadcn/ui Tooltip)
- [ ] Test responsive layout (stacked vertically)

**Phase 3: Integration with Resolutions Page**
- [ ] Create `resolutions-page-wrapper.tsx` ('use client')
- [ ] Add view toggle (tabs: Treemap | Table)
- [ ] Implement conditional rendering (treemap vs table)
- [ ] Connect to API with `mode=aggregate`
- [ ] Handle loading states (simple spinner)
- [ ] Respect organ/recurringSeries filters

**Phase 4: Table Integration & Navigation**
- [ ] Add click handlers to treemap cells
- [ ] Implement bucket filter URL params
- [ ] Modify DocumentTable to handle bucket filters
- [ ] Add "Back to overview" breadcrumb
- [ ] Add filter badges with individual removal
- [ ] Test browser back/forward navigation

**Phase 5: Polish & Optimization**
- [ ] Performance testing
  - [ ] Measure treemap load time (target <100ms)
  - [ ] Measure click-to-table (target <200ms)
  - [ ] Test on mobile device
- [ ] Mobile testing
  - [ ] Check cell tap targets (minimum 44×44px)
  - [ ] Test tooltips on touch
- [ ] Basic accessibility
  - [ ] Semantic HTML (section, h2 for titles)
  - [ ] Basic ARIA labels
  - [ ] Keyboard tab navigation
- [ ] Error handling
  - [ ] API failure → error message
  - [ ] Empty results → "No resolutions found"
  - [ ] Invalid bucket filters → ignore, show all

**Phase 6: Future Enhancements (Optional)**
- [ ] Additional treemaps: year distribution, organ distribution
- [ ] Export treemap as image
- [ ] Comparison view: GA vs ECOSOC side-by-side
- [ ] Series view: switch to resolution series instead of individual resolutions
- [ ] Advanced filters: combine multiple buckets (e.g., show 2K-5K OR >10K)

## Open Questions & Decisions

### Decided:
1. ✅ **Architecture**: Multiple independent treemaps (not nested)
2. ✅ **Data size**: ~41,204 resolutions - server-side bucketing required
3. ✅ **Null handling**: Show as "Unknown" or "New/First" bucket (include in treemap)
4. ✅ **Filtering**: Treemaps respect ALL filters (organ, search, future filters)
5. ✅ **Default view**: Treemap is default - "big picture first, then drill down"
6. ✅ **View toggle**: Tab-like toggle at top "[Treemap] [Table]"
7. ✅ **Bucket labels**: Use en dash (e.g., "0.5K⎼1K", "30%⎼50%", "<30%", ">10K")
8. ✅ **Titles**: "Resolutions by length" and "Resolutions by similarity"
9. ✅ **Tiny buckets**: Show all buckets, don't hide small ones (adjust boundaries later if needed)
10. ✅ **Colors**: All from globals.css, configurable in treemap-config.ts
11. ✅ **Responsive**: Simple stacked layout on all screen sizes
12. ✅ **Default organ filter**: "All Organs" (broader view for aggregate exploration)
13. ✅ **Tooltip details**: Show count, percentage, and simple average (rounded, with ~)
    - Length tooltips: "~1,234 words avg"
    - Similarity tooltips: "~0.78 avg similarity"
    - Use exact values for calculation, then round/smooth display
    - Be epistemically humble: use ~ to hedge on approximations
14. ✅ **Bucket ordering**: Semantic order (short→long, different→identical), not by size
15. ✅ **Caching strategy**: Aggressive caching for snappy performance
    - Aggregate results: permanent in-memory cache (like existing documentCache in document-api-handler)
    - Data changes infrequently (few new resolutions per week)
    - Cache invalidation: only on server restart (acceptable given update frequency)
    - Goal: Near-instant interactions
      - a) Loading treemap: <100ms (just aggregation from cache)
      - b) Clicking treemap → table: <200ms (filtering cached data)

### To Validate:
1. **Length bucket thresholds**: Use data distribution to inform initial buckets, but keep configurable
   - Consider combining very small adjacent buckets (e.g., 5K⎼10K and >10K)
   - Use open bounds for edge cases (e.g., ">10K" rather than "10K⎼100K")
2. **Similarity bucket thresholds**: Use data distribution to inform initial buckets, but keep configurable
   - Consider combining small adjacent buckets (e.g., <30% and 30%⎼50%)
   - Adjust brackets to make visual balance nice

### Implementation Details (to address during build):
1. ✅ **Bucket ordering**: Semantic order
   - Length: `<0.5K → 0.5K⎼1K → 1K⎼2K → ... → >10K` (short to long)
   - Similarity: `New/First → <30% → 30%⎼50% → ... → >90%` (different to identical)
   - NOT ordered by size (don't put "Unknown" first just because it's largest)
2. **Color accessibility**: Test color contrasts during polish phase

## Design Constraints from CLAUDE.md

- ✅ Left-aligned layouts
- ✅ Consistent spacing and hierarchies
- ✅ No drop shadows on components
- ✅ Minimal boxing - avoid unnecessary borders
- ✅ Use UN colors from globals.css (un-blue, trout, faded-jade, etc.)
- ✅ Extend existing infrastructure (URL-based state, document-api-handler)
- ✅ Use shadcn/ui components (Tooltip, Button, etc.)
- ✅ **Keep it simple** - don't overcomplicate, reuse existing patterns where possible

## Implementation Decisions (Ready to Code)

### ✅ Tailwind Color Strategy
**Decision:** Use inline styles with hex colors from globals.css
```typescript
// In treemap-config.ts
export const lengthColors: Record<string, string> = {
  'unknown': '#E5E7EB', // gray-200
  '<0.5k': '#4A7C7E',   // faded-jade
  '0.5k-1k': '#009edb', // un-blue
  // ... etc
};

// Usage in component:
<div style={{ backgroundColor: lengthColors[bucket.id], color: 'white' }}>
```
This avoids Tailwind JIT compilation issues while staying configurable.

### ✅ URL State Management
**Decision:** Keep it simple - reuse existing DocumentTable pattern

DocumentTable already handles URL state with `useSearchParams` + `useRouter`.
The treemap will use the same pattern - no need for complex shared hooks.

```typescript
// In resolutions-page-wrapper.tsx (client component)
const searchParams = useSearchParams();
const view = searchParams.get('view') || 'treemap';
const lengthBucket = searchParams.get('length_bucket');

// When clicking treemap cell:
const updateURL = () => {
  const params = new URLSearchParams(searchParams);
  params.set('view', 'table');
  params.set('length_bucket', bucketId);
  router.replace(`/resolutions?${params}`);
};
```

Simple, consistent with existing code, no new abstractions needed.

### ✅ Component Architecture
**Decision:** Simple wrapper pattern (like existing pages)

```
app/resolutions/page.tsx (SERVER - simple, just renders client component)
  ↓
components/resolutions-page-wrapper.tsx (CLIENT - 'use client')
  ↓ view toggle, URL state
  ├─ ResolutionsTreemapView (when view=treemap)
  └─ DocumentTable (when view=table)
```

This matches the existing pattern - no overcomplication.

### ✅ Accessibility
**Decision:** Basic accessibility only (not a core requirement)
- Proper semantic HTML (section, headings)
- Basic ARIA labels for screen readers
- Keyboard navigation (tab through cells)
- No need for alternative data views or advanced features

## Files to Modify/Create

**New files:**
- `src/components/resolutions-treemap-view.tsx` - Main container for treemap view
- `src/components/treemap-card.tsx` - Individual treemap with title
- `src/components/treemap-cell.tsx` - Single clickable cell (optional, could be inline)
- `src/lib/treemap-utils.ts` - Squarify algorithm (extract from examples)
- `src/lib/treemap-buckets.ts` - Bucketing logic for each dimension

**Modified files:**
- `src/app/resolutions/page.tsx` - Add view toggle, conditional rendering
- `src/lib/document-api-handler.ts` - Add aggregate mode + bucket filtering
- `src/components/document-table.tsx` - Handle bucket filters, add breadcrumb
- `src/types/index.ts` - Add bucket types, aggregate response types

## Success Metrics

- ✅ Users can quickly understand distribution patterns (length, similarity)
- ✅ Users can drill down from aggregate view to filtered table seamlessly
- ✅ Treemap updates dynamically when organ/recurring filters change
- ✅ URL state is shareable (colleagues can open same filtered view)
- ✅ Browser back/forward navigation works correctly
- ✅ Performance: treemap renders in <500ms even with all 41K resolutions
- ✅ Mobile experience is usable (stacked treemaps, scrollable)
- ✅ Accessibility: keyboard navigable, screen reader friendly

## Next Steps

1. **Validate bucket thresholds** - analyze actual data distribution
2. **Confirm design decisions** - empty buckets, mobile layout, tooltip details
3. **Begin Phase 1** - implement aggregate API endpoint
