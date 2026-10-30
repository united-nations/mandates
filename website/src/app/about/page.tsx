import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { explainerTexts } from '@/lib/en_text_contents'

export const metadata: Metadata = {
  title: explainerTexts.pageTitles.about,
  description: explainerTexts.mainHeader.shortDescriptionPlain,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <article className="text-base leading-relaxed text-foreground">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
        About the Mandate Registry
      </h1>

      <section aria-labelledby="methodology" className="space-y-4">
        <h2 id="methodology" className="text-xl font-semibold">
          Methodology and scope
        </h2>
        {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
          <p key={index} className="max-w-2xl">
            {paragraph}
          </p>
        ))}

        <Image
          src="/images/methodology.svg"
          alt="How mandate source documents are identified"
          width={248}
          height={135}
          unoptimized
          className="h-auto w-full"
        />

        <p className="max-w-2xl">
          Some citations in the 2027 proposed UN programme budget are
          preliminary, drawn from advance versions of the underlying documents,
          and may change in the final budget: Section&nbsp;1 (Overall
          policymaking, direction and coordination), from
          A/81/6&nbsp;(Sect.&nbsp;1); and the special political missions, from
          A/81/6&nbsp;(Sect.&nbsp;3)/Add.1–4.
        </p>

        <p className="max-w-2xl text-muted-foreground italic">
          {explainerTexts.mainHeader.disclaimer}
        </p>
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
