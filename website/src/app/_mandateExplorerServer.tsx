import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import type { BudgetVersion } from '@/lib/data/budget-documents'
import type { ApiResponse, FilterOptions } from '@/types'
import { Suspense } from 'react'
import { hasDocumentScope } from '@/lib/document-filter-scope'
import {
  FilteredResultsSummary,
  FilteredResultsSummaryRow,
} from '@/components/FilteredResultsSummary'

interface Props {
  dataPromise: Promise<ApiResponse>
  versions: BudgetVersion[]
  activeVersionSlug: string
  filters: FilterOptions
}

export async function MandateExplorerServer({
  dataPromise,
  versions,
  activeVersionSlug,
  filters,
}: Props) {
  const data = await dataPromise
  const selections = {
    organ:
      filters.organ && filters.organ !== 'all'
        ? {
            code: filters.organ,
            longName:
              data.reference?.organs.find(
                (organ) => organ.short === filters.organ
              )?.long ?? null,
          }
        : undefined,
    entity:
      filters.entity && filters.entity !== 'all'
        ? {
            code: filters.entity,
            longName:
              data.reference?.entities.find(
                (entity) => entity.entity === filters.entity
              )?.entity_long ?? null,
          }
        : undefined,
  }
  return (
    <MandateExplorerClient
      data={data}
      versions={versions}
      activeVersionSlug={activeVersionSlug}
      filteredSummary={
        hasDocumentScope(filters) ? (
          <Suspense
            key={JSON.stringify(filters)}
            fallback={<FilteredResultsSummaryRow selections={selections} />}
          >
            <FilteredResultsSummary
              selections={selections}
              filters={{ ...filters, ppb_version: activeVersionSlug }}
            />
          </Suspense>
        ) : undefined
      }
    />
  )
}
