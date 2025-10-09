# Implementation Handoff: Resolutions Treemap Feature

**Status:** ✅ Ready for Implementation
**Planning Complete:** All decisions made, architecture validated
**Next Step:** Start Phase 1 (API Enhancement)

---

## Quick Start Guide for Next Claude Session

### What We're Building

Two independent treemaps on `/resolutions` page:
1. **"Resolutions by length"** - groups by word_count
2. **"Resolutions by similarity"** - groups by similarity_to_previous

**User flow:** Treemap (default) → click cell → filtered table view

### Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Colors** | Inline styles with hex codes | Avoids Tailwind JIT issues, stays configurable |
| **URL State** | Reuse existing pattern (useSearchParams) | Simple, consistent with DocumentTable |
| **Architecture** | Simple wrapper component | Don't overcomplicate existing infrastructure |
| **Accessibility** | Basic only | Not a core requirement |
| **Caching** | Reuse existing permanent cache | Fast enough (41K docs), no new infrastructure |
| **Mobile** | Same layout, stacked vertically | Keep it simple |

### Files to Create/Modify

**Create:**
- `src/components/resolutions-page-wrapper.tsx` - 'use client', view toggle, URL state
- `src/components/resolutions-treemap-view.tsx` - renders both treemaps
- `src/components/treemap-card.tsx` - single treemap with title
- `src/lib/treemap-utils.ts` - squarify algorithm (extract from snippets/)
- `src/lib/treemap-config.ts` - bucket definitions + color mappings

**Modify:**
- `src/app/resolutions/page.tsx` - render wrapper component
- `src/lib/document-api-handler.ts` - add `mode=aggregate` support
- `src/types/index.ts` - add aggregate response types

### Implementation Phases

**Phase 1: API Enhancement** (Start Here)
1. Add `mode=aggregate` to document-api-handler
2. Implement bucketing logic (length + similarity)
3. Test performance (<100ms target)

**Phase 2: Core Components**
1. Extract squarify from snippets/
2. Create treemap-config.ts with buckets + colors
3. Build treemap-card.tsx with mock data

**Phase 3: Integration**
1. Create resolutions-page-wrapper.tsx
2. Add view toggle (Treemap | Table tabs)
3. Connect to API, handle loading

**Phase 4: Navigation**
1. Click handlers on cells
2. Bucket filters in URL
3. "Back to overview" button

**Phase 5: Polish**
1. Test performance (measure timing)
2. Test on mobile (tap targets)
3. Basic accessibility + error handling

---

## Code Snippets (Copy-Paste Ready)

### treemap-config.ts

```typescript
// Bucket definitions
export interface BucketDefinition {
  id: string;           // URL-safe: 'unknown', '<0.5k', '0.5k-1k'
  label: string;        // Display: 'Unknown', '<0.5K', '0.5K⎼1K'
  min: number | null;
  max: number | null;
  description: string;  // For tooltips
}

export const lengthBuckets: BucketDefinition[] = [
  { id: 'unknown', label: 'Unknown', min: null, max: null, description: 'No word count data' },
  { id: '<0.5k', label: '<0.5K', min: 0, max: 500, description: 'Under 500 words' },
  { id: '0.5k-1k', label: '0.5K⎼1K', min: 501, max: 1000, description: '500 to 1,000 words' },
  { id: '1k-2k', label: '1K⎼2K', min: 1001, max: 2000, description: '1,000 to 2,000 words' },
  { id: '2k-5k', label: '2K⎼5K', min: 2001, max: 5000, description: '2,000 to 5,000 words' },
  { id: '>5k', label: '>5K', min: 5001, max: null, description: 'Over 5,000 words' },
];

export const similarityBuckets: BucketDefinition[] = [
  { id: 'new', label: 'New/First', min: null, max: null, description: 'No previous version' },
  { id: '<30', label: '<30%', min: 0, max: 0.30, description: 'Very different' },
  { id: '30-70', label: '30%⎼70%', min: 0.30, max: 0.70, description: 'Moderately similar' },
  { id: '70-90', label: '70%⎼90%', min: 0.70, max: 0.90, description: 'Very similar' },
  { id: '>90', label: '>90%', min: 0.90, max: 1.00, description: 'Nearly identical' },
];

// Color mappings (inline styles)
export const lengthColors: Record<string, string> = {
  'unknown': '#E5E7EB',  // gray-200
  '<0.5k': '#4A7C7E',    // faded-jade
  '0.5k-1k': '#009edb',  // un-blue
  '1k-2k': '#7D8471',    // camouflage-green
  '2k-5k': '#9B8B7A',    // pale-oyster
  '>5k': '#596B7D',      // shuttle-gray
};

export const similarityColors: Record<string, string> = {
  'new': '#E5E7EB',      // gray-200 (neutral)
  '<30': '#BFDBFE',      // light blue
  '30-70': '#60A5FA',    // medium blue
  '70-90': '#2563EB',    // dark blue
  '>90': '#1E40AF',      // darkest blue
};
```

### API Response Type

```typescript
// types/index.ts
export interface BucketData {
  count: number;
  percentage: number;
  avg_value?: number; // avg word count or avg similarity
}

export interface AggregateResponse {
  totals: {
    count: number;
    resolutions_with_word_count: number;
    resolutions_with_similarity: number;
  };
  buckets: {
    length: Record<string, BucketData>;
    similarity: Record<string, BucketData>;
  };
}
```

