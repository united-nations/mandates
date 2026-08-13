import { UnSystemBodyLine } from '@/components/UnSystemBodyLine'
import {
  UnSystemRegistryDots,
  UnSystemRegistryLegend,
  UnSystemRegistryLink,
} from '@/components/UnSystemRegistryCell'
import unSystemData from '@/data/un-system.json'
import { explainerTexts } from '@/lib/en_text_contents'
import type {
  UnSystemBody,
  UnSystemBodyEntry,
  UnSystemData,
  UnSystemEntity,
  UnSystemGrouping,
} from '@/types'
import { ExternalLink, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'UN System Mandates',
  description:
    'Trace mandates across the UN System: the governing bodies of every fund, programme, specialized agency, related organization and other entity, and how far each one’s mandates can be publicly traced.',
}

const { bodies, organizations } = unSystemData as UnSystemData

const sections: { grouping: UnSystemGrouping; title: string | null }[] = [
  { grouping: 'secretariat', title: 'UN Secretariat' },
  { grouping: 'fund-programme', title: 'Funds and Programmes' },
  { grouping: 'specialized-agency', title: 'Specialized Agencies' },
  { grouping: 'related-organization', title: 'Related Organizations' },
  { grouping: 'regional-commission', title: 'Regional Commissions' },
  { grouping: 'joint-hosted', title: 'Joint and Hosted Bodies' },
]

function resolveBody(entry: UnSystemBodyEntry): UnSystemBody {
  return 'ref' in entry ? bodies[entry.ref] : entry
}

function OrgLevelLink({
  label,
  href,
  email,
}: {
  label: string | null
  href: string
  email?: boolean
}) {
  return (
    <li className="leading-snug">
      <a
        href={email ? `mailto:${href}` : href}
        target={email ? undefined : '_blank'}
        rel={email ? undefined : 'noopener noreferrer'}
        className="inline-flex items-center gap-1 text-gray-500 transition-colors hover:text-un-blue"
      >
        {label ?? href}
        {email ? (
          <Mail className="h-3 w-3 shrink-0" />
        ) : (
          <ExternalLink className="h-3 w-3 shrink-0" />
        )}
      </a>
    </li>
  )
}

function EntityRow({ entity }: { entity: UnSystemEntity }) {
  return (
    <li className="grid grid-cols-1 items-baseline gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_3.5rem_minmax(0,1.5fr)]">
      <div>
        <div className="font-semibold text-gray-900">{entity.code}</div>
        {entity.name !== entity.code && (
          <div className="text-sm text-gray-500">{entity.name}</div>
        )}
      </div>
      <ul className="space-y-1 text-sm text-gray-600">
        {entity.governingBodies.map(resolveBody).map((body) => (
          <UnSystemBodyLine key={body.name} body={body} />
        ))}
        {(entity.officialPages.length > 0 || entity.contacts.length > 0) && (
          <li className="mt-1.5">
            <ul className="space-y-1 text-xs">
              {entity.officialPages.map((page) => (
                <OrgLevelLink
                  key={page.url}
                  label={page.label}
                  href={page.url}
                />
              ))}
              {entity.contacts.map((contact) => (
                <OrgLevelLink
                  key={contact.url ?? contact.email}
                  label={contact.label}
                  href={contact.url ?? contact.email!}
                  email={!!contact.email}
                />
              ))}
            </ul>
          </li>
        )}
      </ul>
      <div>
        <UnSystemRegistryDots
          registry={entity.mandateRegistry}
          note={entity.registryNote}
        />
      </div>
      <div>
        <UnSystemRegistryLink registry={entity.mandateRegistry} />
        {entity.related.map((portal) => (
          <div
            key={portal.url}
            className="mt-1 text-xs leading-snug text-gray-500"
          >
            <a
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 transition-colors hover:text-un-blue"
            >
              {portal.name}
            </a>{' '}
            — not mandate-linked
          </div>
        ))}
      </div>
    </li>
  )
}

export default function UnSystemPage() {
  return (
    <div className="pb-16">
      {/* Hero — text-only, mirroring /secretariat. This is a standalone page,
          not a section of the explorer, so no SectionBanner here. */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-8 md:px-12 lg:px-16">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
          {explainerTexts.systemHeader.headline}
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
          Beyond the{' '}
          <Link
            href="/secretariat"
            className="text-un-blue transition-colors hover:text-shuttle-gray"
          >
            UN Secretariat
          </Link>
          , dozens of funds, programmes, specialized agencies and related
          organizations carry their own mandates. This page lists the governing
          bodies that steer each organization, with official pages and contacts
          — and scores how openly each organization&apos;s mandates can be
          traced, from decision texts to results.
        </p>
        <div className="mt-6 max-w-4xl">
          <UnSystemRegistryLegend />
        </div>
      </section>

      <div className="py-4">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
          {sections.map(({ grouping, title }) => (
            <section key={grouping} className="mb-10">
              {title && (
                <>
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                  <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,2.5fr)_3.5rem_minmax(0,1.5fr)] gap-x-4 px-4 pb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase sm:grid">
                    {/* Pulled out of the box inset so it left-aligns with the section title. */}
                    <span className="-ms-4">Organization</span>
                    <span>Governing bodies</span>
                    <span className="col-span-2">Mandate Registry</span>
                  </div>
                </>
              )}
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {organizations
                  .filter((entity) => entity.grouping === grouping)
                  .map((entity) => (
                    <EntityRow key={entity.code} entity={entity} />
                  ))}
              </ul>
            </section>
          ))}

          {/* Disclaimer, demoted to a footnote — kept honest without being
              the page's opening statement. */}
          <p className="max-w-3xl text-xs leading-relaxed text-gray-500 italic">
            This draft overview is for informational purposes only and
            exhaustiveness is not guaranteed. The relevant rules of the
            organization concerned should be consulted in order to establish the
            legal status, functions and reporting lines of each entity listed.
          </p>
        </div>
      </div>
    </div>
  )
}
