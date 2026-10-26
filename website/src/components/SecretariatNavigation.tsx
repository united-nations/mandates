'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'
import type { ExploreCardFigures } from '@/lib/explore-card-state'
import { cn } from '@/lib/utils'

const text = explainerTexts.secretariatNavigation

interface SecretariatNavigationProps {
  counts?: ExploreCardFigures
}

/** Registry totals stay stable while filters narrow the explorer below. */
export function SecretariatNavigation({ counts }: SecretariatNavigationProps) {
  const pathname = usePathname().replace(/\/$/, '')
  const { filters } = useFilters()
  const activeHref = pathname.startsWith('/mandate/')
    ? '/secretariat'
    : pathname
  const items = [
    {
      href: '/secretariat',
      label: text.cards.cited,
      count: counts?.citedDocumentCount,
      total: counts?.documentsCount,
      action: text.cards.sourcesAction,
    },
    {
      href: '/secretariat/agenda-items',
      label: text.agendaItems,
      count: counts?.organCount,
      action: text.cards.bodiesAction,
    },
    {
      href: '/secretariat/entities-and-programs',
      label: text.entitiesAndPrograms,
      count: counts?.entityCount,
      action: text.cards.entitiesAction,
    },
  ]
  const explainer =
    pathname === '/secretariat/agenda-items'
      ? text.explainers.agendas
      : pathname === '/secretariat/entities-and-programs'
        ? text.explainers.entities
        : pathname === '/secretariat/reports'
          ? explainerTexts.secretariatReports.workInProgress
          : text.explainers.sources

  return (
    <div className="mx-auto w-full max-w-6xl px-6 md:px-12 lg:px-16">
      <nav
        aria-label={text.label}
        className="grid grid-cols-2 gap-3 border-b border-primary pb-3 lg:grid-cols-4"
      >
        {items.map((item) => {
          const active = activeHref === item.href
          const href = filters.ppb_version
            ? `${item.href}?${new URLSearchParams({ ppb_version: filters.ppb_version })}`
            : item.href
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-w-0 flex-col gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                active
                  ? 'border-primary bg-accent lg:after:absolute lg:after:top-full lg:after:left-1/2 lg:after:h-[calc(--spacing(3)+1px)] lg:after:w-px lg:after:-translate-x-1/2 lg:after:bg-primary'
                  : 'border-border bg-background hover:border-primary hover:bg-accent'
              )}
            >
              <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-3xl leading-none font-medium text-foreground tabular-nums">
                <span>{item.count?.toLocaleString('en') ?? '—'}</span>
                {item.total !== undefined && (
                  <>
                    <span
                      aria-hidden
                      className="text-xl whitespace-nowrap text-muted-foreground"
                    >
                      / {item.total.toLocaleString('en')}
                    </span>
                    <span className="sr-only">
                      {text.cards.outOf.replace(
                        '{total}',
                        item.total.toLocaleString('en')
                      )}
                    </span>
                  </>
                )}
                {item.count === undefined && (
                  <span className="sr-only">{text.cards.loading}</span>
                )}
              </span>
              <span className="text-base font-medium text-foreground">
                {item.label}
              </span>
              <span className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-un-blue-text">
                {item.action}
                <ArrowRight aria-hidden className="size-4 shrink-0" />
              </span>
            </Link>
          )
        })}
        <div
          aria-disabled="true"
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-4 text-left"
        >
          <span className="text-3xl leading-none font-medium text-foreground">
            —
          </span>
          <span className="text-base font-medium text-foreground">
            {text.reports}
          </span>
          <span className="mt-auto flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
            <span>
              {text.cards.reportsAction} ({text.cards.comingSoon})
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0" />
          </span>
        </div>
      </nav>
      <div className="pt-4">
        <p className="max-w-3xl text-sm text-foreground">{explainer}</p>
      </div>
    </div>
  )
}
