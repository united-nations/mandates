import { UnSystemEntityLinks } from '@/components/UnSystemEntityLinks'
import unSystemData from '@/data/un-system.json'
import type { UnSystemEntity, UnSystemGrouping } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'UN System Mandates',
  description:
    'Governing bodies, official pages and secretariat contacts across the United Nations system.',
}

const entities = unSystemData as UnSystemEntity[]

const sections: { grouping: UnSystemGrouping; title: string }[] = [
  { grouping: 'principal-organ', title: 'Principal Organs of the United Nations' },
  { grouping: 'fund-programme', title: 'Funds and Programmes' },
  { grouping: 'specialized-agency', title: 'Specialized Agencies' },
  { grouping: 'related-organization', title: 'Related Organizations' },
]

function entitiesFor(grouping: UnSystemGrouping) {
  return entities
    .filter((e) => e.grouping === grouping)
    .sort((a, b) =>
      a.order !== null || b.order !== null
        ? (a.order ?? Infinity) - (b.order ?? Infinity)
        : a.code.localeCompare(b.code),
    )
}

function EntityRow({ entity }: { entity: UnSystemEntity }) {
  const isPrincipalOrgan = entity.grouping === 'principal-organ'
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
      <div>
        <span className="font-semibold text-foreground">
          {isPrincipalOrgan ? entity.name : entity.code}
        </span>
        {!isPrincipalOrgan && entity.name !== entity.code && (
          <div className="text-sm text-muted-foreground">{entity.name}</div>
        )}
      </div>
      <div className="col-span-2 text-sm text-foreground/75 sm:col-span-1">
        {entity.governingBodies.join(' · ')}
      </div>
      <div className="col-start-2 row-start-1 self-center justify-self-end sm:col-start-3">
        <UnSystemEntityLinks
          entity={isPrincipalOrgan ? entity.name : entity.code}
          pages={entity.officialPages}
          contacts={entity.contacts}
          note={entity.note}
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
      <p className="mt-1 mb-8 max-w-195 text-sm text-muted-foreground">
        Governing bodies across the United Nations system, with links to each
        body&apos;s official page and secretariat contact.
      </p>

      {sections.map(({ grouping, title }) => (
        <section key={grouping} className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            {title}
          </h2>
          {grouping !== 'principal-organ' && (
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-x-4 px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
              <span>Organization</span>
              <span>Governing bodies</span>
            </div>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {entitiesFor(grouping).map((entity) => (
              <EntityRow key={entity.code} entity={entity} />
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-12 mb-20 max-w-195 text-xs leading-relaxed text-muted-foreground italic">
        This overview is for informational purposes only and exhaustiveness is
        not guaranteed. The relevant rules of the organization concerned should
        be consulted in order to establish the legal status, functions and
        reporting lines of each entity listed.
      </p>
    </div>
  )
}
