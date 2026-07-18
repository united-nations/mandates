import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'
import { getBudgetHierarchy } from '@/lib/data/mandates'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'

export const metadata: Metadata = {
  title: 'Entities',
  description:
    'United Nations Secretariat entities, organised by the programme budget structure.',
}

export default async function EntitiesPage() {
  const streams = await getBudgetHierarchy()

  return (
    <div className="pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Entities
        </h1>
      </div>
      <p className="mb-8 max-w-195 text-left leading-relaxed text-foreground">
        Every budget-holding entity, grouped by where it sits in the United
        Nations budget: the Proposed Programme Budget by part and section,
        Peacekeeping Operations by mission, and the Plan Outline. The number on
        each card is how many mandate documents cite that entity. Select one to
        open the explorer filtered to it.
      </p>

      <EntitiesDirectory streams={streams} />
    </div>
  )
}
