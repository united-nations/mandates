'use client'

import {
  SecondaryHeader,
  type SecondaryHeaderLinkProps,
} from '@un-eosg/ui/components/secondary-header'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { explainerTexts } from '@/lib/en_text_contents'
import { useFilters } from '@/contexts/FilterContext'

const text = explainerTexts.secretariatNavigation
const items = [
  { href: '/secretariat', label: text.mandateSources },
  { href: '/secretariat/agenda-items', label: text.agendaItems },
  {
    href: '/secretariat/entities-and-programs',
    label: text.entitiesAndPrograms,
  },
]

export function SecretariatNavigation() {
  const pathname = usePathname().replace(/\/$/, '')
  // Retained with the hidden block below for re-enabling the tab explainers.
  // const explainer =
  //   pathname === '/secretariat/agenda-items'
  //     ? text.explainers.agendas
  //     : pathname === '/secretariat/entities-and-programs'
  //       ? text.explainers.entities
  //       : text.explainers.sources
  const { filters } = useFilters()
  const renderLink = ({ href, ...props }: SecondaryHeaderLinkProps) => (
    <Link
      href={
        filters.ppb_version
          ? `${href}?${new URLSearchParams({ ppb_version: filters.ppb_version })}`
          : href
      }
      {...props}
    />
  )

  return (
    <>
      <SecondaryHeader
        items={items}
        label={text.label}
        activeHref={
          pathname.startsWith('/mandate/') ? '/secretariat' : pathname
        }
        renderLink={renderLink}
        className="top-[var(--site-header-height,65px)] min-[1408px]:top-[var(--site-header-height,48.83px)]"
      />
      {/* Top-of-tab explainers are temporarily hidden; restore the selector above with this block.
      <div className="mx-auto w-full max-w-6xl px-6 pt-4 md:px-12 lg:px-16">
        <p className="max-w-3xl text-sm text-foreground">{explainer}</p>
      </div>
      */}
    </>
  )
}
