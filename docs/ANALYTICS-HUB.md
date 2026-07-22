# Analytics integration & the `/analytics` hub

This document records the capstone integration that gathered every analytical
lens of the UN Mandate Registry onto one branch and behind one hub page.

Branch: `worktree-agent-a3d1aabe2f1eaf6e4`
Base: `worktree-agent-acd86e6c146946080` (enhanced `/missions`: paper-vs-ground,
semantic target grades, renewal strips, map/timeline; already carrying the
heartbeat lens and the `/secretariat` renewals expander).

## What was merged

Seven feature branches were merged one at a time on top of the base, each
committed separately, `pnpm typecheck` green after every step.

| # | Branch | Brings | Conflicts |
|---|--------|--------|-----------|
| 1 | `worktree-agent-ab3eacee21e6a38e7` | `/instruments` (SC Consolidated Sanctions List + MTDSG treaty ratifications, paper-vs-ground), mandate-detail implementation chips, "Sanctions & Treaties" nav | none |
| 2 | `worktree-agent-aca22f0fc72b51321` | `/reports` (reporting cycle + request→response implementation samples), per-mandate reporting-cycle section, "Reporting Cycle" nav | `SiteHeader.tsx` nav list |
| 3 | `worktree-lens-consensus` | GA consensus + geopolitics expanders on `/secretariat`, adoption vote strip + named minority on mandate detail | both mandate routes (imports), `/secretariat` expander stack |
| 4 | `worktree-agent-a712e16ac6db68deb` | "The language of command" expander on `/secretariat` | `/secretariat` (imports, data fetch, expander stack) |
| 5 | `worktree-country-attention-map` | Country attention-map choropleth on `/secretariat` (Subjects section) | none (added `d3-geo` + `topojson-client` deps → `pnpm install`) |
| 6 | `worktree-agent-af78fc863d389bbda` | `/genealogy` page (boilerplate genealogy) + its `/secretariat` link card | none |
| 7 | `worktree-agent-acf30d8289d981eab` | Docs-only SPM assessment | none |

### Notable conflict resolutions

- **`SiteHeader.tsx`** — several branches append to one `navItems` array. Each
  conflict was resolved by *unioning* the items, never dropping one. (The final
  nav was then rationalized — see below.)
- **Both mandate routes** (`app/mandate/[...segments]/page.tsx` and
  `app/@modal/(.)mandate/[...segments]/page.tsx`, kept identical) — three
  separate branches add a section to the mandate detail: implementation chips
  (header), the adoption vote strip (top of content), and the reporting-cycle
  section (after citation counts). Git auto-merged the JSX bodies cleanly; only
  the import blocks collided and were unioned. All three sections now coexist in
  both routes in a sensible, non-colliding order.
- **`/secretariat` expander stack** — branches 3 and 4 both insert
  `ExpandableCard`s at the same spot in the Organs section, and branch 4's older
  base tangled the auto-merge across the renewals/consensus/geopolitics cards.
  Reconstructed by hand so all four expanders render in order with stable
  deep-link ids: `#language-of-command`, `#renewals`, `#ga-consensus`,
  `#geopolitics`. A `#attention-map` id was added to the Subjects-section map
  card for the hub's deep link.
- **`package.json`** — `d3-geo`, `topojson-client` and their `@types` were
  unioned in; `pnpm install` re-run and `pnpm-lock.yaml` committed.

## Navigation rationalization

After merging, the header would have carried Secretariat, System, Missions,
Sanctions & Treaties, Reporting Cycle (+ Genealogy reachable only from a card).
That is too many peers for the site's minimal, left-aligned chrome.

