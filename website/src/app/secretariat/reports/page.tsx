import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.secretariatReports

export const metadata = {
  title: explainerTexts.secretariatNavigation.reports,
}

export default function ReportsPage() {
  return (
    <section className="mx-auto max-w-6xl px-2 pt-4 pb-10 sm:px-6 md:px-12 lg:px-16">
      <h2 className="mb-3 text-xl font-semibold">{text.heading}</h2>
      <p className="mb-4 text-muted-foreground">{text.workInProgress}</p>
      <p className="mb-2">{text.interim}</p>
      <a
        href="https://sg-reports.un-two-zero.org/"
        className="text-primary underline underline-offset-4"
      >
        {text.link}
      </a>
    </section>
  )
}
