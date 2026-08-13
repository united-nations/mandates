# The `unfck` branch — plan

A long-lived parallel branch of the mandate registry, to be published at
**mandates.unfck.org** as an unofficial alternative to https://mandates.un.org/.

The branch keeps every good change made on `dev`, but it does not keep the
changes that made the site more minimal. It also brings in all seven analytical
lenses, and puts them into the sections of `/secretariat` instead of a separate
analytics page.

Branch: `unfck`, cut from `dev` at `46eea37`.

---

## 1. Decisions

| Question | Decision |
| --- | --- |
| Section layout | Hybrid. Keep the explore cards **and** give entities, organs and subjects their own banner sections. |
| Section order | The mandates table is the top section. |
| Card strip | Stays above the table, as on `dev`. Each card also links down to its section. |
| Document types | Card and modal only. No dedicated section. |
| Lens pages | Keep `/missions`, `/reports`, `/instruments` and `/genealogy`. Delete the `/analytics` hub. |
| Implementation lenses | Go into a new fifth section, "What happens after the mandate is adopted?" |
| Wayfinding | Take `secretariat-wayfinding` only. Do **not** take `secretariat-calm-hierarchy` — it deletes the banners we are restoring. |
| Branding | Change the header wordmark from "United Nations" to "UNFCK". Nothing else. |

---

## 2. What the history shows

### The rich page

The last rich version of `/secretariat` is `0220dce~1` (22 July 2026). It had
four image-banner sections. Each one held a directory and one chart expander,
then a Background block, the Guterres quote with photo, and Further resources.

### The minimalisation

Seven commits, not one. The good and the bad changes are mixed together in the
same commits, so we cannot simply revert them:

| Commit | What it removed | What it added that we keep |
| --- | --- | --- |
| `0220dce` | Banner images, SG photo | `SectionHeader` |
| `78246ca` | All four sections; charts pushed to `/analytics` | — |
| `7391dfd` | — | `/methodology` page, tabbed analytics |
| `383b524` | — | Reworked mandate detail, explore modals |
| `fdb2a87` | — | Correct facet counts, exact subject matching |
| `373d51b` | — | Loading skeleton width fix |
| `5218d4f` | — | Four explore cards with filter-aware counts |

`feature-unified-view` (merged at `46eea37`) then added `MandateDetailUi`,
`RelatedMandates`, `MandateTopics`, `DocumentSymbol`, `DocumentsDirectory` and
the mandated-SG-reports block. All of these are kept.

### The lenses

`worktree-agent-a3d1aabe2f1eaf6e4` is a capstone branch. It merges all seven
lens branches plus the `/analytics` hub. **Nothing important is unmerged** — the
only branches outside it are two screenshot-only commits
(`worktree-agent-a48fe80cbbb00bde0`, `worktree-agent-aca22f0fc72b51321`).

### Merge cost — measured, not estimated

Since the fork point `0dd2d3c`, `dev` changed 100 files and the capstone changed
153. Only **five files overlap**. A dry-run merge gives:

```
website/src/app/@modal/(.)mandate/[...segments]/page.tsx   CONFLICT (3 hunks)
website/src/app/mandate/[...segments]/page.tsx             CONFLICT (3 hunks)
website/src/app/secretariat/page.tsx                       CONFLICT (6 hunks)
website/src/components/SiteHeader.tsx                      auto-merged, correct
website/package.json                                       auto-merged
```

Twelve conflict hunks in total. This is a small merge.

---

## 3. Target structure of `/secretariat`

```
Headline + intro text
Active-filter bar
Four explore cards      entities · organs · subjects · document types
                        (counts honour the active filters; each links to its section)
Sticky section nav      from secretariat-wayfinding

01  Which mandates is the UN working on?
    [ mandate explorer table ]
    ▸ Trends over time            resolutions vs cited · genuinely new
    ▸ Boilerplate genealogy       → /genealogy
    ▸ The reporting cycle         → /reports

02  Which entities are implementing the mandates?
    [ EntitiesDirectory ]
    ▸ Co-citations between entities

03  Which organs are creating the mandates?
    [ OrgansDirectory ]
    ▸ Citation patterns between entities and organs
    ▸ The language of command
    ▸ Consensus and contestation in the General Assembly
    ▸ Who votes with whom? Country blocs
    ▸ Mandate renewals: the Security Council leash

04  Which topics are the mandates about?
    [ SubjectsCompact / treemap ]
    ▸ Topic trends
    ▸ Which countries are the resolutions about?

05  What happens after the mandate is adopted?
    ▸ Peace operations: paper against ground   → /missions
    ▸ Sanctions and treaties                   → /instruments

Background · Quote · Further resources
```