Decision: keep the **three mandate-family registries** as core destinations
(UN Secretariat Mandates, UN System Mandates, Peace Operation Mandates) and
collapse **every analytical lens** under a single **Analytics** entry that
points at the new `/analytics` hub. No routes were deleted — `/instruments`,
`/reports`, `/genealogy` remain and are reached from the hub. The Analytics nav
item stays highlighted while visiting any of those lens sub-routes
(`isNavActive` in `SiteHeader.tsx`). `/analytics` is registered as a top-level
page in `RootLayoutClient` (no back button, like `/reports`).

## The hub (`/analytics`)

One server-component page, `website/src/app/analytics/page.tsx`, that presents
all seven lenses in a story arc. Each section has: a claim-style title stating
the finding, one reused visual, a takeaway with the real numbers, and an
"explore →" deep link.

Order (story arc) and data source:

1. **The language of command** → `#language-of-command`. Visual
   `LanguageStrengthGradient`. **DB-fed** (`getLanguageStrength`) — see
   graceful degradation below.
2. **Consensus & geopolitics** → `#ga-consensus`. Visual
   `VotingIdealPointTrends` (static `country-votes` JSON).
3. **Country attention** → `#attention-map`. Visual `CountryAttentionMap`
   (static `country-attention.json`).
4. **Boilerplate genealogy** → `/genealogy`. Visual `GenealogyHeadline`
   (static `genealogy.json`).
5. **The reporting cycle** → `/reports`. Stat strip + `ReportsLensYearChart`
   (static `reports-lens.json`).
6. **Missions: paper vs ground** → `/missions` and `#renewals`. Stat strip +
   `MandateHeartbeat` (static `sc-renewals.json` / mission-implementation JSON).
7. **Sanctions & treaties** → `/instruments`. Stat strip +
   `DesignationCadenceChart` (static sanctions/treaty JSON).

### Graceful degradation for DB-fed sections

Only the command-language lens reads the database. It is isolated in its own
`async` sub-component (`CommandLanguageVisual`) that awaits the query inside a
`try/catch`; on failure it renders a text-only takeaway instead of throwing.
This keeps the whole hub renderable even when the DB is unavailable — six of the
seven lenses are entirely static-JSON-fed and never touch the DB.

The hub's stat numbers are read from the same accessors the full pages use, so
they stay in lock-step (verified: reports 2,586 / 7,505 / 60% / 97.6%; missions
21 / 86% / 573 / 2,577; genealogy 26.4% / 68% / 45%; instruments 14 / 1,010 / …
all match their source pages).

## Validation

- `pnpm typecheck` — clean.
- `pnpm lint` — only the pre-existing 6 `lib/db/query.ts` `any` errors (allowed)
  plus pre-existing warnings; no new problems from merged or new code.
- Dev server on port 3031. Screenshots in `docs/analytics-hub/screenshots/`.

### What rendered locally vs what was DB-blocked

The local Postgres reachable from this machine **connects but lacks the registry
schema** (`relation "public.unified_documents" does not exist`,
`ppb2026.budget_documents` missing). Consequently:

- **Fully rendered & screenshotted** (static-JSON-fed): `/analytics` (all seven
  sections; the command-language section correctly showed its graceful text
  fallback), `/missions`, `/reports`, `/instruments`, `/genealogy`.
- **DB-blocked locally** (render in production, validated by typecheck + merge
  review): `/secretariat` (its expanders and explorer are DB-fed) and the
  **mandate detail** pages (`getMandateBySymbol` returns null against the empty
  DB → `notFound()`), which is where the merged vote strip + reporting section +
  implementation chips live. Those three sections were integrated identically
  into both mandate routes and verified to occupy distinct, ordered slots (chips
  in the header button row; vote strip at the top of the content column; reports
  section after citation counts) so they cannot collide.

## Known issues / follow-ups

- Mandate-detail collision check and `/secretariat` expander rendering could not
  be visually confirmed on this machine (empty local DB); confirm on a DB with
  the registry schema or in the deployed dev environment.
- The command-language hub section shows its text fallback until it runs against
  a populated DB; it will surface the live gradient + SG-vs-Member-States figures
  automatically there.
