# Strategic Review: Resolutions Treemap Feature

**Date:** Planning Phase Completion
**Reviewer:** Claude (Architectural Analysis)
**Scope:** Next.js 15, Tailwind CSS, React 18 Best Practices

---

## ✅ Architecture Validation

### Next.js 15 Compliance

**Current Setup:**
- Next.js 15.4.1 with App Router ✅
- Turbopack enabled for dev ✅
- Standalone output mode ✅
- Route handlers using NextRequest/NextResponse ✅

**Plan Compliance:**
1. ✅ **API Routes**: Using Route Handlers (`/api/resolutions/route.ts`) - correct pattern
2. ✅ **Server Components**: Page components are server by default (`resolutions/page.tsx`)
3. ✅ **Client Components**: Interactive components use `'use client'` directive
4. ⚠️ **Potential Issue**: Need to ensure proper client/server boundary

**Recommendation:**
```typescript
// src/app/resolutions/page.tsx (Server Component)
export default function ResolutionsPage() {
  return <ResolutionsPageClient />; // Client component handles interactivity
}

// src/components/resolutions-page-client.tsx ('use client')
'use client';
export function ResolutionsPageClient() {
  // Treemap view, table view, URL state management
  // All client-side interactivity here
}
```

### Tailwind CSS Best Practices

**Current Setup:**
- Tailwind 3.4.1 ✅
- Custom color palette in globals.css ✅
- tailwindcss-animate plugin ✅
- Proper CSS variable usage ✅

**Plan Compliance:**
1. ✅ All colors from globals.css (using CSS variables)
2. ✅ Utility-first approach
3. ✅ Responsive design with breakpoints
4. ⚠️ **Potential Issue**: Dynamic class generation

**⚠️ WARNING - Tailwind Dynamic Classes:**

The plan mentions using configurable colors like:
```typescript
const treemapColors = {
  'length-1': 'bg-faded-jade text-white',
  'length-2': 'bg-un-blue text-white',
}
```

**This violates Tailwind's JIT compiler!** Dynamic class names don't work with Tailwind unless they're in the safelist.

**✅ SOLUTION:**
Use inline styles with CSS variables for dynamic colors:
```typescript
<div
  style={{
    backgroundColor: 'var(--faded-jade)',
    color: 'white'
  }}
>
```

OR use data attributes + CSS:
```css
/* globals.css */
[data-color="length-1"] { @apply bg-faded-jade text-white; }
[data-color="length-2"] { @apply bg-un-blue text-white; }
```

```typescript
<div data-color="length-1">
```

---

## 🔍 Architectural Concerns

### 1. Client/Server Component Boundary

**Current Pattern:**
- `resolutions/page.tsx` is currently a simple server component
- `DocumentTable` is a client component with all state management

**Treemap Plan:**
- Need view toggle (treemap/table)
- Need URL state management
- Need data fetching

**⚠️ ISSUE:** Where should the view toggle live?

**✅ RECOMMENDED ARCHITECTURE:**

```
┌─────────────────────────────────────────────────┐
│ app/resolutions/page.tsx (SERVER)               │
│ - Reads searchParams for view mode              │
│ - Decides which component to render              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ components/resolutions-page-wrapper.tsx (CLIENT)│
│ - View toggle tabs                               │
│ - Organ/recurring filters                        │
│ - URL state management                           │
│ - Conditional rendering of treemap/table        │
└─────────────────────────────────────────────────┘
                      ↓
        ┌──────────────────────┬────────────────────────┐
        │                      │                        │
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ TreemapView   │    │ DocumentTable   │    │ FilterControls  │
│ (CLIENT)      │    │ (CLIENT)        │    │ (CLIENT)        │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

**Why this matters:**
- searchParams in Next.js 15 App Router should be read in Server Components
- But view toggle needs client-side interactivity
- Solution: Server component passes initial state to client wrapper

### 2. Data Fetching Strategy

**Current Pattern:**
- API route: `/api/resolutions/route.ts`
- Client-side fetch in `DocumentTable` component
- In-memory cache on server (good!)

**Treemap Plan:**
- New mode: `?mode=aggregate`
- Returns bucketed counts instead of documents

**⚠️ POTENTIAL ISSUE:** Race conditions

When clicking treemap cell:
1. URL updates with bucket filters
2. View switches to table
3. Table fetches data with bucket filters

**✅ SOLUTION:** Use React 18 Suspense boundaries
```typescript
<Suspense fallback={<TableSkeleton />}>
  <DocumentTable filters={bucketFilters} />
