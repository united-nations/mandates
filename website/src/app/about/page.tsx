import type { Metadata } from 'next'
import Image from 'next/image'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.about

const linkPattern = new RegExp(
  `(${text.links.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g'
)

/** Adds the source links while keeping the shared plain-text copy intact. */
function AboutText({
  children,
  excludeLinks = [],
}: {
  children: string
  excludeLinks?: readonly string[]
}) {
  return children.split(linkPattern).map((part, index) => {
    const link = text.links.find(({ label }) => label === part)
    return link && !excludeLinks.includes(link.label) ? (
      <a key={index} href={link.href} className="text-un-blue-text underline">
        {part}
      </a>
    ) : (
      part
    )
  })
}

export const metadata: Metadata = {
  title: explainerTexts.pageTitles.about,
  description: text.introduction,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <article className="text-base leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        {text.heading}
      </h1>
      <section aria-labelledby="methodology" className="space-y-4">
        <p className="max-w-2xl">
          <AboutText>{text.introduction}</AboutText>
        </p>
        <h2 id="methodology" className="pt-4 text-2xl font-semibold">
          {text.methodologyHeading}
        </h2>
        <p className="max-w-2xl">{text.scope}</p>
        <p className="max-w-2xl">{text.sourcesIntroduction}</p>
        <ul className="max-w-2xl list-disc space-y-3 pl-6">
          {text.sources.map((source) => (
            <li key={source}>
              <AboutText excludeLinks={['UN80 Initiative']}>{source}</AboutText>
            </li>
          ))}
        </ul>
        <Image
          src="/images/methodology.svg"
          alt={text.infographicAlt}
          width={248}
          height={135}
          unoptimized
          className="h-auto w-full"
        />
      </section>
    </article>
  )
}