Section 05 needs a banner image. `hero-banner-president.png` is the only one of
the six not already in use.

---

## 4. Work phases

### Phase 1 — Merge the capstone

```bash
git merge worktree-agent-a3d1aabe2f1eaf6e4
```

Resolve the three conflicts:

- **Both mandate detail pages.** Take the `dev` side as the base — it is newer
  and carries the unified view. Then graft one thing from the lens side: the
  vote strip (`MandateVoteStrip`, the `voteInfo` fetch). Note that the two sides
  each added a reports block: `dev` has `MandateSgReports` (the mandating
  resolution link) and the lens side has `MandateReportsSection` (the reports
  lens). Keep `MandateSgReports` — it is the newer and better-sourced one — and
  drop `MandateReportsSection` from the detail page.
- **`secretariat/page.tsx`.** Do not hand-resolve. Take either side to clear the
  conflict, then rewrite the file in Phase 2.
- Check that the auto-merged `SiteHeader` kept the `/methodology` link. In the
  dry run it did.

### Phase 2 — Rebuild `/secretariat`

Write the page to the structure in section 3, built from the components `dev`
has now, not the old ones. Keep `page.tsx` thin: it fetches the data and
composes section components. See section 5 for why this matters.

New files, all owned by `unfck` alone:

```
website/src/components/sections/SecretariatSection.tsx   banner + heading + slot
website/src/components/sections/MandatesSection.tsx
website/src/components/sections/EntitiesSection.tsx
website/src/components/sections/OrgansSection.tsx
website/src/components/sections/SubjectsSection.tsx
website/src/components/sections/ImplementationSection.tsx
```

Give each explore card an anchor link down to its matching section.

### Phase 3 — Redistribute the lenses

Move each lens into its section as an expander, per the table in section 3. Each
expander shows the headline figure and the lead chart, then links on to its full
page where one exists. The prose in the deleted `/analytics` hub is good — reuse
it as the expander summaries rather than writing new copy.

### Phase 4 — Delete the hub, fix the navigation

- Delete `website/src/app/analytics/page.tsx` and `AnalyticsTabs`.
- Delete `website/src/app/secretariat/analytics/page.tsx` (the unlinked tabbed
  page `dev` left behind).
- Nav becomes: Secretariat · System · Missions. Drop the Analytics item and the
  `analyticsRoutes` helper that goes with it.
- Redirect `/analytics` to `/secretariat` in `next.config.ts`.

### Phase 5 — Wayfinding

Merge `secretariat-wayfinding`. It was cut from `main`, so re-point the
`SectionNav` offsets and `scroll-mt` values at the five sections above. Its
active-filter pill overlaps the `ActiveFilters` bar `dev` already has — keep
`dev`'s bar and take only the sticky nav.

### Phase 6 — Branding

`SiteHeader.tsx` line 88: change `United Nations ` to `UNFCK `. Nothing else.

### Phase 7 — Verify

```bash
cd website && pnpm typecheck && pnpm lint && pnpm build
```

`/missions`, `/reports`, `/instruments` and `/genealogy` must still render, and
`/secretariat` must render with a filter applied.

---

## 5. How to keep the branch mergeable

`unfck` must pull updates from `dev` for a long time. The risk is
`secretariat/page.tsx`: `dev` changes it often, and our version is very
different. Every sync would conflict there.

The rule: **`unfck`'s extra content lives in files that `dev` does not have.**

- All section scaffolding goes in `components/sections/`, which exists only
  here. `dev` will never touch it, so it can never conflict.
