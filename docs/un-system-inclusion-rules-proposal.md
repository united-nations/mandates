# Proposed inclusion rules for `/system`

Round 3 asked thirteen agents to flag every case where they were unsure **what
kind of body, contact or link belongs in the list at all**. This is the resulting
catalogue and the rule adopted for each. All of them have now been decided; the
"Resolved since this was written" section at the end records the ones that were
still open when the catalogue was first drafted.

Once agreed, sections A and B belong in
[`un-system-scope.md`](un-system-scope.md) and section C in
[`un-system-registries.md`](un-system-registries.md).

---

## A. Which governing bodies to list

The page's premise is *who tells this entity what to do*. Round 3 confirmed the
core rule works — 13 of 15 principal-organ removals were upheld — but it does not
decide the cases below.

### A1. The core test (already in use, keep)

> List a body if it **adopts the entity's own mandates**: it approves the
> entity's programme or budget, or adopts decisions and resolutions addressed to
> the entity. Do not list a body merely because it created the entity
> (constitutive), because it appropriates money without directing the work
> (appropriating), or because the entity reports to it (accountability).

**Exception, confirmed twice in round 3:** where an entity has *no* body that
approves its programme, the principal organ that renews its mandate and approves
its budget IS its governing body — UNRWA (no executive board; GA renews the
mandate, most recently to 30 June 2029) and UNHCR (ExCom approves only a budget
*target*; the Statute binds the High Commissioner to GA and ECOSOC directives).

### A2. Advisory bodies — **resolved: do not list**

Cases: ITC's Joint Advisory Group, UNRWA's Advisory Commission, IARC's Scientific
Council, ECA's Committee of Experts, ESCAP's Advisory Committee of Permanent
Representatives, UNEP's and UN-Habitat's Committees of Permanent Representatives.

A reader looking for "who oversees this entity" expects to find them, and
omitting them makes ITC and UNRWA look ungoverned. But presenting them as
governing bodies is false.

> **Adopted:** list only bodies that govern. A body that formally advises or
> reviews but adopts nothing is not listed, and neither is one that merely
> prepares or services. This keeps the page's scope narrow and its promise
> exact: every row is a body that tells the entity what to do.

Consequence: ITC's Joint Advisory Group and UNRWA's Advisory Commission were
removed, and the five further advisory bodies this section once proposed adding
are not added. Where an entity's only oversight is advisory, the `note` records
it rather than the body list implying governance that does not exist.

Watch out for false positives on the name: UNIDIR's governing body is the
Secretary-General's **Advisory** Board on Disarmament Matters, which its statute
makes function as the Institute's Board of Trustees. It governs, and stays.

### A3. Committees that recommend vs committees that adopt — **adopt wins**

> **Proposed:** a committee is a governing body when it **adopts instruments in
> its own numbered series**; it is not when it only recommends to a parent.

Consequences: IMO's five Main Committees (MSC, MEPC, LEG, TC, FAL) stay — they
adopt their own resolutions. PAHO's Executive Committee stays. FAO's Programme,
Finance and CCLM committees, UNIDO's and WIPO's Programme and Budget Committees,
and PAHO's Subcommittee on Program, Budget and Administration are out.

**Resolved — IOM's Standing Committee on Programmes and Finance is listed.**
IOM's own governance page presents the Council and the SCPF together under the
heading "IOM GOVERNING BODIES", and the SCPF adopts numbered resolutions
including revisions to the Programme and Budget (S/36/RES/40). The Constitution
establishes only two organs and calls the SCPF a subcommittee that may "examine
and review", never "approve", so the entity's `note` records the tension.

### A4. Intersessional executive organs — **list**

UNECE's EXCOM, ESCWA's Executive Committee and ECLAC's Committee of the Whole all
approve programmes of work between sessions. A1 already covers them; stating it
avoids three separate judgement calls.

### A5. Regional and sectoral tiers — **resolved: do not list**

Option (b) below was adopted: only bodies with organization-wide competence are
listed, and regional tiers are left to prose. This was the largest open
question, and it affects the two strongest registries in the survey.

- **WHO** lists six Regional Committees as governing bodies on its own governance
  page, and its Resolutions Portal gives them a top-level tab beside the Assembly
  and the Board.
- **WMO's** six regional associations have issued more resolutions since 2019 than
  Congress itself, and sit in the same in-force database.
