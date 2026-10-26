import Link from 'next/link'

import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.secretariatReports

export const metadata = {
  title: explainerTexts.secretariatNavigation.reports,
}

export default function ReportsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-3 pb-10 md:px-12 lg:px-16">
      <p className="mb-4 text-muted-foreground">{text.workInProgress}</p>
      <p>
        {text.interim}{' '}
        <Link
          href="/secretariat"
          className="text-primary underline underline-offset-4"
        >
          {text.link}
        </Link>
        .
      </p>
    </section>
  )
}
