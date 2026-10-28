import type { Metadata } from 'next'

import { ExternalLink } from '@/components/external-link'
import { DirectorySummaryTable } from '@/components/focal-points/DirectorySummaryTable'
import { getFocalPointDirectorySummary } from '@/lib/data/focal-points'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.focalPoints

export const metadata: Metadata = {
  title: 'Mandate focal points',
  description: text.introduction,
}

/**
 * The page takes no search params, so without this Next prerenders it once at
 * build time and every later deploy is the only thing that can change it. The
 * table it reads is written by a different application: a focal point who moves
 * on, or a designation an entity takes off the site, has to stop being shown
 * when that application says so, not when this site is next built.
 */
export const dynamic = 'force-dynamic'

/**
 * The focal point directory.
 *
 * A second, narrower view of a directory that belongs to a separate internal
 * application: the same designations, without the administrative record of how
 * each one was submitted and cleared. Read-only — there is no sign-in, nothing
 * here writes, and there is no per-designation page, which is why the detail
 * view is a state-driven panel rather than the intercepting route the mandate
 * detail uses (see DirectorySummaryPanel).
 *
 * A designation that has been superseded or taken off the site is not listed;
 * both conditions are applied in the query, and the reasoning is in
 * `lib/data/focal-points.ts`.
 */
export default async function FocalPointDirectoryPage() {
  const { designations, searchVocabulary } =
    await getFocalPointDirectorySummary()

  return (
    <div className="mx-auto max-w-6xl px-6 pt-8 pb-10 text-foreground md:px-12 lg:px-16">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
        {text.heading}
      </h1>

      {/* The table's width, not a reading measure: capped narrower, the
          paragraph broke after three short lines beside a table that ran on
          past them, and the ragged edge read as a layout fault. */}
      <p className="mb-3 text-base leading-relaxed whitespace-pre-line md:text-lg">
        {text.introduction}
      </p>

      {/* For the entity officer who arrives here meaning to submit rather than
          to look someone up, and finds a directory with no way into it. Under
          the intro rather than under the table: below forty-odd rows it was a
          footnote few readers reached, and the reader it is for needs it
          before they start scrolling. Still one caption-tier line, the
          quietest on the page — a signpost for a minority of readers, not what
          the page is for — so not a banner or a callout, and not in
          SiteFooter, which is every page's and not this one's. */}
      <p className="mb-6 text-sm text-muted-foreground">
        {text.designationIntroduction}{' '}
        <ExternalLink
          href="https://mandate-focal-points.un-two-zero.org"
          className="text-un-blue-text hover:underline"
        >
          {text.designationLink}
        </ExternalLink>
        .
      </p>

      <DirectorySummaryTable
        designations={designations}
        searchVocabulary={searchVocabulary}
      />
    </div>
  )
}
