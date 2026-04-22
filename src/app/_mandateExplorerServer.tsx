import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import type { ApiResponse } from '@/types'

interface Props {
  dataPromise: Promise<ApiResponse>
  pageType: 'main' | 'entity' | 'organ'
  entityFilter?: string
  organFilter?: string
}

export async function MandateExplorerServer({
  dataPromise,
  pageType,
  entityFilter,
  organFilter,
}: Props) {
  const data = await dataPromise
  return (
    <MandateExplorerClient
      data={data}
      pageType={pageType}
      entityFilter={entityFilter}
      organFilter={organFilter}
    />
  )
}
