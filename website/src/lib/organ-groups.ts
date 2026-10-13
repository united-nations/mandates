/**
 * Editorial groupings for the /organs directory and the table's Organ filter.
 *
 * The codes in ppb2026.organs carry no hierarchy of their own — only a flat
 * sort_order. This module adds the one piece of structure both the /organs page
 * and the Organ column filter need: which category each code belongs to, and
 * the order categories appear in.
 *
 * It is deliberately a repo-side constant, not a DB column: the client-side
 * table filter imports it directly, and the grouping is display metadata, not
 * queryable data. Codes are referenced by their `short` value only — names and
 * websites stay canonical in ppb2026.organs.
 *
 * The vocabulary is not all organs. It holds deliberative bodies alongside two
 * instruments (the Charter, UNCLOS), an organisation outside the UN (WTO) and a
 * residue bucket.
 *
 * The surface that renders it is titled "Mandating bodies", after the term the
 * Secretary-General's report on the mandate implementation review defines for
 * the intergovernmental bodies that issue mandates. That title is deliberately
 * narrower than the list it heads: an instrument is not a body, and the WTO is
 * not a UN one. The alternative was a title true of every member and
 * recognisable to none — the previous one, "Sources of mandates", took that
 * road, and it collided with the phrase the analytics captions use for the
 * documents. Each member the definition does not reach carries an information
 * marker on its own card instead, so the exception is disclosed where a reader
 * meets it rather than in the heading; see CARD_NOTES in
 * MandatingBodiesDirectory.
 *
 * Every short code in the database should appear in exactly one category.
 * getOrganHierarchy folds any DB code not listed here into the category flagged
 * `isCatchAll`, and the organ-entity heatmap does the same, so a newly-seeded
 * code is grouped there rather than dropped. The Organ column filter has no such
 * catch-all: it walks the declared categories and looks up each code, never the
 * reverse, so a code in no category is offered as no filter option at all while
 * its documents stay in the table. A code that belongs to a particular category
 * has to be listed here by name.
 */

export interface OrganCategory {
  id: string
  label: string
  /** Organ `short` codes in this category, in display order. */
  organs: string[]
  /**
   * Where codes present in the database but listed in no category are folded.
   * Exactly one category carries it. Both fold paths used to select this
   * category by its position in the array — one comparing ids, the other
   * comparing indices — so reordering the array silently moved where unlisted
   * codes landed, with no type error and no runtime warning.
   */
  isCatchAll?: boolean
}

export const ORGAN_CATEGORIES: OrganCategory[] = [
  {
    id: 'principal',
    label: 'Principal organs',
    organs: ['GA', 'SC', 'ECOSOC', 'TC'],
  },
  {
    id: 'subsidiary',
    label: 'Subsidiary organs & assemblies',
    organs: ['HRC', 'UNCTAD', 'UNEA', 'UNHA and Other'],
  },
  {
    // The functional and regional commissions stay together: both are ECOSOC
    // bodies under the same article, differing only in whether their mandate is
    // a subject or a region, and splitting them loses what is true of all ten.
    id: 'ecosoc-commissions',
    label: 'ECOSOC commissions',
    organs: [
      'CND',
      'CCPCJ',
      'CSW',
      'CPD',
      'CSD',
      'ECA',
      'ECE',
      'ECLAC',
      'ESCAP',
      'ESCWA',
    ],
  },
  {
    // WTO is neither treaty-established in the sense UNTOC COP is nor an
    // instrument, so this label is precisely wrong about it; it stays because it
    // is precisely classified, and folding it into the residue would make that
    // category mean two things at once. The card carries the explanation.
    id: 'treaty-and-instruments',
    label: 'Treaty-established bodies & instruments',
    organs: ['UNTOC COP', 'INCB', 'WTO', 'Charter', 'UNCLOS'],
  },
  {
    // Last, and flagged: the two fold paths append here. PF and HRB name a layer
    // that does not issue mandates — programmes and funds have governing bodies
    // that do — so they sit in the residue rather than among the subsidiary
    // organs. Neither renders: both carry zero documents.
    id: 'other',
    label: 'Other',
    organs: ['Other', 'PF', 'HRB'],
    isCatchAll: true,
  },
]
