// Constants for the citation matrix page (/citation-matrix).
// Mirrors the cross-citation figure in the UN80 initiative report (2512998E_MIR_web.pdf):
// entities are grouped into six pillars in a fixed order with one color per group.

export type GroupLabel =
  | 'Development'
  | 'Human Rights'
  | 'Peace and security'
  | 'Humanitarian'
  | 'Legal'
  | 'Effective functioning'

export const GROUP_ORDER: GroupLabel[] = [
  'Development',
  'Human Rights',
  'Peace and security',
  'Humanitarian',
  'Legal',
  'Effective functioning',
]

// Hex values mirror the custom palette in app/globals.css.
export const GROUP_COLOR: Record<GroupLabel, string> = {
  Development: '#009edb', // un-blue
  'Human Rights': '#4a7c7e', // faded-jade
  'Peace and security': '#a0665c', // au-chico
  Humanitarian: '#7d8471', // camouflage-green
  Legal: '#6c5b7b', // smoky
  'Effective functioning': '#5a6c7d', // shuttle-gray
}

// Diverging scale for the 2027−2026 difference view.
export const DIFF_NEGATIVE_COLOR = '#a0665c' // au-chico (red-ish)
export const DIFF_POSITIVE_COLOR = '#009edb' // un-blue
export const DIFF_ZERO_COLOR = '#ffffff'

// Map (pillar, budget_part) → display group. Returns null when no group applies
// so the entity can be filtered out client-side.
export function deriveGroup(
  pillar: string | null,
  budgetPart: string | null,
): GroupLabel | null {
  if (!pillar) return null
  switch (pillar) {
    case 'Development':
      return 'Development'
    case 'Human Rights':
      return 'Human Rights'
    case 'Peace & Security':
      return 'Peace and security'
    case 'Humanitarian':
      return 'Humanitarian'
    case 'Other':
      if (budgetPart === 'International justice and law') return 'Legal'
      return 'Effective functioning'
    default:
      return null
  }
}

// Entities the PDF figure omits — field missions, special envoys, panels of experts,
// and a handful of small entities that would create empty rows/columns.
const PREFIX_EXCLUDE = [
  'OSESG-',
  'SESG-',
  'OSASG-',
  'PESG-',
  'SRSG-',
  'OMBUD-',
  'PoE-',
  'GoE-',
  'SC-RES',
  'OSC-',
  'FP-',
]

const EXACT_EXCLUDE = new Set([
  'MINURSO',
  'MINUSCA',
  'MONUSCO',
  'UNAMA',
  'UNAMI',
  'UNDOF',
  'UNFICYP',
  'UNIFIL',
  'UNISFA',
  'UNMHA',
  'UNMIK',
  'UNMISS',
  'UNMOGIP',
  'UNSMIL',
  'UNSOS',
  'UNSOH',
  'UNTMIS',
  'UNTSO',
  'UNVMC',
  'BINUH',
  'UNAOC',
  'UNOAU',
  'UNOCA',
  'UNOWAS',
  'UNRCCA',
  'UNSCO',
  'UNSCOL',
  'UNGSC Brindisi',
  'RSCE',
  'CNMC',
  'ASMT',
  'CTED',
  'OVRA',
  'IIMP',
])

export function isExcludedEntity(entity: string): boolean {
  if (EXACT_EXCLUDE.has(entity)) return true
  return PREFIX_EXCLUDE.some((p) => entity.startsWith(p))
}
