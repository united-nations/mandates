# IMF — International Monetary Fund

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Selected Decisions** (Decisions Database) — <https://www.imf.org/en/publications/selected-decisions/selected-decisions-list>
  — per-decision web pages, with a sibling index by decision number at
  `/en/Publications/Selected-Decisions/selected-decisions-list-by-number`
  and per-decision detail URLs of the form
  `/en/Publications/Selected-Decisions/description?decision=16645-(20/5)`.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — decisions, interpretations and resolutions of the Executive Board and the Board of Governors, browsable by subject and by number |
| 2 mandates (active) | yes — Selected Decisions compiles decisions *currently applicable*; the front matter states that decisions which lapsed or were superseded are deleted from each issue. In-force by design. "Selected" means curated, not exhaustive — the known limitation |
| 3 budget-linked | no — no system connects decisions to budget or financial information; decision pages are text-only |
| 4 implementation-linked | no — no per-decision implementation reporting found in three rounds |
| 5 results-linked | no — no results/outcome reporting against specific Board decisions |
| 6 interoperability | deferred — HTML per decision plus a whole-issue PDF; no export or API found |

## Related portals (not linked to mandates)

None verified. `imf.org` remains unfetchable to every non-interactive
client (see below), so IMF Finances and the Annual Report could not be
checked for decision references in this round either.

## Notes

- **Round 3 (2026-08-13) link check: not directly verifiable — three
  methods blocked.** `imf.org` served an Akamai "Access Denied" page
  (reference `18.942b2117…`) to WebFetch, to `curl` with a desktop Chrome
  user-agent, **and** to a headless Chromium render. This is a harder block
  than round 2 recorded (which saw a plain 403) and is now the main
  obstacle for this entity.
- **Indirect verification.** Search-engine indexing confirms the recorded
  URL is live and returns the Selected Decisions list; the indexed page
  title still reads "Selected Decisions and Selected Documents of the IMF,
  **Forty-Third Issue**". A **Forty-Fourth Issue** exists and is published
  at `imf.org/-/media/files/selecteddecisions/current/9798229008426-web.pdf`
  (note the `current/` path segment) and in the IMF eLibrary. Whether the
  HTML list has been re-cut to the 44th issue or still serves the 43rd
  could not be settled — round 2's "44th issue" claim is therefore
  downgraded to unconfirmed.
- **Governing bodies: no change.** The Board of Governors (retains the
  power to approve quota increases, allocate SDRs, admit members, amend the
  Articles) and the 25-member Executive Board (day-to-day decisions) both
  adopt IMF mandates. The IMFC is **advisory** to the Board of Governors and
  is correctly absent.
- The `how-the-imf-makes-decisions` factsheet used as the governing-body
  URL is still live (confirmed via search index, same 403 wall on direct
  fetch).

## Open questions

- Which issue the HTML list currently reflects, and whether the eLibrary
  edition carries any machine-readable status field.
- Whether IMF Finances pages carry decision references — needs a client
  that gets past Akamai; a residential browser session, not a datacentre
  fetcher.

_Last verified: 2026-08-13 (research round 3, re-verification)._
