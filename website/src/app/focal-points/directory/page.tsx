import type { Metadata } from 'next'

import { ExternalLink } from '@/components/external-link'
import { DirectorySummaryTable } from '@/components/focal-points/DirectorySummaryTable'
import { getFocalPointDirectorySummary } from '@/lib/data/focal-points'
import { typography } from '@/lib/typography'

export const metadata: Metadata = {
  title: 'Mandate focal points',
  description:
    'Which UN entity is the focal point for mandate design, who to contact there, and what subjects they cover.',
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
  const designations = await getFocalPointDirectorySummary()

  return (
    <div className="text-foreground">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
        Mandate focal points
      </h1>

      <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground">
        The UN entity designated as the focal point for mandate design, who to
        contact there, and the subjects each designation says it covers.
        Coverage is as claimed by the entity; two designations may cover the
        same subject. Select a row for the full list of subjects covered.
      </p>

      <DirectorySummaryTable designations={designations} />

      {/* For the entity officer who arrives here meaning to submit rather than
          to look someone up, and finds a directory with no way into it. One
          caption-tier line under the table: it is a signpost for a minority of
          readers, not what the page is for, so it takes the quietest tier on
          the page and sits after the thing it is a footnote to. Deliberately
          not a banner, a callout, or anything above the table — and not in
          SiteFooter, which is every page's and not this one's. */}
      <p className={`mt-4 ${typography.caption}`}>
        UN entities designate their focal points at{' '}
        <ExternalLink
          href="https://mandate-focal-points.un-two-zero.org"
          className="text-un-blue-text hover:underline"
        >
          mandate-focal-points.un-two-zero.org
        </ExternalLink>
        .
      </p>
    </div>
  )
}
