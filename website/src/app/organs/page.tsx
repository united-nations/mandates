import { Gavel } from 'lucide-react'
import type { Metadata } from 'next'
import { getOrganHierarchy } from '@/lib/data/mandates'
import { OrgansDirectory } from '@/components/OrgansDirectory'

export const metadata: Metadata = {
  title: 'Organs',
  description:
    'The United Nations organs and bodies that adopt mandates, grouped by their place in the UN system.',
}

export default async function OrgansPage() {
  const groups = await getOrganHierarchy()

  return (
    <div className="pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Gavel className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Organs
        </h1>
      </div>
      <p className="mb-8 max-w-195 text-left leading-relaxed text-foreground">
        The intergovernmental organs and bodies that adopt Secretariat mandates,
        grouped by where they sit in the United Nations system: the
        Charter&rsquo;s principal organs, their subsidiary bodies and
        assemblies, the functional and regional commissions of ECOSOC, and the
        treaty bodies and other entities. The number on each card is how many
        mandate documents that organ adopted. Select one to open the explorer
        filtered to it.
      </p>

      <OrgansDirectory groups={groups} />
    </div>
  )
}