### API Handler Logic (add to document-api-handler.ts)

```typescript
// Inside createDocumentHandler function
const mode = searchParams.get('mode');

if (mode === 'aggregate') {
  // Apply existing filters first
  let filtered = allDocuments;
  if (organ) {
    filtered = filtered.filter(d => d.organ === organ);
  }
  if (isRecurringSeries) {
    filtered = filtered.filter(d => d.is_recurring_series === (isRecurringSeries === 'true'));
  }

  // Bucket by length
  const lengthBuckets: Record<string, BucketData> = {};
  // ... bucketing logic using treemap-config buckets

  // Bucket by similarity
  const similarityBuckets: Record<string, BucketData> = {};
  // ... bucketing logic

  return NextResponse.json({
    totals: {
      count: filtered.length,
      resolutions_with_word_count: filtered.filter(d => d.word_count !== null).length,
      resolutions_with_similarity: filtered.filter(d => d.similarity_to_previous !== null).length,
    },
    buckets: {
      length: lengthBuckets,
      similarity: similarityBuckets,
    },
  });
}
```

### URL State Pattern

```typescript
// In resolutions-page-wrapper.tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function ResolutionsPageWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = searchParams.get('view') || 'treemap';
  const organ = searchParams.get('organ') || 'All Organs';
  const lengthBucket = searchParams.get('length_bucket');
  const similarityBucket = searchParams.get('similarity_bucket');

  const updateView = (newView: 'treemap' | 'table') => {
    const params = new URLSearchParams(searchParams);
    if (newView === 'treemap') {
      params.delete('view');
      params.delete('length_bucket');
      params.delete('similarity_bucket');
    } else {
      params.set('view', 'table');
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const handleCellClick = (dimension: 'length' | 'similarity', bucketId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', 'table');
    if (dimension === 'length') {
      params.set('length_bucket', bucketId);
    } else {
      params.set('similarity_bucket', bucketId);
    }
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => updateView('treemap')}>Treemap</button>
        <button onClick={() => updateView('table')}>Table</button>
      </div>

      {/* Conditional rendering */}
      {view === 'treemap' ? (
        <ResolutionsTreemapView onCellClick={handleCellClick} organ={organ} />
      ) : (
        <DocumentTable config={resolutionsConfig} />
      )}
    </div>
  );
}
```

---

## Important Notes

### Performance Targets
- Treemap load: <100ms
- Click → table: <200ms
- Test with `Performance.now()` measurements

### Squarify Algorithm
Source: `snippets/BudgetTreemap.tsx`, `snippets/SDGExpensesTreemap.tsx`
Extract the layout calculation logic to `lib/treemap-utils.ts`

### Data Distribution (for reference)
- **Word count**: 63.8% null, most non-null are 500-2000 words
- **Similarity**: 78.1% null, most non-null are high (70%+)
- Unknown/New buckets will be LARGE in treemap

### Tooltip Content
Show on hover:
- Bucket label: "0.5K⎼1K words"
- Count: "1,456 resolutions"
- Percentage: "29.9%"
- Average: "~1,234 words avg" (rounded with ~)
- Hint: "Click to explore"

### Number Formatting
- Always calculate with exact values
- Display rounded (epistemic humility)
- Use ~ prefix: "~1,234 words"
- Match existing table rounding

---

## Testing Checklist

**Phase 1 (API):**
- [ ] `/api/resolutions?mode=aggregate` returns correct structure
- [ ] Filtered aggregate works: `?mode=aggregate&organ=General Assembly`
- [ ] Bucket counts are accurate
- [ ] Response time <100ms (measure it!)

**Phase 2 (Components):**
- [ ] Treemap renders with mock data
- [ ] Cells are sized proportionally
- [ ] Colors match config
- [ ] Tooltips work

**Phase 3 (Integration):**
- [ ] View toggle switches between treemap/table
- [ ] URL updates correctly
- [ ] Filters (organ, recurring) work
- [ ] Loading states show

**Phase 4 (Navigation):**
- [ ] Click cell → table view with bucket filter
- [ ] Browser back button works
- [ ] "Back to overview" button works
- [ ] Filter badges display

**Phase 5 (Polish):**
- [ ] Performance meets targets
- [ ] Mobile cells are tappable (44×44px)
- [ ] Tooltips work on mobile
- [ ] Error states handled
- [ ] Empty results handled

---

## Quick Reference

**Main Documentation:**
- [PLAN.md](PLAN.md) - Full feature specification
- [STRATEGIC_REVIEW.md](STRATEGIC_REVIEW.md) - Technical validation (optional reading)

**Key Patterns:**
- URL state: reuse DocumentTable pattern (useSearchParams + useRouter)
- Colors: inline styles with hex codes from globals.css
- Components: 'use client' for interactivity, keep simple
- API: extend document-api-handler with mode=aggregate

**Performance:**
- Leverage existing permanent in-memory cache
- Bucketing is O(n), fast for 41K docs
- Target <100ms aggregate, <200ms transitions

**Design:**
- Treemap default view ("big picture first")
- Two independent treemaps stacked vertically
- Semantic ordering (short→long, different→identical)
- Bucket labels with en dash: "0.5K⎼1K"

---

## Ready to Implement! 🚀

Start with **Phase 1: API Enhancement**. All decisions are made, architecture is validated, and code patterns are provided. Good luck!
