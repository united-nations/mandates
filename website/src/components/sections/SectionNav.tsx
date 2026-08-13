'use client'

import { Filter, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { titleCase } from 'title-case'

import { useFilters } from '@/contexts/FilterContext'
import {
  BUDGET_STREAM_LABELS,
  SUBJECT_DOMAIN_LABELS,
} from '@/lib/filter-constants'
import { FOUNDATIONAL_LABEL } from '@/lib/foundational'
import { cn } from '@/lib/utils'
import type { FilterOptions } from '@/types'

// Must match the section ids rendered by components/sections/*. The order is
// the page order, because the scrollspy below takes "the last anchor above the
// line" as current.
const SECTIONS = [
  { id: 'mandates', label: 'Mandates' },
  { id: 'entities', label: 'Entities' },
  { id: 'organs', label: 'Organs' },
  { id: 'subjects', label: 'Topics' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'background', label: 'Background' },
] as const

/**
 * Human-readable labels for every active explorer filter, in the same order
 * and with the same label lookups as the ActiveFilters chip bar inside the
 * explorer. First entry is shown in the sticky pill, the rest are counted.
 */
function activeFilterLabels(filters: FilterOptions): string[] {
  const labels: string[] = []
  if (filters.keyword?.trim()) labels.push(`"${filters.keyword.trim()}"`)
  if (filters.entity && filters.entity !== 'all') labels.push(filters.entity)
  if (filters.crossCitingEntity && filters.crossCitingEntity !== 'all')
    labels.push(`Cites ${filters.crossCitingEntity}`)
  if (filters.organ && filters.organ !== 'all') labels.push(filters.organ)
  if (filters.budget_part) labels.push(`Part ${filters.budget_part}`)
  if (filters.section) labels.push(`Section ${filters.section}`)
  if (filters.subprogramme) labels.push(filters.subprogramme)
  if (filters.foundational === 'true') labels.push(FOUNDATIONAL_LABEL)
  if (filters.programme) labels.push(`Programme ${filters.programme}`)
  if (filters.subject) labels.push(titleCase(filters.subject))
  if (filters.subject_domain)
    labels.push(
      SUBJECT_DOMAIN_LABELS[filters.subject_domain] ?? filters.subject_domain
    )
  if (filters.document_type) labels.push(filters.document_type)
  if (filters.agenda_item) labels.push(`Agenda ${filters.agenda_item}`)
  if (filters.start_year && filters.end_year)
    labels.push(`${filters.start_year}–${filters.end_year}`)
  if (filters.budget_document && filters.budget_document !== 'all')
    labels.push(
      BUDGET_STREAM_LABELS[
        filters.budget_document as keyof typeof BUDGET_STREAM_LABELS
      ] ?? filters.budget_document
    )
  if (filters.min_citations) labels.push(`≥${filters.min_citations} citations`)
  if (filters.max_citations) labels.push(`≤${filters.max_citations} citations`)
  return labels
}

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Slim sticky in-page navigation for the /secretariat page. Sits in the flow
 * right below the intro and sticks under the site header from there on, so it
 * appears exactly when the long page starts. Two jobs:
 *
 * 1. Wayfinding: links to the page's main sections with a scrollspy highlight
 *    (IntersectionObserver on the section anchors — a section counts as
 *    "current" once its anchor has crossed the top band of the viewport).
 * 2. Filter visibility: the explorer's filters travel with the reader as a
 *    compact pill (the lower directory sections set filters that only show
 *    inside the explorer, ~thousands of pixels up). The pill scrolls back to
 *    the explorer; its × clears all filters.
 *
 * The pill duplicates nothing: the ActiveFilters bar at the top of the page
 * gives the full detail but does not stick, and by the organs section it is
 * several thousand pixels out of view. This is the compact travelling copy.
 */
export function SectionNav() {
  const { filters, clearAllFilters } = useFilters()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    // Where the "current section" line sits: just below the sticky header +
    // nav chrome, matching the scroll-mt-28 (112px) on the section anchors.
    const OFFSET = 130
    let observer: IntersectionObserver | null = null

    const anchors = SECTIONS.map(({ id }) =>
      document.getElementById(id)
    ).filter((el): el is HTMLElement => el !== null)
    if (anchors.length === 0) return

    // The active section is the last anchor above the offset line. Cheap to
    // compute exactly (five rects), so the observer below is only a change
    // detector that tells us *when* to recompute.
    const recompute = () => {
      let current: string | null = null
      for (const el of anchors) {
        if (el.getBoundingClientRect().top <= OFFSET) current = el.id
      }
      setActiveId(current)
    }

    // Observing only the (short) anchor banners would miss instant jumps that
    // skip right over them — IntersectionObserver fires on intersection
    // *changes*, and a banner that goes from below the band to above it in one
    // step never intersects. The page blocks from the first banner down tile
    // the page contiguously, so observing all of them against a band at the
    // top of the viewport guarantees a callback whenever the block under the
    // line changes, including jumps. Root band height depends on the viewport,
    // hence the rebuild on resize.
    const setup = () => {
      observer?.disconnect()
      observer = new IntersectionObserver(recompute, {
        rootMargin: `0px 0px ${-Math.max(window.innerHeight - OFFSET, 0)}px 0px`,
        threshold: 0,
      })
      const parent = anchors[0].parentElement
      if (!parent) return
      let inSections = false
      for (const child of Array.from(parent.children)) {
        if (child === anchors[0]) inSections = true
        if (inSections) observer.observe(child)
      }
    }

    setup()
    recompute()
    window.addEventListener('resize', setup)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', setup)
    }
  }, [])

  const filterLabels = activeFilterLabels(filters)

  return (
    // top offset tracks the SiteHeader height: ~65px with the inline emblem,
    // ~57px once the emblem moves outboard at min-[1408px] (1px overlap is
    // intentional so no content line shows through between the two bars).
    <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/75 min-[1408px]:top-14">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 md:px-12 lg:px-16">
        <nav
          aria-label="Page sections"
          className="-mx-2.5 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]"
        >
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeId === id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault()
                scrollToId(id)
                history.replaceState(null, '', `#${id}`)
              }}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                activeId === id
                  ? 'bg-un-blue/10 text-un-blue'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        {filterLabels.length > 0 && (
          <div
            className="flex shrink-0 items-center rounded-full bg-un-blue/10 text-xs font-medium text-un-blue"
            title={`Active filters: ${filterLabels.join(' · ')}`}
          >
            <a
              href="#mandates"
              onClick={(event) => {
                event.preventDefault()
                scrollToId('mandates')
              }}
              className="flex max-w-40 items-center gap-1.5 rounded-l-full py-1 pl-2.5 transition-colors hover:bg-un-blue/20 sm:max-w-56"
            >
              <Filter className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{filterLabels[0]}</span>
              {filterLabels.length > 1 && (
                <span className="shrink-0 text-un-blue/70">
                  +{filterLabels.length - 1}
                </span>
              )}
            </a>
            <button
              type="button"
              onClick={clearAllFilters}
              aria-label="Clear all filters"
              className="rounded-r-full py-1 pr-2 pl-1.5 transition-colors hover:bg-un-blue/20"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
