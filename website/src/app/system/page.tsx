import { UnSystemBodyLine } from '@/components/UnSystemBodyLine'
import { UnSystemRegistryCell } from '@/components/UnSystemRegistryCell'
import unSystemData from '@/data/un-system.json'
import type {
  UnSystemBody,
  UnSystemBodyEntry,
  UnSystemData,
  UnSystemEntity,
  UnSystemGrouping,
} from '@/types'
import { ExternalLink, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UN System Mandates',
  description:
    'Governing bodies, official pages and secretariat contacts across the United Nations system.',
}

const { bodies, organizations } = unSystemData as UnSystemData

const sections: { grouping: UnSystemGrouping; title: string | null }[] = [
  { grouping: 'secretariat', title: null },
  { grouping: 'fund-programme', title: 'Funds and Programmes' },
  { grouping: 'specialized-agency', title: 'Specialized Agencies' },
  { grouping: 'related-organization', title: 'Related Organizations' },
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
        className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-un-blue"
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
    <li className="grid grid-cols-1 items-baseline gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)]">
      <div>
        <div className="font-semibold text-foreground">{entity.code}</div>
        {entity.name !== entity.code && (
          <div className="text-sm text-muted-foreground">{entity.name}</div>
        )}
      </div>
      <ul className="space-y-1 text-sm text-foreground/75">
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
        <UnSystemRegistryCell
          registry={entity.mandateRegistry}
          note={entity.registryNote}
        />
      </div>
    </li>
  )
}

export default function UnSystemPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        United Nations System
      </h1>
      <p className="mt-1 max-w-195 text-sm text-muted-foreground">
        Governing bodies across the United Nations system, with links to each
        body&apos;s official page and secretariat contact.
      </p>
      <p className="mt-3 mb-8 max-w-195 text-sm text-muted-foreground italic">
        This draft overview is for informational purposes only and
        exhaustiveness is not guaranteed. The relevant rules of the
        organization concerned should be consulted in order to establish the
        legal status, functions and reporting lines of each entity listed.
      </p>

      {sections.map(({ grouping, title }) => (
        <section key={grouping} className="mb-10">
          {title && (
            <>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                {title}
              </h2>
              <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1fr)] gap-x-4 px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
                {/* Pulled out of the box inset so it left-aligns with the section title. */}
                <span className="-ms-4">Organization</span>
                <span>Governing bodies</span>
                <span>Mandate Registry</span>
              </div>
            </>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {organizations
              .filter((entity) => entity.grouping === grouping)
              .map((entity) => (
                <EntityRow key={entity.code} entity={entity} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
