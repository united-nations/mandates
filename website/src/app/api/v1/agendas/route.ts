import { getPublicAgendas } from '@/lib/data/public-agendas'
import { publicAgendaQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const { body, session } = publicAgendaQuery(
      new URL(request.url).searchParams
    )
    return publicJson(await getPublicAgendas(body, session))
  } catch (error) {
    return publicError(error)
  }
}