- `page.tsx` stays a thin composition file. When `dev` changes it, the conflict
  is a few lines, not the whole page.
- Do not reformat or re-order shared files. A whitespace change in a shared file
  buys a conflict for no gain.
- Keep the branding change to the one line in `SiteHeader.tsx`.

## 6. Sync procedure

Always merge in one direction only — `dev` into `unfck`, never the reverse:

```bash
git checkout unfck
git merge dev
```

If `dev` ever minimises the page further, the conflict appears in `page.tsx`
alone. Resolve by keeping our section calls and taking `dev`'s changes to the
shared parts.

**The conflict surface, measured.** A future `git merge dev` can only conflict
in files that exist on both branches. Everything this branch adds lives in files
`dev` does not have, so the whole surface is eight files:

```
website/src/app/secretariat/page.tsx              76 lines   composition only
website/src/components/SiteHeader.tsx             36 lines   nav + wordmark
website/src/app/globals.css                       12 lines   from the capstone
website/src/components/MandateExplorerClient.tsx   7 lines   a comment
website/src/components/SectionBanner.tsx           4 lines   scroll-mt
website/src/components/RootLayoutClient.tsx        3 lines   route list
website/src/app/mandate/[...segments]/page.tsx               vote strip + chips
website/src/app/@modal/(.)mandate/…/page.tsx                 same, keep in step
```

About 138 changed lines in total, against 153 files brought in by the capstone.
Keep it that way: if a sync starts conflicting badly, the cause will be new
markup that crept into `page.tsx` instead of into `components/sections/`.

Do not push and do not open a pull request without being asked.

---

## 7. Open items

- **Deployment.** Written but deliberately inactive:
  `.github/workflows/unfck.yml.example`. It cannot run until the Azure Web App,
  the container registry and four repository secrets exist. The file's header
  lists the four steps to turn it on, the last being a rename that drops
  `.example`.
- **Database.** The language-of-command lens reads
  `digitallibrary.document_paragraphs`. Confirm the deploy target can reach it.
  The other lenses read static JSON checked into the repo.
- **Repository size.** The lens JSON adds about 7.7 MB, mostly
  `reports-lens.json` at 5.0 MB.
- **Not taken.** The four whole-site redesigns (Rams, editorial, terminal,
  brutalist), `secretariat-progressive-disclosure`, `secretariat-calm-hierarchy`
  and `worktree-mandate-sidebar` stay unmerged. Any of them can be revisited
  later. (`worktree-citation-matrix` was taken — see the audit in §8.)

- **"Length of resolutions" — the one explored idea with no successor.** Specced
  here rather than half-built, because it needs a new chart component and that
  deserves proper design time. The data is available and the query is cheap;
  `digitallibrary.document_paragraphs` gives one row per operative paragraph,
  joined to `digitallibrary.documents` on `symbol_normalized`:

  ```sql
  WITH per_doc AS (
    SELECT d.symbol_normalized,
           d.un_body                                  AS body,
           extract(year FROM d.date_publication)::int AS year,
           count(*)::int                              AS paragraphs
    FROM digitallibrary.document_paragraphs p
    JOIN digitallibrary.documents d USING (symbol_normalized)
    WHERE d.un_body IN ('General Assembly', 'Security Council',
                        'Economic and Social Council')
      AND d.date_publication IS NOT NULL
    GROUP BY 1, 2, 3
  )
  SELECT body,
         year,
         count(*)::int                                          AS documents,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY paragraphs) AS median_paragraphs
  FROM per_doc
  GROUP BY 1, 2
  HAVING count(*) >= 10   -- thin early years would swing the median wildly
  ORDER BY 1, 2;
  ```

  Use the **median**, not the mean: a handful of very long omnibus resolutions
  otherwise dominate. Home for it is the Mandates section, inside the existing
  "Trends over time" expander, as a third chart beside the citation and
  recurrence trends — it is the same kind of claim about the same corpus.
  Follow the `dataviz` skill before writing the chart.

---

## 8. Build log

All seven phases are done. The branch builds (`pnpm build`, exit 0) and
typechecks clean.

