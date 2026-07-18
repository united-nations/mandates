/**
 * Editorial groupings for the /organs directory and the table's Organ filter.
 *
 * The organs in ppb2026.organs carry no hierarchy of their own — only a flat
 * sort_order. This module adds the one piece of structure both the /organs page
 * and the Organ column filter need: which category each organ belongs to, and
 * the order categories appear in.
 *
 * It is deliberately a repo-side constant, not a DB column: the client-side
 * table filter imports it directly, and the grouping is display metadata, not
 * queryable data. Organs are referenced by their `short` code only — names and
 * websites stay canonical in ppb2026.organs.
 *
 * Every organ short code in the database should appear in exactly one category.
 * getOrganHierarchy folds any DB organ not listed here into the last ("Treaty
 * bodies & other") category, so a newly-seeded organ is grouped, never dropped.
 */

export interface OrganCategory {
  id: string
  label: string
  /** Organ `short` codes in this category, in display order. */
  organs: string[]
}

export const ORGAN_CATEGORIES: OrganCategory[] = [
  {
    id: 'principal',
    label: 'Principal organs',
    organs: ['GA', 'SC', 'ECOSOC', 'TC', 'Charter'],
  },
  {
    id: 'subsidiary',
    label: 'Subsidiary bodies & assemblies',
    organs: ['HRC', 'HRB', 'UNCTAD', 'UNEA', 'UNHA and Other', 'PF'],
  },
  {
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
    id: 'other',
    label: 'Treaty bodies & other',
    organs: ['INCB', 'UNTOC COP', 'UNCLOS', 'WTO', 'Other'],
  },
]
