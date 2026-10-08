import { explainerTexts } from '@/lib/en_text_contents'

export const metadata = {
  title: explainerTexts.secretariatNavigation.agendaItems,
}

export default function AgendaItemsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-8 pb-10 md:px-12 lg:px-16">
      <h2 className="text-4xl font-bold tracking-tight text-foreground">
        {explainerTexts.secretariatNavigation.agendaItems}
      </h2>
    </section>
  )
}