</Suspense>
```

### 3. URL State Management

**Current Pattern:**
- `DocumentTable` manages its own URL state
- Uses `useSearchParams`, `useRouter`, `usePathname`
- Updates URL with `router.replace`

**Treemap Plan:**
- View toggle also needs URL state
- Bucket filters need URL state
- Must coordinate with existing table filters

**⚠️ ISSUE:** Two components (treemap + table) both managing URL state = potential conflicts

**✅ RECOMMENDED SOLUTION:**

Create a shared URL state manager:
```typescript
// lib/url-state-manager.ts
export function useResolutionsState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = searchParams.get('view') || 'treemap';
  const organ = searchParams.get('organ') || 'All Organs';
  const lengthBucket = searchParams.get('length_bucket');
  const similarityBucket = searchParams.get('similarity_bucket');

  const updateState = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    // ... update logic
    router.replace(`${pathname}?${params.toString()}`);
  };

  return { view, organ, lengthBucket, similarityBucket, updateState };
}
```

Use this hook in both treemap and table components - single source of truth.

### 4. Performance Considerations

**Squarify Algorithm:**
- Recursive algorithm on potentially 30+ cells (6 length × 5 similarity)
- Client-side layout calculation

**⚠️ CONCERN:** Could be slow on mobile/low-end devices

**✅ MITIGATION:**
1. Memoize squarify calculations:
```typescript
const layout = useMemo(
  () => squarify(buckets, 0, 0, 100, 100),
  [buckets] // Only recalculate when buckets change
);
```

2. Consider using Web Workers for complex calculations (overkill for this, probably)

3. Profile on low-end devices during Phase 5

**API Performance:**
- Target: <100ms for aggregate
- 41K documents in memory: ~8-10MB
- Bucketing operation: O(n) iteration + grouping

**✅ VALIDATION:**
This is fast. Iterating 41K objects and grouping is <10ms on modern hardware.
The bottleneck will be network latency, not computation.

---

## 🚨 Open Questions & Risks

### Critical Questions

**1. Server-Side Rendering (SSR) vs Client-Side Rendering (CSR)**

**Question:** Should the treemap be server-rendered or client-rendered?

**Current Plan:** Client-side (fetch aggregate data on mount)

**Alternative:** Server-side
```typescript
// app/resolutions/page.tsx
export default async function ResolutionsPage({ searchParams }) {
  const organ = searchParams.organ || 'All Organs';
  const aggregateData = await fetchAggregateData(organ); // Server-side

  return <TreemapView data={aggregateData} />;
}
```

**Pros of SSR:**
- Faster initial paint (no loading spinner)
- Better SEO (not relevant for this app)
- No client-side fetch on mount

**Cons of SSR:**
- Can't use `'use client'` hooks easily
- More complex for interactive updates

**✅ RECOMMENDATION:** Stay with CSR (client-side fetch)
- App is behind login/auth (no SEO concerns)
- Interactive filtering needs client state anyway
- Simpler implementation

**2. Filter State Persistence**

**Question:** Should filter state persist across page navigations?

Example:
1. User sets organ=GA, view=treemap
2. User clicks entity link → goes to /entity/UNDP
3. User clicks back → should filters be restored?

**Current Behavior:** URL-based, so YES they persist (good!)

**✅ CONFIRMED:** No change needed. URL state handles this.

**3. Mobile Treemap Interactions**

**Question:** On mobile, cells might be very small (<1cm²). How to handle taps?

**Potential Issues:**
- Fat finger problem
- Small cells hard to tap
- Tooltips on mobile (no hover)

**✅ SOLUTIONS:**
1. Minimum cell size: 44×44px (iOS/Android touch target guidelines)
2. If cell too small after squarify, either:
   - Combine with adjacent bucket
   - OR show as "Others" category
3. Mobile tooltips: Tap to show, tap outside to dismiss
4. Consider tap-and-hold for detailed tooltip

**Action Item:** Add to Phase 5 testing

**4. Accessibility (a11y)**

**Question:** How do screen readers interact with treemap?

**Current Plan:** "Accessibility (keyboard navigation, ARIA labels)"

**⚠️ NOT SUFFICIENT!** Treemaps are inherently visual.

**✅ ACCESSIBILITY STRATEGY:**

1. **Semantic HTML:**
```typescript
<section aria-label="Resolutions by length">
  <div role="list">
    <div role="listitem" aria-label="0.5K to 1K words: 1,456 resolutions (29.9%)">
      {/* Visual cell */}
    </div>
  </div>
