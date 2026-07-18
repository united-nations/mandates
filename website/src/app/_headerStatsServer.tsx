import { HeaderStats } from '@/components/HeaderStats'
import type { ApiResponse } from '@/types'

interface Props {
  dataPromise: Promise<ApiResponse>
}

export async function HeaderStatsServer({ dataPromise }: Props) {
  const data = await dataPromise
  return <HeaderStats data={data} />
}
