import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ApiPlayground } from '@/components/ApiPlayground'
import { FILTER_PARAMS } from '@/lib/filter-constants'
import { FILTER_DESCRIPTIONS } from '@/lib/public-openapi'
import { COVERAGE_NOTES } from '@/lib/public-api'

export const metadata: Metadata = {
  title: 'API and data | UN Mandate Registry',
  description:
    'Search, download and reuse mandate documents, paragraphs and budget citations through the public read-only API.',
  alternates: { canonical: '/developers' },
}
const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
    {children}
  </code>
)
// Code spans are authored explicitly; ordinary prose never matches field names.
function ApiText({ children }: { children: string }) {
  return (
    <>
      {children
        .split(/(`[^`]+`)/g)
        .map((part, index) =>
          index % 2 ? <Code key={index}>{part.slice(1, -1)}</Code> : part
        )}
    </>
  )
}
const endpoints = [
  [
    '/api/v1/documents',
    'Paginated search; `include=details` expands sidebar data.',
  ],
  [
    '/api/v1/documents/{symbol}',
    'One document with complete details; encode the document symbol in the path.',
  ],
  [
    '/mandate/{symbol}.json',
    'The same document representation at its human-page address.',
  ],
  [
    '/api/v1/reference',
    'Entities, organs, programme hierarchy and budget cycles.',
  ],
  ['/api/v1/exports', 'All matching documents as CSV, Excel or JSON.'],
]
export default function DevelopersPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">API and data</h1>
        <p>
          Search mandate documents, read their available text, and explore the
          budget citations and relationships behind the registry. Public{' '}
          <Code>GET</Code> endpoints require no account or API key.
        </p>
        <div className="flex flex-wrap gap-4 text-un-blue-text">
          <a href="/openapi.json" className="underline">
            OpenAPI specification (JSON)
          </a>
          <a href="/llms.txt" className="underline">
            For AI agents
          </a>
        </div>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Start with search, then follow the links
        </h2>
        <p>
          <ApiText>
            {
              'Search returns `pageUrl`, `canonicalUrl` and `jsonUrl` for every document. Follow `jsonUrl` to retrieve available paragraphs, full selected-cycle budget citations, version history, linked reports and expenditure data. Canonical URLs identify the document; contextual URLs preserve the budget cycle.'
            }
          </ApiText>
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
          <code>{`curl 'https://mandates.un.org/api/v1/documents?keyword=climate&limit=2'\ncurl 'https://mandates.un.org/mandate/A/RES/79/1.json'`}</code>
        </pre>
        <p>
          Reference codes, programme hierarchy and available budget cycles are
          at{' '}
          <a className="text-un-blue-text underline" href="/api/v1/reference">
            <Code>/api/v1/reference</Code>
          </a>
          . English extracted text is provided where available; the original
          source remains linked.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Try the API</h2>
        <ApiPlayground />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">
                  <Code>GET</Code> endpoint
                </th>
                <th className="p-2">Returns</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([path, description]) => (
                <tr key={path} className="border-t">
                  <td className="p-2">
                    <Code>{path}</Code>
                  </td>
                  <td className="p-2">
                    <ApiText>{description}</ApiText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Search parameters</h2>
        <p>
          The API uses the website’s filters. Copy structured agenda or
          budget-location parameters from a filtered website URL. Unknown
          parameters are ignored; repeated known filters, malformed integers and
          unknown budget cycles return <Code>400</Code>. Blank filter strings
          are treated as absent.
        </p>
        <dl className="space-y-3">
          {FILTER_PARAMS.map((key) => (
            <div key={key}>
              <dt className="text-sm font-semibold">
                <Code>{key}</Code>
              </dt>
              <dd className="text-sm text-muted-foreground">
                <ApiText>{FILTER_DESCRIPTIONS[key]}</ApiText>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Downloads and pagination</h2>
        <p>
          <ApiText>
            {
              'Use `pagination.hasMore` and increment `page` to read the entire result set.'
            }
          </ApiText>{' '}
          The page-size maximum is 100; it does not limit how many documents you
          can retrieve. Empty pages retain the total result count.
        </p>
        <p>
          Downloads have no total result cap. They ignore page, page size and
          visible columns, and expand grouped versions into individual matching
          documents. CSV is a standard table of document fields, including
          agenda items, citing programmes and foundational citing entities.
          Export-wide metadata stays in Excel and JSON. Excel separates
          documents, all selected-cycle budget citations, version relationships
          and metadata into sheets. JSON downloads are indented regular JSON.{' '}
          <Code>include=details</Code> includes available paragraphs and sidebar
          data. Details retain the full selected-cycle context even if a
          citation filter selected the document.
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-4 text-sm">
          <code>{`curl -OJ 'https://mandates.un.org/api/v1/exports?entity=DESA&format=xlsx'\ncurl -OJ 'https://mandates.un.org/api/v1/exports?entity=DESA&format=json&include=details'`}</code>
        </pre>
        <p>
          Downloads stream live batches, so large detailed exports can take
          time. The generation timestamp is not a frozen database snapshot;
          source updates during a download can affect results. An interrupted or
          failed stream is incomplete and should be downloaded again.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Interpreting the data</h2>
        <ul className="list-disc space-y-2 pl-5">
          {COVERAGE_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p>
          <ApiText>
            {
              'Document summary fields named `matching…` reflect the active search filters. Expanded details contain all citation sites for that document in the selected cycle. Empty relationship arrays mean no recorded matches were found; `paragraphs.status=unavailable` means readable extracted text is unavailable. A `not_included` status means the section was not requested or is not currently exposed.'
            }
          </ApiText>{' '}
          Expenditure amounts describe the matched entity or budget location,
          not money attributed to a resolution; preserve their period,
          provenance and availability fields.
        </p>
        <p>
          <ApiText>
            {
              'Series `latest_version` identifies the latest version when one is known; `is_latest` identifies whether this document is that version.'
            }
          </ApiText>{' '}
          These are registry relationship annotations, not a legal determination
          that a mandate has ceased to apply. Collections must not be treated as
          ordered versions.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Errors, caching and reuse</h2>
        <p>
          <Code>400</Code> indicates an invalid request, <Code>404</Code> an
          unknown document, and <Code>503</Code> temporary data unavailability;
          the latter includes <Code>Retry-After: 30</Code>. Public JSON
          responses may be cached for five minutes and served stale for ten
          additional minutes while revalidating. Downloads are not cached.
          Cross-origin <Code>GET</Code> access is enabled for public data.
        </p>
        <p>
          Cite the original document symbol and source URL together with the
          registry link and budget cycle. Access through this API does not
          introduce a new data licence; existing{' '}
          <a
            className="text-un-blue-text underline"
            href="https://www.un.org/en/about-us/terms-of-use"
          >
            UN terms of use
          </a>{' '}
          and source-specific terms apply. For methodology and coverage,{' '}
          <Link className="text-un-blue-text underline" href="/methodology">
            read the methodology
          </Link>
          .
        </p>
      </section>
    </article>
  )
}
