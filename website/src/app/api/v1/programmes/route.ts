import { getEntitiesProgrammesData } from '@/lib/data/entities-programmes'
import { API_VERSION, publicProgrammeQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    publicProgrammeQuery(new URL(request.url).searchParams)
    return publicJson({
      apiVersion: API_VERSION,
      ...(await getEntitiesProgrammesData()),
    })
  } catch (error) {
    return publicError(error)
  }
}
