import { MandateExplorerClient } from '@/components/MandateExplorerClient'
import type { ApiResponse } from '@/types'

interface Props {
  dataPromise: Promise<ApiResponse>
}

export async function MandateExplorerServer({ dataPromise }: Props) {
  const data = await dataPromise
  return <MandateExplorerClient data={data} />
}
