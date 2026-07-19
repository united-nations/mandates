// One stable colour per UNBIS subject domain for the /subjects treemap and
// pill-map. The treemap is the pill-map's legend, so the mapping is keyed by
// domain code (not by count rank) — a domain keeps its colour across data
// refreshes. Colours come from the muted UN palette in globals.css; class
// strings are written as complete literals so Tailwind v4's source scanner
// keeps them (never build `bg-${x}` dynamically).
//
// The palette is deliberately small: the heaviest, most-often-visible domains
// each get a distinct muted hue (with un-blue the sole bright anchor on
// Political & Legal), Geographical Descriptors gets neutral grey (fitting for
// places), and the five smallest domains (Employment, International Trade,
// Transport, Human Settlements, Agriculture) share one muted purple (plum)
// rather than each carrying a unique hue no one can tell apart at tile size.
// Collapsing them frees the olive (camouflage-green) for Culture.

export interface DomainColor {
  bg: string
  text: string
  /** Hex, for non-Tailwind surfaces (e.g. a pill's left colour rail). */
  hex: string
}

const NEUTRAL: DomainColor = {
  bg: 'bg-dusty-gray',
  text: 'text-white',
  hex: '#969696',
}

// Keyed by two-digit domain code.
const DOMAIN_COLORS: Record<string, DomainColor> = {
  '01': { bg: 'bg-un-blue', text: 'text-white', hex: '#009edb' }, // Political & Legal
  '14': { bg: 'bg-au-chico', text: 'text-white', hex: '#a0665c' }, // Social Conditions
  '18': { bg: 'bg-smoky', text: 'text-white', hex: '#6c5b7b' }, // Organizational
  '02': { bg: 'bg-faded-jade', text: 'text-white', hex: '#4a7c7e' }, // Economic
  '15': { bg: 'bg-camouflage-green', text: 'text-white', hex: '#7d8471' }, // Culture (freed olive, was ugly yellow)
  '17': NEUTRAL, // Geographical Descriptors
  '03': { bg: 'bg-pale-oyster', text: 'text-black', hex: '#9bbb7a' }, // Natural Resources
  '05': { bg: 'bg-shuttle-gray', text: 'text-white', hex: '#5a6c7d' }, // Industry
  '16': { bg: 'bg-un-blue-muted', text: 'text-white', hex: '#4a90a4' }, // Science & Technology
  '08': { bg: 'bg-dusty-rose', text: 'text-white', hex: '#9c5a6e' }, // Population
  '13': { bg: 'bg-muted-clay', text: 'text-black', hex: '#c48a63' }, // Humanitarian
  '11': { bg: 'bg-indigo-muted', text: 'text-white', hex: '#55578f' }, // Education
  '10': { bg: 'bg-forest-muted', text: 'text-white', hex: '#4b7048' }, // Health
  // Five smallest domains — one shared muted purple.
  '12': { bg: 'bg-plum', text: 'text-white', hex: '#7d5a8c' }, // Employment
  '07': { bg: 'bg-plum', text: 'text-white', hex: '#7d5a8c' }, // International Trade
  '06': { bg: 'bg-plum', text: 'text-white', hex: '#7d5a8c' }, // Transport
  '09': { bg: 'bg-plum', text: 'text-white', hex: '#7d5a8c' }, // Human Settlements
  '04': { bg: 'bg-plum', text: 'text-white', hex: '#7d5a8c' }, // Agriculture
}

export function domainColor(code: string): DomainColor {
  return DOMAIN_COLORS[code] ?? NEUTRAL
}
