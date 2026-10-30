import type { FilterOptions } from '@/types'
import { organSelectionLabel } from '@/lib/explore-card-state'
import {
  NO_CITING_ENTITY,
  NO_CITING_ENTITY_LABEL,
} from '@/lib/filter-constants'
import {
  getFilteredResultsSummary,
  type FilteredResultsSummaryData,
} from '@/lib/data/filtered-results-summary'

interface SummarySelections {
  organ?: { code: string; longName: string | null }
  entity?: { code: string; longName: string | null }
}

export function FilteredResultsSummaryRow({
  data,
  selections = {},
}: {
  data?: FilteredResultsSummaryData | null
  selections?: SummarySelections
}) {
  const organ = selections.organ
  const entity = selections.entity
  const citedDetail = !data
    ? undefined
    : data.documents === 0
      ? 'None cited as mandates'
      : data.citedDocuments === data.documents
        ? 'All cited as mandates'
        : `${data.citedDocuments.toLocaleString('en')} cited as mandates`
  const cells = [
    {
      label: 'Documents',
      value: data?.documents,
      detail: citedDetail,
    },
    {
      label: organ ? 'Mandating body selected' : 'Mandating bodies',
      value: data?.bodies,
      selection: organ
        ? organSelectionLabel(organ.code, organ.longName)
        : undefined,
      title: organ?.longName ?? organ?.code,
      detail: data
        ? `${data.bodies === 1 ? 'Issues' : 'Issue'} these documents`
        : undefined,
    },
    {
      label: entity ? 'Entity selected' : 'Entities',
      value: data?.entities,
      selection:
        entity?.code === NO_CITING_ENTITY
          ? NO_CITING_ENTITY_LABEL
          : entity?.code,
      title: entity?.longName ?? entity?.code,
      detail: !data
        ? undefined
        : entity?.code === NO_CITING_ENTITY
          ? 'No budget citations'
          : entity
            ? `${data.entities.toLocaleString('en')} ${data.entities === 1 ? 'entity cites' : 'entities cite'} these documents`
            : `${data.entities === 1 ? 'Cites' : 'Cite'} these documents`,
    },
    {
      label: 'Reports',
      value: data?.reports,
      detail: 'Linked to these documents',
    },
  ]
  return (
    <div
      role="group"
      aria-label="Filtered results"
      aria-busy={data === undefined}
      className="mt-3"
    >
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Filtered results
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="rounded-md bg-muted/40 px-4 py-2">
            <div
              title={cell.title}
              className="text-xl font-medium text-foreground tabular-nums"
            >
              {cell.selection ?? cell.value?.toLocaleString('en') ?? '—'}
            </div>
            <div className="text-sm text-muted-foreground">{cell.label}</div>
            {cell.detail && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {cell.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export async function FilteredResultsSummary({
  filters,
  selections,
}: {
  filters: FilterOptions
  selections?: SummarySelections
}) {
  const data = await getFilteredResultsSummary(filters).catch((error) => {
    console.error('Unable to load filtered results summary', error)
    return null
  })
  return <FilteredResultsSummaryRow data={data} selections={selections} />
}
