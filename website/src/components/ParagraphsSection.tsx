'use client'

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  type JSX,
} from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Menu,
  Package,
  Users,
  X,
} from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { Chip } from '@/components/ui/chip'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { SearchSyntaxHelp } from '@/components/SearchSyntaxHelp'

import { cn } from '@/lib/utils'
import { explainerTexts } from '@/lib/en_text_contents'
import {
  compileSearchMarker,
  findMarkRanges,
  matchesSearchTerms,
  parseSearchQuery,
  type SearchMarker,
} from '@/lib/paragraph-search'
import {
  isAnnexSection,
  isContentElement,
  resolveVisibilityTier,
  isMainPreambular,
  shouldCollapsePreamble,
} from '@/lib/paragraph-presentation'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Entity, Paragraph } from '@/types'
import { EntityName } from '@/components/EntityName'
import { titleCase } from 'title-case'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ParagraphsSectionProps {
  sourceUrl?: string | null
  paragraphs: Paragraph[]
  documentSymbol: string
  isLoading: boolean
  error: string | null
  compact?: boolean
  entities?: Entity[]
}

type ParagraphMandate = NonNullable<Paragraph['mandates']>[number]

type EntityTooltipData = {
  assignee: string
  assignee_normalized: string
  assignee_type: string
  entityType: 'assignee' | 'mentioned_entity'
}

type DeliverableTooltipData = ParagraphMandate['deliverables'][number]

/**
 * The key the "Actions" filter groups by: the normalized lemma when the
 * extraction supplied one, else the literal verb. Grouping on the raw verb would
 * list every surface variant separately ("requests" / "Further requests" /
 * "also requests"); the Digital Library corpus alone has 388 of them against 81
 * lemmas, and the mandates corpus 485 against 80. Returns null when the mandate
 * carries no verb at all.
 */
const actionVerbKey = (mandate: ParagraphMandate): string | null => {
  const verb = mandate.action_verb_normalized || mandate.action_verb
  return verb ? verb.toLowerCase() : null
}

// TOC data structure
interface TOCItem {
  id: string
  text: string
  level: number
  children: TOCItem[]
  index: number
}

/**
 * The three filter controls are `Chip`s (components/ui/chip.tsx) at the
 * sidebar's own density, so the row sits at exactly the same height as the
 * entity and topic chips above it — this file used to carry its own copy of
 * that geometry, which is how the two drifted apart.
 *
 * `bg-transparent` is the one deviation: a filter *trigger* is not a value, so
 * it does not take the neutral chip's grey fill. It is passed as a class rather
 * than added as a fifth tone, because a tone is meaning and this is geometry.
 * Active filters are marked in un-blue *text*, never a fill — the fill is
 * reserved for a selected facet, which a trigger never is.
 */
const filterPillTone = (currentFilter: string) =>
  cn(
    'bg-transparent',
    currentFilter !== 'all' ? 'font-medium text-un-blue-text' : 'text-muted-foreground'
  )

/** Popover panel, anchored under the pill whatever the pill's height is. */
const FILTER_PANEL =
  'absolute top-full left-0 z-50 mt-1 min-w-48 rounded-md border border-border bg-white py-1 shadow-lg'

// Reusable filter dropdown component
interface FilterDropdownProps {
  label: string
  currentFilter: string
  isOpen: boolean
  onToggle: () => void
  onFilterChange: (filter: string) => void
  typeCounts: Record<string, number>
  withItemsCount: number
  withItemsLabel: string
  className?: string
  hierarchicalData?: Record<string, Record<string, number>>
  filteredTotalCount: number // Count of all paragraphs matching other filters
}

