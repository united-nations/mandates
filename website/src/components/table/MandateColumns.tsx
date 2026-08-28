import type { FilterOptions } from '@/types'

export interface ColumnDef {
  id: string
  label: string
  defaultVisible: boolean
  sortKeys?: { asc: string; desc: string }
  filterParam?: string
  filterType?: 'pill' | 'yearRange' | 'simpleSelect' | 'hierarchy'
  /**
   * Column width in px. The table runs on `table-layout: fixed`, so this is
   * taken exactly rather than treated as a hint the browser may overrule from
   * whatever happens to be in the cells.
   */
  width: number
  /**
   * The one column that declares no width and absorbs whatever the table has
   * over its minimum, so its `width` is a floor rather than an exact value.
   * Only the title is flexible: it is the column whose content has no upper
   * bound, and the only one that gains anything from being wider.
   */
  flexible?: true
  align?: 'left' | 'right' | 'center'
}

// Order here is the column order in the table. `defaultVisible` is deliberately
// minimal — symbol + title only (plus the non-toggleable `detail` column) — so
// the list reads as a document list first; everything else is opt-in via the
// "more columns" picker in the toolbar.
export const COLUMN_DEFINITIONS: ColumnDef[] = [
  {
    id: 'symbol',
    label: 'Symbol',
    defaultVisible: true,
    // Sized for the chip plus a grouping icon beside it, not for the symbol
    // alone — the series markers and the group expander sit in the same flex
    // row and are what overran the old 140px, clipping the icon.
    //
    // This covers the common case, not every value. Symbol length has a
    // median of 13 characters and a 95th percentile of 17, but 684 documents
    // run past 20 and 86 past 40 — those last have no symbol at all and
    // carry a title in the field as a stand-in. They truncate at any width.
    width: 170,
    align: 'left',
  },
  {
    // Between Symbol and Title: the organ is part of how a document identifies
    // itself ("this is a GA resolution"), so it belongs beside the symbol rather
    // than after the title where it read as just another attribute.
    id: 'organ',
    label: 'Organ',
    defaultVisible: false,
    filterParam: 'organ',
    filterType: 'pill',
    width: 84,
    align: 'left',
  },
  {
    id: 'title',
    label: 'Title',
    defaultVisible: true,
    // 40 characters of title, at roughly 6.33px a character plus the cell's
    // 24px of padding. 200px was about 28 characters, which stops inside
    // "Report of the Secretary-General on" - a column at that floor would
    // show rows reading identically. Distinguishability climbs steeply to 35
    // characters and then flattens, so 40 buys the margin for titles with
    // acronyms and digits cheaply where 60 would not.
    width: 280,
    flexible: true,
    align: 'left',
  },
  {
    id: 'year',
    label: 'Year',
    defaultVisible: false,
    sortKeys: { asc: 'year_asc', desc: 'year_desc' },
    filterParam: 'start_year',
    filterType: 'yearRange',
    // Sized for the header, not the cells: "YEAR" with its sort chevron and
    // filter funnel is wider than four digits. Headers do not wrap and the
    // cell does not clip them, so a column's floor is whichever of its header
    // and its content needs more — here that is the header.
    width: 90,
    align: 'left',
  },
  {
    id: 'entity_list',
    label: 'Entities',
    defaultVisible: false,
    sortKeys: {
      asc: 'citing_entities_asc',
      desc: 'citing_entities_desc',
    },
    filterParam: 'entity',
    filterType: 'pill',
    width: 150,
    align: 'left',
  },
  {
    id: 'detail',
    label: '',
    defaultVisible: true,
    // Icon-only rail: a 14px chevron plus the button's 4px padding and 1px
    // border on each side, inside the cell's own px-3. Nothing wider, because
    // this is the one column that never scrolls out of view — its width comes
    // off the visible area at every scroll position.
    width: 48,
    align: 'center',
  },
  {
    id: 'subjects',
    label: 'Subjects',
    defaultVisible: false,
    filterParam: 'subject',
    filterType: 'pill',
    width: 200,
    align: 'left',
  },
  {
    // Where in the budget each document is cited: part › section › entity ›
    // subprogramme. Replaces the old Programme column — every section has
    // exactly one programme, so the programme rode along on the section label
    // and a column of its own said nothing the section did not.
    //
    // Its filter is the hierarchy tree rather than a flat facet list, which is
    // the only reason `filterType: 'hierarchy'` exists.
    id: 'budget_location',
    label: 'Budget Location',
    defaultVisible: false,
    filterParam: 'budget_part',
    filterType: 'hierarchy',
    width: 260,
    align: 'left',
  },
  {
    id: 'document_type',
    // Sentence case, like every other label on the site. The id and the
    // `document_type` filter param are unchanged — this is the visible label
    // only, so stored column selections and shared URLs keep working.
    label: 'Document type',
    defaultVisible: false,
    filterParam: 'document_type',
    filterType: 'pill',
    // The header governs here too, and by a wide margin: "DOCUMENT TYPE"
    // plus the filter funnel needs half again what the values under it do.
    // Shortening this to fit the content puts the header over the next
    // column.
    width: 148,
    align: 'left',
  },
  {
    id: 'agenda_item',
    label: 'Agenda Item',
    defaultVisible: false,
    filterParam: 'agenda_item',
    filterType: 'pill',
    width: 150,
    align: 'left',
  },
  {
    // How many entities cite the document as a mandate, as one number — the
    // figure the list is sorted by out of the box, so it is on by default and
    // pinned to the right, immediately left of the Details rail (last in this
    // array, and only `detail` is moved after it). The Entities column above is
    // the same data spelled out; this is the glanceable form, with the full set
    // of chips one hover away.
    id: 'entity_count',
    label: '# Entities',
    defaultVisible: true,
    sortKeys: {
      asc: 'citing_entities_asc',
      desc: 'citing_entities_desc',
    },
    // Same `entity` filter as the Entities column — one filter, reached two
    // ways, exactly as the organ/budget columns already share theirs.
    filterParam: 'entity',
    filterType: 'pill',
    // Wide enough for "# ENTITIES" plus the sort chevron and the filter funnel;
    // the circles themselves sit at the right edge, against the Details rail.
    width: 142,
    align: 'right',
  },
]

