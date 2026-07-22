import { Ban, ScrollText } from 'lucide-react'

import { regimeForResolution } from '@/lib/sanctions-implementation'
import { treatiesForResolution } from '@/lib/treaty-implementation'

/**
 * Cross-link chips shown on a mandate detail page when the document is an
 * implementation anchor: the resolution that established a Security Council
 * sanctions regime, or one that adopted a General Assembly treaty. Links into
 * the /instruments page. Renders nothing when the symbol matches neither, so it
 * is safe to drop into every mandate page (modal + full).
 *
 * Data: sanctions-implementation.json / treaty-implementation.json, see
 * docs/lens-impact/SOURCES-ROUND2.md.
 */
export function MandateImplementationChips({ symbol }: { symbol: string }) {
  const regime = regimeForResolution(symbol)
  const treaties = treatiesForResolution(symbol)
  if (!regime && treaties.length === 0) return null

  const nf = new Intl.NumberFormat('en-US')

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {regime && (
        <a
          href="/instruments#sanctions"
          className="inline-flex items-center gap-1.5 rounded-full border border-un-blue/30 bg-un-blue/5 px-3 py-1 text-xs text-un-blue transition-colors hover:bg-un-blue/10"
          title={`This resolution established the ${regime.name} sanctions regime`}
        >
          <Ban className="h-3.5 w-3.5" />
          <span>
            {nf.format(regime.total_listed)} designations under this sanctions
            regime
          </span>
        </a>
      )}
      {treaties.map((t) => (
        <a
          key={t.mtdsg_no}
          href="/instruments#treaties"
          className="inline-flex items-center gap-1.5 rounded-full border border-un-blue/30 bg-un-blue/5 px-3 py-1 text-xs text-un-blue transition-colors hover:bg-un-blue/10"
          title={`This resolution adopted the ${t.name}`}
        >
          <ScrollText className="h-3.5 w-3.5" />
          <span>
            {t.short}: {nf.format(t.parties)} states parties
            {t.in_force ? '' : ' · not in force'}
          </span>
        </a>
      ))}
    </div>
  )
}