</section>
```

2. **Keyboard Navigation:**
- Tab through cells
- Enter/Space to activate (same as click)
- Arrow keys to navigate between cells

3. **Alternative View:**
Consider adding a "Data Table" view of the treemap data:
```
[Treemap] [Table] [Data View]
              ↑
        Simple table showing buckets + counts
```

This gives screen reader users a way to understand the distribution.

**Action Item:** Add to Phase 4 or 5

**5. Error Handling**

**Question:** What happens if:
- API fails to return data?
- Invalid bucket filters in URL?
- 0 results for a filter combination?

**Current Plan:** "Error handling and edge cases" (Phase 5)

**✅ SPECIFIC ERROR SCENARIOS:**

1. **API Failure:**
```typescript
if (error) {
  return <ErrorState message="Failed to load data" retry={refetch} />;
}
```

2. **Invalid Bucket Filter:**
```typescript
// Example: ?length_bucket=invalid
// Solution: Ignore invalid filters, show all data
const validBuckets = ['<0.5k', '0.5k-1k', ...];
const lengthBucket = validBuckets.includes(urlParam) ? urlParam : null;
```

3. **0 Results:**
```typescript
if (filteredData.length === 0) {
  return (
    <EmptyState
      message="No resolutions match these filters"
      action={<Button onClick={clearFilters}>Clear filters</Button>}
    />
  );
}
```

**Action Item:** Define error states in types

### Non-Critical Questions

**6. Animation Performance**

**Question:** Should cells animate when treemap updates (filter change)?

**Consideration:**
- Framer Motion is already in dependencies
- Could animate cell positions smoothly
- But: might be distracting or slow

**✅ RECOMMENDATION:** Start without animations, add in Phase 6 if desired

**7. Export Functionality**

**Question:** Should users be able to export treemap as image?

**Current Plan:** Phase 6 (future enhancement)

**✅ RECOMMENDATION:** Use `html-to-canvas` or similar
- Capture treemap DOM as canvas
- Download as PNG
- Low priority for MVP

**8. Comparison View**

**Question:** Show two treemaps side-by-side (e.g., GA vs ECOSOC)?

**Current Plan:** Phase 6 (future enhancement)

**✅ RECOMMENDATION:** Good idea but complex
- Would need split view with synchronized filters
- URL state becomes more complex: `?view=compare&left=GA&right=ECOSOC`
- Defer to post-MVP

---

## 📋 Implementation Checklist

### Before Starting Implementation

- [ ] **Decision:** Confirm client-side fetch vs server-side data passing
- [ ] **Decision:** Confirm Tailwind dynamic color strategy (inline styles vs data attributes)
- [ ] **Architecture:** Create URL state manager (shared hook)
- [ ] **Architecture:** Define client/server boundary (wrapper component)
- [ ] **Types:** Add error state types to `types/index.ts`
- [ ] **Accessibility:** Define keyboard navigation spec

### Phase 0: Setup (NEW - Before Phase 1)

- [ ] Create shared URL state manager (`lib/resolutions-url-state.ts`)
- [ ] Create page wrapper component (`components/resolutions-page-wrapper.tsx`)
- [ ] Define TypeScript types for:
  - [ ] Bucket configuration
  - [ ] Aggregate API response
  - [ ] Treemap layout (rectangles)
  - [ ] Error states
- [ ] Set up color strategy in `treemap-config.ts` (inline styles or data attributes)

### Updated Phase 1: API Enhancement

- [ ] Add `mode=aggregate` support to `document-api-handler.ts`
- [ ] Implement bucketing logic (use config from `treemap-config.ts`)
- [ ] Add bucket filtering logic (when `length_bucket` or `similarity_bucket` params present)
- [ ] Test API performance (measure actual timing, confirm <100ms)
- [ ] Test with invalid bucket names (error handling)
- [ ] Document API endpoints and response types

### Updated Phase 2: Core Components

- [ ] Extract and test squarify algorithm (unit tests!)
- [ ] Create TreemapCard component
  - [ ] Memoize layout calculations
  - [ ] Handle empty/loading states
- [ ] Create TreemapCell component
  - [ ] Minimum size enforcement (44×44px)
  - [ ] Hover/tap states
  - [ ] Keyboard focus styles
- [ ] Test on mobile (actual device, not just devtools)

### Updated Phase 4: Navigation & Integration

- [ ] Implement breadcrumb/back button
- [ ] Implement filter badges
- [ ] Test URL state edge cases:
  - [ ] Invalid bucket names
  - [ ] Missing required params
  - [ ] Deep linking (share URL with filters)
  - [ ] Browser back/forward
- [ ] Test transition speed (measure: treemap → table)

### Updated Phase 5: Polish

- [ ] **Performance profiling:**
  - [ ] Measure treemap render time
  - [ ] Measure API response time
  - [ ] Measure click-to-table transition
  - [ ] Profile on low-end device (mobile)
- [ ] **Accessibility audit:**
  - [ ] Screen reader testing (NVDA/VoiceOver)
  - [ ] Keyboard navigation testing
  - [ ] Color contrast validation (WebAIM checker)
  - [ ] Consider alternative data view
- [ ] **Mobile testing:**
  - [ ] Touch target sizes
  - [ ] Tooltip behavior
  - [ ] Viewport sizing
- [ ] **Error handling:**
  - [ ] API failure states
  - [ ] Invalid filters
  - [ ] Empty results
  - [ ] Network timeout

---

## 🎯 Success Criteria (Measurable)

### Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Treemap load time | <100ms | Chrome DevTools Performance tab |
| Click-to-table transition | <200ms | Time from click to table render |
| API aggregate response | <100ms | Server-side timing logs |
| Squarify calculation | <10ms | Performance.now() measurement |
| Mobile frame rate | 60fps | No janky scrolling/animations |

### Accessibility Targets

| Criterion | Standard | Testing Method |
|-----------|----------|----------------|
| Color contrast | WCAG AA | WebAIM Contrast Checker |
| Keyboard navigation | All cells reachable | Manual testing |
| Screen reader | Meaningful labels | NVDA/VoiceOver |
| Touch targets | ≥44×44px | Mobile device testing |
| Focus indicators | Visible | Keyboard testing |

### User Experience Targets

| Goal | Success Metric |
|------|----------------|
| Intuitive navigation | Users can find table from treemap without instructions |
| Fast interactions | No visible loading spinners (<200ms) |
| Mobile usable | Can tap cells and view table on phone |
| Filter persistence | URL can be shared, filters preserved |
| Error recovery | Clear error messages with recovery actions |

---

## 🔧 Recommended Code Patterns

### Pattern 1: Shared URL State Hook

```typescript
// lib/resolutions-url-state.ts
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export type ViewMode = 'treemap' | 'table';

