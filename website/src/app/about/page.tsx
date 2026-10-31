import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.about

const linkPattern = new RegExp(
  `(${text.links.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g'
)

/** Adds the source links while keeping the shared plain-text copy intact. */
function AboutText({ children }: { children: string }) {
  return children.split(linkPattern).map((part, index) => {
    const link = text.links.find(({ label }) => label === part)
    return link ? (
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
              <AboutText>{source}</AboutText>
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
        <p className="max-w-2xl">{text.preliminaryCitations}</p>
      </section>

      <section
        aria-labelledby="programmatic-access"
        className="mt-10 max-w-2xl space-y-4"
      >
        <h2 id="programmatic-access" className="text-xl font-semibold">
          Using this programmatically
        </h2>
        <p>
          The public read-only API lets you search documents, retrieve available
          text and budget citations, and download filtered results. No account
          or API key is required. Fetch a document by its symbol at{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] break-all">
            /mandate/A/RES/79/1
          </code>
          ; append{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            .json
          </code>{' '}
          to the address for structured data, including available paragraphs and
          budget citations.
        </p>
        <p>
          To search or list documents, fetch{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] break-all">
            /api/v1/documents?keyword=climate
          </code>
          . Use the same filters as the website, such as{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            entity=DESA
          </code>{' '}
          or{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            start_year=2024
          </code>
          , and add{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            page=2
          </code>{' '}
          to read the next page of results. Omit the keyword to browse all
          documents matching your filters.
        </p>
        <p>
          The API also exposes the intergovernmental agenda hierarchy at{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] break-all">
            /api/v1/agendas?body=GA
          </code>{' '}
          and the entities and programmes tree, expenditure matches and clusters
          at{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] break-all">
            /api/v1/programmes
          </code>
          .
        </p>
        <p>
          CSV, Excel and JSON downloads include all matching documents across
          every page. See the{' '}
          <Link href="/openapi" className="text-un-blue-text underline">
            interactive OpenAPI reference
          </Link>{' '}
          for endpoints, parameters and response schemas, or download the{' '}
          <a href="/openapi.json" className="text-un-blue-text underline">
            OpenAPI specification (JSON)
          </a>
          .
        </p>
      </section>

      <section
        aria-labelledby="ai-agents"
        className="mt-10 max-w-2xl space-y-4"
      >
        <h2 id="ai-agents" className="text-xl font-semibold">
          For AI agents
        </h2>
        <p>
          Start with{' '}
          <a href="/llms.txt" className="text-un-blue-text underline">
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
              llms.txt
            </code>
          </a>{' '}
          for a structured guide to the API, document URLs and a recommended
          retrieval workflow. The{' '}
          <a href="/openapi.json" className="text-un-blue-text underline">
            OpenAPI specification (JSON)
          </a>{' '}
          describes the available operations and data structures.
        </p>
      </section>
    </article>
  )
}
