import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import type { BudgetVersion } from '@/lib/data/budget-documents'
import type { ApiResponse } from '@/types'

interface Props {
  dataPromise: Promise<ApiResponse>
  versions: BudgetVersion[]
  activeVersionSlug: string
}

export async function MandateExplorerServer({
  dataPromise,
  versions,
  activeVersionSlug,
}: Props) {
  const data = await dataPromise
  return (
    <MandateExplorerClient
      data={data}
      versions={versions}
      activeVersionSlug={activeVersionSlug}
    />
  )
}