export interface ResolutionsFilters {
  view: ViewMode;
  organ: string;
  recurringSeries: string;
  lengthBucket?: string;
  similarityBucket?: string;
}

export function useResolutionsState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: ResolutionsFilters = {
    view: (searchParams.get('view') as ViewMode) || 'treemap',
    organ: searchParams.get('organ') || 'All Organs',
    recurringSeries: searchParams.get('recurringSeries') || 'all',
    lengthBucket: searchParams.get('length_bucket') || undefined,
    similarityBucket: searchParams.get('similarity_bucket') || undefined,
  };

  const updateFilters = useCallback((updates: Partial<ResolutionsFilters>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === 'treemap' || value === 'All Organs' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newURL, { scroll: false });
  }, [searchParams, pathname, router]);

  return { filters, updateFilters };
}
```

### Pattern 2: Treemap Color Mapping (Safe for Tailwind)

```typescript
// lib/treemap-config.ts

// Option A: Inline styles with CSS variables
export const lengthColors: Record<string, string> = {
  'unknown': 'rgb(229, 231, 235)', // gray-200
  '<0.5k': '#4A7C7E', // faded-jade
  '0.5k-1k': '#009edb', // un-blue
  '1k-2k': '#7D8471', // camouflage-green
  // ... etc
};

