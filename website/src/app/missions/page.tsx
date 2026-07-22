import type { Metadata } from 'next'

import {
  MissionDeploymentSpark,
  MissionMandateVsDeployedPanel,
} from '@/components/MissionDeploymentChart'
import {
  getMissionImplementation,
  latestBudgetExecution,
  latestDeployment,
  latestIndicators,
  latestPersonnel,
  missionSinceYear,
  splitSymbols,
  totalFatalities,
  undocsUrl,
  type Mission,
} from '@/lib/mission-implementation'

export const metadata: Metadata = {
  title: 'Peace Operation Mandates — Implementation',
  description:
    'Security Council mandates for peace operations joined with official field data: mandate renewals and expiry against actual deployment, mandated strength, fatalities, budgets and performance targets.',
}

const nf = new Intl.NumberFormat('en-US')

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function ExpiryCell({ expiry, asOf }: { expiry: string | null; asOf: string }) {
  if (!expiry) {
    return <span className="text-gray-500">open-ended</span>
  }
  const days = Math.round(
    (Date.parse(expiry) - Date.parse(asOf)) / (1000 * 60 * 60 * 24)
  )
  return (
    <div>
      <div className="text-gray-900">{fmtDate(expiry)}</div>
      <div
        className={
          days < 0
            ? 'text-xs text-au-chico'
            : days < 90
              ? 'text-xs font-medium text-gray-700'
              : 'text-xs text-gray-400'
        }
      >
        {days < 0
          ? 'lapsed / closing'
          : days < 90
            ? `renewal due in ${days} d`
            : `${Math.round(days / 30)} months left`}
      </div>
    </div>
  )
}

