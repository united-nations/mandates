'use client'

import { SiteHeader as SharedSiteHeader } from '@un-eosg/ui/components/site-header'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/secretariat', label: 'UN Secretariat View' },
  { href: '/system', label: 'UN System View' },
  // The full path, not '/focal-points'. The shared header decides the active
  // entry by exact string equality against `activeHref` (the pathname), so a
  // shorter href would never match and the entry would never light.
  { href: '/focal-points/directory', label: 'Focal points' },
]

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <SharedSiteHeader
      brand="United Nations"
      descriptor="Mandate Registry"
      href="/secretariat"
      homeLabel="Mandate Registry — home"
      navItems={navItems}
      activeHref={pathname}
      mobileMenuLabel="Open navigation menu"
      emblemPlacement="outboard"
      containerClassName="max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16"
      badge={
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help rounded-md bg-accent px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap text-accent-foreground md:px-2 md:py-1 md:text-xs">
              Beta Version
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-56">
            <p className="text-sm">
              The development of the mandate registry is still ongoing. Go to
              the{' '}
              <Link
                href="/methodology"
                className="font-medium text-un-blue-text underline hover:text-shuttle-gray"
              >
                methodology
              </Link>{' '}
              section for information on the current scope.
            </p>
          </TooltipContent>
        </Tooltip>
      }
    />
  )
}
