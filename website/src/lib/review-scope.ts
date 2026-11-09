import { calendarYearWindow } from '#lib/year-window'

export const REVIEW_CITATION_CATEGORIES = [
  'peacekeeping',
  'foundational',
  'legislative',
  'planOutline',
] as const
export type ReviewCitationCategory = (typeof REVIEW_CITATION_CATEGORIES)[number]
export type ReviewCitationMode = 'include' | 'neutral' | 'exclude'
export type ReviewCitationModes = Record<
  ReviewCitationCategory,
  ReviewCitationMode
>

export function reviewCitationModes(
  mode: ReviewCitationMode
): ReviewCitationModes {
  return Object.fromEntries(
    REVIEW_CITATION_CATEGORIES.map((category) => [category, mode])
  ) as ReviewCitationModes
}

/** Disjoint groups of distinct documents, sufficient for exact intersections. */
export interface ReviewScopeGroup {
  year: number | null
  citationCategories: ReviewCitationCategory[]
  securityCouncil: boolean
  /** Informative recurrence group member before its last recorded year, including collections. */
  earlierVersion: boolean
  count: number
}

export function calculateReviewScope(
  groups: ReviewScopeGroup[],
  currentYear: number,
  windowYears: number,
  citationModes: ReviewCitationModes,
  excludeSecurityCouncil: boolean,
  excludeOlder: boolean,
  excludeEarlierVersions: boolean
) {
  const window = calendarYearWindow(
    groups.map((group) => group.year),
    currentYear,
    windowYears
  )
  const overlaps = {
    recentOnly: { total: 0, remaining: 0 },
    citedOnly: { total: 0, remaining: 0 },
    both: { total: 0, remaining: 0 },
    neither: { total: 0, remaining: 0 },
  }
  const citations = Object.fromEntries(
    REVIEW_CITATION_CATEGORIES.map((key) => [key, 0])
  ) as Record<ReviewCitationCategory, number>
  const securityCouncil = { total: 0, remaining: 0 }
  const byYear = new Map<
    number | null,
    { year: number | null; total: number; highlight: number }
  >()
  let total = 0
  let remaining = 0

  for (const group of groups) {
    const recent =
      group.year !== null &&
      group.year >= window.startYear &&
      group.year <= window.endYear
    const cited = group.citationCategories.length > 0
    const included = group.citationCategories.some(
      (category) => citationModes[category] === 'include'
    )
    const excluded = group.citationCategories.some(
      (category) => citationModes[category] === 'exclude'
    )
    // Citation inclusion restores documents removed by age or series rules.
    // Citation exclusion and the explicit SC exclusion are applied last.
    const retainedByGlobalRules =
      !(excludeOlder && group.year !== null && group.year < window.startYear) &&
      !(excludeEarlierVersions && group.earlierVersion)
    const selected =
      (retainedByGlobalRules || included) &&
      !excluded &&
      !(excludeSecurityCouncil && group.securityCouncil)
    const overlap =
      overlaps[
        recent
          ? cited
            ? 'both'
            : 'recentOnly'
          : cited
            ? 'citedOnly'
            : 'neither'
      ]
    overlap.total += group.count
    if (selected) overlap.remaining += group.count
    total += group.count
    if (selected) remaining += group.count
    for (const category of group.citationCategories)
      citations[category] += group.count
    if (group.securityCouncil) {
      securityCouncil.total += group.count
      if (selected) securityCouncil.remaining += group.count
    }
    const year = byYear.get(group.year) ?? {
      year: group.year,
      total: 0,
      highlight: 0,
    }
    year.total += group.count
    if (selected) year.highlight += group.count
    byYear.set(group.year, year)
  }
  return {
    ...window,
    total,
    remaining,
    share: total ? (remaining / total) * 100 : 0,
    overlaps,
    citations,
    securityCouncil,
    years: [...byYear.values()].sort((a, b) =>
      a.year === null ? 1 : b.year === null ? -1 : a.year - b.year
    ),
  }
}