function StrengthCell({ mission }: { mission: Mission }) {
  const p = latestPersonnel(mission)
  if (!p || p.approvedUniformed === 0) {
    return <span className="text-xs text-gray-300">—</span>
  }
  const share = p.actualUniformed / p.approvedUniformed
  return (
    <div
      title={`Budget year ${p.year}: approved uniformed ${nf.format(p.approvedUniformed)}, actual average ${nf.format(p.actualUniformed)}`}
    >
      <div className="text-gray-900">
        {nf.format(p.actualUniformed)}
        <span className="text-gray-400">
          {' '}
          / {nf.format(p.approvedUniformed)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <div className="h-1 w-16 rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-un-blue"
            style={{ width: `${Math.min(share * 100, 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">
          {Math.round(share * 100)}%
        </span>
      </div>
    </div>
  )
}

export default function MissionsPage() {
  const { generated, missions } = getMissionImplementation()
  const open = missions.filter((m) => m.open)
  const closed = missions.filter((m) => !m.open)
  const pkos = open.filter((m) => m.type === 'Peacekeeping Mission')
  const spms = open.filter((m) => m.type !== 'Peacekeeping Mission')

  // Shared x-domain end for all deployment charts: the latest reported month.
  const domainEnd = Math.max(
    ...missions.flatMap((m) =>
      m.deployment.length > 0
        ? [
            Number(m.deployment[m.deployment.length - 1].m.slice(0, 4)) * 12 +
              Number(m.deployment[m.deployment.length - 1].m.slice(5, 7)) -
              1,
          ]
        : []
    )
  )
  const latestMonthLabel = new Date(
    Date.UTC(Math.floor(domainEnd / 12), domainEnd % 12, 1)
  ).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const deployedNow = open.reduce(
    (s, m) => s + (latestDeployment(m)?.n ?? 0),
    0
  )
  const renewalsTracked = missions.reduce((s, m) => s + m.renewals.length, 0)
  const fatalitiesTotal = missions.reduce(
    (s, m) => s + totalFatalities(m).total,
    0
  )
  const approvedNow = pkos.reduce(
    (s, m) => s + (latestPersonnel(m)?.approvedUniformed ?? 0),
    0
  )
  const actualNow = pkos.reduce(
    (s, m) => s + (latestPersonnel(m)?.actualUniformed ?? 0),
    0
  )

  const multiples = pkos
    .filter((m) => m.personnel.length > 0 && m.deployment.length > 1)
    .sort(
      (a, b) =>
        (latestPersonnel(b)?.approvedUniformed ?? 0) -
        (latestPersonnel(a)?.approvedUniformed ?? 0)
    )

  return (
    <div className="py-6">
      {/* Header */}
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Peace operation mandates: paper vs ground
        </h1>
        <p className="mt-5 text-gray-600">
          What happens after the Security Council adopts a mandate? This page
          joins the mandate ledger — every extension and renewal resolution in
          our Digital Library mirror — with the UN&rsquo;s own field data from
          the{' '}
          <a
            href="https://psdata.un.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            Peace &amp; Security Data Hub
          </a>
          : how many uniformed personnel each mission was mandated to have, how
          many were actually deployed, what the operation cost, how many
          peacekeepers died, and how the missions score against their own
          results targets.
        </p>
      </section>

      {/* Stat strip */}
      <section className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { value: nf.format(open.length), label: 'active missions' },
          {
            value: nf.format(deployedNow),
            label: `uniformed personnel deployed (${latestMonthLabel})`,
          },
          {
            value: `${Math.round((actualNow / approvedNow) * 100)}%`,
            label: 'of mandated strength actually deployed (active PKOs)',
          },
          {
            value: nf.format(renewalsTracked),
            label: 'mandate renewal resolutions tracked',
          },
          {
            value: nf.format(fatalitiesTotal),
            label: 'fatalities since 1948 (these missions)',
          },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="mt-1 text-xs leading-snug text-gray-500">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Active missions table */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">Active missions</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Peacekeeping operations first, then special political missions.
          Strength is the actual average uniformed personnel against the
          approved (mandated) uniformed ceiling in the latest reported budget
          year; targets are the mission&rsquo;s own results-based-budgeting
          indicators (2023/24).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-gray-500">
                <th className="py-2 pr-4 font-medium">Mission</th>
                <th className="py-2 pr-4 font-medium">Mandate expires</th>
                <th className="py-2 pr-4 font-medium">Renewals</th>
                <th className="py-2 pr-4 font-medium">
                  Strength: actual / mandated
                </th>
                <th className="py-2 pr-4 font-medium">Deployment 2010–</th>
                <th className="py-2 pr-4 text-right font-medium">Fatalities</th>
                <th className="py-2 text-right font-medium">Targets met</th>
              </tr>
            </thead>
            {[
              { label: 'Peacekeeping operations', rows: pkos },
              { label: 'Special political missions', rows: spms },
            ].map((group) => (
              <tbody key={group.label}>
                <tr>
                  <td
                    colSpan={7}
                    className="pt-5 pb-1 text-xs font-semibold text-gray-400"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.rows.map((m) => {
                  const fat = totalFatalities(m)
                  const ind = latestIndicators(m)
                  const since = missionSinceYear(m)
                  return (
                    <tr
                      key={m.acronym}
                      className="border-b border-border/60 align-top"
                    >
                      <td className="max-w-56 py-2.5 pr-4">
                        <div className="font-semibold text-gray-900">
                          {m.acronym}
                          {m.chapterVii && (
                            <span
                              className="ml-1.5 rounded-sm bg-muted px-1 py-px align-middle text-[10px] font-medium text-gray-600"
                              title="Mandate adopted under Chapter VII of the UN Charter"
                            >
                              Ch. VII
                            </span>
                          )}
                        </div>
                        <div className="text-xs leading-snug text-gray-500">
                          {m.location}
                          {since ? ` · since ${since}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <ExpiryCell expiry={m.mandateExpiry} asOf={generated} />
                      </td>
                      <td className="py-2.5 pr-4">
                        {m.renewals.length > 0 ? (
                          <div>
                            <div className="text-gray-900">
                              {m.renewals.length}×
                            </div>
                            <a
                              href={undocsUrl(
                                m.renewals[m.renewals.length - 1].symbol
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-un-blue hover:underline"
                              title="Latest renewal resolution (undocs.org)"
                            >
                              {m.renewals[m.renewals.length - 1].symbol}
                            </a>
                          </div>
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            title="No extension/renewal resolutions found — mandate is open-ended or renewed by exchange of letters"
                          >
                            {m.latestSymbol ? (
                              <a
                                href={undocsUrl(
                                  splitSymbols(m.latestSymbol)[0]
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-un-blue hover:underline"
                              >
                                {splitSymbols(m.latestSymbol)[0]}
                              </a>
                            ) : (
                              '—'
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StrengthCell mission={m} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <MissionDeploymentSpark
                          series={m.deployment}
                          domainEnd={domainEnd}
                        />
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {fat.total > 0 ? (
                          <div
                            title={`${fat.total} fatalities recorded since 1948, of which ${fat.malicious} from malicious acts`}
                          >
                            <div className="text-gray-900">
                              {nf.format(fat.total)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {fat.malicious} malicious
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {ind ? (
                          <div
                            title={`Results-based-budgeting indicators, ${ind.period}`}
                          >
                            <div className="text-gray-900">
                              {ind.met}/{ind.total}
                            </div>
                            <div className="text-xs text-gray-400">
                              {ind.period}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {/* Small multiples: mandated ceiling vs deployment */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold text-gray-900">
          Mandated strength vs boots on the ground
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          For each budgeted peacekeeping operation: monthly deployed uniformed
          personnel{' '}
          <span className="whitespace-nowrap">
            <span
              aria-hidden
              className="mr-1 inline-block h-2.5 w-2.5 rounded-xs bg-un-blue/30 align-middle outline-1 -outline-offset-1 outline-un-blue"
            />
            actual
          </span>{' '}
          against the uniformed ceiling approved for each budget year{' '}
          <span className="whitespace-nowrap">
            <span
              aria-hidden
              className="mr-1 inline-block w-3 border-t-2 border-dashed border-trout align-middle"
            />
            mandated
          </span>
          . The gap between the dashed line and the blue curve is the
          implementation gap.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {multiples.map((m) => (
            <MissionMandateVsDeployedPanel
              key={m.acronym}
              mission={m}
              domainEnd={domainEnd}
            />
          ))}
        </div>
      </section>

      {/* Budget execution */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold text-gray-900">
          Paying for the mandate
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Approved budget against actual expenditure in the latest reported
          budget year — how completely each mission&rsquo;s appropriation was
          spent.
        </p>
        <div className="mt-4 max-w-2xl space-y-2">
          {pkos
            .map((m) => ({ m, ex: latestBudgetExecution(m) }))
            .filter((r) => r.ex !== null)
            .sort(
              (a, b) =>
                (b.m.budget[b.m.budget.length - 1]?.appropriation ?? 0) -
                (a.m.budget[a.m.budget.length - 1]?.appropriation ?? 0)
            )
            .map(({ m, ex }) => {
              const b = m.budget[m.budget.length - 1]
              return (
                <div
                  key={m.acronym}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1"
                >
                  <div className="w-20 shrink-0 text-sm font-medium text-gray-900">
                    {m.acronym}
                  </div>
                  <div className="order-last h-3 w-full basis-full rounded-xs bg-muted sm:order-none sm:w-auto sm:flex-1 sm:basis-auto">
                    <div
                      className="h-3 rounded-xs bg-un-blue"
                      style={{
                        width: `${Math.min((ex!.rate ?? 0) * 100, 100)}%`,
                      }}
                      title={`${m.acronym} ${ex!.year}: spent ${Math.round(ex!.rate * 100)}% of appropriation`}
                    />
                  </div>
                  <div className="ml-auto shrink-0 text-right text-xs text-gray-500 sm:ml-0 sm:w-40">
                    {Math.round(ex!.rate * 100)}% of{' '}
                    {b.appropriation >= 1e9
                      ? `$${(b.appropriation / 1e9).toFixed(2)}B`
                      : `$${Math.round(b.appropriation / 1e6)}M`}{' '}
                    ({ex!.year})
                  </div>
                </div>
              )
            })}
        </div>
      </section>

      {/* Closed missions */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold text-gray-900">
          Recently closed missions
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-gray-500">
                <th className="py-2 pr-4 font-medium">Mission</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Renewals</th>
                <th className="py-2 pr-4 font-medium">Final resolution</th>
                <th className="py-2 text-right font-medium">Fatalities</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((m) => {
                const fat = totalFatalities(m)
                return (
                  <tr
                    key={m.acronym}
                    className="border-b border-border/60 align-top"
                  >
                    <td className="py-2 pr-4">
                      <span className="font-medium text-gray-900">
                        {m.acronym}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {m.name}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{m.location}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {m.renewals.length > 0 ? `${m.renewals.length}×` : '—'}
                    </td>
                    <td className="py-2 pr-4">
                      {m.latestSymbol
                        ? splitSymbols(m.latestSymbol).map((sym, i) => (
                            <span key={sym}>
                              {i > 0 && (
                                <span className="text-gray-400"> · </span>
                              )}
                              <a
                                href={undocsUrl(sym)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-un-blue hover:underline"
                              >
                                {sym}
                              </a>
                            </span>
                          ))
                        : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {nf.format(fat.total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sources & method */}
      <section className="mt-14 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-gray-500">
        <h2 className="text-sm font-semibold text-gray-900">
          Sources and method
        </h2>
        <p className="mt-2">
          Mission register, mandated (approved) vs actual personnel, monthly
          deployments, fatalities, budgets and results indicators:{' '}
          <a
            href="https://psdata.un.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            UN Peace &amp; Security Data Hub
          </a>{' '}
          (DPPA-DPO official open data, via its{' '}
          <a
            href="https://data.humdata.org/organization/unpeacesecurity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue hover:underline"
          >
            HDX mirrors
          </a>
          ), retrieved {fmtDate(generated)}. Mandate renewals and expiry dates:
          Security Council resolutions in our UN Digital Library mirror whose
          catalogue title marks an extension or renewal of a mission mandate;
          the mission is identified from the title and the expiry date parsed
          from it. Renewal counts undercount before ~1997, where catalogue
          titles are less systematic. Monthly deployment data starts in 2010 and
          covers uniformed personnel only; regional offices and envoy-led
          missions report no uniformed personnel. Mandated strength means the
          uniformed ceiling approved by the General Assembly for the budget
          year, which can differ from the ceiling authorised in Security Council
          resolutions.
        </p>
      </section>
    </div>
  )
}
