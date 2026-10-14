import { explainerTexts } from '@/lib/en_text_contents'
import { AgendaItemsView } from '@/components/AgendaItemsView'
import { getProgressiveAgendaPageData } from '@/lib/data/agenda-items'

export const metadata = {
  title: explainerTexts.pageTitles.agendas,
}

export default async function AgendaItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const body =
    params.agenda_body === 'SC'
      ? 'SC'
      : params.agenda_body === 'HRC'
        ? 'HRC'
        : params.agenda_body === 'ECOSOC'
          ? 'ECOSOC'
          : 'GA'
  const { data, mainCounts, relatedCounts } =
    await getProgressiveAgendaPageData(
      body,
      typeof params.agenda_session === 'string'
        ? params.agenda_session
        : undefined
    )
  return (
    <section className="mx-auto max-w-6xl px-2 pt-4 pb-10 sm:px-6 md:px-12 lg:px-16">
      <AgendaItemsView
        key={`${data.body}/${data.status === 'ready' ? data.session : ''}`}
        data={data}
        mainCounts={mainCounts}
        relatedCounts={relatedCounts}
      />
    </section>
  )
}