- **ITU** splits "governing bodies of the Union" from "governing bodies of the
  three Sectors"; WRC, RA, WTSA and WTDC adopt resolutions that mandate ITU's own
  work programme. Listing them takes ITU from 2 rows to 6.
- **FAO's** Regional Conferences are formally designated governing bodies in the
  Basic Texts, yet only recommend. **UN Tourism's** Regional Commissions are the
  same shape. Both were removed in round 3.
- **ECLAC's** eight subsidiary conferences adopt their own agreements and work
  programmes; listing them gives ECLAC eight rows and the other commissions none.

The A3 test ("adopts its own numbered series") admits WHO's and WMO's regional
bodies and ITU's sector conferences, and excludes FAO's and UN Tourism's. That is
defensible and mechanical — but it roughly doubles the row count for three
entities, which is why it was not adopted. The options weighed were: (a) apply
A3 uniformly and accept the asymmetry; (b) list only bodies with system-wide
competence and note regional tiers in prose — **adopted**; (c) add a `tier`
field and let the page collapse regional bodies behind a disclosure, which
remains the honest answer if completeness is ever wanted.

### A6. Subsidiary bodies of treaty COPs — **do not list**

UNFCCC's SBI and SBSTA and UNCCD's CRIC and CST adopt *conclusions*, not
decisions, and are subordinate to the COP. Co-equal supreme bodies **are** listed:
UNFCCC's CMA and CMP were added in round 3.

Note the irony worth recording: the only in-force tracking UNFCCC has covers
exactly the bodies this rule excludes.

### A7. Shared boards — **list, they are the entity's own**

The Executive Board of UNDP, UNFPA and UNOPS is the governing body of each of
those three *and* of UNCDF and UNV. It is not "someone else's board".

> **Proposed:** a shared board is listed for every entity named in its mandate or
> taking decisions addressed to that entity.

### A8. A governing body belonging to another organization — **list it, with its
own URL**

UNIDIR has no board: its statute (art. III.1) makes the Secretary-General's
**Advisory Board on Disarmament Matters** function as its board, and that body's
home is UNODA's site. Similarly ITC's governance runs through the **WTO General
Council**.

> **Proposed:** governing bodies outside the entity — and outside the UN — are
> admissible, and are linked at their own canonical URL.

**Consequence:** the shared `bodies` dictionary needs its first non-UN entries.
Suggested: `wto-general-council`, optionally `wto-ctd`; and promote
`unctad-tdb` to a reusable ref, since ITC and UNCTAD both use it.

### A9. Boards of individuals — **list**

UNU's Council, UNITAR's Board of Trustees and the Technology Bank's Council are
appointed in a personal capacity, not as State representatives. They govern, so
they are listed — but note the scope document's phrase "an intergovernmental body
that approves its own budget and programme" does not fit them and should be
softened to "a body".

### A10. Bodies that guide or elect without governing — **do not list**

UNICRI's Board sits "under the overall guidance of" the Commission on Crime
Prevention and Criminal Justice, which also elects its members; UNRISD's
equivalent is the Commission for Social Development; UNSSC's Board members are
recommended by the CEB, which receives its annual report. None approves a
programme or budget. This is the accountability limb of A1.

### A11. Dual-hatted sessions — **list once, under the entity's own name**

PAHO's Directing Council session *is* the WHO Regional Committee session: one
meeting, two identities, one document series. List it once as PAHO's Directing
Council and record the dual role in `note`.

### A12. The UN Secretariat's own bodies — **the four, with HRC annotated**

GA, Security Council, ECOSOC and the Human Rights Council. Verified empirically
from PPB 2027: GA 2,154 mandate citations, SC 471, ECOSOC 428, HRC 279 — and the
next bodies down are an order of magnitude smaller and belong to entities we list
separately (CND and CCPCJ → UNODC, UNEA → UNEP).

HRC is **not** a principal organ — it is a GA subsidiary organ created by
resolution 60/251 — so it carries a `note` saying so. The residual tail (CPD 12
citations, SPLOS 7, INCB 4, CSD 2 — 0.7% of all Secretariat mandates) is
deliberately not listed.

---

## B. What counts as a contact, and as a link

### B1. Contacts — a contact belongs to a governing body, or it does not belong

**Resolved.** The page is about governing bodies, so a contact earns a place
only if it serves one. An organization's switchboard tells the reader nothing
they could not get from its homepage, which is already linked from the
abbreviation.

> **Proposed:** record the secretariat that services a governing body, attached
> to that body. Do not record the organization's general contact page, its press
> office, its registration or logistics inboxes, or a partnership desk.

