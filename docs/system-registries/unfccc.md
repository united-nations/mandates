# UNFCCC — United Nations Framework Convention on Climate Change Secretariat

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Systems

- **Decisions** (Decisions Database) — <https://unfccc.int/decisions> — searchable database of **1,034 decisions**; filter by body, conference and session, full-text keyword search, six-language PDFs, card/list views.
- **SB Mandates** ("Mandates Database", periodic PDF) — <https://unfccc.int/sites/default/files/resource/SB%20Mandates%202022.pdf> — secretariat compilation of the ongoing mandates of the two subsidiary bodies (SBI/SBSTA), each row: Issue · Mandate Reference (decision + FCCC document paras) · Session · Mandate Text · Relevant additional mandates.
- **MAS Observers mandate search tool** — <https://unfccc.int/process-and-meetings/parties-non-party-stakeholders/non-party-stakeholders/mas-observers-mandate-search-tool> — searchable by body and/or theme, but scoped to one topic (observer engagement), not the full mandate corpus.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — re-verified round 3. Body facet: COP, CMP, CMA **and now SBI**; session facet runs to **COP 30 / CMA 7 / CMP 20 / SBI 60**; conference facet 1995–2025 (Berlin → Belém). Total unchanged at 1,034. The wider FCCC document series sits in the separate Documents portal (<https://unfccc.int/documents>, HTTP 200) |
| 2 mandates (active) | **partial — re-confirmed, no change.** The "SB Mandates" compilation does track which subsidiary-body mandates are still live vs concluded ("held in abeyance", "deferred to SBI 56", "ongoing"), each tied to a decision reference — genuine active-mandate tracking, but delivered as a periodically-refreshed secretariat PDF covering only the SBI/SBSTA agenda, not a queryable system spanning all COP/CMA/CMP decisions; the Decisions database itself carries no in-force/replaced flag |
| 3 budget-linked | no — neither the Decisions database nor the SB Mandates compilation carries budget fields; the secretariat work programme and core budget are published as documents (e.g. "Work programme of the secretariat for the biennium 2026–2027", `unfccc.int/documents/657980`), not linked per decision |
| 4 implementation-linked | no — the SBI reviews implementation of the Convention/Kyoto Protocol/Paris Agreement broadly; the SB Mandates statuses describe the state of *consideration* of an agenda item, not implementation outcomes of requests |
| 5 results-linked | no — no outcomes reported against specific COP/CMA decisions |
| 6 interoperability | deferred (later round) |

## Notes — the point-2 re-check (the round-3 headline question)

The open question from the gap-fill round was whether a newer or online searchable
version of the SB Mandates compilation now exists, which would raise point 2 to a
full point. **It does not.** Evidence:

- `SB Mandates 2022.pdf` is still live (HTTP 200, 476 KB, 30 pages) and search
  engines still return it under its internal title **"Mandates Database_current"**.
- Probing the obvious successors on the same path: **2023 → HTTP 404**,
  **2024 → 404** (after redirect), **2025 → 404** (after redirect). No later
  edition is published at the pattern the 2022 file uses.
- The **SB Chairs Lobby** page (<https://unfccc.int/process-and-meetings/bodies/governing-and-subsidiary-bodies/subsidiary-bodies/sb-chairs-lobby>, HTTP 200) — the natural home for such a compilation — carries bureau membership, contacts, submissions and a narrative of 2026 SB 64/65 priorities, but **no link with "mandate" in it** and no mandates list.
- No FCCC document series titled as a mandates compilation surfaced for 2024–2026;
  what exists are per-session SBI/SBSTA reports and the biennial secretariat work
  programme, neither of which is a live-vs-concluded mandate register.

So UNFCCC stays at **1.5** and remains the best treaty-secretariat case, but on the
strength of the decisions database plus a stale PDF, not a system.

## Related portals (not linked to mandates)

- Documents portal — <https://unfccc.int/documents> (HTTP 200).
- MAS Observers mandate search tool (a genuine searchable decision tool, topically narrow).

## Notes

- **Governing bodies:** only the COP was recorded. The COP page confirms "The COP is the supreme decision-making body of the Convention" but does **not** cross-link the other two supreme bodies. Both exist as separate live pages and adopt decisions in their own right, addressed in large part to the secretariat: the **CMA** (<https://unfccc.int/process/bodies/supreme-bodies/conference-of-the-parties-serving-as-the-meeting-of-the-parties-to-the-paris-agreement-cma>, "The Conference of the Parties, the supreme body of the Convention, shall serve as the meeting of the Parties to the Paris Agreement… takes decisions to promote its effective implementation") and the **CMP** (<https://unfccc.int/process/bodies/supreme-bodies/conference-of-the-parties-serving-as-the-meeting-of-the-parties-to-the-kyoto-protocol-cmp>). The Decisions database itself treats COP, CMP and CMA as three co-equal adopting bodies. They should be listed alongside the COP; SBI/SBSTA should not (they are subsidiary bodies that adopt conclusions, not the secretariat's mandating organs) — flagged for the inclusion rule.
- UNFCCC clearly has the in-house capability to run a searchable mandate tool (see the MAS Observers tool), which makes the absence of a general online SB-mandates tracker notable rather than a capacity gap.
- Round 3 contact: <https://unfccc.int/about-us/contact-and-directions/find-contact-by-issue> HTTP 200; no dedicated COP/CMA secretariat contact is published, so the by-issue directory remains the right entry.

## Open questions

- Point 6 interoperability (deferred): the Decisions database has structured facets — check for API/bulk export.

_Last verified: 2026-08-13 (research round 3, re-verification)._
