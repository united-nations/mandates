import type { Mandate } from '@/types'

export interface ColumnDef {
  id: string
  label: string
  defaultVisible: boolean
  sortKeys?: { asc: string; desc: string }
  filterParam?: string
  filterType?: 'pill' | 'yearRange' | 'simpleSelect'
  widthClass: string
  minWidthClass?: string
  align?: 'left' | 'right' | 'center'
}

export const COLUMN_DEFINITIONS: ColumnDef[] = [
  {
    id: 'symbol',
    label: 'Symbol',
    defaultVisible: true,
    widthClass: 'w-[140px]',
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
    id: 'organ',
    label: 'Organ',
    defaultVisible: true,
    filterParam: 'organ',
    filterType: 'pill',
    widthClass: 'w-[80px]',
    align: 'left',
  },
  {
    id: 'year',
    label: 'Year',
    defaultVisible: true,
    sortKeys: { asc: 'year_asc', desc: 'year_desc' },
    filterParam: 'start_year',
    filterType: 'yearRange',
    widthClass: 'w-[70px]',
    align: 'left',
  },
  {
    id: 'citations',
    label: 'Cit.',
    defaultVisible: true,
    sortKeys: { asc: 'citations_asc', desc: 'citations_desc' },
    widthClass: 'w-[50px]',
    align: 'right',
  },
  {
    id: 'entity_list',
    label: 'Entities',
    defaultVisible: true,
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
    widthClass: 'w-[40px]',
    align: 'center',
  },
  // Hidden by default
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
    id: 'programme',
    label: 'Programme',
    defaultVisible: false,
    filterParam: 'programme',
    filterType: 'pill',
    widthClass: 'w-[150px]',
    align: 'left',
  },
  {
    id: 'budget_document',
    label: 'Budget Doc',
    defaultVisible: false,
    filterParam: 'budget_document',
    filterType: 'simpleSelect',
    widthClass: 'w-[120px]',
    align: 'left',
  },
  {
    id: 'document_type',
    label: 'Type',
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

export function getMandateUrl(symbol: string): string {
  if (!symbol) return '/mandate/unknown'
  const segments = symbol
    .split('/')
    .map((segment) => encodeURIComponent(segment))
  return `/mandate/${segments.join('/')}`
}
