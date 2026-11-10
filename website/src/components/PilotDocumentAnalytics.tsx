'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ParagraphFacetFilter } from '@/components/ParagraphFacetFilter'
import {
  analyticsFacetLabel,
  countDocumentFacets,
  matchesDocumentFacet,
  documentFacetTree,
  type PilotAnalytics,
  type PilotDimension,
  type PilotDocument,
} from '@/lib/pilot-document-analytics'

const dimensions: {
  key: PilotDimension
  label: string
  description: string
}[] = [
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Requested work, grouped by task family and subtype.',
  },
  {
    key: 'assignees',
    label: 'Assignees',
    description:
      'Assigned actors: Member States, the UN system and other actors. Mentions are excluded.',
  },
  {
    key: 'actions',
    label: 'Action verbs',
    description:
      'Deterministic verb categories and words in the sampled operative text.',
  },
]
const percent = (value: number, total: number) =>
  `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(total ? (value / total) * 100 : 0)}%`
type Selection = Record<PilotDimension, string[]>
const empty: Selection = { tasks: [], assignees: [], actions: [] }

export function PilotDocumentAnalytics({ runs }: { runs: PilotAnalytics[] }) {
  const [reasoning, setReasoning] = useState(runs[runs.length - 1].reasoning)
  const data = runs.find((r) => r.reasoning === reasoning) ?? runs[0]
  const [body, setBody] = useState('all')
  const [filters, setFilters] = useState<Selection>(empty)
  const [open, setOpen] = useState<PilotDimension | null>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.pilot-analytics-filters'))
        setOpen(null)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  const base = useMemo(
    () => data.documents.filter((d) => body === 'all' || d.body === body),
    [data, body]
  )
  const matches = (d: PilotDocument, exclude?: PilotDimension) =>
    dimensions.every(
      ({ key }) => key === exclude || matchesDocumentFacet(d, key, filters[key])
    )
  const scoped = base.filter((d) => matches(d))
  const n = scoped.length
  const selected = dimensions.some(({ key }) => filters[key].length)
  const choose = (dimension: PilotDimension, path: string[]) => {
    setFilters((f) => ({ ...f, [dimension]: path }))
    setOpen(null)
  }
  const bar = (count: number) => (
    <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
      <div className="h-full bg-un-blue" style={{ width: percent(count, n) }} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Mandate tasks</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Share of documents containing at least one matching operative
          paragraph. Each document counts once per category; categories can
          overlap. Preambular paragraphs are excluded.
        </p>
        <p className="text-sm">
          <strong>
            Overall sample: {data.sampleDocuments} registry documents.
          </strong>{' '}
          Current selection: <strong>{n} documents</strong>. Every bar below
          uses this selection as its denominator.
        </p>
        <p className="text-xs text-muted-foreground">
          {data.model}, reasoning{' '}
          {data.reasoning === 'none' ? 'off' : data.reasoning}.{' '}
          {percent(data.validated, data.targets)} of extraction requests passed
          validation. Results are exploratory; incomplete extraction may
          undercount matches.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            Analysis run
            <select
              value={reasoning}
              onChange={(e) => {
                setReasoning(e.target.value)
                setFilters(empty)
              }}
              className="rounded border border-border bg-background px-2 py-1"
            >
              {runs.map((r) => (
                <option key={r.reasoning} value={r.reasoning}>
                  {r.reasoning === 'none'
                    ? 'Original prompt · reasoning off'
                    : 'Reviewed prompt · medium reasoning'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Issuing body
            <select
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                setFilters(empty)
              }}
              className="rounded border border-border bg-background px-2 py-1"
            >
              <option value="all">All bodies</option>
              {[...new Set(data.documents.map((d) => d.body))]
                .sort()
                .map((b) => (
                  <option key={b}>{b}</option>
                ))}
            </select>
          </label>
        </div>
        {runs.length === 1 && (
          <p className="text-xs text-muted-foreground">
            The revised medium-reasoning run is processing. The original results
            remain available until it is complete and reviewed.
          </p>
        )}
      </div>
      <div className="pilot-analytics-filters flex flex-wrap items-center gap-2">
        {dimensions.map(({ key, label }) => {
          const options = base.filter((d) => matches(d, key))
          return (
            <ParagraphFacetFilter
              key={key}
              label={label}
              className={`analytics-${key}-filter`}
              nodes={documentFacetTree(options, key)}
              value={filters[key].length ? JSON.stringify(filters[key]) : 'all'}
              open={open === key}
              onToggle={() => setOpen(open === key ? null : key)}
              onChange={(value) =>
                choose(
                  key,
                  value === 'all' ? [] : (JSON.parse(value) as string[])
                )
              }
              total={options.length}
              countFormat="percentage"
              allLabel="All documents"
            />
          )
        })}
        {selected && (
          <button
            onClick={() => setFilters(empty)}
            className="text-sm text-un-blue-text hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {dimensions.map(({ key, label, description }) => {
          const facets = countDocumentFacets(scoped, key)
          const covered = scoped.filter((d) => d.facets[key].length > 0).length
          const render = (parent: string[] = []): React.ReactNode =>
            facets
              .filter(
                (f) =>
                  f.path.length === parent.length + 1 &&
                  parent.every((part, i) => part === f.path[i])
              )
              .map((f) => {
                const name = analyticsFacetLabel(f.path[f.path.length - 1])
                const children = facets.some(
                  (child) =>
                    child.path.length === f.path.length + 1 &&
                    f.path.every((part, i) => part === child.path[i])
                )
                return children ? (
                  <details key={JSON.stringify(f.path)}>
                    <summary className="cursor-pointer text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="float-right tabular-nums">
                        {percent(f.count, n)}
                      </span>
                      {bar(f.count)}
                    </summary>
                    <button
                      className="mt-2 text-xs text-un-blue-text hover:underline"
                      onClick={() => choose(key, f.path)}
                    >
                      Filter to these documents
                    </button>
                    <div className="mt-2 max-h-72 space-y-3 overflow-y-auto border-l border-border pl-3">
                      {render(f.path)}
                    </div>
                  </details>
                ) : (
                  <button
                    key={JSON.stringify(f.path)}
                    onClick={() => choose(key, f.path)}
                    className="block w-full text-left text-xs hover:text-un-blue-text"
                  >
                    <span>{name}</span>
                    <span className="float-right tabular-nums">
                      {percent(f.count, n)}
                    </span>
                    {bar(f.count)}
                  </button>
                )
              })
          return (
            <section key={key} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
              <p className="my-3 text-sm">
                Found in <strong>{percent(covered, n)}</strong> of selected
                documents
              </p>
              <div className="space-y-3">{render()}</div>
              {!facets.length && (
                <p className="text-sm text-muted-foreground">
                  No observed matches.
                </p>
              )}
            </section>
          )
        })}
      </div>
      <section className="space-y-3">
        <h3 className="font-semibold">Documents in the current selection</h3>
        <p className="text-xs text-muted-foreground">
          Missing or rejected output does not establish that a document has no
          tasks.
        </p>
        <div className="max-h-96 overflow-y-auto rounded border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="p-2">Document</th>
                <th className="p-2">Body</th>
                <th className="p-2">Extraction coverage</th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((d) => (
                <tr key={d.symbol} className="border-t border-border">
                  <td className="p-2">
                    <Link
                      href={`/mandate/${d.symbol}`}
                      className="text-un-blue-text hover:underline"
                    >
                      {d.symbol}
                    </Link>
                  </td>
                  <td className="p-2">{d.body}</td>
                  <td className="p-2">
                    {percent(d.validated, d.targets)} validated
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
