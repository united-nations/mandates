import { Tags } from 'lucide-react'
import type { Metadata } from 'next'
import { getSubjectHierarchy } from '@/lib/data/mandates'
import { SubjectsDirectory } from '@/components/SubjectsDirectory'

export const metadata: Metadata = {
  title: 'Subjects',
  description:
    'United Nations mandate subjects, organised by the UNBIS thesaurus hierarchy.',
}

export default async function SubjectsPage() {
  const domains = await getSubjectHierarchy()

  return (
    <div className="pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Tags className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Subjects
        </h1>
      </div>
      <p className="mb-8 max-w-195 text-left leading-relaxed text-foreground">
        Every subject heading applied to a mandate document, arranged by the
        United Nations Bibliographic Information System (UNBIS) thesaurus: 18
        top-level domains, each broken into sub-domains and their subjects. The
        number beside each subject is how many mandate documents carry it.
        Select a subject to open the explorer filtered to it, or a domain
        heading to see everything within it.
      </p>

      <SubjectsDirectory domains={domains} />
    </div>
  )
}
