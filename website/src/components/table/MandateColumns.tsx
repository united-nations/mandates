export interface ColumnDef {
  id: string
  label: string
  defaultVisible: boolean
  sortKeys?: { asc: string; desc: string }
  filterParam?: string
  filterType?: 'pill' | 'yearRange' | 'simpleSelect' | 'hierarchy'
  widthClass: string
  minWidthClass?: string
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
    widthClass: 'w-[140px]',
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
    widthClass: 'w-[80px]',
    align: 'left',
  },
  {
    id: 'title',
    label: 'Title',
    defaultVisible: true,
    widthClass: 'w-auto',
    minWidthClass: 'min-w-[200px]',
    align: 'left',
  },
  {
    id: 'year',
    label: 'Year',
    defaultVisible: false,
    sortKeys: { asc: 'year_asc', desc: 'year_desc' },
    filterParam: 'start_year',
    filterType: 'yearRange',
    widthClass: 'w-[70px]',
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
    widthClass: 'w-auto',
    minWidthClass: 'min-w-[150px]',
    align: 'left',
  },
  {
    id: 'detail',
    label: '',
    defaultVisible: true,
    widthClass: 'w-[92px]',
    align: 'center',
  },
  {
    id: 'subjects',
    label: 'Subjects',
    defaultVisible: false,
    filterParam: 'subject',
    filterType: 'pill',
    widthClass: 'max-w-[200px]',
    minWidthClass: 'min-w-[150px]',
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
    widthClass: 'w-[260px]',
    minWidthClass: 'min-w-[200px]',
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
    widthClass: 'w-[100px]',
    align: 'left',
  },
  {
    id: 'agenda_item',
    label: 'Agenda Item',
    defaultVisible: false,
    filterParam: 'agenda_item',
    filterType: 'pill',
    widthClass: 'w-auto',
    minWidthClass: 'min-w-[150px]',
    align: 'left',
  },
]

export const DEFAULT_VISIBLE_COLUMNS = new Set(
  COLUMN_DEFINITIONS.filter((c) => c.defaultVisible).map((c) => c.id)
)

export const TOGGLEABLE_COLUMNS = COLUMN_DEFINITIONS.filter(
  (c) => c.id !== 'detail'
)

export function getMandateUrl(
  symbol: string,
  query?: { ppb_version?: string; mode?: string },
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
  if (query?.mode) params.set('mode', query.mode)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
