'use client'

import Image from 'next/image'
import { Link as LinkIcon } from 'lucide-react'

export default function ResourcesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <LinkIcon className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          More Transparency Resources
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: open.un.org */}
        <a
          href="https://open.un.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block flex-col items-start rounded-lg border border-muted p-4 text-left transition hover:border-un-blue"
        >
          <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
            <Image
              src="/images/screenshots/open_un_org.png"
              alt="open.un.org screenshot"
              fill
              className="object-cover"
            />
          </div>
          <div className="mb-1 text-base font-medium text-un-blue">
            UN Transparency Portal
          </div>
          <div className="text-sm text-muted-foreground">
            Visual exploration of the budget of the UN secretariat and UN
            system.
          </div>
        </a>
        {/* Card 2: unsceb.org/financial-statistics */}
        <a
          href="https://unsceb.org/financial-statistics"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-start rounded-lg border border-muted p-4 text-left transition hover:border-un-blue"
        >
          <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
            <Image
              src="/images/screenshots/unsceb_org.png"
              alt="unsceb.org/financial-statistics screenshot"
              fill
              className="object-cover"
            />
          </div>
          <div className="mb-1 text-base font-medium text-un-blue">
            CEB Financial Statistics
          </div>
          <div className="text-sm text-muted-foreground">
            Financial statistics from the UN System Chief Executives Board.
          </div>
        </a>
        {/* Card 3: results.un.org */}
        <a
          href="https://results.un.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="block flex-col items-start rounded-lg border border-muted p-4 text-left transition hover:border-un-blue"
        >
          <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
            <Image
              src="/images/screenshots/results_un_org.png"
              alt="results.un.org screenshot"
              fill
              className="object-cover"
            />
          </div>
          <div className="mb-1 text-base font-medium text-un-blue">
            Programme Budget Results
          </div>
          <div className="text-sm text-muted-foreground">
            Results information for the proposed programme budget 2026.
          </div>
        </a>
      </div>
    </div>
  )
}
