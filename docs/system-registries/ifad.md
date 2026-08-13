# IFAD — International Fund for Agricultural Development

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Members Platform** (Session Documents) — <https://webapps.ifad.org/members/gc>
  — publicly readable; per-session document sets for the Governing Council
  (latest: GC 49, 10–11 February 2026). Parallel Executive Board section at
  <https://webapps.ifad.org/members/eb>.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — but coarse: each session publishes **one** compiled PDF (`GC-49-Resolutions.pdf`, "Resolutions adopted by the Governing Council at its Forty-ninth session"), not per-resolution records. Some session documents are members-only |
| 2 mandates (active) | no — round 3 re-confirmed: no consolidated in-force/superseded list, no status index, no cross-session search |
| 3 budget-linked | no — no system links resolutions to budget data. Inherent overlap only: the annual administrative budget (GC 49/L.4, "IFAD's 2026 results-based programme of work, regular and capital budgets") and each replenishment are themselves adopted by GC resolutions carrying amounts; nothing connects resolutions to financial data as a system |
| 4 implementation-linked | no — no per-decision implementation tracking found in three rounds |
| 5 results-linked | no — results are reported against the per-replenishment Results Management Framework (RIDE report), not against specific GC resolutions |
| 6 interoperability | deferred — PDF per session; no structured export |

## Related portals (not linked to mandates)

- **Operations Dashboard** — <https://www.ifad.org/en/operations-dashboard>
  — live (round 3: HTTP 200 with a browser user-agent; `ifad.org` 403s
  plain fetchers). Projects, countries, performance data.
- **PRISMA Dashboard** — <https://www.ifad.org/en/prisma-dashboard> — live.
  Follow-up status of **evaluation** recommendations. Structurally the
  closest thing IFAD has to decision tracking, but the objects tracked are
  IOE recommendations, not governing-body resolutions.

## Notes

- **Round 3 (2026-08-13) link check: everything live.**
  `ifad.org/en/governing-bodies` 200, `webapps.ifad.org/members/gc` 200,
  `webapps.ifad.org/members/eb` 200, operations dashboard 200, PRISMA 200.
  No redirects, no content drift.
- **Governing bodies under the round-3 rule: both survive.** IFAD's own
  governance page is unusually explicit — the Governing Council "meets
  annually to decide on issues such as new members, appointing IFAD's
  President, **approving budgets**, and adopting policies, criteria and
  regulations"; the Executive Board "oversees the general operations of
  IFAD and **approves its programme of work**". Both therefore adopt IFAD's
  own mandates. Better per-body URLs than the shared overview page are
  available on the Members Platform.
- GC 49 approved the establishment of the IFAD14 replenishment
  consultation, reporting to GC 50 in 2027 — a report-back obligation that
  lives in resolution text only, with no tracker behind it.
- IFAD's transparency stack (Operations Dashboard, RMF, PRISMA, IATI) is
  entirely project- and replenishment-framework oriented; governing-body
  resolutions sit outside all of it. Unchanged since round 1.

## Open questions

- Whether a consolidated resolutions index exists behind the members-only
  parts of the platform. Members-only material is not citable for this
  survey either way — see UNCERTAINTIES on whether login-gated systems
  should ever be scored.

_Last verified: 2026-08-13 (research round 3, re-verification)._
