import { ExpandableCard } from '@/components/ExpandableCard'
import { DesignationCadenceChart } from '@/components/InstrumentCharts'
import { MissionMap } from '@/components/MissionMap'
import { LensLink } from '@/components/sections/MandatesSection'
import {
  ChartNote,
  SecretariatSection,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
import {
  getMissionImplementation,
  latestPersonnel,
  totalFatalities,
} from '@/lib/mission-implementation'
import { getMissionMap } from '@/lib/mission-map'
import { getSanctionsImplementation } from '@/lib/sanctions-implementation'
import { getTreatyImplementation } from '@/lib/treaty-implementation'

const nf = new Intl.NumberFormat('en-US')

interface Stat {
  value: string
  label: string
}

/** Four figures across, the shape the analytics hub used. */
function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-gray-200 py-6 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {s.value}
          </div>
          <div className="mt-1 text-xs leading-snug text-gray-500">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Section 05 — the paper-against-ground test.
 *
 * The first four sections all describe the mandate as written. This one asks
 * what the mandate turned into. It only covers the three things where an
 * outside record exists to check against: peace operations (deployment and
 * renewal data), sanctions regimes (designation lists) and treaties
 * (ratifications). Each expander gives the headline and hands off to the lens's
 * own page, which has the detail this section deliberately does not repeat.
 */
export function ImplementationSection() {
  const { missions } = getMissionImplementation()
  const openMissions = missions.filter((m) => m.open)
  const pkos = openMissions.filter((m) => m.type === 'Peacekeeping Mission')
  const approvedNow = pkos.reduce(
    (sum, m) => sum + (latestPersonnel(m)?.approvedUniformed ?? 0),
    0
  )
  const actualNow = pkos.reduce(
    (sum, m) => sum + (latestPersonnel(m)?.actualUniformed ?? 0),
    0
  )
  const renewalsTracked = missions.reduce(
    (sum, m) => sum + m.renewals.length,
    0
  )
  const fatalitiesTotal = missions.reduce(
    (sum, m) => sum + totalFatalities(m).total,
    0
  )
  const deployedShare =
    approvedNow > 0 ? Math.round((actualNow / approvedNow) * 100) : null

  const sanctions = getSanctionsImplementation()
  const treaties = getTreatyImplementation()

  return (
    <SecretariatSection
      id="implementation"
      imageSrc="/images/banners/hero-banner-president.png"
      title="What happens after the mandate is adopted?"
      description="The sections above describe the mandate as written. These are the three places where the paper can be checked against an outside record: peace operations on the ground, sanctions designations, and treaty ratifications."
    >
      <SectionExpanders>
        <ExpandableCard
          id="missions"
          title="Peace operations: the mandate against the ground"
          variant="filled"
        >
          <div className="space-y-6">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              For peace operations the mandate can be checked against reality.
              The {nf.format(openMissions.length)} active missions field roughly{' '}
              {deployedShare !== null && (
                <strong className="font-semibold text-gray-900">
                  {deployedShare}%
                </strong>
              )}{' '}
              of their mandated uniformed strength, and their mandates are kept
              alive by short, repeated renewals — {nf.format(renewalsTracked)}{' '}
              extension resolutions tracked in all.
            </p>
            <StatStrip
              stats={[
                {
                  value: nf.format(openMissions.length),
                  label: 'active peace operations',
                },
                {
                  value: deployedShare !== null ? `${deployedShare}%` : '—',
                  label: 'of mandated strength actually deployed',
                },
                {
                  value: nf.format(renewalsTracked),
                  label: 'mandate renewal resolutions tracked',
                },
                {
                  value: nf.format(fatalitiesTotal),
                  label: 'fatalities since 1948 (these missions)',
                },
              ]}
            />
            <MissionMap data={getMissionMap()} />
            <LensLink href="/missions">
              Open peace operations in full — targets, renewals and deployment
            </LensLink>
          </div>
        </ExpandableCard>

        <ExpandableCard
          id="instruments"
          title="Sanctions and treaties: who was actually listed or ratified"
          variant="filled"
        >
          <div className="space-y-6">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              The same test applies to the two other things UN organs mandate
              into being. {nf.format(sanctions.regime_count)} Security Council
              sanctions regimes have {nf.format(sanctions.totals.total_listed)}{' '}
              individuals and entities currently designated under them. The{' '}
              {nf.format(treaties.treaty_count)} General Assembly treaties
              tracked here have drawn {nf.format(treaties.totals.sum_parties)}{' '}
              ratifications between them.
            </p>
            <StatStrip
              stats={[
                {
                  value: nf.format(sanctions.regime_count),
                  label: 'active sanctions regimes',
                },
                {
                  value: nf.format(sanctions.totals.total_listed),
                  label: 'individuals & entities designated',
                },
                {
                  value: nf.format(treaties.treaty_count),
                  label: 'treaties tracked',
                },
                {
                  value: nf.format(treaties.totals.sum_parties),
                  label: 'ratifications across those treaties',
                },
              ]}
            />
            <DesignationCadenceChart
              byYear={sanctions.totals.listings_by_year}
            />
            <ChartNote>
              Designation and ratification counts are snapshots of the published
              lists, not a live feed. A designation that was later delisted is
              not counted here.
            </ChartNote>
            <LensLink href="/instruments">
              Open sanctions and treaties in full
            </LensLink>
          </div>
        </ExpandableCard>
      </SectionExpanders>
    </SecretariatSection>
  )
}
