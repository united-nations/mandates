# ISA — International Seabed Authority

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Session Documents** (Session Documents) — <https://isa.org.jm/sessions/31st-session-2026/> *(round 3: the recorded URL pointed at the 30th session, 2025 — superseded)*

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — per-session pages listing Assembly/Council/Finance Committee documents by agenda item, six languages. Individual documents also have their own permalinks (`isa.org.jm/documents/<symbol-slug>/`, e.g. `/documents/isba-31-a-crp-3/`) |
| 2 mandates (active) | no — re-confirmed round 3; session pages are plain document lists per agenda item, no status distinction between current and replaced decisions |
| 3 budget-linked | no — budget decisions exist as session documents (paired Assembly/Council decisions, e.g. the 2027–2028 proposed budget) but financial statements are standalone; no system links decisions to amounts (<https://isa.org.jm/organs/the-finance-committee/>, HTTP 200) |
| 4 implementation-linked | no |
| 5 results-linked | no — Secretary-General annual reporting is generic; the site's dashboards track contributions and capacity development, not outcomes per decision |
| 6 interoperability | deferred (later round) |

## Related portals (not linked to mandates)

- Finance Committee page with financial statements — <https://isa.org.jm/organs/the-finance-committee/> (HTTP 200 round 3).
- Contributions Dashboard and Capacity Development Dashboard, linked from the Finance Committee page.
- **"Selected Decisions and Documents" per-session compilations** (PDF), e.g. the 30th-session volume published 11 February 2026 — a genuine decisions compilation, but per session and PDF-only, so it does not move any point.

## Notes

- Round 3 link check: `/organs/the-assembly/`, `/organs/the-council/`, `/organs/the-secretariat/`, `/organs/the-finance-committee/` and `/sessions/30th-session-2025/` all HTTP 200.
- **Stale registry URL fixed.** The registry pointed at a specific session page, which ages out each year. The current session is the **31st (2026)**: <https://isa.org.jm/sessions/31st-session-2026/> (HTTP 200). There is **no stable sessions index**: `https://isa.org.jm/sessions/` redirects to an arbitrary agenda-item page of the previous session (observed: `/sessions-30th-session-2025-item16/`), so a per-session URL that must be rolled forward each year is unavoidable.
- **Oddity worth knowing:** `https://isa.org.jm/documents/` is **not** a document portal — it renders a publicly reachable WordPress admin manual ("ISA Docs", with `wp-admin` links and CMS screenshots). Do not link it.
- Round 3 contact: the recorded Secretariat page (<https://isa.org.jm/organs/the-secretariat/>) shows the address "14 - 20 Port Royal Street, Kingston, Jamaica" and phone "+1 (876) 922-9105", and confirms the Secretariat services Assembly and Council sessions. A dedicated contact page also exists at <https://isa.org.jm/contact-us/> (same address and phone plus an enquiry form). Note that `https://isa.org.jm/contact/` 301-redirects to the **DeepData database** contact page — not the ISA contact.

## Open questions

- Round 6 interoperability (per-document permalinks look scrapable; no API observed).

_Last verified: 2026-08-13 (research round 3, re-verification)._
