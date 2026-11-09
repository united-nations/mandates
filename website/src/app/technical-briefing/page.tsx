import type { Metadata } from 'next'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.technicalBriefing

const VIDEO_ID = 'EHlQGY91owc'

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
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
          title={text.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video h-auto w-full rounded-md border-0"
        />
        <p className="text-sm">
          <a
            href={`https://www.youtube.com/watch?v=${VIDEO_ID}`}
            target="_blank"
            rel="noopener"
            className="text-un-blue-text underline"
          >
            {text.watchOnYouTube}
          </a>
        </p>
      </section>
    </article>
  )
}
