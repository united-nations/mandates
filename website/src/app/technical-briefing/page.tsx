import type { Metadata } from 'next'
import { explainerTexts } from '@/lib/en_text_contents'
import { TechnicalBriefingVideo } from './TechnicalBriefingVideo'

const text = explainerTexts.technicalBriefing

export const metadata: Metadata = {
  title: text.title,
  description: text.introduction,
  alternates: { canonical: '/technical-briefing' },
}

export default function TechnicalBriefingPage() {
  return (
    <article className="text-base leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        {text.title}
      </h1>
      <section className="space-y-4">
        <p className="max-w-2xl">{text.introduction}</p>
        <TechnicalBriefingVideo
          title={text.title}
          chaptersHeading={text.chaptersHeading}
          chapters={text.chapters}
        />
      </section>
    </article>
  )
}
