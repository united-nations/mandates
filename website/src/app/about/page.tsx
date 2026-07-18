import { explainerTexts } from '@/lib/en_text_contents'
import { GitCompare, Link as LinkIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Methodology of the UN Mandate Source Registry and further transparency resources.',
}

const resources = [
  {
    href: 'https://open.un.org/',
    title: 'UN Transparency Portal',
    description:
      'Visual exploration of the budget of the UN secretariat and UN system.',
    screenshot: '/images/screenshots/open_un_org.png',
  },
  {
    href: 'https://unsceb.org/financial-statistics',
    title: 'CEB Financial Statistics',
    description:
      'Financial statistics from the UN System Chief Executives Board.',
    screenshot: '/images/screenshots/unsceb_org.png',
  },
  {
    href: 'https://results.un.org/',
    title: 'Programme Budget Results',
    description: 'Results information for the proposed programme budget 2026.',
    screenshot: '/images/screenshots/results_un_org.png',
  },
  {
    href: 'https://diff.un-two-zero.dev/',
    title: 'UN Document Diff Viewer',
    description:
      'Compare versions of UN documents side by side and track changes between them.',
    screenshot: null,
  },
]

export default function AboutPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
        About
      </h1>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Methodology
        </h2>
        <div className="mb-4 max-w-195 space-y-4 text-left text-foreground sm:text-justify">
          {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
            <p key={index} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        <Image
          src="/images/methodology.svg"
          alt="Methodology"
          width={248}
          height={135}
          unoptimized
          style={{ width: '100%', height: 'auto' }}
        />
        <p className="mt-8 max-w-195 text-left text-sm leading-relaxed text-foreground italic sm:text-justify">
          {explainerTexts.mainHeader.disclaimer}
        </p>
      </section>

      <hr className="my-10 border-muted" />

      <section id="resources" className="mb-20">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          More Transparency Resources
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-start rounded-lg border border-muted p-4 text-left transition hover:border-un-blue"
            >
              <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
                {resource.screenshot ? (
                  <Image
                    src={resource.screenshot}
                    alt={`${resource.title} screenshot`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/30">
                    <GitCompare
                      className="h-12 w-12 text-un-blue"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
              </div>
              <div className="mb-1 inline-flex items-center gap-1.5 text-base font-medium text-un-blue">
                {resource.title}
                <LinkIcon className="h-3.5 w-3.5" />
              </div>
              <div className="text-sm text-foreground">
                {resource.description}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
