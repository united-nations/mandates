# Planning Complete - Implementation Handoff

**Date:** Planning Phase Completion
**Next Claude Session:** Start Implementation (Phase 1: API Enhancement)

---

## 📋 What Was Accomplished

### Planning Documents Created

1. **[PLAN.md](PLAN.md)** - Complete feature specification
   - 15 key decisions locked in
   - 5 implementation phases defined
   - Technical architecture documented
   - ~380 lines, comprehensive

2. **[IMPLEMENTATION_READY.md](IMPLEMENTATION_READY.md)** - Quick start guide
   - Code snippets ready to copy-paste
   - Step-by-step implementation guide
   - Testing checklists
   - Performance targets

3. **[STRATEGIC_REVIEW.md](STRATEGIC_REVIEW.md)** - Technical validation (optional)
   - Next.js 15 compliance check
   - Tailwind CSS best practices
   - Risk analysis and mitigation
   - Detailed architectural review

4. **[analyze_distribution.js](analyze_distribution.js)** - Data analysis script
   - Already run, results documented in PLAN.md
   - Can rerun if data changes

---

## ✅ All Decisions Made

| Decision | Choice |
|----------|--------|
| Architecture | Multiple independent treemaps (length + similarity) |
| Default view | Treemap (big picture first) |
| Colors | Inline styles with hex codes from globals.css |
| URL state | Reuse existing pattern (simple, no new abstractions) |
| Component structure | Simple wrapper (don't overcomplicate) |
| Caching | Reuse existing permanent cache (fast enough) |
| Accessibility | Basic only (not core requirement) |
| Mobile | Same layout, stacked vertically |
| Bucket labels | En dash: "0.5K⎼1K" |
| Titles | "Resolutions by length" / "Resolutions by similarity" |
| Tooltips | Count + percentage + rounded average (~) |
| Default filter | All Organs |
| Bucket ordering | Semantic (short→long, different→identical) |
| Tiny buckets | Show all, don't hide |
| Performance | <100ms treemap, <200ms click-to-table |

---

## 🎯 What to Build

Two independent treemaps on `/resolutions` page:

**Treemap 1: Resolutions by length**
- Buckets: Unknown, <0.5K, 0.5K⎼1K, 1K⎼2K, 2K⎼5K, >5K
- Colors: Spectrum from faded-jade to pale-oyster
- Unknown bucket will dominate (~64%)

**Treemap 2: Resolutions by similarity**
- Buckets: New/First, <30%, 30%⎼70%, 70%⎼90%, >90%
- Colors: Blue gradient (light to dark)
- New/First bucket will dominate (~78%)

**User Flow:**
1. Land on `/resolutions` → see treemap view (default)
2. Apply filters (organ, recurring) → treemap updates
3. Click treemap cell → switch to table view with bucket filter
4. Click "← Back to overview" → return to treemap

---

## 📂 Files to Create

**New Components:**
```
src/components/
  resolutions-page-wrapper.tsx      # 'use client', view toggle, URL state
  resolutions-treemap-view.tsx      # Renders both treemaps
  treemap-card.tsx                  # Single treemap with title

src/lib/
  treemap-utils.ts                  # Squarify algorithm (from snippets/)
  treemap-config.ts                 # Buckets + colors configuration
```

**Modify:**
```
src/app/resolutions/page.tsx        # Render wrapper component
src/lib/document-api-handler.ts     # Add mode=aggregate
src/types/index.ts                  # Add aggregate response types
```

---

## 🚀 Start Here (Phase 1)

**Next Claude session should:**
1. Read [IMPLEMENTATION_READY.md](IMPLEMENTATION_READY.md)
2. Start with Phase 1: API Enhancement
3. Follow the implementation phases sequentially

**Phase 1 deliverables:**
- [ ] Add `mode=aggregate` to document-api-handler.ts
- [ ] Implement bucketing logic for length
- [ ] Implement bucketing logic for similarity
- [ ] Test API performance (<100ms target)
- [ ] Test with filters (organ, recurring)

**Estimated time:** Phase 1 should take 1-2 hours

---

## 🔑 Key Implementation Notes

### Don't Overcomplicate
- Reuse existing patterns (DocumentTable URL state handling)
- No new state management abstractions needed
- Keep components simple and focused

### Colors Must Use Inline Styles
```typescript
// ✅ Correct (in treemap-config.ts)
export const lengthColors: Record<string, string> = {
  'unknown': '#E5E7EB',
  '<0.5k': '#4A7C7E',
  // ...
};

// ✅ Usage
<div style={{ backgroundColor: lengthColors[bucket.id], color: 'white' }}>

// ❌ WRONG - won't work with Tailwind JIT
<div className={`bg-${colorClass}`}>
```

### Performance Matters
- Target: <100ms for treemap load
- Target: <200ms for click-to-table transition
- Measure with `Performance.now()`
- Leverage existing permanent cache (already fast)

### Testing is Critical
- Test on actual mobile device (not just devtools)
- Verify tap targets are ≥44×44px
- Test browser back/forward navigation
- Test with invalid bucket names in URL

---

## 📊 Data Context (For Reference)

**Resolutions dataset:**
- Total: 41,204 resolutions
- Word count: 63.8% null, most non-null are 500-2000 words
- Similarity: 78.1% null, most non-null are high (70%+)

**This means:**
- "Unknown" and "New/First" buckets will be LARGE
- This is expected and documented in the plan
- Design accounts for dominant null categories

---

## 📖 Documentation Structure

```
HANDOFF.md (this file)         ← Start here for context
  ↓
IMPLEMENTATION_READY.md         ← Quick start guide with code snippets
  ↓
PLAN.md                         ← Full specification (reference)
  ↓
STRATEGIC_REVIEW.md             ← Technical deep-dive (optional)
```

---

## ✨ Success Criteria

**Functional:**
- [ ] Treemap loads and displays two independent treemaps
- [ ] Clicking cell filters table view correctly
- [ ] URL state is shareable (copy/paste works)
- [ ] Browser back/forward navigation works
- [ ] Filters (organ, recurring) update treemap

**Performance:**
- [ ] Treemap loads in <100ms
- [ ] Click-to-table transition in <200ms
- [ ] No janky scrolling or animations

**UX:**
- [ ] Mobile cells are tappable (44×44px minimum)
- [ ] Tooltips show useful information
- [ ] Loading states are clear
- [ ] Error states are handled

**Code Quality:**
- [ ] Reuses existing patterns
- [ ] No unnecessary abstractions
- [ ] TypeScript types are complete
- [ ] Configuration is easily adjustable

---

## 🎉 Ready to Ship!

All planning is complete. All decisions are made. Architecture is validated. Code patterns are documented. The next Claude session can start implementing immediately with Phase 1.

**Good luck with implementation!** 🚀

---

## Quick Q&A for Next Claude

**Q: Where do I start?**
A: Read IMPLEMENTATION_READY.md, then start Phase 1 (API Enhancement)

**Q: What if I find an issue with the plan?**
A: Document it, make a pragmatic decision, and note it in comments

**Q: Should I follow the phases strictly?**
A: Yes, they build on each other sequentially

**Q: Can I change the architecture?**
A: Only if necessary. Current architecture is validated and simple.

**Q: What about colors?**
A: Use inline styles with hex codes. Pattern is documented in IMPLEMENTATION_READY.md

**Q: How do I handle URL state?**
A: Reuse the DocumentTable pattern (useSearchParams + useRouter). Keep it simple.

**Q: What about accessibility?**
A: Basic only (semantic HTML, ARIA labels). Not a core requirement.

**Q: Should I add tests?**
A: Manual testing checklists are in IMPLEMENTATION_READY.md. Follow those.
