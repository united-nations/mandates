import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { CountryAttentionMap } from '@/components/CountryAttentionMap'
import { DesignationCadenceChart } from '@/components/InstrumentCharts'
import { GenealogyHeadline } from '@/components/genealogy/GenealogyHeadline'
import { LanguageStrengthGradient } from '@/components/LanguageStrengthGradient'
import { MandateHeartbeat } from '@/components/MandateHeartbeat'
import { ReportsLensYearChart } from '@/components/ReportsLensYearChart'
import { VotingIdealPointTrends } from '@/components/VotingIdealPointTrends'

import { getVotingAnalysis } from '@/lib/data/country-votes'
import { getLanguageStrength } from '@/lib/data/language-strength'
import { getReportsLensStats } from '@/lib/data/reports-lens'
import { genealogyMeta, headlineByAge, headlineByDecade } from '@/lib/genealogy'
import {
  getMissionImplementation,
  latestPersonnel,
  totalFatalities,
} from '@/lib/mission-implementation'
import { getSanctionsImplementation } from '@/lib/sanctions-implementation'
import { getScRenewalData } from '@/lib/sc-renewals'
import { getTreatyImplementation } from '@/lib/treaty-implementation'

export const metadata: Metadata = {
  title: 'Analytics — UN Mandate Registry',
  description:
    'Every analytical lens on the mandate registry in one place: the language of command, consensus and geopolitics, country attention, boilerplate genealogy, the reporting cycle, mission ground-truth, and sanctions & treaties.',
}

const nf = new Intl.NumberFormat('en-US')

/* ------------------------------------------------------------------ */
/* Small presentational primitives                                     */
/* ------------------------------------------------------------------ */

interface Stat {
  value: string
  label: string
}