Applied in August 2026: 30 contacts moved onto the body they service, 51
deleted, 1 kept at organization level. That last one is the only case the rule
does not cover — UNOPS's Board and External Relations Office services the
Executive Board of UNDP, UNFPA and UNOPS, which is a *shared* body, so writing
the contact onto it would show a UNOPS office under UNDP, UNFPA, UNCDF and UNV
as well.

**26 entities now have no contact at all**, against none before. That is the
honest result: they publish a switchboard and no governing-body contact. The
previous state showed a general enquiries link for each of them, in the
governing-bodies column, which implied a governance contact that does not exist.

**Never record a named individual's address.** A role mailbox
(`CSG-Director@fao.org`) survives a personnel change; a person mailbox does not,
and publishing it is a privacy decision that is not ours to make. The same
applies to names in labels: "Board Secretary (Brook Boyer)" is now "Board of
Trustees Secretariat".

Sub-cases, with proposed answers:

| Case | Proposal |
|---|---|
| Email obfuscated (Cloudflare `data-cfemail`, `name [at] org`) | Record it — a human reading the page sees the address |
| Email only in a `mailto:` href, not visible text | Record it — it is published, and machine-readable |
| Email published only inside an official PDF | Record it, and note the source document in the dossier. Four of the best contacts found (FAO, WHO, IFAD, UN Tourism) exist nowhere else |
| Web form with no address | Only if it is scoped to a governing body (WIPO's Assemblies form). A general form is the switchboard |
| Generic organization mailbox | No — see above |
| Registration / logistics inbox | No. `pmo-registration@unido.org`, `registration@wmo.int` are serviced by the governing-body secretariat but useless for a mandate enquiry |
| Press or public-information office | No |
| Functionally-scoped secretariat mailbox | Record, with the scope in the label — e.g. the HRC Secretariat's NGO-liaison team |
| A page describing an office, not a way to reach it | No. Applied in full in August 2026: 11 further such contacts were dropped, including secretariat landing pages on un-ga, un-sc, undp-board, UNESCO, UN Women, UNEP, UNICEF, WFP, IAEA and ECLAC. A contact must be an address or a contact form |
| Social media account | Never a contact |

**Store an address in `email`, never as a `url` beginning `mailto:`.** The
renderer keys the envelope icon and the link target off which field is set, so a
`mailto:` URL rendered as an external page link with no icon. Four entries had
this and are fixed.

### B4. `officialPages` — **resolved: the field is gone**

It had become a catch-all for three unrelated things — governance landing pages,
document indexes and statutes. It is now split: a single **`homepage`** per
entity (the abbreviation in the first column links there), with everything else
moved to `resources`, and entries duplicating a homepage or a governing-body URL
dropped.

Two sub-cases:
- **A team page used as a governance page.** UNRISD's Board is a JavaScript tab on
  `/about/our-team` with no distinct URL, so the link lands on a staff list. Used
  because nothing better exists; flagged in the dossier. *Proposed: acceptable
  as a last resort, and the dossier must say so.*
- **Per-session microsites** (`ga.untourism.int`) publish working documents but
  no adopted resolutions and are replaced each session. *Proposed:
  a resource, never a scored registry.*

### B5. `related` — **resolved: renamed `resources`**

`related` used to mean "an organization portal that is **not** mandate-linked",
and the UI appends exactly that qualifier. Two things break it:

1. **Governing-body report series** — UNIDIR's `/report-of-the-director`,
   UNICRI's ECOSOC report page — are the governance record, not transparency
   portals. Labelling them "not mandate-linked" misdescribes them.
2. **This site's own registry** is mandate-linked by construction; that is why it
   moved to `mandateRegistry` with `scope: 'this-site'`.

> **Proposed:** rename the concept to **"related resources"** in the data model as
> it already is in the UI, and drop the "not mandate-linked" qualifier from
> anything carrying an explicit marker. Keep the distinction in the dossier prose,
> where it is a finding, rather than in a rendered suffix.

### B6. Login-gated and volatile systems

- **Members-only systems are recorded but not scored** — the UPU Documentation
  Centre, the World Bank Governors' Portal, IMO's IMODOCS (free registration),
  PRAIS 4, UNRWA's Advisory Commission Members Area. Precedent: CTBTO scores 0
  as members-only. *Caveat worth stating in the doc: this treats an invisible
  system as no system, which is a transparency judgement, not a capability one.*
- **Volatile URLs.** ISA has no stable sessions index — its registry URL is a
  session page that must be rolled forward annually. *Proposed: allow it, and
  flag such entries in the dossier so a yearly check is scheduled.*
- **Universal portals** (open.un.org, results.un.org) are page-level, never
  repeated per entity. Already in force.

---

## C. Scoring: form is scored once

The adversarial review found the root cause of most disputed scores: **the scheme
let form (PDF vs database) decide points 1–5, while reserving point 6 for exactly
that.** Every borderline call became a private judgement about whether something
is "a system".

> **Proposed:** form is never scored at points 1–5. Whether a thing is a PDF, a
> web page, a faceted database or an API is scored once, at point 6. At points
> 1–5, `'partial'` means **incomplete coverage or an ambiguous statement**, and
> nothing else.

Per-point tests follow from that:

- **Point 1 (documents)** — earned when a standing, session-spanning index leads
  to artefacts *whose subject is the adopted decisions themselves*, each
  identifiable by symbol or number with its text one click away. Not earned when
  decisions can only be reconstructed from artefacts about something else
  (session reports, annual reports). A general institutional repository qualifies
  if it holds the decisions collection and that collection is reachable from the
  governance pages.
- **Point 2 (mandates)** — earned only by a statement of **legal standing** (in
  force / superseded / lapsed / replaced-by) covering substantially a whole
  corpus and re-issued within its own cycle, with a 12-month grace period.
  Progress vocabularies — in progress, completed, closed, held in abeyance — are
  implementation status, scored at point 4; crediting them here counts one
  artefact twice.
- **Point 4 (implementation)** — earned by a **cumulative register that is
  maintained**: per-item status, open stock carried forward, earlier rows updated.
  `'partial'` for a narrative snapshot of one session that the next cycle replaces
  rather than updates.
- **Adjudicative output is never scored.** Judgments, advisory opinions and orders
  are case law, not mandates. But administrative, budgetary and electoral
  decisions *addressed to the entity* do count — which is why ITLOS now scores on
  its SPLOS series and not on its docket.

### C1. May an entity be scored on another organization's register? — **resolved: yes**

The Executive Board's tracking tables name **UNCDF** and **UNV** as responsible
parties against specific decision paragraphs, with their own deadlines, progress
entries and statuses — but the tables are published by UNDP. Meanwhile **UNCTAD,
UNODC and UNHCR** all have their mandates registered in mandates.un.org and score
`mandates: false`.

Round 3 held UNCDF and UNV at 1 rather than apply a rule to two entities and not
to three others. **Either** write the rule and re-run it across the survey, **or**
drop it. The scheme's own framing ("the Mandate Registry column … per
organization") reads as *does this entity maintain a registry*, which argues for
dropping it.

### C2. Whose score does the page show? — **resolved: one merged score**

Thirteen entities carry a this-site *Mandate Source Registry* row, so `/system`
renders dots for entities whose own dossier says 0. Defensible as display, but
undocumented.

> **Resolved:** the score shown merges every registry that covers the entity,
> including this site's. The column asks how far an organization's mandates can
> be traced, so who publishes the registry does not change the answer.

---

## Applied in round 3

A1 and its UNRWA/UNHCR exception; A2 (labels in `name`, pending the `role`
field); A3 (IMO and PAHO committees kept, FAO/UNIDO/WIPO/PAHO advisory
committees dropped); A4; A6; A7; A8 (UNIDIR, ITC); A9; A10; A11; A12; B1 with
the no-personal-addresses rule; B4; B6; and all of section C except C1 and C2.

Nothing in this catalogue is now open.

## Resolved since this was written

A3's IOM case — IOM's own governance page presents the Council and the Standing
Committee on Programmes and Finance together under the heading "IOM GOVERNING
BODIES", so both are listed. · A5 — regional and sectoral tiers are **not**
listed. · B3 — organization-level contacts that duplicated a governing body's
contact were removed, and body contacts now live on the body. · B5 — `related`
is renamed `resources` and the "not mandate-linked" suffix is gone. · C1 — an
entity **is** scored on whichever registry covers its mandates, whoever
publishes it, so UNCDF and UNV keep the implementation point. · C2 — one merged
score per entity, so entities covered only by this site carry its score. ·
B2 — contacts carry no `kind` field; too much detail for now. · B1 — a contact
is recorded only where it services a governing body, and is attached to that
body; switchboards, press offices and registration inboxes are not recorded.
