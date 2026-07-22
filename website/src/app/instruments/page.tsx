import type { Metadata } from 'next'

import {
  DesignationCadenceChart,
  ProtocolGapRow,
  RegimeCadenceSpark,
} from '@/components/InstrumentCharts'
import {
  getSanctionsImplementation,
  mandateHref as sanctionsMandateHref,
  undocsUrl as sanctionsUndocs,
  yearsSince,
} from '@/lib/sanctions-implementation'
import {
  CATEGORY_ORDER,
  getTreatyImplementation,
  mandateHref as treatyMandateHref,
  UNIVERSALITY_REF,
  undocsUrl as treatyUndocs,
  type Treaty,
} from '@/lib/treaty-implementation'

export const metadata: Metadata = {
  title: 'Sanctions & Treaties — Implementation',
  description:
    'Two more mandate ledgers, paper vs ground: Security Council sanctions regimes against who was actually designated, and General Assembly treaties against how many states actually ratified.',
}

const nf = new Intl.NumberFormat('en-US')

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** A resolution symbol: link into our registry if held, else out to undocs.org. */
function ResolutionLink({
  symbol,
  inDb,
  kind,
}: {
  symbol: string
  inDb: boolean
  kind: 'sanctions' | 'treaty'
}) {
  const href = inDb
    ? kind === 'sanctions'
      ? sanctionsMandateHref(symbol)
      : treatyMandateHref(symbol)
    : kind === 'sanctions'
      ? sanctionsUndocs(symbol)
      : treatyUndocs(symbol)
  return (
    <a
      href={href}
      {...(inDb ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className="font-mono text-xs text-un-blue hover:underline"
      title={
        inDb
          ? 'Open this mandate in the registry'
          : 'Not in the registry — open on undocs.org'
      }
    >
      {symbol}
    </a>
  )
}

export default function InstrumentsPage() {
  const sanctions = getSanctionsImplementation()
  const treaties = getTreatyImplementation()

  const cadenceYears = Object.keys(sanctions.totals.listings_by_year).map(
    Number
  )
  const cadStart = Math.min(...cadenceYears)
  const cadEnd = Math.max(...cadenceYears)

  const iran = sanctions.regimes.find((r) => r.code === 'Iran')
  const dprk = sanctions.regimes.find((r) => r.code === 'DPRK')

  const byShort = new Map(treaties.treaties.map((t) => [t.short, t]))
  const protocolPairs: Array<[string, string]> = [
    ['CRC', 'OP-CRC-IC'],
    ['ICESCR', 'OP-ICESCR'],
    ['CEDAW', 'OP-CEDAW'],
    ['CAT', 'OP-CAT'],
  ]
  const gapMax = Math.max(
    ...protocolPairs.flatMap(([p, c]) => [
      byShort.get(p)?.parties ?? 0,
      byShort.get(c)?.parties ?? 0,
    ])
  )
  const ctbt = byShort.get('CTBT')

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: treaties.treaties
      .filter((t) => t.category === cat)
      .sort((a, b) => b.parties - a.parties),
  }))

  return (
    <div className="py-6">
      {/* Header */}
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Sanctions and treaties: paper vs ground
        </h1>
        <p className="mt-5 text-gray-600">
          The{' '}
          <a href="/missions" className="text-un-blue hover:underline">
            peace-operations page
          </a>{' '}
          asks what happens after the Council mandates a mission. This page asks
          the same of the two other things UN organs mandate into being:{' '}
          <strong className="font-semibold text-gray-800">
            coercive measures
          </strong>{' '}
          — Security Council sanctions, against the people and entities actually
          designated under them — and{' '}
          <strong className="font-semibold text-gray-800">legal norms</strong> —
          the treaties the General Assembly created, against how many states
          actually ratified them. In both cases the resolution is the mandate;
          the external register is the ground truth.
        </p>
      </section>

      {/* ============================ SANCTIONS ============================ */}
      <section id="sanctions" className="mt-14 scroll-mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          A sanctions mandate authorises designations. Who was actually listed?
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-gray-600">
          Every active Security Council sanctions regime is created and renewed
          by resolution. The UN&rsquo;s official{' '}
          <a
            href="https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            Consolidated List
          </a>{' '}
          is the enforcement output: the individuals and entities currently
          under an asset freeze, travel ban or arms embargo. Below, the mandate
          volume in our registry (sanctions resolutions per regime) sits next to
          the live designations under it.
        </p>

        {/* Stat strip */}
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-6 sm:grid-cols-4">
          {[
            {
              value: nf.format(sanctions.regime_count),
              label: 'active sanctions regimes',
            },
            {
              value: nf.format(sanctions.totals.total_listed),
              label: `individuals & entities currently designated`,
            },
            {
              value: nf.format(sanctions.totals.sc_sanctions_resolutions_in_db),
              label: 'SC sanctions resolutions in the registry',
            },
            {
              value: `${sanctions.regimes.filter((r) => r.establishing_in_db).length}/${sanctions.regime_count}`,
              label: 'establishing resolutions held in the registry',
            },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="mt-1 text-xs leading-snug text-gray-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Designation cadence */}
        <div className="mt-10">
          <h3 className="text-base font-semibold text-gray-900">
            Designations spike with crises, then the list only grows
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Currently-listed designations by the year they were added, all
            regimes combined. The 2001 peak is the post-9/11 Al-Qaida expansion;
            the list is a snapshot of surviving listings, so delisted names are
            not counted.
          </p>
          <div className="mt-4">
            <DesignationCadenceChart
              byYear={sanctions.totals.listings_by_year}
            />
          </div>
        </div>

        {/* Regime table */}
        <div className="mt-12">
          <h3 className="text-base font-semibold text-gray-900">
            Every regime: the mandate and its enforcement
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Sorted by designations in force. &ldquo;Sanctions resolutions&rdquo;
            counts the <code>S/RES</code>&nbsp;resolutions in our registry
            carrying that regime&rsquo;s subject; a regime whose last
            designation is more than three years old is marked{' '}
            <span className="text-terracotta">dormant</span>.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-gray-500">
                  <th className="py-2 pr-4 font-medium">Regime</th>
                  <th className="py-2 pr-4 font-medium">Established by</th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Sanctions resolutions
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Designated
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    Designations by year
                  </th>
                  <th className="py-2 font-medium">Last added</th>
                </tr>
              </thead>
              <tbody>
                {sanctions.regimes.map((r) => {
                  const dormant =
                    (yearsSince(r.last_listing, sanctions.list_generated) ??
                      0) > 3
                  return (
                    <tr
                      key={r.code}
                      className="border-b border-border/60 align-top"
                    >
                      <td className="max-w-56 py-2.5 pr-4">
                        <div className="font-semibold text-gray-900">
                          {r.name}
                        </div>
                        <div className="text-xs text-gray-500">{r.code}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <ResolutionLink
                          symbol={r.establishing_resolution}
                          inDb={r.establishing_in_db}
                          kind="sanctions"
                        />
                        {r.establishing_date && (
                          <div className="text-xs text-gray-400">
                            {r.establishing_date.slice(0, 4)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-900 tabular-nums">
                        {nf.format(r.sc_sanctions_resolutions_in_db)}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <div className="text-gray-900 tabular-nums">
                          {nf.format(r.total_listed)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {r.individuals_listed} ppl · {r.entities_listed} org
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <RegimeCadenceSpark
                          regime={r}
                          start={cadStart}
                          end={cadEnd}
                        />
                      </td>
                      <td className="py-2.5">
                        <div
                          className={
                            dormant ? 'text-terracotta' : 'text-gray-900'
                          }
                        >
                          {fmtDate(r.last_listing)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dormant ? 'dormant' : 'active'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Callouts */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card-gray p-4">
            <div className="text-sm font-semibold text-gray-900">
              The list outlives the mandate
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              The Iran regime was <em>terminated</em> by resolution 2231 (2015),
              yet {iran ? nf.format(iran.total_listed) : ''} Iran designations
              remain frozen on the Consolidated List — no new listing since{' '}
              {fmtDate(iran?.last_listing ?? null)}. Enforcement records persist
              long after the authorising mandate is gone.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card-gray p-4">
            <div className="text-sm font-semibold text-gray-900">
              A frozen regime
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              The DPRK regime is fully open and politically live, but the
              committee has added nobody since{' '}
              {fmtDate(dprk?.last_listing ?? null)} — and no new DPRK sanctions
              resolution has passed since 2017. The mandate persists; its
              enforcement has stalled at the Council.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ TREATIES ============================ */}
      <section id="treaties" className="mt-20 scroll-mt-20">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          A treaty mandate creates a legal norm. How many states adopted it?
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-gray-600">
          When the General Assembly adopts a multilateral treaty by resolution,
          the mandate is done — but the norm only takes hold as states ratify.
          The UN&rsquo;s{' '}
          <a
            href="https://treaties.un.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            Treaty Collection
          </a>{' '}
          records the uptake: entry into force, and every state&rsquo;s
          ratification date. Each adopting resolution below links back to the
          mandate in our registry.
        </p>

        {/* Stat strip */}
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-6 sm:grid-cols-4">
          {[
            {
              value: `${treaties.totals.adopting_resolutions_in_db}/${treaties.treaty_count}`,
              label: 'adopting resolutions held in the registry',
            },
            {
              value: nf.format(treaties.totals.sum_parties),
              label: 'state ratifications across these treaties',
            },
            {
              value: `${treaties.totals.in_force}/${treaties.treaty_count}`,
              label: 'treaties in force (CTBT the exception)',
            },
            {
              value: nf.format(byShort.get('CRC')?.parties ?? 0),
              label: 'parties to the most-ratified treaty (CRC)',
            },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="mt-1 text-xs leading-snug text-gray-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTBT callout */}
        {ctbt && (
          <div className="mt-8 rounded-md border border-au-chico/40 bg-au-chico/5 p-4">
            <div className="text-sm font-semibold text-gray-900">
              Adopted 1996, {nf.format(ctbt.parties)} ratifications — and still
              not in force, 30 years on
            </div>
            <p className="mt-1.5 max-w-3xl text-sm text-gray-600">
              The Comprehensive Nuclear-Test-Ban Treaty (adopted by GA
              resolution{' '}
              <ResolutionLink
                symbol={ctbt.adopting_resolution}
                inDb={ctbt.adopting_resolution_in_db}
                kind="treaty"
              />
              ) has {ctbt.signatories} signatories and {ctbt.parties}{' '}
              ratifications, yet cannot enter into force until a fixed set of
              hold-out states ratify. It is the starkest paper-vs-ground gap on
              the normative side: the mandate was fully delivered; the impact is
              blocked.
            </p>
          </div>
        )}

        {/* Treaty table by category */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-gray-500">
                <th className="py-2 pr-4 font-medium">Treaty</th>
                <th className="py-2 pr-4 font-medium">Adopted by</th>
                <th className="py-2 pr-4 font-medium">In force</th>
                <th className="py-2 pr-4 font-medium">
                  States parties (toward universal, 193 members)
                </th>
                <th className="py-2 text-right font-medium">Signatories</th>
              </tr>
            </thead>
            {byCategory.map((group) => (
              <tbody key={group.cat}>
                <tr>
                  <td
                    colSpan={5}
                    className="pt-5 pb-1 text-xs font-semibold text-gray-400"
                  >
                    {group.cat}
                  </td>
                </tr>
                {group.rows.map((t: Treaty) => (
                  <tr
                    key={t.short + t.mtdsg_no}
                    className="border-b border-border/60 align-top"
                  >
                    <td className="max-w-64 py-2.5 pr-4">
                      <div className="font-semibold text-gray-900">
                        {t.short}
                      </div>
                      <div className="text-xs leading-snug text-gray-500">
                        {t.name}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <ResolutionLink
                        symbol={t.adopting_resolution}
                        inDb={t.adopting_resolution_in_db}
                        kind="treaty"
                      />
                      {t.adopting_resolution_date && (
                        <div className="text-xs text-gray-400">
                          {t.adopting_resolution_date.slice(0, 4)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {t.in_force ? (
                        <span className="text-gray-700">
                          {t.entry_into_force}
                        </span>
                      ) : (
                        <span className="rounded-sm bg-au-chico/15 px-1.5 py-0.5 text-xs font-medium text-au-chico">
                          not in force
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-32 rounded-xs bg-muted">
                          <div
                            className="h-2.5 rounded-xs bg-un-blue"
                            style={{
                              width: `${Math.min((t.parties / UNIVERSALITY_REF) * 100, 100)}%`,
                            }}
                            title={`${t.parties} states parties (193 UN members + some non-member states)`}
                          />
                        </div>
                        <span className="text-gray-900 tabular-nums">
                          {t.parties}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-gray-500 tabular-nums">
                      {t.signatories}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* Optional-protocol gap */}
        <div className="mt-12">
          <h3 className="text-base font-semibold text-gray-900">
            States accept the norm, but resist the complaints mechanism
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Each core human-rights treaty&nbsp;(
            <span className="whitespace-nowrap">
              <span
                aria-hidden
                className="mr-1 inline-block h-2.5 w-2.5 rounded-xs bg-un-blue align-middle"
              />
              parent
            </span>
            ) far out-ratifies its optional protocol&nbsp;(
            <span className="whitespace-nowrap">
              <span
                aria-hidden
                className="mr-1 inline-block h-2.5 w-2.5 rounded-xs bg-au-chico align-middle"
              />
              protocol
            </span>
            ), which adds an individual-complaints procedure. The gap is the
            enforcement-mechanism mandate landing softer than the
            substantive-rights one.
          </p>
          <div className="mt-5 max-w-2xl space-y-4">
            {protocolPairs.map(([p, c]) => {
              const parent = byShort.get(p)
              const child = byShort.get(c)
              if (!parent || !child) return null
              return (
                <ProtocolGapRow
                  key={p}
                  parentLabel={p}
                  parentParties={parent.parties}
                  childLabel={c}
                  childParties={child.parties}
                  max={gapMax}
                />
              )
            })}
          </div>
        </div>
      </section>

      {/* Sources & method */}
      <section className="mt-16 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-gray-500">
        <h2 className="text-sm font-semibold text-gray-900">
          Sources and method
        </h2>
        <p className="mt-2">
          <strong>Sanctions.</strong> UN Security Council{' '}
          <a
            href="https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            Consolidated List
          </a>{' '}
          (official XML), generated {fmtDate(sanctions.list_generated)}, joined
          to Security Council sanctions resolutions in our UN Digital Library
          mirror by the sanctions regime and its establishing resolution. The
          Consolidated List holds only <em>currently</em>&nbsp;designated
          targets, so historical designation volume is undercounted — delisted
          individuals are gone. Regime-to-resolution counts match the
          regime&rsquo;s country/thematic subject on <code>S/RES</code>{' '}
          documents, so thematic regimes (Al-Qaida via terrorism subjects,
          Taliban via Afghanistan) count fewer resolutions than their full
          lineage.
        </p>
        <p className="mt-2">
          <strong>Treaties.</strong> UN{' '}
          <a
            href="https://treaties.un.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            Treaty Collection
          </a>{' '}
          (Multilateral Treaties Deposited with the Secretary-General),
          retrieved {fmtDate(treaties.generated)}, joined to the General
          Assembly resolutions in our mirror that adopted each treaty. This is
          the high-signal subset of GA-created treaties (human rights, crime,
          disarmament); most of the ~560 MTDSG treaties were adopted at
          diplomatic conferences rather than by a GA resolution, so are out of
          join scope. Party counts are parsed from the official participation
          table and can differ by one to three from headline figures where a
          cell records two actions. Built by{' '}
          <code>build_sanctions_implementation.py</code> and{' '}
          <code>build_treaty_implementation.py</code>; see{' '}
          <code>docs/lens-impact/SOURCES-ROUND2.md</code>.
        </p>
      </section>
    </div>
  )
}