function FilterDropdown({
  label,
  currentFilter,
  isOpen,
  onToggle,
  onFilterChange,
  typeCounts,
  withItemsCount,
  withItemsLabel,
  className = '',
  hierarchicalData,
  filteredTotalCount,
}: FilterDropdownProps) {
  const withItemsKey = `with-${label.toLowerCase()}`

  return (
    <div className={`relative ${className}`}>
      <Chip onClick={onToggle} className={filterPillTone(currentFilter)}>
        <span>
          {currentFilter === 'all'
            ? label
            : currentFilter === withItemsKey
              ? `${withItemsLabel} (${withItemsCount})`
              : currentFilter.includes(':')
                ? (() => {
                    const [type, item] = currentFilter.split(':')
                    const itemCount = hierarchicalData?.[type]?.[item] || 0
                    return `${titleCase(item)} (${itemCount})`
                  })()
                : `${titleCase(currentFilter.replace(/_/g, ' '))} (${typeCounts[currentFilter] || 0})`}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 self-center text-un-blue-text transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Chip>
      {isOpen && (
        <div className={FILTER_PANEL}>
          {/* All paragraphs option */}
          <button
            onClick={() => onFilterChange('all')}
            className={`flex w-full items-center justify-between py-1.5 text-left text-sm hover:bg-muted ${
              currentFilter === 'all'
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground'
            }`}
          >
            <span className="pl-3">All paragraphs</span>
            <span className="pr-3 text-muted-foreground">{filteredTotalCount}</span>
          </button>

          {/* With items option */}
          {withItemsCount > 0 && withItemsLabel && (
            <button
              onClick={() => onFilterChange(withItemsKey)}
              className={`flex w-full items-center justify-between py-1.5 text-left text-sm hover:bg-muted ${
                currentFilter === withItemsKey
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground'
              }`}
            >
              <span className="pl-3">{withItemsLabel}</span>
              <span className="pr-3 text-muted-foreground">{withItemsCount}</span>
            </button>
          )}

          {/* Type subcategories */}
          {Object.keys(typeCounts).length > 0 &&
            Object.entries(typeCounts)
              .sort(([, a], [, b]) => {
                // Sort by count descending, but keep non-zero counts first
                if (a === 0 && b === 0) return 0
                if (a === 0) return 1
                if (b === 0) return -1
                return b - a
              })
              .map(([type, count]) => (
                <div key={type}>
                  {/* Type header */}
                  <button
                    onClick={() =>
                      count > 0 ? onFilterChange(type) : undefined
                    }
                    disabled={count === 0}
                    className={`flex w-full items-center justify-between py-1.5 text-left text-sm ${
                      count === 0
                        ? 'cursor-not-allowed text-muted-foreground'
                        : currentFilter === type
                          ? 'bg-accent text-accent-foreground hover:bg-muted'
                          : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="pl-6">
                      {titleCase(type.replace(/_/g, ' '))}
                    </span>
                    <span
                      className={`pr-3 ${count === 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                    >
                      {count}
                    </span>
                  </button>

                  {/* Individual items under this type */}
                  {hierarchicalData &&
                    hierarchicalData[type] &&
                    Object.entries(hierarchicalData[type])
                      .sort(([, a], [, b]) => {
                        // Sort by count descending, but keep non-zero counts first
                        if (a === 0 && b === 0) return 0
                        if (a === 0) return 1
                        if (b === 0) return -1
                        return b - a
                      })
                      .map(([itemName, itemCount]) => (
                        <button
                          key={`${type}-${itemName}`}
                          onClick={() =>
                            itemCount > 0
                              ? onFilterChange(`${type}:${itemName}`)
                              : undefined
                          }
                          disabled={itemCount === 0}
                          className={`flex w-full items-center justify-between py-1.5 text-left text-sm ${
                            itemCount === 0
                              ? 'cursor-not-allowed text-muted-foreground'
                              : currentFilter === `${type}:${itemName}`
                                ? 'bg-accent text-accent-foreground hover:bg-muted'
                                : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="pl-10 text-sm">
                            {titleCase(itemName)}
                          </span>
                          <span
                            className={`pr-3 text-sm ${itemCount === 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                          >
                            {itemCount}
                          </span>
                        </button>
                      ))}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

// Searchable filter dropdown component
interface SearchableFilterDropdownProps {
  label: string
  currentFilter: string
  isOpen: boolean
  onToggle: () => void
  onFilterChange: (filter: string) => void
  typeCounts: Record<string, number>
  className?: string
  filteredTotalCount: number // Count of all paragraphs matching other filters
  hierarchicalData?: Record<string, Record<string, number>>
  withItemsCount?: number
  withItemsLabel?: string
  entityLongMap?: Record<string, string>
}

function SearchableFilterDropdown({
  label,
  currentFilter,
  isOpen,
  onToggle,
  onFilterChange,
  typeCounts,
  className = '',
  filteredTotalCount,
  hierarchicalData,
  withItemsCount,
  withItemsLabel,
  entityLongMap,
}: SearchableFilterDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    const entries = Object.entries(typeCounts)
    if (!searchTerm) return entries

    return entries.filter(([option]) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [typeCounts, searchTerm])

  // Filter hierarchical data based on search term
  const filteredHierarchicalData = useMemo(() => {
    if (!hierarchicalData || !searchTerm) return hierarchicalData

    const filtered: Record<string, Record<string, number>> = {}

    Object.entries(hierarchicalData).forEach(([type, entities]) => {
      const filteredEntities: Record<string, number> = {}

      // Include entities that match the search term
      Object.entries(entities).forEach(([entityName, count]) => {
        if (entityName.toLowerCase().includes(searchTerm.toLowerCase())) {
          filteredEntities[entityName] = count
        }
      })

      // Include the type if it matches the search term or has matching entities
      if (
        type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.keys(filteredEntities).length > 0
      ) {
        filtered[type] = filteredEntities
      }
    })

    return filtered
  }, [hierarchicalData, searchTerm])

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on close
      setSearchTerm('')
    }
  }, [isOpen])

  return (
    <div className={`relative ${className}`}>
      <Chip onClick={onToggle} className={filterPillTone(currentFilter)}>
        <span>
          {currentFilter === 'all'
            ? label
            : currentFilter === `with-${label.toLowerCase()}`
              ? `${withItemsLabel} (${withItemsCount})`
              : currentFilter.includes(':')
                ? (() => {
                    const [type, item] = currentFilter.split(':')
                    const itemCount = hierarchicalData?.[type]?.[item] || 0
                    return `${titleCase(item)} (${itemCount})`
                  })()
                : `${titleCase(currentFilter.replace(/_/g, ' '))} (${typeCounts[currentFilter] || 0})`}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 self-center text-un-blue-text transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Chip>
      {isOpen && (
        <div className={FILTER_PANEL}>
          {/* Search input */}
          <div className="border-b border-border px-3 py-2">
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-border px-2 py-1 text-sm focus:border-un-blue focus:ring-1 focus:ring-un-blue focus:outline-hidden"
              autoFocus
            />
          </div>

          {/* Scrollable options container */}
          <div className="dropdown-scroll-container max-h-72 overflow-y-auto">
            {/* All paragraphs option */}
            <button
              onClick={() => onFilterChange('all')}
              className={`flex w-full items-center justify-between py-1.5 text-left text-sm hover:bg-muted ${
                currentFilter === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground'
              }`}
            >
              <span className="pl-3">All paragraphs</span>
              <span className="pr-3 text-muted-foreground">{filteredTotalCount}</span>
            </button>

            {/* With items option */}
            {withItemsCount && withItemsCount > 0 && withItemsLabel && (
              <button
                onClick={() => onFilterChange(`with-${label.toLowerCase()}`)}
                className={`flex w-full items-center justify-between py-1.5 text-left text-sm hover:bg-muted ${
                  currentFilter === `with-${label.toLowerCase()}`
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground'
                }`}
              >
                <span className="pl-3">{withItemsLabel}</span>
                <span className="pr-3 text-muted-foreground">{withItemsCount}</span>
              </button>
            )}

            {/* Hierarchical options or simple filtered options */}
            {hierarchicalData ? (
              // Hierarchical structure
              Object.keys(filteredHierarchicalData || {}).length > 0 ? (
                Object.entries(filteredHierarchicalData || {})
                  .sort(([, a], [, b]) => {
                    // Sort by total count in each type
                    const aTotal = Object.values(a).reduce(
                      (sum, count) => sum + count,
                      0
                    )
                    const bTotal = Object.values(b).reduce(
                      (sum, count) => sum + count,
                      0
                    )
                    if (aTotal === 0 && bTotal === 0) return 0
                    if (aTotal === 0) return 1
                    if (bTotal === 0) return -1
                    return bTotal - aTotal
                  })
                  .map(([type, entities]) => {
                    const typeCount = typeCounts[type] || 0
                    return (
                      <div key={type}>
                        {/* Type header */}
                        <button
                          onClick={() =>
                            typeCount > 0 ? onFilterChange(type) : undefined
                          }
                          disabled={typeCount === 0}
                          className={`flex w-full items-center justify-between py-1.5 text-left text-sm ${
                            typeCount === 0
                              ? 'cursor-not-allowed text-muted-foreground'
                              : currentFilter === type
                                ? 'bg-accent text-accent-foreground hover:bg-muted'
                                : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="pl-6">
                            {titleCase(type.replace(/_/g, ' '))}
                          </span>
                          <span
                            className={`pr-3 ${typeCount === 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                          >
                            {typeCount}
                          </span>
                        </button>
                        {/* Individual entities under this type */}
                        {Object.entries(entities)
                          .sort(([, a], [, b]) => {
                            // Sort by count descending, but keep non-zero counts first
                            if (a === 0 && b === 0) return 0
                            if (a === 0) return 1
                            if (b === 0) return -1
                            return b - a
                          })
                          .map(([entityName, entityCount]) => (
                            <button
                              key={`${type}-${entityName}`}
                              onClick={() =>
                                entityCount > 0
                                  ? onFilterChange(`${type}:${entityName}`)
                                  : undefined
                              }
                              disabled={entityCount === 0}
                              className={`flex w-full items-center justify-between py-1.5 text-left text-sm ${
                                entityCount === 0
                                  ? 'cursor-not-allowed text-muted-foreground'
                                  : currentFilter === `${type}:${entityName}`
                                    ? 'bg-accent text-accent-foreground hover:bg-muted'
                                    : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <span className="pl-10 text-sm">
                                <EntityName
                                  entityName={titleCase(entityName)}
                                  entityLong={entityLongMap?.[entityName]}
                                />
                              </span>
                              <span
                                className={`pr-3 text-sm ${entityCount === 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                              >
                                {entityCount}
                              </span>
                            </button>
                          ))}
                      </div>
                    )
                  })
              ) : searchTerm ? (
                <div className="px-3 py-2 text-sm text-muted-foreground italic">
                  No {label.toLowerCase()} found matching "{searchTerm}"
                </div>
              ) : null
            ) : // Simple filtered options (for non-hierarchical data like action verbs)
            filteredOptions.length > 0 ? (
              filteredOptions
                .sort(([, a], [, b]) => {
                  // Sort by count descending, but keep non-zero counts first
                  if (a === 0 && b === 0) return 0
                  if (a === 0) return 1
                  if (b === 0) return -1
                  return b - a
                })
                .map(([option, count]) => (
                  <button
                    key={option}
                    onClick={() =>
                      count > 0 ? onFilterChange(option) : undefined
                    }
                    disabled={count === 0}
                    className={`flex w-full items-center justify-between py-1.5 text-left text-sm ${
                      count === 0
                        ? 'cursor-not-allowed text-muted-foreground'
                        : currentFilter === option
                          ? 'bg-accent text-accent-foreground hover:bg-muted'
                          : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="pl-6">
                      {titleCase(option.replace(/_/g, ' '))}
                    </span>
                    <span
                      className={`pr-3 ${count === 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}
                    >
                      {count}
                    </span>
                  </button>
                ))
            ) : searchTerm ? (
              <div className="px-3 py-2 text-sm text-muted-foreground italic">
                No {label.toLowerCase()} found matching "{searchTerm}"
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function cleanPrefix(prefix: string) {
  return prefix.replace(/[.\(\)\[\]]/g, '').trim()
}

/** A heading whose text opens an annex/appendix (used when there is no
 * Digital Library section metadata, e.g. the mandates corpus). */
const ANNEX_START_RE = /^(annex|appendix)\b/i

function isAnnexStartHeading(p: Paragraph): boolean {
  if (p.type !== 'heading') return false
  if (isAnnexSection(p.section) && p.annex_index != null) return true
  return ANNEX_START_RE.test(p.text?.trim() || '')
}

/** Roman numeral for annex labels (annexes never exceed a handful). */
function romanNumeral(n: number): string {
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let out = ''
  let rem = n
  for (const [value, symbol] of table) {
    while (rem >= value) {
      out += symbol
      rem -= value
    }
  }
  return out
}

/**
 * Comparable form of a document-title line. Strips the leading resolution
 * number the title carries either inline ("79/1.   The Pact for the Future",
 * mandates arm) or in `prefix` ("80/286.", Digital Library arm), plus trailing
 * punctuation, so a title and a heading of the same text compare equal.
 */
function normalizeTitleText(text: string): string {
  return text
    .replace(/^\s*\d+\/\d+[A-Za-z]?\.?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.:;]+$/, '')
}

/**
 * Index of the heading that merely repeats the document title, or null.
 *
 * Declaration-style documents ("The Pact for the Future", the Millennium
 * Declaration) carry the title twice: once as the hidden `title` element and
 * again as an unnumbered level-1 heading opening the declaration text — which
 * on the detail page renders as a bold echo of the page H1 one screen above.
 *
 * Three guards keep genuine structure: the heading must carry no `prefix` (a
 * numbered "I. Support account for peacekeeping operations" is a real section
 * even when it matches the title), must sit before the first operative
 * paragraph (the same text further down opens an annexed instrument — the
 * Sendai Framework, the Convention against Cybercrime — and is a real heading),
 * and only the first such match is dropped. Measured over the corpus: 144
 * headings match a title text, 33 of those precede the first operative
 * paragraph, 27 of those are unnumbered — the 27 title echoes.
 */
function findTitleEchoIndex(paragraphs: Paragraph[] | null): number | null {
  if (!paragraphs || paragraphs.length === 0) return null
  const titleRow = paragraphs.find(
    (p) => p.type === 'title' && !isAnnexSection(p.section)
  )
  if (!titleRow) return null
  const title = normalizeTitleText(
    `${titleRow.prefix ?? ''} ${titleRow.text ?? ''}`
  )
  if (!title) return null

  const firstOperative = paragraphs.findIndex(
    (p) => p.paragraph_type === 'operative'
  )
  const limit = firstOperative === -1 ? paragraphs.length : firstOperative

  for (let i = 0; i < limit; i++) {
    const p = paragraphs[i]
    if (p.type !== 'heading') continue
    if (p.prefix?.trim()) continue
    if (normalizeTitleText(p.text ?? '') === title) return i
  }
  return null
}

/** Indentation for nested list levels. */
function getIndentClass(level: number): string {
  if (level <= 1) return ''
  switch (level) {
    case 2:
      return 'ml-6'
    case 3:
      return 'ml-12'
    case 4:
      return 'ml-18'
    case 5:
      return 'ml-24'
    case 6:
      return 'ml-30'
    case 7:
      return 'ml-36'
    case 8:
      return 'ml-42'
    default:
      return 'ml-48'
  }
}

/**
 * The search-match treatment. Reused rather than invented: this is what a
 * search hit already looks like on the mandate table (lib/utils.ts), and the
 * two searches should not read as different features.
 *
 * Deliberately not bg-un-yellow-tint. Inside renderProcessedText that already
 * means "matches the active attribute dropdown", on verbs, entities and
 * deliverables alike, and a dropdown and a query can be live at the same
 * time. The other grounds in this component are spoken for too: un-blue is
 * interactive, red bold is the budget phrase, gray-200 is the idle pill.
 */
const MARK_CLASS = 'bg-un-blue-tint-50 text-un-blue-shade px-0.5 rounded'

/**
 * Mark the search terms inside one already-rendered run of text.
 *
 * Matching runs per rendered segment rather than across the paragraph, and
 * that is the load-bearing decision. A segment's text is what the reader sees:
 * the delimiters are already stripped from an annotation's inner text, and the
 * offsets are its own. So there is no offset to translate, no way for a mark
 * to reach the `replacements` array and displace a tooltip, and no way for one
 * to print a raw `*` or `<<`.
 *
 * What it costs: a term spanning a segment boundary marks only the parts that
 * fall inside each segment, and a phrase straddling a tooltip may mark partly
 * or not at all. Accepted — an unmarked paragraph is what the reader had
 * before, and a mark on the wrong words is not.
 *
 * Returns the string untouched when there is nothing to mark, so a paragraph
 * with no hits renders exactly the nodes it rendered before.
 */
function markSearchHits(
  text: string,
  marker: SearchMarker | null
): React.ReactNode {
  if (!marker) return text
  const ranges = findMarkRanges(text, marker)
  if (ranges.length === 0) return text

  const parts: React.ReactNode[] = []
  let at = 0
  ranges.forEach(({ start, end }, i) => {
    if (start > at) parts.push(text.slice(at, start))
    parts.push(
      <mark key={`mark-${i}`} className={MARK_CLASS}>
        {text.slice(start, end)}
      </mark>
    )
    at = end
  })
  if (at < text.length) parts.push(text.slice(at))
  return <>{parts}</>
}

export function ParagraphsSection({
  paragraphs: allParagraphs,
  sourceUrl,
  documentSymbol,
  isLoading,
  error,
  compact = false,
  entities,
}: ParagraphsSectionProps) {
  const entityLongMap = useMemo(
    () =>
      Object.fromEntries(
        (entities ?? []).map((e) => [e.entity, e.entity_long])
      ),
    [entities]
  )
  const [paragraphFilter] = useState<'all' | 'operative'>('operative')
  const [showPreamble, setShowPreamble] = useState(false)
  const [deliverableFilter, setDeliverableFilter] = useState<string>('all')
  const [isDeliverableDropdownOpen, setIsDeliverableDropdownOpen] =
    useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const [actionVerbFilter, setActionVerbFilter] = useState<string>('all')
  const [isActionVerbDropdownOpen, setIsActionVerbDropdownOpen] =
    useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [isMobileTOCOpen, setIsMobileTOCOpen] = useState(false)
  const [showFloatingTOC, setShowFloatingTOC] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isMobile = useIsMobile()
  const paragraphsTitleRef = useRef<HTMLDivElement>(null)

  // Parsed once per keystroke. The paragraph filter below depends on the
  // parsed form, so a query that parses to nothing (whitespace, a lone
  // minus) is not a search at all.
  const searchTerms = useMemo(
    () => parseSearchQuery(searchQuery),
    [searchQuery]
  )
  const hasSearchQuery = searchTerms.length > 0
  // Compiled once per query rather than once per segment: this component
  // re-renders on every keystroke, and a long document splits into thousands
  // of segments. An empty query compiles to no patterns and so marks nothing.
  const searchMarker = useMemo(
    () => compileSearchMarker(searchTerms),
    [searchTerms]
  )

  // Check if any filters are active (excluding paragraph type which defaults to 'operative')
  const hasActiveFilters = useMemo(() => {
    return (
      deliverableFilter !== 'all' ||
      assigneeFilter !== 'all' ||
      actionVerbFilter !== 'all' ||
      hasSearchQuery
    )
  }, [deliverableFilter, assigneeFilter, actionVerbFilter, hasSearchQuery])

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setDeliverableFilter('all')
    setAssigneeFilter('all')
    setActionVerbFilter('all')
    setSearchQuery('')
    // Keep paragraph filter as 'operative' since that's the default
  }, [])

  // Helper function to check if a paragraph matches filters (excluding the filter being calculated)
  const paragraphMatchesOtherFilters = useCallback(
    (
      paragraph: Paragraph,
      excludeFilter: 'deliverable' | 'assignee' | 'actionVerb'
    ): boolean => {
      // Filter by paragraph type (always applied)
      if (
        paragraphFilter === 'operative' &&
        paragraph.paragraph_type !== 'operative'
      ) {
        return false
      }

      // Filter by entity type or individual entity (if not excluded) - includes both assignees and mentioned_entities
      if (excludeFilter !== 'assignee') {
        if (assigneeFilter === 'with-assignees') {
          if (
            !paragraph.mandates?.some(
              (mandate) =>
                mandate.assignees?.length > 0 ||
                mandate.mentioned_entities?.length > 0
            )
          ) {
            return false
          }
        } else if (assigneeFilter !== 'all') {
          if (assigneeFilter.includes(':')) {
            const [filterType, filterEntity] = assigneeFilter.split(':')
            if (
              !paragraph.mandates?.some(
                (mandate) =>
                  mandate.assignees?.some(
                    (assignee) =>
                      assignee.assignee_type === filterType &&
                      (assignee.assignee_normalized || assignee.assignee) ===
                        filterEntity
                  ) ||
                  mandate.mentioned_entities?.some(
                    (entity) =>
                      entity.mentioned_entity_type === filterType &&
                      (entity.mentioned_entity_normalized ||
                        entity.mentioned_entity) === filterEntity
                  )
              )
            ) {
              return false
            }
          } else {
            if (
              !paragraph.mandates?.some(
                (mandate) =>
                  mandate.assignees?.some(
                    (assignee) => assignee.assignee_type === assigneeFilter
                  ) ||
                  mandate.mentioned_entities?.some(
                    (entity) => entity.mentioned_entity_type === assigneeFilter
                  )
              )
            ) {
              return false
            }
          }
        }
      }

      // Filter by deliverable type (if not excluded)
      if (excludeFilter !== 'deliverable') {
        if (deliverableFilter === 'with-deliverables') {
          if (
            !paragraph.mandates?.some(
              (mandate) => mandate.deliverables?.length > 0
            )
          ) {
            return false
          }
        } else if (deliverableFilter !== 'all') {
          if (
            !paragraph.mandates?.some((mandate) =>
              mandate.deliverables?.some(
                (deliverable) =>
                  deliverable.deliverable_type === deliverableFilter
              )
            )
          ) {
            return false
          }
        }
      }

      // Filter by action verb (if not excluded)
      if (excludeFilter !== 'actionVerb') {
        if (actionVerbFilter !== 'all') {
          if (
            !paragraph.mandates?.some(
              (mandate) => actionVerbKey(mandate) === actionVerbFilter
            )
          ) {
            return false
          }
        }
      }

      return true
    },
    [paragraphFilter, assigneeFilter, deliverableFilter, actionVerbFilter]
  )

  // Get all possible deliverable types from unfiltered data
  const allDeliverableTypes = useMemo(() => {
    if (!allParagraphs) return new Set<string>()

    const types = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach((mandate) => {
          mandate.deliverables?.forEach((deliverable) => {
            types.add(deliverable.deliverable_type)
          })
        })
      }
    })

    return types
  }, [allParagraphs])

  // Calculate deliverable type counts based on current filters (paragraph-level counting)
  const deliverableTypeCounts = useMemo(() => {
    if (!allParagraphs) return {}

    // Initialize all possible types with 0 count
    const counts: Record<string, number> = {}
    allDeliverableTypes.forEach((type) => {
      counts[type] = 0
    })

    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'deliverable')) {
        if (paragraph.mandates) {
          // Track which deliverable types this paragraph has (to avoid double-counting)
          const deliverableTypesInParagraph = new Set<string>()

          paragraph.mandates.forEach((mandate) => {
            mandate.deliverables?.forEach((deliverable) => {
              deliverableTypesInParagraph.add(deliverable.deliverable_type)
            })
          })

          // Count this paragraph once for each unique deliverable type it contains
          deliverableTypesInParagraph.forEach((type) => {
            counts[type] = (counts[type] || 0) + 1
          })
        }
      }
    })

    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allDeliverableTypes])

  // Get all possible entity types from unfiltered data (both assignees and mentioned_entities)
  const allAssigneeTypes = useMemo(() => {
    if (!allParagraphs) return new Set<string>()

    const types = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach((mandate) => {
          // Include assignee types
          mandate.assignees?.forEach((assignee) => {
            types.add(assignee.assignee_type)
          })
          // Include mentioned entity types
          mandate.mentioned_entities?.forEach((entity) => {
            types.add(entity.mentioned_entity_type)
          })
        })
      }
    })

    return types
  }, [allParagraphs])

  // Calculate entity type counts based on current filters (paragraph-level counting)
  const assigneeTypeCounts = useMemo(() => {
    if (!allParagraphs) return {}

    // Initialize all possible types with 0 count
    const counts: Record<string, number> = {}
    allAssigneeTypes.forEach((type) => {
      counts[type] = 0
    })

    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'assignee')) {
        if (paragraph.mandates) {
          // Track which entity types this paragraph has (to avoid double-counting)
          const entityTypesInParagraph = new Set<string>()

          paragraph.mandates.forEach((mandate) => {
            // Include assignee types
            mandate.assignees?.forEach((assignee) => {
              entityTypesInParagraph.add(assignee.assignee_type)
            })
            // Include mentioned entity types
            mandate.mentioned_entities?.forEach((entity) => {
              entityTypesInParagraph.add(entity.mentioned_entity_type)
            })
          })

          // Count this paragraph once for each unique entity type it contains
          entityTypesInParagraph.forEach((type) => {
            counts[type] = (counts[type] || 0) + 1
          })
        }
      }
    })

    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allAssigneeTypes])

  // Get all possible individual entities grouped by type from unfiltered data
  const allAssigneesByType = useMemo(() => {
    if (!allParagraphs) return {}

    const groupedEntities: Record<string, Record<string, number>> = {}

    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach((mandate) => {
          // Include assignees
          mandate.assignees?.forEach((assignee) => {
            const type = assignee.assignee_type
            const entityName = assignee.assignee_normalized || assignee.assignee

            if (!groupedEntities[type]) {
              groupedEntities[type] = {}
            }

            if (!groupedEntities[type][entityName]) {
              groupedEntities[type][entityName] = 0
            }
          })
          // Include mentioned entities
          mandate.mentioned_entities?.forEach((entity) => {
            const type = entity.mentioned_entity_type
            const entityName =
              entity.mentioned_entity_normalized || entity.mentioned_entity

            if (!groupedEntities[type]) {
              groupedEntities[type] = {}
            }

            if (!groupedEntities[type][entityName]) {
              groupedEntities[type][entityName] = 0
            }
          })
        })
      }
    })

    return groupedEntities
  }, [allParagraphs])

  // Calculate individual entity counts grouped by type based on current filters (paragraph-level counting)
  const assigneesByType = useMemo(() => {
    if (!allParagraphs) return {}

    // Initialize with all possible entities with 0 count
    const groupedEntities: Record<string, Record<string, number>> = {}
    Object.entries(allAssigneesByType).forEach(([type, entities]) => {
      groupedEntities[type] = {}
      Object.keys(entities).forEach((entityName) => {
        groupedEntities[type][entityName] = 0
      })
    })

    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'assignee')) {
        if (paragraph.mandates) {
          // Track which entities this paragraph has (to avoid double-counting)
          const entitiesInParagraph = new Set<string>()

          paragraph.mandates.forEach((mandate) => {
            // Include assignees
            mandate.assignees?.forEach((assignee) => {
              const type = assignee.assignee_type
              const entityName =
                assignee.assignee_normalized || assignee.assignee
              entitiesInParagraph.add(`${type}:${entityName}`)
            })
            // Include mentioned entities
            mandate.mentioned_entities?.forEach((entity) => {
              const type = entity.mentioned_entity_type
              const entityName =
                entity.mentioned_entity_normalized || entity.mentioned_entity
              entitiesInParagraph.add(`${type}:${entityName}`)
            })
          })

          // Count this paragraph once for each unique entity it contains
          entitiesInParagraph.forEach((entityKey) => {
            const [type, entityName] = entityKey.split(':')

            if (
              groupedEntities[type] &&
              groupedEntities[type][entityName] !== undefined
            ) {
              groupedEntities[type][entityName] =
                (groupedEntities[type][entityName] || 0) + 1
            }
          })
        }
      }
    })

    return groupedEntities
  }, [allParagraphs, paragraphMatchesOtherFilters, allAssigneesByType])

  // Calculate count of paragraphs with any entities based on current filters
  const paragraphsWithAssigneesCount = useMemo(() => {
    if (!allParagraphs) return 0

    return allParagraphs.filter(
      (paragraph: Paragraph) =>
        paragraphMatchesOtherFilters(paragraph, 'assignee') &&
        paragraph.mandates?.some(
          (mandate) =>
            mandate.assignees?.length > 0 ||
            mandate.mentioned_entities?.length > 0
        )
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // Get all possible action verbs from unfiltered data
  const allActionVerbs = useMemo(() => {
    if (!allParagraphs) return new Set<string>()

    const verbs = new Set<string>()
    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraph.mandates) {
        paragraph.mandates.forEach((mandate) => {
          const key = actionVerbKey(mandate)
          if (key) {
            verbs.add(key)
          }
        })
      }
    })

    return verbs
  }, [allParagraphs])

  // Calculate action verb counts based on current filters (paragraph-level counting)
  const actionVerbCounts = useMemo(() => {
    if (!allParagraphs) return {}

    // Initialize all possible verbs with 0 count
    const counts: Record<string, number> = {}
    allActionVerbs.forEach((verb) => {
      counts[verb] = 0
    })

    allParagraphs.forEach((paragraph: Paragraph) => {
      if (paragraphMatchesOtherFilters(paragraph, 'actionVerb')) {
        if (paragraph.mandates) {
          // Track which action verbs this paragraph has (to avoid double-counting)
          const actionVerbsInParagraph = new Set<string>()

          paragraph.mandates.forEach((mandate) => {
            const key = actionVerbKey(mandate)
            if (key) {
              actionVerbsInParagraph.add(key)
            }
          })

          // Count this paragraph once for each unique action verb it contains
          actionVerbsInParagraph.forEach((verb) => {
            counts[verb] = (counts[verb] || 0) + 1
          })
        }
      }
    })

    return counts
  }, [allParagraphs, paragraphMatchesOtherFilters, allActionVerbs])

  // Whether any filter dropdown has options at all. Each dropdown already hides
  // itself when empty; this keeps the surrounding "Filter:" row from rendering
  // as a dead label when all three are.
  const hasAnyFilterOptions = useMemo(
    () =>
      Object.keys(assigneeTypeCounts).length > 0 ||
      Object.keys(deliverableTypeCounts).length > 0 ||
      Object.keys(actionVerbCounts).length > 0,
    [assigneeTypeCounts, deliverableTypeCounts, actionVerbCounts]
  )

  // Calculate count of paragraphs with any deliverables based on current filters
  const paragraphsWithDeliverablesCount = useMemo(() => {
    if (!allParagraphs) return 0

    return allParagraphs.filter(
      (paragraph: Paragraph) =>
        paragraphMatchesOtherFilters(paragraph, 'deliverable') &&
        paragraph.mandates?.some((mandate) => mandate.deliverables?.length > 0)
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // Calculate filtered total counts for "All paragraphs" option in each dropdown
  const deliverableFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) =>
      paragraphMatchesOtherFilters(paragraph, 'deliverable')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  const assigneeFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) =>
      paragraphMatchesOtherFilters(paragraph, 'assignee')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  const actionVerbFilteredTotalCount = useMemo(() => {
    if (!allParagraphs) return 0
    return allParagraphs.filter((paragraph: Paragraph) =>
      paragraphMatchesOtherFilters(paragraph, 'actionVerb')
    ).length
  }, [allParagraphs, paragraphMatchesOtherFilters])

  // The one heading that only repeats the document title (see
  // findTitleEchoIndex); dropped from the flow and from the TOC.
  const visibilityTier = useMemo(
    () => resolveVisibilityTier(allParagraphs ?? []),
    [allParagraphs]
  )
  const collapsePreamble = shouldCollapsePreamble(
    allParagraphs ?? [],
    hasSearchQuery
  )
  const titleEchoIndex = useMemo(
    () => findTitleEchoIndex(allParagraphs),
    [allParagraphs]
  )

  // Frontend filtering of paragraphs. Returns the searched list the section
  // renders, plus the query-blind view the heading count is computed from.
  const { paragraphs, headingCountElements } = useMemo(() => {
    if (!allParagraphs)
      return { paragraphs: allParagraphs, headingCountElements: allParagraphs }

    // Helper function to check if a paragraph matches the current filters
    const paragraphMatchesFilters = (paragraph: Paragraph): boolean => {
      // Filter by paragraph type
      if (
        paragraphFilter === 'operative' &&
        paragraph.paragraph_type !== 'operative'
      ) {
        return false
      }

      // Filter by deliverable type
      if (deliverableFilter === 'with-deliverables') {
        if (
          !paragraph.mandates?.some(
            (mandate) => mandate.deliverables?.length > 0
          )
        ) {
          return false
        }
      } else if (deliverableFilter !== 'all') {
        if (
          !paragraph.mandates?.some((mandate) =>
            mandate.deliverables?.some(
              (deliverable) =>
                deliverable.deliverable_type === deliverableFilter
            )
          )
        ) {
          return false
        }
      }

      // Filter by entity type or individual entity - includes both assignees and mentioned_entities
      if (assigneeFilter === 'with-assignees') {
        if (
          !paragraph.mandates?.some(
            (mandate) =>
              mandate.assignees?.length > 0 ||
              mandate.mentioned_entities?.length > 0
          )
        ) {
          return false
        }
      } else if (assigneeFilter !== 'all') {
        if (assigneeFilter.includes(':')) {
          // Individual entity filter (format: "type:entityName")
          const [filterType, filterEntity] = assigneeFilter.split(':')
          if (
            !paragraph.mandates?.some(
              (mandate) =>
                mandate.assignees?.some(
                  (assignee) =>
                    assignee.assignee_type === filterType &&
                    (assignee.assignee_normalized || assignee.assignee) ===
                      filterEntity
                ) ||
                mandate.mentioned_entities?.some(
                  (entity) =>
                    entity.mentioned_entity_type === filterType &&
                    (entity.mentioned_entity_normalized ||
                      entity.mentioned_entity) === filterEntity
                )
            )
          ) {
            return false
          }
        } else {
          // Entity type filter
          if (
            !paragraph.mandates?.some(
              (mandate) =>
                mandate.assignees?.some(
                  (assignee) => assignee.assignee_type === assigneeFilter
                ) ||
                mandate.mentioned_entities?.some(
                  (entity) => entity.mentioned_entity_type === assigneeFilter
                )
            )
          ) {
            return false
          }
        }
      }

      // Filter by action verb
      if (actionVerbFilter !== 'all') {
        if (
          !paragraph.mandates?.some(
            (mandate) => actionVerbKey(mandate) === actionVerbFilter
          )
        ) {
          return false
        }
      }

      return true
    }

    // Helper function to find parent paragraph index
    const findParentIndex = (currentIndex: number): number | null => {
      const currentParagraph = allParagraphs[currentIndex]
      const currentLevel = currentParagraph.paragraph_level || 0

      // Look backwards for a paragraph with a lower level (parent)
      for (let i = currentIndex - 1; i >= 0; i--) {
        const paragraph = allParagraphs[i]
        if (
          paragraph.type !== 'heading' &&
          (paragraph.paragraph_level || 0) < currentLevel
        ) {
          return i
        }
      }
      return null
    }

    // Helper function to find all children of a paragraph
    const findChildrenIndices = (parentIndex: number): number[] => {
      const parentParagraph = allParagraphs[parentIndex]
      const parentLevel = parentParagraph.paragraph_level || 0
      const childIndices: number[] = []

      // Look forward for paragraphs with higher levels (children)
      for (let i = parentIndex + 1; i < allParagraphs.length; i++) {
        const paragraph = allParagraphs[i]
        if (paragraph.type === 'heading') continue

        const currentLevel = paragraph.paragraph_level || 0
        if (currentLevel <= parentLevel) {
          // Found a sibling or parent, stop looking
          break
        }
        childIndices.push(i)
      }
      return childIndices
    }

    // Helper function to check if a heading has any visible content beneath it
    const headingHasVisibleContent = (headingIndex: number): boolean => {
      const heading = allParagraphs[headingIndex]
      if (heading.type !== 'heading') return false

      const currentLevel = heading.heading_level || 3

      // Find the next heading at the same or higher level
      let nextHeadingIndex = -1
      for (let i = headingIndex + 1; i < allParagraphs.length; i++) {
        const nextParagraph = allParagraphs[i]
        if (
          nextParagraph.type === 'heading' &&
          (nextParagraph.heading_level || 3) <= currentLevel
        ) {
          nextHeadingIndex = i
          break
        }
      }

      // Check if there are any matching paragraphs between this heading and the next
      const endIndex =
        nextHeadingIndex === -1 ? allParagraphs.length : nextHeadingIndex
      for (let i = headingIndex + 1; i < endIndex; i++) {
        const paragraph = allParagraphs[i]
        if (paragraph.type !== 'heading' && shouldIncludeParagraph(i)) {
          return true
        }
      }

      return false
    }

    // Check if any assignee/deliverable/action filters are active (these trigger parent-child logic)
    const hasEnhancedFilters =
      deliverableFilter !== 'all' ||
      assigneeFilter !== 'all' ||
      actionVerbFilter !== 'all'

    const hasQuery = searchTerms.length > 0

    // The mandate-attribute filters and the search query both narrow the list
    // (and both gate heading retention below); with neither active the base
    // view shows every content element (operative + neutral body + annex
    // content). The two values are deliberately not the same thing:
    // hasEnhancedFilters alone gates the parent/child widening, which the
    // query must never switch on — see the search gate below.
    const hasActiveFilters = hasEnhancedFilters || hasQuery

    // Helper function to determine if a paragraph should be included (with
    // parent-child logic). ignoreQuery serves the heading count's query-blind
    // pass below; every other caller applies the search.
    const shouldIncludeParagraph = (
      index: number,
      ignoreQuery = false
    ): boolean => {
      const paragraph = allParagraphs[index]

      // Hide structural chrome and the document title (duplicates the H1).
      if (!isContentElement(paragraph, visibilityTier)) {
        return false
      }

      // Main-section preambular clauses render in the collapsible above, not
      // the list. Preambular inside an annex renders inline within its block.
      if (collapsePreamble && isMainPreambular(paragraph)) {
        return false
      }

      // The search gate. Its position is load-bearing: it sits before the
      // early exit below and before the parent/child widening, because the
      // search matches only the paragraph's own text. The widening exists so
      // that an attribute annotated on one element of a clause returns the
      // whole readable clause; letting the search inherit it would return
      // paragraphs that do not contain the query — a spurious hit the reader
      // cannot check, where a missed match is visible on the page. It also
      // makes the search intersect with the dropdowns rather than union.
      if (
        !ignoreQuery &&
        hasQuery &&
        !matchesSearchTerms(paragraph.text, searchTerms)
      ) {
        return false
      }

      // If no enhanced filters are active, show all content elements
      if (!hasEnhancedFilters) {
        return true
      }

      // Check if this paragraph directly matches the enhanced filters
      const directMatch = paragraphMatchesFilters(paragraph)

      if (directMatch) {
        return true
      }

      // If paragraph doesn't directly match, check parent-child relationships

      // Check if this paragraph is a child of a matching parent
      const parentIndex = findParentIndex(index)
      if (parentIndex !== null) {
        const parentParagraph = allParagraphs[parentIndex]
        if (
          paragraphFilter === 'operative' &&
          parentParagraph.paragraph_type !== 'operative'
        ) {
          // Parent doesn't match paragraph type filter, skip
        } else if (paragraphMatchesFilters(parentParagraph)) {
          return true // Include child because parent matches
        }
      }

      // Check if this paragraph is a parent of any matching children
      const childIndices = findChildrenIndices(index)
      for (const childIndex of childIndices) {
        const childParagraph = allParagraphs[childIndex]
        if (
          paragraphFilter === 'operative' &&
          childParagraph.paragraph_type !== 'operative'
        ) {
          continue // Child doesn't match paragraph type filter
        }
        if (paragraphMatchesFilters(childParagraph)) {
          return true // Include parent because child matches
        }
      }

      return false
    }

    // Filter paragraphs
    const filtered = allParagraphs.filter(
      (paragraph: Paragraph, index: number) => {
        // The heading that only echoes the document title never renders.
        if (index === titleEchoIndex) {
          return false
        }

        if (paragraph.type === 'heading') {
          // If no filters are active, always show headings
          if (!hasActiveFilters) {
            return true
          }
          // If filters are active, only show headings that have visible content beneath them
          return headingHasVisibleContent(index)
        }

        // For non-heading paragraphs, apply the enhanced filtering logic
        return shouldIncludeParagraph(index)
      }
    )

    // The heading count's input: the same pass with the search query ignored,
    // so the dropdowns move the heading number and the search does not (its
    // match count reports beside the field instead). Headings are omitted
    // because the counts never count them.
    const headingCountElements = hasQuery
      ? allParagraphs.filter(
          (paragraph: Paragraph, index: number) =>
            paragraph.type !== 'heading' && shouldIncludeParagraph(index, true)
        )
      : filtered

    return { paragraphs: filtered, headingCountElements }
  }, [
    allParagraphs,
    paragraphFilter,
    deliverableFilter,
    assigneeFilter,
    actionVerbFilter,
    titleEchoIndex,
    visibilityTier,
    collapsePreamble,
    searchTerms,
  ])

  // Build TOC from paragraphs
  const tocItems = useMemo((): TOCItem[] => {
    if (!paragraphs || paragraphs.length === 0) return []

    const items: TOCItem[] = []
    const stack: TOCItem[] = []

    let insideAnnex = false
    paragraphs.forEach((paragraph: Paragraph, index: number) => {
      if (paragraph.type === 'heading') {
        const isAnnexStart = isAnnexStartHeading(paragraph)
        if (paragraph.section === 'main' && !isAnnexStart) insideAnnex = false
        // Annexes anchor a top-level TOC node; their inner headings nest one
        // level below it (the raw heading levels inside annexes are flat).
        let level: number
        if (isAnnexStart) {
          insideAnnex = true
          level = 1
        } else if (insideAnnex || isAnnexSection(paragraph.section)) {
          level = Math.max((paragraph.heading_level || 3) + 1, 2)
        } else {
          level = paragraph.heading_level || 3
        }
        // Include prefix in TOC text if it exists
        const displayText = paragraph.prefix
          ? `${paragraph.prefix} ${paragraph.text}`
          : paragraph.text
        const item: TOCItem = {
          id: `heading-${index}`,
          text: displayText,
          level,
          children: [],
          index,
        }

        // Remove items from stack that are at same or deeper level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        if (stack.length === 0) {
          // Top-level item
          items.push(item)
        } else {
          // Child item
          stack[stack.length - 1].children.push(item)
        }

        stack.push(item)
      }
    })

    return items
  }, [paragraphs])

  // Helper function to check if a section should be expanded based on active heading
  const isInActivePath = useCallback(
    (item: TOCItem): boolean => {
      if (!activeHeadingId) return false

      // Check if this item or any of its descendants is active
      const checkDescendants = (currentItem: TOCItem): boolean => {
        if (currentItem.id === activeHeadingId) return true
        return currentItem.children.some((child) => checkDescendants(child))
      }

      return checkDescendants(item)
    },
    [activeHeadingId]
  )

  // Intersection Observer for scroll detection
  useEffect(() => {
    if (!paragraphs || paragraphs.length === 0 || tocItems.length === 0) return

    // Add a small delay to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      const headingElements = paragraphs
        .map((paragraph: Paragraph, index: number) => {
          if (paragraph.type === 'heading') {
            return document.getElementById(`heading-${index}`)
          }
          return null
        })
        .filter(Boolean) as HTMLElement[]

      if (headingElements.length === 0) {
        // Try again after a longer delay if no elements found
        const retryTimeoutId = setTimeout(() => {
          const retryElements = paragraphs
            .map((paragraph: Paragraph, index: number) => {
              if (paragraph.type === 'heading') {
                return document.getElementById(`heading-${index}`)
              }
              return null
            })
            .filter(Boolean) as HTMLElement[]

          if (retryElements.length === 0) return

          const observer = new IntersectionObserver(
            (entries) => {
              if (entries.length === 0) return

              // Sort entries by their position in the document
              const sortedEntries = entries.sort((a, b) => {
                const aRect = a.boundingClientRect
                const bRect = b.boundingClientRect
                return aRect.top - bRect.top
              })

              // Find the best heading to highlight
              let activeEntry = null

              // First, try to find an intersecting heading
              const intersectingEntries = sortedEntries.filter(
                (entry) => entry.isIntersecting
              )
              if (intersectingEntries.length > 0) {
                // Use the first intersecting heading (topmost)
                activeEntry = intersectingEntries[0]
              } else {
                // No headings are intersecting, find the last heading above the viewport
                const aboveViewport = sortedEntries.filter(
                  (entry) => entry.boundingClientRect.bottom < 0
                )
                if (aboveViewport.length > 0) {
                  activeEntry = aboveViewport[aboveViewport.length - 1] // Last one above viewport
                } else {
                  // All headings are below viewport, use the first one
                  activeEntry = sortedEntries[0]
                }
              }

              if (activeEntry) {
                setActiveHeadingId(activeEntry.target.id)
              }
            },
            {
              rootMargin: '-20% 0px -60% 0px', // Trigger when heading is in upper portion of viewport
              threshold: [0, 0.25, 0.5, 0.75, 1],
            }
          )

          retryElements.forEach((el) => observer.observe(el))

          // Return cleanup function for retry observer
          return () => observer.disconnect()
        }, 100)

        return () => clearTimeout(retryTimeoutId)
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.length === 0) return

          // Sort entries by their position in the document
          const sortedEntries = entries.sort((a, b) => {
            const aRect = a.boundingClientRect
            const bRect = b.boundingClientRect
            return aRect.top - bRect.top
          })

          // Find the best heading to highlight
          let activeEntry = null

          // First, try to find an intersecting heading
          const intersectingEntries = sortedEntries.filter(
            (entry) => entry.isIntersecting
          )
          if (intersectingEntries.length > 0) {
            // Use the first intersecting heading (topmost)
            activeEntry = intersectingEntries[0]
          } else {
            // No headings are intersecting, find the last heading above the viewport
            const aboveViewport = sortedEntries.filter(
              (entry) => entry.boundingClientRect.bottom < 0
            )
            if (aboveViewport.length > 0) {
              activeEntry = aboveViewport[aboveViewport.length - 1] // Last one above viewport
            } else {
              // All headings are below viewport, use the first one
              activeEntry = sortedEntries[0]
            }
          }

          if (activeEntry) {
            setActiveHeadingId(activeEntry.target.id)
          }
        },
        {
          rootMargin: '-20% 0px -60% 0px', // Trigger when heading is in upper portion of viewport
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      )

      headingElements.forEach((el) => observer.observe(el))

      return () => observer.disconnect()
    }, 50) // Small delay to ensure DOM is ready

    return () => clearTimeout(timeoutId)
    // tocItems.length only guards the early return; tocItems itself is derived
    // from `paragraphs`, so depending on the whole array would re-run for free.
  }, [paragraphs, tocItems.length])

  // Set initial active heading when paragraphs first load
  useEffect(() => {
    if (!paragraphs || paragraphs.length === 0 || activeHeadingId !== null)
      return

    // Find the first heading and set it as active
    const firstHeading = paragraphs.find((p: Paragraph) => p.type === 'heading')
    if (firstHeading) {
      const firstHeadingIndex = paragraphs.indexOf(firstHeading)
      setActiveHeadingId(`heading-${firstHeadingIndex}`)
    }
  }, [paragraphs, activeHeadingId])

  // Intersection Observer for paragraphs title visibility
  useEffect(() => {
    if (!isMobile || !paragraphsTitleRef.current) return

    const titleElement = paragraphsTitleRef.current

    const checkScrollPosition = () => {
      const rect = titleElement.getBoundingClientRect()
      // Show floating TOC when the title has completely scrolled above the viewport
      setShowFloatingTOC(rect.bottom < 0)
    }

    // Check initial position
    checkScrollPosition()

    // Use scroll event listener for more reliable position tracking
    const handleScroll = () => {
      checkScrollPosition()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile])

  // TOC navigation handler
  const handleTOCClick = (headingId: string) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Close the mobile TOC and the filter dropdowns on outside click, resize or Escape.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.mobile-toc-container')) {
        setIsMobileTOCOpen(false)
      }
      if (!target.closest('.deliverable-dropdown')) {
        setIsDeliverableDropdownOpen(false)
      }
      if (!target.closest('.assignee-dropdown')) {
        setIsAssigneeDropdownOpen(false)
      }
      if (!target.closest('.action-verb-dropdown')) {
        setIsActionVerbDropdownOpen(false)
      }
    }

    const handleResize = () => {
      // Close everything on resize as layout changes
      if (isDeliverableDropdownOpen) {
        setIsDeliverableDropdownOpen(false)
      }
      if (isAssigneeDropdownOpen) {
        setIsAssigneeDropdownOpen(false)
      }
      if (isActionVerbDropdownOpen) {
        setIsActionVerbDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDeliverableDropdownOpen) {
          setIsDeliverableDropdownOpen(false)
        }
        if (isAssigneeDropdownOpen) {
          setIsAssigneeDropdownOpen(false)
        }
        if (isActionVerbDropdownOpen) {
          setIsActionVerbDropdownOpen(false)
        }
        if (isMobileTOCOpen) {
          setIsMobileTOCOpen(false)
        }
      }
    }

    if (
      isMobileTOCOpen ||
      isDeliverableDropdownOpen ||
      isAssigneeDropdownOpen ||
      isActionVerbDropdownOpen
    ) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('resize', handleResize)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [
    isMobileTOCOpen,
    isDeliverableDropdownOpen,
    isAssigneeDropdownOpen,
    isActionVerbDropdownOpen,
  ])

  // Render TOC items recursively
  const renderTOCItem = (
    item: TOCItem,
    isTopLevel: boolean = false
  ): React.ReactNode => {
    const isActive = activeHeadingId === item.id
    const hasChildren = item.children.length > 0
    const shouldExpand = isInActivePath(item)

    return (
      <div key={item.id} className="space-y-1">
        <div className="flex items-center gap-1">
          {/* Always reserve space for expand button to maintain alignment */}
          <div className="flex h-4 w-4 shrink-0 items-center justify-center">
            {hasChildren && (
              <button
                onClick={() => handleTOCClick(item.id)}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-muted-foreground"
                title={`Go to ${item.text}`}
              >
                <svg
                  className={`h-3 w-3 transition-transform ${shouldExpand ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => handleTOCClick(item.id)}
            className={`flex-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-secondary ${
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-foreground hover:text-foreground'
            } ${isTopLevel ? 'font-medium' : ''}`}
            style={{ marginLeft: `${(item.level - 1) * 12}px` }}
          >
            <span className="line-clamp-2 leading-tight">
              {item.text.length > 35
                ? `${item.text.substring(0, 35)}...`
                : item.text}
            </span>
          </button>
        </div>

        {hasChildren && shouldExpand && (
          <div className="space-y-1">
            {item.children.map((child) => renderTOCItem(child, false))}
          </div>
        )}
      </div>
    )
  }

  // Parse a paragraph into React elements: annotation spans with their
  // tooltips, the budget phrase, and links out to cited documents.
  //
  // This used to fork. A paragraph carrying extraction markup was built as
  // React elements, because the verb and entity tooltips cannot be expressed
  // in a string; a paragraph without markup went through an older path that
  // assembled an HTML string by successive replaces and emitted it through
  // dangerouslySetInnerHTML. That string path was the original implementation
  // of the whole function, kept when the tooltips arrived because the case it
  // served had no tooltip to attach — not because it did anything the element
  // path could not. It ended up doing strictly less: both paths grew the
  // budget phrase and the link handling separately, and had to be kept in step
  // by hand.
  const renderProcessedText = (
    text: string,
    links: [string, string][],
    textWithHighlights: string | undefined,
    mandates: ParagraphMandate[] | undefined,
    // Null where a call site must not mark. Required rather than optional so
    // that adding a call site is a decision about marking, not an omission.
    marker: SearchMarker | null
  ) => {
    // The string every span offset below is positioned against: the annotated
    // form when the extraction produced one, the paragraph's own text
    // otherwise. Not what the reader sees — the delimiters are dropped as each
    // span is built.
    const spanSource = textWithHighlights || text

    // Check if any assignee/deliverable/action verb filters are active for enhanced highlighting
    const hasEnhancedFilters =
      assigneeFilter !== 'all' ||
      deliverableFilter !== 'all' ||
      actionVerbFilter !== 'all'

    // Parse text and create segments with proper React components
    const segments: React.ReactNode[] = []
    let segmentKey = 0

    // Split text by all special patterns to process sequentially. The four
    // annotation patterns are looked for only in a string the extraction
    // marked up: in a paragraph's own text a `*` or a `<<` is the document's
    // punctuation, and reading it as a delimiter would swallow the words
    // around it. The budget phrase and the links are properties of the prose
    // and are found in either.
    const allPatterns = [
      ...(textWithHighlights
        ? [
            { pattern: /\*(.*?)\*/g, type: 'verb' },
            { pattern: /<<(.*?)>>/g, type: 'assignee' },
            { pattern: /\{\{(.*?)\}\}/g, type: 'mentioned_entity' },
            { pattern: /\[\[(.*?)\]\]/g, type: 'deliverable' },
          ]
        : []),
      { pattern: /within existing resources/gi, type: 'highlight' },
    ]

    const replacements: {
      start: number
      end: number
      component: React.ReactNode
      text: string
    }[] = []

    // Find all matches across all patterns
    allPatterns.forEach(({ pattern, type }) => {
      let match
      while ((match = pattern.exec(spanSource)) !== null) {
        const matchText = type === 'highlight' ? match[0] : match[1]
        // What this span shows. `matchText` itself stays a string — the
        // mandate and deliverable lookups below compare against it.
        const matchLabel = markSearchHits(matchText, marker)
        let component: React.ReactNode

        if (type === 'highlight') {
          component = (
            <span
              key={`highlight-${segmentKey++}`}
              className="font-bold text-red-600"
            >
              {matchLabel}
            </span>
          )
        } else if (type === 'verb') {
          const correspondingMandate = mandates?.find(
            (mandate) =>
              mandate.action_verb &&
              mandate.action_verb.toLowerCase() === matchText.toLowerCase()
          )

          // Enhanced highlighting for action verb when filter is active
          const isFilteredVerb =
            actionVerbFilter !== 'all' &&
            correspondingMandate !== undefined &&
            actionVerbKey(correspondingMandate) === actionVerbFilter
          const verbClasses =
            hasEnhancedFilters && isFilteredVerb
              ? 'text-un-blue-shade cursor-help bg-un-yellow-tint px-1 py-0.5 rounded font-semibold shadow-xs'
              : 'text-un-blue-text cursor-help'

          component = (
            <Tooltip key={`verb-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className={verbClasses}>{matchLabel}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Action Verb</div>
                  <div className="text-sm">
                    {titleCase(
                      (
                        correspondingMandate?.action_verb_type || 'Unknown'
                      ).replace(/_/g, ' ')
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        } else if (type === 'assignee' || type === 'mentioned_entity') {
          // Search assignees and mentioned_entities; last match wins (preserves
          // the prior forEach-assignment order: per mandate, assignees then
          // mentioned_entities).
          const needle = matchText.toLowerCase()
          const entityCandidates: EntityTooltipData[] = (
            mandates ?? []
          ).flatMap((mandate) => [
            ...(mandate.assignees ?? [])
              .filter((a) => a.assignee.toLowerCase() === needle)
              .map((a): EntityTooltipData => ({
                ...a,
                entityType: 'assignee',
              })),
            ...(mandate.mentioned_entities ?? [])
              .filter((e) => e.mentioned_entity.toLowerCase() === needle)
              .map((e): EntityTooltipData => ({
                assignee: e.mentioned_entity,
                assignee_normalized: e.mentioned_entity_normalized,
                assignee_type: e.mentioned_entity_type,
                entityType: 'mentioned_entity',
              })),
          ])
          const entityData: EntityTooltipData | null =
            entityCandidates[entityCandidates.length - 1] ?? null

          // Enhanced highlighting for entity when filter is active
          const isFilteredEntity =
            assigneeFilter !== 'all' &&
            ((assigneeFilter.includes(':') &&
              assigneeFilter ===
                `${entityData?.assignee_type}:${entityData?.assignee_normalized || entityData?.assignee}`) ||
              (!assigneeFilter.includes(':') &&
                entityData?.assignee_type === assigneeFilter))
          const entityClasses =
            hasEnhancedFilters && isFilteredEntity
              ? 'bg-un-yellow-tint px-2 py-0.5 rounded-full text-sm font-semibold cursor-help shadow-xs'
              : 'bg-muted px-2 py-0.5 rounded-full text-sm font-medium cursor-help'

          component = (
            <Tooltip key={`entity-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className={entityClasses}>
                  <Users className="mr-1 inline h-3 w-3 align-middle" />
                  {matchLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Entity</div>
                  <div className="text-sm">
                    <div>
                      {titleCase(
                        (entityData?.assignee_type || 'Unknown').replace(
                          /_/g,
                          ' '
                        )
                      )}
                    </div>
                    {entityData?.assignee_normalized && (
                      <div className="text-muted-foreground">
                        {entityData.assignee_normalized}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        } else if (type === 'deliverable') {
          // Last match wins (preserves prior forEach-assignment behavior).
          const deliverableMatches = (mandates ?? [])
            .flatMap((m) => m.deliverables ?? [])
            .filter(
              (d) => d.deliverable.toLowerCase() === matchText.toLowerCase()
            )
          const deliverableData: DeliverableTooltipData | null =
            deliverableMatches[deliverableMatches.length - 1] ?? null

          // Enhanced highlighting for deliverable when filter is active
          const isFilteredDeliverable =
            deliverableFilter !== 'all' &&
            deliverableData?.deliverable_type === deliverableFilter
          const deliverableClasses =
            hasEnhancedFilters && isFilteredDeliverable
              ? // gray-350 is not a Tailwind colour and is not defined in
                // globals.css, so this border has never rendered at all.
                'bg-un-yellow-tint border border-border px-2 py-0.5 rounded-full text-sm font-semibold cursor-help shadow-xs'
              : 'bg-muted border border-border px-2 py-0.5 rounded-full text-sm font-medium cursor-help'

          component = (
            <Tooltip key={`deliverable-${segmentKey++}`}>
              <TooltipTrigger asChild>
                <span className={deliverableClasses}>
                  <Package className="mr-1 inline h-3 w-3 align-middle" />
                  {matchLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium">Deliverable</div>
                  <div className="text-sm">
                    <div>
                      {titleCase(
                        (
                          deliverableData?.deliverable_type || 'Unknown'
                        ).replace(/_/g, ' ')
                      )}
                    </div>
                    {deliverableData?.deliverable_normalized && (
                      <div className="text-muted-foreground">
                        {deliverableData.deliverable_normalized}
                      </div>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        }

        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          component: component!,
          text: match[0],
        })
      }
      pattern.lastIndex = 0 // Reset regex
    })

    // Linked symbols, in either kind of paragraph. A link's text can straddle
    // an annotation span, which is why these are pushed as spans and reconciled
    // below rather than substituted in place.
    if (links && links.length > 0) {
      links.forEach(([linkText, url]) => {
        if (!linkText || !url) return
        let from = 0
        for (;;) {
          const idx = spanSource.indexOf(linkText, from)
          if (idx === -1) break
          replacements.push({
            start: idx,
            end: idx + linkText.length,
            component: (
              <a
                key={`link-${segmentKey++}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-un-blue-text hover:underline"
              >
                {linkText}
              </a>
            ),
            text: linkText,
          })
          from = idx + linkText.length
        }
      })
    }

    // Sort replacements by position, longest first on ties, then drop anything
    // that overlaps an already-claimed span. Annotation spans never overlap each
    // other (verified across all 9,006 pre-rendered rows), but a link's text can
    // straddle one, and the segment builder below assumes disjoint spans — an
    // overlap would emit the same words twice.
    replacements.sort((a, b) => a.start - b.start || b.end - a.end)
    const disjointReplacements: typeof replacements = []
    let claimedTo = 0
    for (const replacement of replacements) {
      if (replacement.start < claimedTo) continue
      disjointReplacements.push(replacement)
      claimedTo = replacement.end
    }

    let lastIndex = 0
    disjointReplacements.forEach((replacement) => {
      // Add text before this replacement
      if (replacement.start > lastIndex) {
        const textBefore = spanSource.slice(lastIndex, replacement.start)
        if (textBefore) {
          segments.push(
            <span key={`text-${segmentKey++}`}>
              {markSearchHits(textBefore, marker)}
            </span>
          )
        }
      }

      // Add the replacement component
      segments.push(replacement.component)
      lastIndex = replacement.end
    })

    // Add remaining text
    if (lastIndex < spanSource.length) {
      const remainingText = spanSource.slice(lastIndex)
      if (remainingText) {
        segments.push(
          <span key={`text-${segmentKey++}`}>
            {markSearchHits(remainingText, marker)}
          </span>
        )
      }
    }

    return <>{segments}</>
  }

  // Render a single flow element (heading, annex title, or body card). Shared
  // by the main list and the annex blocks so both stay identical.
  const renderParagraphElement = (
    paragraph: Paragraph,
    index: number
  ): React.ReactNode => {
    const indentLevel = paragraph.paragraph_level || 0
    const indentClass = getIndentClass(indentLevel)

    if (paragraph.type === 'heading') {
      const HeadingTag =
        `h${Math.min(paragraph.heading_level || 3, 6)}` as keyof JSX.IntrinsicElements
      const headingClasses = {
        1: 'text-lg font-bold',
        2: 'text-base font-bold',
        3: 'text-base font-semibold',
        4: 'text-sm font-semibold',
        5: 'text-sm font-medium',
        6: 'text-sm font-medium',
      }
      const headingClass =
        headingClasses[
          paragraph.heading_level as keyof typeof headingClasses
        ] || headingClasses[3]

      return (
        <div key={`${documentSymbol}-${index}`}>
          <div className={`${indentClass}`}>
            <HeadingTag
              id={`heading-${index}`}
              className={`${headingClass} mb-3 scroll-mt-4 leading-tight text-foreground`}
            >
              {paragraph.prefix && (
                <span className="mr-2 font-medium text-un-blue-text">
                  {paragraph.prefix}
                </span>
              )}
              {renderProcessedText(
                paragraph.text,
                paragraph.links,
                paragraph.textWithHighlights,
                paragraph.mandates,
                searchMarker
              )}
            </HeadingTag>
          </div>
        </div>
      )
    }

    // Annex/appendix descriptive title — the subtitle under an "Annex N" marker.
    if (paragraph.type === 'title') {
      return (
        <p
          key={`${documentSymbol}-${index}`}
          className="text-base leading-tight font-semibold text-foreground"
        >
          {renderProcessedText(
            paragraph.text,
            paragraph.links,
            paragraph.textWithHighlights,
            paragraph.mandates,
            searchMarker
          )}
        </p>
      )
    }

    // Body card — operative (numbered badge) or neutral (no badge when the
    // element carries no prefix).
    const label = paragraph.prefix ? cleanPrefix(paragraph.prefix) : null

    return (
      <div key={`${documentSymbol}-${index}`} className={`${indentClass}`}>
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-start gap-2">
            {label && (
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-un-blue-text text-xs font-medium text-white">
                {label}
              </span>
            )}
            <div className="max-w-4xl flex-1">
              <div className="text-sm leading-relaxed">
                {renderProcessedText(
                  paragraph.text,
                  paragraph.links,
                  paragraph.textWithHighlights,
                  paragraph.mandates,
                  searchMarker
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Partition the filtered flow into main content and per-annex groups. The
  // filtered array is already in document order (main first, annexes last), and
  // each annex begins with a `heading` row carrying an `annex_index`.
  const mainElements: { paragraph: Paragraph; index: number }[] = []
  interface AnnexGroup {
    key: string
    label: string
    startIndex: number | null
    items: { paragraph: Paragraph; index: number }[]
  }
  const annexGroups: AnnexGroup[] = []
  // An annex begins at a `heading` that either carries a Digital Library
  // annex_index or whose text starts with "Annex"/"Appendix" (the mandates-arm
  // corpus has no section metadata, so the heading text is the only signal).
  let currentAnnex: AnnexGroup | null = null
  ;(paragraphs || []).forEach((paragraph: Paragraph, index: number) => {
    const text = paragraph.text?.trim() || ''
    const isAnnexStart = isAnnexStartHeading(paragraph)

    if (isAnnexStart) {
      currentAnnex = {
        key: `annex-${index}`,
        label:
          text ||
          `Annex ${romanNumeral((paragraph.annex_index as number) || 1)}`,
        startIndex: index,
        items: [],
      }
      annexGroups.push(currentAnnex)
      return
    }

    // An element explicitly marked as main content closes any open annex.
    if (paragraph.section === 'main') currentAnnex = null

    if (currentAnnex) {
      currentAnnex.items.push({ paragraph, index })
    } else if (isAnnexSection(paragraph.section)) {
      // Annex/appendix content with no explicit marker heading.
      currentAnnex = {
        key: `annex-${index}`,
        label: paragraph.section === 'appendix' ? 'Appendix' : 'Annex',
        startIndex: null,
        items: [],
      }
      annexGroups.push(currentAnnex)
      currentAnnex.items.push({ paragraph, index })
    } else {
      mainElements.push({ paragraph, index })
    }
  })

  // Quiet count beside the heading, in the register of the sibling sections
  // ("27 entities"). Documents whose extraction marks operative clauses are
  // counted as such; the Digital Library arm carries body paragraphs with no
  // paragraph_type at all, so those are counted plainly rather than reported
  // as "0 operative paragraphs".
  //
  // The count derives from the dropdown-filtered view and deliberately
  // ignores the search query. The heading asks what is in the document; a
  // count of what matched a query answers a different question in the same
  // slot, and that number is reported beside the search field instead. So
  // the dropdowns move this number and the search does not — do not point
  // these back at the searched `paragraphs` list.
  const countsAsBody = (p: Paragraph) =>
    p.type !== 'heading' && (p.type !== 'title' || visibilityTier === 'title')
  const headingOperativeCount = (headingCountElements || []).filter(
    (p: Paragraph) => p.paragraph_type === 'operative'
  ).length
  const headingBodyCount = (headingCountElements || []).filter(
    countsAsBody
  ).length
  const headingCount = headingOperativeCount || headingBodyCount
  const headingHint =
    headingCount > 0
      ? `${headingCount} ${headingOperativeCount ? 'operative ' : ''}paragraph${
          headingCount === 1 ? '' : 's'
        }`
      : undefined

  // What the search matched: the same body-row population, counted over the
  // searched list.
  const matchedBodyCount = (paragraphs || []).filter(countsAsBody).length

  return (
    <div className="space-y-4">
      <div ref={paragraphsTitleRef} className="space-y-3">
        <DetailSectionHeading
          hint={headingHint}
          howTo={<SearchSyntaxHelp />}
          disclaimer={explainerTexts.mandateDetail.paragraphs.betaDisclaimer}
        >
          What&rsquo;s in this document?
        </DetailSectionHeading>

        {allParagraphs?.[0]?.source_symbol && (
          <p className="text-sm text-muted-foreground">
            {allParagraphs[0].source_symbol} [{allParagraphs[0].part_letter}]
          </p>
        )}

        {allParagraphs?.some(
          (paragraph) => paragraph.extraction_quality_warning === true
        ) && (
          <p
            role="note"
            className="rounded-md border border-border bg-secondary px-3 py-2 text-sm"
          >
            This extracted fulltext may contain errors or omissions. Please check
            the source document.
          </p>
        )}

        {/* Search — its own line between the heading and the filter row, so
            the section reads name it, count it, search it, filter it. It
            filters the paragraphs rendered below; matching runs over the raw
            text, so nothing can be hidden that the reader could not otherwise
            see. Gated on the list having content — but an active query keeps
            the field mounted, or a query matching nothing would unmount the
            control it was typed into.
            Search syntax used to have its own "?" beside the field, a second
            circle a few pixels from the heading's. Both explain this section,
            so both now live behind the heading's — one glyph, not two. */}
        {(hasSearchQuery || (paragraphs && paragraphs.length > 0)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ChartSearchInput
              placeholder="Search these paragraphs..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {/* The match count reports here, beside the control it answers,
                in the grammar of the app's other search fields. The heading
                count above deliberately does not move with the query. */}
            {hasSearchQuery && (
              <span className="text-sm text-muted-foreground">
                {matchedBodyCount.toLocaleString()} matching paragraph
                {matchedBodyCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* Filters — their own line under the heading, in the chip language of
            the sections above. Omitted entirely when no dropdown has options;
            each dropdown is additionally hidden on its own when its own option
            list is empty (Digital Library documents, for instance, never carry
            deliverables or mentioned entities). */}
        {hasAnyFilterOptions && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {/* Assignee type dropdown */}
            {Object.keys(assigneeTypeCounts).length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SearchableFilterDropdown
                      label="Entities"
                      currentFilter={assigneeFilter}
                      isOpen={isAssigneeDropdownOpen}
                      onToggle={() =>
                        setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)
                      }
                      onFilterChange={(filter) => {
                        setAssigneeFilter(filter)
                        setIsAssigneeDropdownOpen(false)
                      }}
                      typeCounts={assigneeTypeCounts}
                      className="assignee-dropdown"
                      filteredTotalCount={assigneeFilteredTotalCount}
                      hierarchicalData={assigneesByType}
                      withItemsCount={paragraphsWithAssigneesCount}
                      withItemsLabel="With entities"
                      entityLongMap={entityLongMap}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm" side="top">
                  <div className="space-y-2">
                    <div className="font-medium">Filter by Entity</div>
                    <div className="text-sm">
                      Entities include both assignees (organizations assigned to
                      carry out mandates) and mentioned entities (organizations
                      referenced in the text).
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Deliverable type dropdown */}
            {Object.keys(deliverableTypeCounts).length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <FilterDropdown
                      label="Deliverables"
                      currentFilter={deliverableFilter}
                      isOpen={isDeliverableDropdownOpen}
                      onToggle={() =>
                        setIsDeliverableDropdownOpen(!isDeliverableDropdownOpen)
                      }
                      onFilterChange={(filter) => {
                        setDeliverableFilter(filter)
                        setIsDeliverableDropdownOpen(false)
                      }}
                      typeCounts={deliverableTypeCounts}
                      withItemsCount={paragraphsWithDeliverablesCount}
                      withItemsLabel="With deliverables"
                      className="deliverable-dropdown"
                      filteredTotalCount={deliverableFilteredTotalCount}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm" side="top">
                  <div className="space-y-2">
                    <div className="font-medium">
                      Filter by Deliverable Type
                    </div>
                    <div className="text-sm">
                      Deliverables are specific outputs or tasks that are
                      mandated in a paragraph.
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Action verb searchable dropdown */}
            {Object.keys(actionVerbCounts).length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SearchableFilterDropdown
                      label="Actions"
                      currentFilter={actionVerbFilter}
                      isOpen={isActionVerbDropdownOpen}
                      onToggle={() =>
                        setIsActionVerbDropdownOpen(!isActionVerbDropdownOpen)
                      }
                      onFilterChange={(filter) => {
                        setActionVerbFilter(filter)
                        setIsActionVerbDropdownOpen(false)
                      }}
                      typeCounts={actionVerbCounts}
                      className="action-verb-dropdown"
                      filteredTotalCount={actionVerbFilteredTotalCount}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm" side="top">
                  <div className="space-y-2">
                    <div className="font-medium">Filter by Action Verb</div>
                    <div className="text-sm">
                      Action verbs determine the type and strength of operative
                      paragraphs.
                      {/* They may present and acknowledge information, reinforce prior statements, express a positive or negative stance, constitute an action of the assembly itself, or direct assignees to carry out deliverables. */}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Reset — only visible when filters are active. No tooltip: it
                would only restate the button's own label. */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-1 inline-flex cursor-pointer items-center gap-1 self-center text-sm font-medium text-un-blue-text hover:underline"
                aria-label="Reset all filters"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile TOC - Floating button and expandable panel */}
      {isMobile && showFloatingTOC && (
        <div className="mobile-toc-container">
          {/* Floating TOC Button */}
          <button
            onClick={() => setIsMobileTOCOpen(!isMobileTOCOpen)}
            className="fixed top-4 left-4 z-50 rounded-lg border border-border bg-white p-2 shadow-lg transition-colors hover:bg-muted"
            aria-label="Toggle table of contents"
          >
            <Menu className="h-4 w-4 text-foreground" />
          </button>

          {/* Expandable TOC Panel */}
          {isMobileTOCOpen && (
            <div className="fixed top-14 left-4 z-40 max-h-96 w-80 max-w-xs overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
              <div className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4" />
                  Table of contents
                </h4>
                <div className="space-y-1">
                  {tocItems.length > 0 ? (
                    tocItems.map((item) => renderTOCItem(item, true))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No headings found in this document.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paragraphs Content with TOC Layout */}
      <div className={isMobile || compact ? 'w-full' : 'flex gap-8'}>
        {/* Main paragraph content */}
        <div className={isMobile || compact ? 'w-full' : 'max-w-[65%] flex-1'}>
          <div className={isMobile || compact ? '' : 'pr-4'}>
            {isLoading ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted p-3">
                    <Skeleton className="mb-2 h-4 w-3/4" />
                    <Skeleton className="mb-1 h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="rounded-lg bg-muted p-3">
                      <Skeleton className="mb-1 h-4 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted p-3">
                    <Skeleton className="mb-2 h-4 w-2/3" />
                    <Skeleton className="mb-1 h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="rounded-lg bg-muted p-3">
                      <Skeleton className="mb-1 h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <Skeleton className="mb-1 h-4 w-5/6" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted p-3">
                    <Skeleton className="mb-2 h-4 w-3/5" />
                    <Skeleton className="mb-1 h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-700">
                  Error loading paragraphs: {error}
                </p>
              </div>
            ) : paragraphs && paragraphs.length > 0 ? (
              <div className="space-y-4">
                {/* Collapsible preambular section */}
                {(() => {
                  const preambularParagraphs = (allParagraphs || []).filter(
                    (p: Paragraph) =>
                      collapsePreamble &&
                      isMainPreambular(p) &&
                      isContentElement(p, visibilityTier)
                  )
                  if (preambularParagraphs.length === 0) return null
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPreamble(!showPreamble)}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-un-blue-text hover:underline"
                      >
                        {showPreamble ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Show fewer
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show {preambularParagraphs.length} preambular
                            paragraph
                            {preambularParagraphs.length !== 1 && 's'}
                          </>
                        )}
                      </button>
                      {showPreamble && (
                        <div className="space-y-2">
                          {preambularParagraphs.map(
                            (paragraph: Paragraph, i: number) => {
                              const label = paragraph.prefix
                                ? cleanPrefix(paragraph.prefix)
                                : null
                              const indentLevel = paragraph.paragraph_level || 0
                              const indent =
                                indentLevel > 1 ? (indentLevel - 1) * 24 : 0
                              return (
                                <div
                                  key={`preamble-${i}`}
                                  style={{ marginLeft: indent }}
                                >
                                  <div className="rounded-lg bg-muted p-3">
                                    <div className="flex items-start gap-2">
                                      {label && (
                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-un-blue-text text-xs font-medium text-white">
                                          {label}
                                        </span>
                                      )}
                                      <div className="flex-1 text-sm leading-relaxed text-foreground">
                                        {renderProcessedText(
                                          paragraph.text,
                                          paragraph.links,
                                          paragraph.textWithHighlights,
                                          paragraph.mandates,
                                          // No marks here. This block renders
                                          // main-section preambular clauses
                                          // from the unsearched list, so a
                                          // mark would claim a match the
                                          // paragraph never made.
                                          null
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Main content: operative + neutral body paragraphs */}
                {mainElements.map(({ paragraph, index }, i) => {
                  // Thin delimiter between sub-resolution blocks in omnibus
                  // documents (multiple text_index values).
                  const prev = i > 0 ? mainElements[i - 1].paragraph : null
                  const showTextDivider =
                    prev != null &&
                    paragraph.text_index != null &&
                    prev.text_index != null &&
                    paragraph.text_index !== prev.text_index
                  return (
                    <React.Fragment key={`main-${index}`}>
                      {showTextDivider && (
                        <div
                          className="my-6 border-t border-border"
                          aria-hidden
                        />
                      )}
                      {renderParagraphElement(paragraph, index)}
                    </React.Fragment>
                  )
                })}

                {/* Annex / appendix blocks, each set off as its own section */}
                {annexGroups.map((group) => (
                  <section
                    key={group.key}
                    className="mt-8 space-y-4 border-t border-border pt-6"
                  >
                    <div
                      id={
                        group.startIndex != null
                          ? `heading-${group.startIndex}`
                          : undefined
                      }
                      className="scroll-mt-4 text-sm font-semibold tracking-wide text-un-blue-text uppercase"
                    >
                      {group.label}
                    </div>
                    <div className="space-y-4 border-l-2 border-border pl-4">
                      {group.items.map(({ paragraph, index }) =>
                        renderParagraphElement(paragraph, index)
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : hasSearchQuery ? (
              /* Search-miss state, in the register of the app's other search
                 fields. Distinct from the no-paragraphs card below, which is
                 a claim about extraction — false here, where extraction
                 succeeded and the query simply missed. */
              <p className="text-sm text-muted-foreground">
                No paragraphs match &ldquo;{searchQuery.trim()}&rdquo;.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Fulltext could not be extracted.
                </p>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-un-blue-text underline underline-offset-2"
                  >
                    View source document
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop TOC Sidebar - Right side, only for paragraphs section */}
        {!isMobile && !compact && (
          <div className="w-[30%] shrink-0">
            <div className="sticky top-4 mb-8 rounded-lg bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                Table of contents
              </h4>
              <div className="space-y-1">
                {tocItems.length > 0 ? (
                  tocItems.map((item) => renderTOCItem(item, true))
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No headings found in this document.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
