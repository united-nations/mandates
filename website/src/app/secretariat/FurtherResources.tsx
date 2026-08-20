import {
  FileText,
  GitCompare,
  Globe,
  Landmark,
  Library,
  Target,
} from 'lucide-react'

import { ResourceLink } from '@/components/ResourceLink'

const resources = [
  {
    title: 'UN Transparency Portal',
    description:
      'Visual exploration of the budget of the UN Secretariat and the wider UN System.',
    href: 'https://open.un.org/',
    icon: Globe,
  },
  {
    title: 'Programme Budget Results',
    description: 'Results information for the proposed programme budget.',
    href: 'https://results.un.org/',
    icon: Target,
  },
  {
    title: 'UN Meeting Transcripts',
    description: 'Searchable transcripts of UN meetings and proceedings.',
    href: 'https://transcripts.un.org/',
    icon: FileText,
  },
  {
    title: 'UN Document Diff Viewer',
    description:
      'Compare versions of UN documents side by side and track the changes.',
    href: 'https://diff.un-two-zero.dev/',
    icon: GitCompare,
  },
  {
    title: 'UN Digital Library',
    description:
      'Official repository of UN documents, resolutions, and voting records.',
    href: 'https://digitallibrary.un.org/',
    icon: Library,
  },
  {
    title: 'UN80 Initiative',
    description:
      'Building a simpler, more effective and more coherent UN System.',
    href: 'https://www.un.org/un80-initiative/en',
    icon: Landmark,
  },
]

/** Renders the stable external-resource grid below the explorer. */
export const FurtherResources = () => (
  <section id="resources" className="scroll-mt-20 bg-white py-10 md:py-12">
    <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Further resources
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <ResourceLink key={resource.title} {...resource} />
        ))}
      </div>
    </div>
  </section>
)
