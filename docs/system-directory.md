# Consolidated UN system directory

`/system` combines the former system overview and focal-point directory.
`/focal-points/directory` redirects to it. The first release populates entity,
listed governing-body count, public focal-point designation, and document
registry. Mandate registry, finance, plans/results and interoperability remain
visually empty; no existing scores are repurposed for them.

## Sources and refresh

- `website/src/data/un-system.json` remains the source for the 57 original
  entities, governing bodies, body contacts, notes, registry links and other
  resources. The document-registry check means an existing blue registry link
  is listed, including coverage in this site; it is not a new scored assessment.
- `website/src/data/un-system-directory-additions.json` adds 31 entity codes,
  names and classes from the public `entity_display_names` view, restricted to
  `public_listing_status = 'listed'`, checked on 24 September 2026. It contains
  no personal or administrative data. This gives a stable baseline of 88 rows,
  including entities that have not designated anyone. A roster update can add
  further publicly listed entities to this file after review.
- Focal-point designations, current contacts and coverage are read on each
  request using the existing `getFocalPointDirectorySummary` query. Its public
  listing, supersession, removal and contact-validity predicates are unchanged.
  New entities returned by that public query are also shown; unknown classes
  are displayed under an explicit classification-pending heading. All
  designations for one entity stay together in its panel.

Entity codes join the sources exactly; no names are used for fuzzy matching.
A roster row never creates or preserves a designation. When the database cannot
be read, the stable entity/resource directory remains visible and focal-point
availability is explicitly unavailable, with no stale-contact fallback.

## Display hierarchy

The hierarchy is a directory presentation, not a claim of legal reporting lines.
The original system classification and Secretariat-administration flag remain
unchanged in the source dataset.

| Group | Rows |
| --- | ---: |
| Funds and programmes | 8 |
| UN Secretariat parent | 1 |
| ↳ Departments and offices (including UNODC) | 23 |
| ↳ Offices away from headquarters: UNOG, UNON, UNOV | 3 |
| ↳ Special advisers, representatives and envoys | 6 |
| ↳ Regional commissions | 5 |
| Specialized agencies | 15 |
| Other UN entities | 7 |
| Related organizations | 8 |
| ↳ Convention secretariats: UNFCCC, UNCCD | 2 |
| Research and training | 6 |
| Joint and hosted bodies (including UNAIDS) | 4 |

Research and training contains UNITAR, UNU, UNSSC, UNIDIR, UNICRI and UNRISD.
Other UN entities contains ITC, UNCTAD, UNHCR, UNOPS, UNRWA, UN Women and Tech
Bank. UNEP and UN-Habitat remain in funds and programmes. Administrative
affiliation is explained in entity panels without duplicate entity rows.

This adapts the [UN system chart](https://www.un.org/en/node/97673) and the
[Secretariat directory](https://www.un.org/en/node/122013), adding the agreed
joint/hosted and convention groupings. Regional commissions retain their own
governing-body details. No governing bodies, registry links or focal-point
designations are inherited between parent and child rows.

## Verification

`website/src/lib/system-directory.test.ts` checks roster reconciliation, shared
body references, multiple designations, removal on refresh, missing metadata,
new entities, the absence of parent/child inheritance, and sidebar-content search.
The entity button supports keyboard opening; closing the sheet restores focus
to the row. The table scrolls horizontally on narrow screens with the entity
column pinned, and the sheet uses the existing full-width mobile layout.
