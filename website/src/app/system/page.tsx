import type { Metadata } from 'next'
import Link from 'next/link'
import { SystemDirectoryTable } from '@/components/system/SystemDirectoryTable'
import unSystemData from '@/data/un-system.json'
import additions from '@/data/un-system-directory-additions.json'
import { getFocalPointDirectorySummary } from '@/lib/data/focal-points'
import type { DirectorySummaryDesignation } from '@/lib/focal-point-constants'
import { buildSystemDirectory } from '@/lib/system-directory'
import type { UnSystemData } from '@/types'

export const metadata: Metadata = {
  title: 'UN System View',
  description:
    'UN system entities, their governing bodies, mandate focal points and document registries.',
}

// Designations and contact removals take effect without waiting for a deploy.
export const dynamic = 'force-dynamic'

export default async function UnSystemPage() {
  let designations: DirectorySummaryDesignation[] = []
  let focalPointsAvailable = true
  try {
    designations = await getFocalPointDirectorySummary()
  } catch {
    // A contact-directory outage must not erase the static entity directory or
    // imply that every entity has lost its designation. Never serve stale people.
    console.error('UN system directory: focal-point data could not be loaded')
    focalPointsAvailable = false
  }
  const entities = buildSystemDirectory(
    unSystemData as UnSystemData,
    additions,
    designations
  )

  return (
    <div className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:px-12 lg:px-16">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
        UN System View
      </h1>
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-foreground">
        Explore UN system entities, their governing bodies, focal points and
        document registries. Select an entity for contacts, coverage and
        resources. For mandates of the UN Secretariat, visit the{' '}
        <Link href="/secretariat" className="text-un-blue-text hover:underline">
          Secretariat View
        </Link>
        .
      </p>
      <SystemDirectoryTable
        entities={entities}
        focalPointsAvailable={focalPointsAvailable}
      />
      <p className="mt-6 text-sm text-muted-foreground">
        UN entities designate their focal points at{' '}
        <a
          href="https://mandate-focal-points.un-two-zero.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue-text hover:underline"
        >
          mandate-focal-points.un-two-zero.org
        </a>
        .
      </p>
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        This draft directory combines the existing UN system overview with
        entities from the public focal-point roster. Categories organize the
        directory and do not establish legal status or reporting lines.
        Governing bodies, contacts and resources may not be exhaustive; consult
        the relevant organization’s rules and official sources. Use the feedback
        button for corrections.
      </p>
    </div>
  )
}