function StatStrip({ stats, cols }: { stats: Stat[]; cols?: string }) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-6 ${
        cols ?? 'sm:grid-cols-4'
      }`}
    >
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

function VisualFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 md:p-6">
      {children}
    </div>
  )
}

function ExploreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-un-blue hover:underline"
    >
      {label}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </Link>
  )
}

interface LensSectionProps {
  n: number
  id: string
  kicker: string
  title: string
  children: React.ReactNode
}

function LensSection({ n, id, kicker, title, children }: LensSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-gray-100 py-14">
      <p className="text-xs font-semibold tracking-wide text-un-blue uppercase">
        {String(n).padStart(2, '0')} · {kicker}
      </p>
      <h2 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* DB-fed section: the language of command                             */
/* Isolated so a local DB outage degrades to text, never a 500.        */
/* ------------------------------------------------------------------ */

async function CommandLanguageVisual() {
  let data: Awaited<ReturnType<typeof getLanguageStrength>> | null = null
  try {
    data = await getLanguageStrength()
  } catch {
    data = null
  }

  if (!data) {
    return (
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
        The registry classifies every operative paragraph by the verb that
        opens it, from directive (decides, authorizes) to hortatory (requests,
        urges). The command gradient is steep: instructions to the
        Secretary-General are overwhelmingly directive, while paragraphs
        addressed to Member States mostly ask rather than order. Open the live
        expander for the current figures.
      </p>
    )
  }

  const sg = data.gradient.find((r) => /secretary/i.test(r.assigneeClass))
  const ms = data.gradient.find((r) => /member/i.test(r.assigneeClass))
  return (
    <>
      {sg && ms && (
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          When an organ addresses the Secretary-General,{' '}
          <strong className="font-semibold text-gray-900">
            {Math.round(sg.pctDirective)}%
          </strong>{' '}
          of its operative paragraphs use directive verbs (decides, authorizes).
          When it turns to Member States, only{' '}
          <strong className="font-semibold text-gray-900">
            {Math.round(ms.pctDirective)}%
          </strong>{' '}
          do — the rest merely request, urge or invite. The Secretariat is told;
          sovereign states are asked.
        </p>
      )}
      <VisualFrame>
        <LanguageStrengthGradient data={data.gradient} />
      </VisualFrame>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  /* --- Missions (static JSON) --- */
  const { missions } = getMissionImplementation()
  const openMissions = missions.filter((m) => m.open)
  const pkos = openMissions.filter((m) => m.type === 'Peacekeeping Mission')
  const approvedNow = pkos.reduce(
    (s, m) => s + (latestPersonnel(m)?.approvedUniformed ?? 0),
    0
  )
  const actualNow = pkos.reduce(
    (s, m) => s + (latestPersonnel(m)?.actualUniformed ?? 0),
    0
  )
  const renewalsTracked = missions.reduce((s, m) => s + m.renewals.length, 0)
  const fatalitiesTotal = missions.reduce(
    (s, m) => s + totalFatalities(m).total,
    0
  )

  /* --- Renewals heartbeat (static JSON) --- */
  const renewalData = getScRenewalData()

  /* --- Instruments (static JSON) --- */
  const sanctions = getSanctionsImplementation()
  const treaties = getTreatyImplementation()

  /* --- Reports (static JSON) --- */
  const reports = getReportsLensStats()

  /* --- Geopolitics / consensus (static JSON) --- */
  const voting = getVotingAnalysis()
  const loneliest = voting.loneliest[0]
  const loneliestName = loneliest ? voting.countries[loneliest.iso] : null

  /* --- Genealogy (static JSON) --- */
  const g1 = headlineByAge.find((h) => h.age === 1)
  const g3 = headlineByAge.find((h) => h.age === 3)
  const g10 = headlineByAge.find((h) => h.age === 10)
  const carried3 = g3 ? Math.round(g3.verbatimPct + g3.mutatedPct) : null

  return (
    <div className="pb-8">
      {/* Intro */}
      <section className="pt-2 pb-4">
        <p className="text-xs font-semibold tracking-wide text-un-blue uppercase">
          Analytics
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-foreground">
          Seven lenses on 2,565 mandates
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-600">
          The registry catalogues the resolutions, decisions and other documents
          the UN cites as its marching orders. Each lens below asks a different
          question of that corpus — how the orders are worded, how united the
          bodies that issue them are, whom they concern, how their text is
          recycled, and what actually happens once the paper is adopted. Every
          finding links onward to its full page or expander.
        </p>
      </section>

      {/* 1 — The language of command */}
      <LensSection
        n={1}
        id="command"
        kicker="What the Secretariat is told to do"
        title="The Secretariat is told; Member States are asked"
      >
        <CommandLanguageVisual />
        <ExploreLink
          href="/secretariat#language-of-command"
          label="Explore the language of command"
        />
      </LensSection>

      {/* 2 — Consensus & geopolitics */}
      <LensSection
        n={2}
        id="consensus"
        kicker="How united the tellers are"
        title="Most mandates pass by consensus — but the votes that split reveal fixed geopolitical blocs"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          The General Assembly adopts most resolutions without a vote. When it
          does record one — {nf.format(voting.gaCoverage.votes)} plenary votes
          from {voting.gaCoverage.from.slice(0, 4)} to{' '}
          {voting.gaCoverage.to.slice(0, 4)} — the alignment barely moves from
          year to year: a US-led pole, a large non-aligned majority, and a
          handful of persistent isolates.
          {loneliestName && (
            <>
              {' '}
              {loneliestName} sat on a one- or two-country losing side{' '}
              {nf.format(loneliest.lonely)} times.
            </>
          )}
        </p>
        <VisualFrame>
          <VotingIdealPointTrends analysis={voting} />
        </VisualFrame>
        <ExploreLink
          href="/secretariat#ga-consensus"
          label="Explore consensus and geopolitics"
        />
      </LensSection>

      {/* 3 — Country attention */}
      <LensSection
        n={3}
        id="attention"
        kicker="Who the mandates are about"
        title="UN attention is concentrated on a handful of countries"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          Resolutions name countries unevenly. Mapping every country subject
          applied to a mandate shows attention pooling around a small set of
          conflict and post-conflict states, while much of the world is rarely
          the direct object of a mandate at all.
        </p>
        <VisualFrame>
          <CountryAttentionMap />
        </VisualFrame>
        <ExploreLink
          href="/secretariat#attention-map"
          label="Explore the country attention map"
        />
      </LensSection>

      {/* 4 — Boilerplate genealogy */}
      <LensSection
        n={4}
        id="genealogy"
        kicker="How the texts live and mutate"
        title="After the third renewal, two-thirds of a resolution is recycled from the last one"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          Most resolutions are re-adoptions, not fresh drafts. Aligning{' '}
          {nf.format(genealogyMeta.nParas)} paragraphs across{' '}
          {nf.format(genealogyMeta.nChainsAnalyzed)} renewal chains shows the
          first re-adoption already keeps{' '}
          {g1 && (
            <strong className="font-semibold text-gray-900">
              {g1.verbatimPct}%
            </strong>
          )}{' '}
          of its text verbatim; by the third renewal{' '}
          {carried3 && (
            <strong className="font-semibold text-gray-900">
              {carried3}%
            </strong>
          )}{' '}
          is carried over, and by the tenth{' '}
          {g10 && (
            <strong className="font-semibold text-gray-900">
              {g10.verbatimPct}%
            </strong>
          )}{' '}
          is word-for-word identical.
        </p>
        <VisualFrame>
          <GenealogyHeadline byAge={headlineByAge} byDecade={headlineByDecade} />
        </VisualFrame>
        <ExploreLink href="/genealogy" label="Explore boilerplate genealogy" />
      </LensSection>

      {/* 5 — The reporting cycle */}
      <LensSection
        n={5}
        id="reports"
        kicker="The paper trail"
        title="Many mandates are requests for paper — and most of them get answered"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          A large share of mandates simply ask an official to report back. The
          registry detects{' '}
          {nf.format(reports.requestParagraphs)} reporting obligations across{' '}
          {nf.format(reports.resolutionsWithRequests)} resolutions, and links{' '}
          {nf.format(reports.deliveredReports)} delivered reports that name the
          resolution they answer — {Math.round(reports.requestMatchRate * 100)}%
          of requesting resolutions have at least one linked report.
        </p>
        <StatStrip
          stats={[
            {
              value: nf.format(reports.requestParagraphs),
              label: 'reporting obligations detected',
            },
            {
              value: nf.format(reports.deliveredReports),
              label: 'reports naming their requesting resolution',
            },
            {
              value: `${Math.round(reports.requestMatchRate * 100)}%`,
              label: 'of requesting resolutions have a linked report',
            },
            {
              value: `${Math.round(reports.linkEdgeRegistryRate * 100)}%`,
              label: 'of report links point into the registry',
            },
          ]}
        />
        <VisualFrame>
          <ReportsLensYearChart
            reportsPerYear={reports.reportsPerYear}
            description="Reports published each year that state which registry resolution they respond to."
          />
        </VisualFrame>
        <ExploreLink href="/reports" label="Explore the reporting cycle" />
      </LensSection>

      {/* 6 — Missions: paper vs ground */}
      <LensSection
        n={6}
        id="missions"
        kicker="The ground truth"
        title="On the ground, missions run below their mandated strength — and on a Council leash"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          For peace operations the mandate can be checked against reality. The{' '}
          {nf.format(openMissions.length)} active missions field roughly{' '}
          <strong className="font-semibold text-gray-900">
            {Math.round((actualNow / approvedNow) * 100)}%
          </strong>{' '}
          of their mandated uniformed strength, and their mandates are kept alive
          by short, repeated renewals — {nf.format(renewalsTracked)} extension
          resolutions tracked in all. The heartbeat below shows how long a leash
          the Security Council grants each chain.
        </p>
        <StatStrip
          stats={[
            {
              value: nf.format(openMissions.length),
              label: 'active peace operations',
            },
            {
              value: `${Math.round((actualNow / approvedNow) * 100)}%`,
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
        <VisualFrame>
          <MandateHeartbeat data={renewalData} />
        </VisualFrame>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <ExploreLink href="/missions" label="Explore peace operations" />
          <ExploreLink
            href="/secretariat#renewals"
            label="See the renewals expander"
          />
        </div>
      </LensSection>

      {/* 7 — Instruments: sanctions & treaties */}
      <LensSection
        n={7}
        id="instruments"
        kicker="The instruments"
        title="Sanctions and treaties: the mandate on paper against who was actually listed or ratified"
      >
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700">
          The same paper-vs-ground test applies to the two other things UN organs
          mandate into being. {nf.format(sanctions.regime_count)} Security
          Council sanctions regimes have{' '}
          {nf.format(sanctions.totals.total_listed)} individuals and entities
          currently designated under them; the {nf.format(treaties.treaty_count)}{' '}
          General-Assembly treaties tracked here have drawn{' '}
          {nf.format(treaties.totals.sum_parties)} ratifications between them.
        </p>
        <StatStrip
          cols="sm:grid-cols-4"
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
        <VisualFrame>
          <DesignationCadenceChart byYear={sanctions.totals.listings_by_year} />
        </VisualFrame>
        <ExploreLink href="/instruments" label="Explore sanctions & treaties" />
      </LensSection>
    </div>
  )
}
