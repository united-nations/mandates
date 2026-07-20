/**
 * Curated entity → section grouping for the Entity × Entity co-citation
 * heatmap.
 *
 * Recreates the appendix figure from the Mandate Implementation Review
 * ("Map of overlapping mandate citations between two entities in the UN
 * Secretariat Programme Budget"). `code` is the canonical entity code in
 * systemchart.entities (and the `entity` column of source_document_citations).
 * `label` is the short display label used in the figure. The ordered list +
 * section assignment is hand curated to match the figure exactly — there is no
 * section column in the DB.
 */

export type Section =
  | 'development'
  | 'human-rights'
  | 'peace-security'
  | 'humanitarian'
  | 'legal'
  | 'effective-functioning'
  | 'other'

export interface SectionMeta {
  id: Section
  /** Short header shown above the column band, as in the figure. */
  label: string
  /** Base hue (hex) for within-section cells; intensity scales toward this. */
  baseColor: string
}

/**
 * Section hues mapped to the UN theme palette (see website/docs/COLORS.md).
 * Development=un-blue, Peace & Security=au-chico, Effective Functioning=smoky,
 * Humanitarian=pale-oyster, H/R=trout, Legal=faded-jade, cross/other=dusty-gray.
 */
export const SECTION_META: Record<Section, SectionMeta> = {
  development: {
    id: 'development',
    label: 'Development',
    baseColor: '#009edb',
  },
  'human-rights': { id: 'human-rights', label: 'H/R', baseColor: '#495057' },
  'peace-security': {
    id: 'peace-security',
    label: 'Peace & Security',
    baseColor: '#a0665c',
  },
  humanitarian: {
    // Soft hyphen lets the label break as "Humani-/tarian" (like the figure)
    // when constrained to its narrow band; renders as "Humanitarian" otherwise.
    id: 'humanitarian',
    label: 'Humani­tarian',
    baseColor: '#9b8b7a',
  },
  legal: { id: 'legal', label: 'Legal', baseColor: '#4a7c7e' },
  'effective-functioning': {
    id: 'effective-functioning',
    label: 'Effective Functioning',
    baseColor: '#6c5b7b',
  },
  other: { id: 'other', label: 'Other', baseColor: '#969696' },
}

/** Hue used for cross-section (inter-group) cells, per the figure. */
export const CROSS_SECTION_COLOR = '#969696' // --color-dusty-gray

export interface CuratedEntity {
  /** Canonical entity code in systemchart.entities. */
  code: string
  /** Short display label from the figure. */
  label: string
  section: Section
}

/**
 * The 41 curated Secretariat entities in the figure's order.
 *
 * Label → code mappings that differ from the figure label:
 *   Habitat→UN-Habitat, Women→UN Women, OHRLLS→UN-OHRLLS, UNYO→UN Youth,
 *   SVC→SRSG-SVC, VAC→SRSG-VAC, CAAC→SRSG-CAAC, VRA→OVRA.
 *
 * NOTE: "RCS" (Resident Coordinator System) has no dedicated entity in
 * systemchart.entities; mapped to DCO (Development Coordination Office, which
 * runs the RC system). Confirm with the data owners and adjust if needed.
 */
export const CURATED_ENTITIES: CuratedEntity[] = [
  // Development
  { code: 'ECLAC', label: 'ECLAC', section: 'development' },
  { code: 'DESA', label: 'DESA', section: 'development' },
  { code: 'ESCAP', label: 'ESCAP', section: 'development' },
  { code: 'ESCWA', label: 'ESCWA', section: 'development' },
  { code: 'ECA', label: 'ECA', section: 'development' },
  { code: 'ECE', label: 'ECE', section: 'development' },
  { code: 'ITC', label: 'ITC', section: 'development' },
  { code: 'UNCTAD', label: 'UNCTAD', section: 'development' },
  { code: 'UNEP', label: 'UNEP', section: 'development' },
  { code: 'UN-Habitat', label: 'Habitat', section: 'development' },
  { code: 'UN Women', label: 'Women', section: 'development' },
  { code: 'UN-OHRLLS', label: 'OHRLLS', section: 'development' },
  { code: 'DCO', label: 'RCS', section: 'development' }, // RCS≈Resident Coordinator System — confirm
  { code: 'OSAA', label: 'OSAA', section: 'development' },
  { code: 'UN Youth', label: 'UNYO', section: 'development' },
  // Human rights
  { code: 'OHCHR', label: 'OHCHR', section: 'human-rights' },
  // Peace & Security (incl. drugs, crime, counter-terrorism)
  { code: 'DPPA', label: 'DPPA', section: 'peace-security' },
  { code: 'DPO', label: 'DPO', section: 'peace-security' },
  { code: 'UNODC', label: 'UNODC', section: 'peace-security' },
  { code: 'OCT', label: 'OCT', section: 'peace-security' },
  { code: 'ODA', label: 'ODA', section: 'peace-security' },
  { code: 'SRSG-SVC', label: 'SVC', section: 'peace-security' },
  { code: 'SRSG-VAC', label: 'VAC', section: 'peace-security' },
  { code: 'SRSG-CAAC', label: 'CAAC', section: 'peace-security' },
  { code: 'OOSA', label: 'OOSA', section: 'peace-security' },
  // Humanitarian
  { code: 'OCHA', label: 'OCHA', section: 'humanitarian' },
  { code: 'UNDRR', label: 'UNDRR', section: 'humanitarian' },
  { code: 'UNRWA', label: 'UNRWA', section: 'humanitarian' },
  // Legal
  { code: 'OLA', label: 'OLA', section: 'legal' },
  // Effective functioning
  { code: 'DMSPC', label: 'DMSPC', section: 'effective-functioning' },
  { code: 'DOS', label: 'DOS', section: 'effective-functioning' },
  { code: 'UNOG', label: 'UNOG', section: 'effective-functioning' },
  { code: 'UNON', label: 'UNON', section: 'effective-functioning' },
  { code: 'UNOV', label: 'UNOV', section: 'effective-functioning' },
  { code: 'OICT', label: 'OICT', section: 'effective-functioning' },
  { code: 'OIOS', label: 'OIOS', section: 'effective-functioning' },
  { code: 'OSC-SEA', label: 'OSC-SEA', section: 'effective-functioning' },
  { code: 'OVRA', label: 'VRA', section: 'effective-functioning' },
  { code: 'DGACM', label: 'DGACM', section: 'effective-functioning' },
  { code: 'DGC', label: 'DGC', section: 'effective-functioning' },
  { code: 'DSS', label: 'DSS', section: 'effective-functioning' },
]

/** Order in which sections appear in the curated layout. */
export const SECTION_ORDER: Section[] = [
  'development',
  'human-rights',
  'peace-security',
  'humanitarian',
  'legal',
  'effective-functioning',
  'other',
]