// Usage:
<div style={{ backgroundColor: lengthColors[bucket.id] }}>

// Option B: Data attributes + CSS (in globals.css)
export const lengthColorClasses: Record<string, string> = {
  'unknown': 'treemap-neutral',
  '<0.5k': 'treemap-length-1',
  '0.5k-1k': 'treemap-length-2',
  // ... etc
};

// In globals.css:
.treemap-neutral { @apply bg-gray-200 text-gray-700; }
.treemap-length-1 { @apply bg-faded-jade text-white; }
.treemap-length-2 { @apply bg-un-blue text-white; }

// Usage:
<div className={lengthColorClasses[bucket.id]}>
```

### Pattern 3: Bucket Configuration

```typescript
// lib/treemap-config.ts

export interface BucketDefinition {
  id: string; // URL-safe identifier
  label: string; // Display label with en dash
  min: number | null;
  max: number | null;
  colorKey: string;
  description: string; // For tooltips/accessibility
}

export const lengthBuckets: BucketDefinition[] = [
  {
    id: 'unknown',
    label: 'Unknown',
    min: null,
    max: null,
    colorKey: 'neutral',
    description: 'Resolutions without word count data',
  },
  {
    id: '<0.5k',
    label: '<0.5K',
    min: 0,
    max: 500,
    colorKey: 'length-1',
    description: 'Very short resolutions (under 500 words)',
  },
  {
    id: '0.5k-1k',
    label: '0.5K⎼1K',
    min: 501,
    max: 1000,
    colorKey: 'length-2',
    description: 'Short resolutions (500 to 1,000 words)',
  },
  // ... etc
];

// Helper function
export function getBucketForValue(
  value: number | null,
  buckets: BucketDefinition[]
): BucketDefinition | undefined {
  if (value === null) {
    return buckets.find(b => b.min === null && b.max === null);
  }
  return buckets.find(b =>
    b.min !== null && b.max !== null &&
    value >= b.min && value <= b.max
  );
}
```

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tailwind JIT doesn't compile dynamic classes | High | Medium | Use inline styles or data attributes (documented above) |
| URL state conflicts between treemap/table | High | Medium | Use shared URL state hook (pattern above) |
| Mobile cells too small to tap | Medium | High | Enforce minimum size, combine small buckets |
| Screen reader can't understand treemap | Medium | Medium | Add semantic HTML + alternative data view |
| Performance <100ms not achieved | Medium | Low | Profile + optimize, bucketing is fast in practice |
| Browser back button doesn't restore state | High | Low | URL-based state handles this automatically |

---

## ✅ Final Recommendations

### Do These Before Implementation

1. **Create shared URL state hook** - prevents conflicts
2. **Decide on color strategy** - inline styles (recommended) or CSS classes
3. **Add minimum cell size logic** - prevents tap issues on mobile
4. **Plan accessibility from day 1** - not as afterthought

### Consider Adding to Plan

1. **Phase 0: Setup** - create foundations before Phase 1
2. **Alternative data view** - table of bucket counts for accessibility
3. **Error state designs** - what does API failure look like?
4. **Mobile-specific tests** - in Phase 5 checklist

### Can Defer to Post-MVP

1. Animations on treemap updates
2. Export to image functionality
3. Comparison view (two treemaps side-by-side)
4. Web Workers for layout calculation (overkill)

---

## 📝 Summary

**Status:** ✅ Plan is architecturally sound with minor adjustments needed

**Key Adjustments Required:**
1. Tailwind dynamic class strategy → Use inline styles or data attributes
2. URL state management → Create shared hook
3. Client/server boundary → Define wrapper component pattern
4. Accessibility → Add specific requirements

**Green Lights:**
- Next.js 15 patterns ✅
- API caching strategy ✅
- Performance targets realistic ✅
- Component architecture sound ✅
- Responsive design feasible ✅

**Yellow Flags (addressable):**
- Dynamic Tailwind classes ⚠️ → Fix with inline styles
- Mobile tap targets ⚠️ → Add minimum size constraint
- Screen reader support ⚠️ → Add semantic HTML + alternative view
- URL state coordination ⚠️ → Create shared hook

**No Red Flags!** 🎉

The plan is ready for implementation with the adjustments noted above.
