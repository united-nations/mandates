import type { Metadata } from 'next'
import Image from 'next/image'

import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.about

export const metadata: Metadata = {
  title: explainerTexts.pageTitles.about,
  description: text.introduction,
}

export default function AboutPage() {
  return (
    <article className="max-w-3xl text-base leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        {text.heading}
      </h1>

      <div className="space-y-4">
        <p>{text.introduction}</p>
        <h2 className="pt-4 text-2xl font-semibold">
          {text.methodologyHeading}
        </h2>
        <p>{text.scope}</p>
        <p>{text.sourcesIntroduction}</p>
        <ul className="list-disc space-y-3 pl-6">
          {text.sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>

        <Image
          src="/images/methodology.svg"
          alt={text.infographicAlt}
          width={248}
          height={135}
          unoptimized
          className="h-auto w-full max-w-4xl"
        />

        <p>{text.preliminaryCitations}</p>
      </div>
    </article>
  )
}