export const DEFAULT_VISIBLE_COLUMNS = new Set(
  COLUMN_DEFINITIONS.filter((c) => c.defaultVisible).map((c) => c.id)
)

export const TOGGLEABLE_COLUMNS = COLUMN_DEFINITIONS.filter(
  (c) => c.id !== 'detail'
)

/**
 * The table's own minimum width: every visible column at its declared width,
 * with the flexible column at its floor. Above this the table is w-full and
 * the surplus goes to the flexible column; below it the table holds here and
 * the wrapper scrolls sideways.
 *
 * Summed over the visible columns rather than all of them. A constant sized
 * for the full set would put a scrollbar under the default view, where four
 * columns are on.
 */
export function tableMinWidth(columns: ColumnDef[]): number {
  return columns.reduce((total, col) => total + col.width, 0)
}

/**
 * Whether this column's filter currently holds a value.
 *
 * The hierarchy filter writes to whichever level was clicked, so the column
 * reads as filtered if any of them is set. `entity` is intentionally shared
 * between the Entities and # Entities columns — it is the same filter, reached
 * several ways.
 *
 * Three places need the same answer: the header (does the funnel light up), the
 * columns/filters menu, and the rule that a filtered column is always shown.
 */
export function isColumnFilterActive(
  column: ColumnDef,
  filters: FilterOptions
): boolean {
  if (!column.filterParam) return false
  if (column.filterType === 'yearRange')
    return !!(filters.start_year || filters.end_year)
  if (column.filterType === 'hierarchy')
    return !!(filters.budget_part || filters.section || filters.subprogramme)
  return !!(filters as Record<string, string | undefined>)[column.filterParam]
}

export function getMandateUrl(
  symbol: string,
  query?: { ppb_version?: string },
  // Current list search params to carry through. Opening a mandate is an
  // overlay on the *same* list — the mandate identity lives in the path, so the
  // query string should pass through untouched. Without this, navigating to the
  // modal replaces the list's URL and its client controls re-read the new,
  // stripped params: the "Group versions" toggle (which has no default) visibly
  // flips off, active filters/sort/page appear reset, etc.
  preserveParams?: { toString(): string }
): string {
  if (!symbol) return '/mandate/unknown'
  const segments = symbol
    .split('/')
    .map((segment) => encodeURIComponent(segment))
  const base = `/mandate/${segments.join('/')}`
  // Seed from the caller's current params, then let explicit overrides win.
  // The detail/modal view already reads ppb_version to scope its citation
  // counts to the same budget version as the list it came from; preserving the
  // full query string keeps that behaviour and everything else besides.
  const params = new URLSearchParams(preserveParams?.toString() ?? '')
  if (query?.ppb_version) params.set('ppb_version', query.ppb_version)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