| Commit | Phase |
| --- | --- |
| `09df5d5` | This plan |
| `2fb0ea9` | 1 — merge the capstone |
| `cf35ee8` | 2 and 3 — rebuild the page, redistribute the lenses |
| `bc7a33f` | 4 and 6 — drop the hub, fix the nav, brand as UNFCK |
| `24412aa` | 5 — sticky section nav |

### Decisions taken while building

These differ from, or add to, the plan above. Each one is recorded in the
commit that made it.

1. **The travelling filter pill is kept.** The plan said to take only the
   sticky nav from `secretariat-wayfinding` and to drop its filter pill as a
   duplicate of dev's `ActiveFilters` bar. It is not a duplicate: the bar holds
   the detail but does not stick, and by the organs section it is thousands of
   pixels out of view. Both are kept, doing different jobs.

2. **Two deleted components are restored.** `SubjectsCompact` and
   `SubjectTreemap` were deleted on `dev` when the subjects section became a
   modal panel. The subjects section needs them, so they come back from the
   capstone. Neither exists on `dev`, so neither can conflict.

3. **`MandateReportsSection` is dropped, not merged.** It and dev's
   `MandateSgReports` answer the same question — which reports came back under
   this mandate. `MandateSgReports` answers it from the Digital Library
   catalogue rather than a static JSON snapshot, so it wins.
   `MandateVoteStrip` and `MandateImplementationChips` are grafted from the
   lens side, because they add something the dev page had no answer for.

4. **`/secretariat/analytics` is deleted too.** The plan only named the
   `/analytics` hub. `dev` also carries an unlinked tabbed analytics page,
   which the sections now replace. Both routes redirect to `/secretariat`.

5. **`DirectoryExplorer` is untouched.** The cards keep opening their modals.
   The sections give the same directories inline, with a different selection
   behaviour, which is the hybrid that was asked for: the cards are the fast
   filter path, the sections are the browsable one.

6. **Three shared files carry a small change each**, and these are the only
   places a future sync can conflict beyond `page.tsx`: `SiteHeader` (nav and
   wordmark), `SectionBanner` (`scroll-mt-20` → `scroll-mt-28`),
   `RootLayoutClient` (the back-button route list).

### Audit: was every explored feature merged?

No. The capstone held all seven analytical lenses, but not everything that was
built. Full sweep of the branches that carry data exploration:

| Branch | Date | In the capstone? | Verdict |
| --- | --- | --- | --- |
| `worktree-citation-matrix` | Jun 2026 | **No** | **Integrated** as an entities-section expander |
| the seven lens branches | Jul 2026 | Yes | Already here |
| `worktree-agent-a48fe80…`, `…aca22f0…` | Jul 2026 | Screenshots only | Nothing to take |
| `worktree-implementation-data-report` | Jul 2026 | No | Documentation only — 35 sources scored, no UI |
| `worktree-verb-importance-study` | Jul 2026 | No | Documentation only |
| `origin/feature/all-docs` | Feb 2026 | No | Pre-monorepo. Its recurrence and similarity stats are superseded by the recurrence trend and the genealogy lens. **"Length of resolutions" is the one idea in it with no successor.** |
| `origin/feature/insights` | Feb 2026 | No | Pre-monorepo, built on `all-docs` |
| `origin/feature/visualize-resolutions-table` | Oct 2025 | No | Pre-monorepo by two restructures; superseded |

The three `origin/feature/*` branches all predate the move of the app into
`website/`, so nothing can be cherry-picked from them cleanly. They are worth
reading for ideas, not for code.

Not data exploration, and still unmerged, so listed only so they are not lost:
`worktree-mandate-sidebar` (a detail-sidebar redesign) and the four whole-site
redesigns.

### Known state of `pnpm lint`

Six errors, all `@typescript-eslint/no-explicit-any` in
`website/src/lib/db/query.ts`. They are **pre-existing on `dev`** — that file is
byte-identical on `dev`, on the capstone and here. CLAUDE.md explicitly allows
`any` in the DB helpers' generic defaults; the eslint config has no exemption
for it. Not fixed here, because it is not this branch's business.
