import type { Metadata } from 'next'
import Link from 'next/link'

import { ChainDNA } from '@/components/genealogy/ChainDNA'
import { GenealogyHeadline } from '@/components/genealogy/GenealogyHeadline'
import {
  defaultChainId,
  genealogyMeta,
  getChainDetail,
  getFeaturedChains,
  headlineByAge,
  headlineByDecade,
  oldestSentences,
} from '@/lib/genealogy'

export const metadata: Metadata = {
  title: 'Boilerplate Genealogy — UN Mandate Registry',
  description:
    'How resolution text mutates across renewal chains: which sentences are copy-pasted for decades, which mutate, which appear and disappear.',
}

const CONTENT = 'mx-auto max-w-6xl px-6 md:px-12 lg:px-16'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function cleanText(t: string): string {
  return t.replace(/\s+/g, ' ').trim()
}

export default async function GenealogyPage({ searchParams }: PageProps) {
  const params = await searchParams
  const options = getFeaturedChains()
  const rawChain = typeof params.chain === 'string' ? params.chain : undefined
  const chainId =
    rawChain && getChainDetail(rawChain) ? rawChain : defaultChainId()
  const detail = getChainDetail(chainId)

  // headline numbers for the lede
  const r1 = headlineByAge.find((h) => h.age === 1)
  const r3 = headlineByAge.find((h) => h.age === 3)
  const r10 = headlineByAge.find((h) => h.age === 10)
  const carried3 = r3 ? Math.round(r3.verbatimPct + r3.mutatedPct) : null
  const nf = new Intl.NumberFormat('en-US')

  return (
    <div>
      {/* Intro */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-8 md:px-12 lg:px-16">
        <p className="mb-3 text-xs font-semibold tracking-wide text-un-blue uppercase">
          A lens on the mandate registry
        </p>
        <h1 className="mb-5 max-w-4xl text-4xl font-bold tracking-tight text-foreground">
          After the third renewal, two-thirds of a resolution is recycled from
          the last one.
        </h1>
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-gray-700">
          <p>
            Most UN resolutions are not written from scratch. A body returns to
            the same question year after year and re-adopts a lightly edited
            version of what it said last time. This lens takes{' '}
            {nf.format(genealogyMeta.nChainsAnalyzed)} such renewal chains —{' '}
            {nf.format(genealogyMeta.nDocs)} resolutions,{' '}
            {nf.format(genealogyMeta.nParas)} paragraphs — and aligns every
            paragraph against the previous resolution in its chain to see which
            text is carried over word-for-word (boilerplate), which is reworded,
            and which is genuinely new.
          </p>
          <p>
            {r1 && (
              <>
                The first re-adoption already keeps{' '}
                <strong className="font-semibold text-gray-900">
                  {r1.verbatimPct}%
                </strong>{' '}
                of its text verbatim.{' '}
              </>
            )}
            {carried3 && (
              <>
                By the third renewal,{' '}
                <strong className="font-semibold text-gray-900">
                  {carried3}%
                </strong>{' '}
                is carried over from the resolution before it.{' '}
              </>
            )}
            {r10 && (
              <>
                By the tenth,{' '}
                <strong className="font-semibold text-gray-900">
                  {r10.verbatimPct}%
                </strong>{' '}
                is literally the same words.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Headline chart */}
      <section className={`${CONTENT} pb-14`}>
        <h2 className="mb-1 text-2xl font-bold text-gray-900">
          The older a mandate, the less of it is new
        </h2>
        <p className="mb-6 max-w-3xl text-sm text-gray-500">
          Each resolution split into the share of paragraphs carried over
          verbatim, reworded (mutated), or new — averaged across all{' '}
          {genealogyMeta.nChainsAnalyzed} chains, by how many times the chain has
          been renewed, or by the decade the resolution was adopted.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
          <GenealogyHeadline byAge={headlineByAge} byDecade={headlineByDecade} />
        </div>
      </section>

      {/* Chain DNA */}
      <section id="dna" className={`${CONTENT} border-t border-gray-100 py-14`}>
        <h2 className="mb-1 text-2xl font-bold text-gray-900">
          The DNA of a renewal chain
        </h2>
        <p className="mb-6 max-w-3xl text-sm text-gray-500">
          Every row is one resolution in the chain, oldest at the top; every
          column is a paragraph tracked through time, ordered by the year it was
          born. Solid dark bands are sentences copy-pasted for decades; pale rows
          are years that rewrote themselves.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
          {detail ? (
            <ChainDNA detail={detail} chainId={chainId} options={options} />
          ) : (
            <p className="text-sm text-gray-500">No chain selected.</p>
          )}
        </div>
      </section>

      {/* Oldest surviving sentences */}
      <section className={`${CONTENT} border-t border-gray-100 py-14`}>
        <h2 className="mb-1 text-2xl font-bold text-gray-900">
          The oldest surviving sentences
        </h2>
        <p className="mb-6 max-w-3xl text-sm text-gray-500">
          Paragraphs that have been re-adopted essentially unchanged the longest
          — the load-bearing boilerplate of the UN&apos;s recurring agenda.
        </p>
        <ol className="max-w-4xl divide-y divide-gray-100">
          {oldestSentences.slice(0, 15).map((o, i) => (
            <li key={i} className="flex gap-4 py-3">
              <span
                className="mt-0.5 shrink-0 text-sm font-bold tabular-nums"
                style={{ color: 'var(--color-geneal-verbatim)' }}
              >
                {o.spanYears}y
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-800">
                  “{cleanText(o.text)}”
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  born {o.bornYear}, still in {o.lastYear} · {o.nDocs}{' '}
                  resolutions ·{' '}
                  <Link
                    href={`/genealogy?chain=${o.chainId}#dna`}
                    className="text-un-blue hover:underline"
                  >
                    {cleanText(o.chainTitle)}
                  </Link>{' '}
                  ({o.body})
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Method / source */}
      <section className={`${CONTENT} border-t border-gray-100 py-12`}>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          How this is measured
        </h2>
        <div className="max-w-3xl space-y-3 text-xs leading-relaxed text-gray-500">
          <p>
            Renewal chains come from the resolution-series grouping (recurring
            resolutions, decisions and Human Rights Council presidential
            statements that share a normalized title). For each chain, every
            substantive paragraph — preambular or operative — is aligned against
            the previous resolution in the chain using a token-similarity match.
            A paragraph is <em>verbatim</em> when it is a near-exact copy
            (similarity ≥ {genealogyMeta.thresholds.verbatim}), <em>mutated</em>{' '}
            when the same clause survives with edited wording, dates or
            references, and <em>new</em> when it has no match in the previous
            resolution. Numbers and dates are normalized for matching, so a
            clause whose only change is its date counts as mutated, not new.
          </p>
          <p>
            Analysis covers the {genealogyMeta.nChainsAnalyzed} longest chains
            (by number of parsed resolutions) across the General Assembly,
            Security Council and ECOSOC; the DNA view offers a curated subset of{' '}
            {`${genealogyMeta.nChainsFeatured} chains`}. Text is from parsed
            English
            documents in the Digital Library. Older resolutions were digitized
            from scans, so occasional split paragraphs or footnote fragments show
            up as spurious &ldquo;new&rdquo; text — the boilerplate share is, if
            anything, an underestimate for early decades. Alignment was
            hand-checked on the UNIFIL, Oceans and the law of the sea, and
            Belarus chains; see{' '}
            <span className="font-mono">docs/lens-genealogy/ANALYSIS.md</span>.
          </p>
          <p>
            <Link href="/secretariat" className="text-un-blue hover:underline">
              ← Back to the mandate registry
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
