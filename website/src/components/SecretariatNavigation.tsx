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
  {
    href: '/secretariat/entities-and-programs',
    label: text.entitiesAndPrograms,
  },
  { href: '/secretariat/agenda-items', label: text.agendaItems },
]

export function SecretariatNavigation() {
  const pathname = usePathname().replace(/\/$/, '')
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
    <SecondaryHeader
      items={items}
      label={text.label}
      activeHref={pathname.startsWith('/mandate/') ? '/secretariat' : pathname}
      renderLink={renderLink}
      className="top-[var(--site-header-height,65px)] min-[1408px]:top-[var(--site-header-height,48.83px)]"
    />
  )
}
