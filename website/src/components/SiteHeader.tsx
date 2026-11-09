'use client'

import { SiteHeader as SharedSiteHeader } from '@un-eosg/ui/components/site-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { explainerTexts } from '@/lib/en_text_contents'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const menuText = explainerTexts.siteMenu

interface MenuEntry {
  href: string
  label: string
}

const secretariatView: MenuEntry = {
  href: '/secretariat',
  label: 'UN Secretariat View',
}
const systemView: MenuEntry = { href: '/system', label: 'UN System View' }
// The full path, not '/focal-points'. The shared header decides the active
// entry by exact string equality against `activeHref` (the pathname), so a
// shorter href would never match and the entry would never light.
const focalPoints: MenuEntry = {
  href: '/focal-points/directory',
  label: 'Focal points',
}

/** The inline tabs, shown from the lg breakpoint up. */
const navItems = [secretariatView, systemView, focalPoints]

/**
 * The menu carries the views itself below lg, because the shared header's own
 * mobile menu is switched off: one menu at every width, not two side by side.
 */
const narrowOnlyMenuItems = [secretariatView, systemView]
const menuItems: MenuEntry[] = [
  { href: '/about', label: menuText.about },
  { href: '/technical-briefing', label: menuText.technicalBriefing },
  focalPoints,
]

function SiteMenuItem({
  entry,
  activeHref,
  className,
}: {
  entry: MenuEntry
  activeHref: string
  className?: string
}) {
  const active = entry.href === activeHref
  return (
    <DropdownMenuItem
      asChild
      className={cn(
        'cursor-pointer rounded-none border-s-2 border-transparent focus:bg-un-blue-surface focus:text-un-blue-text',
        active && 'border-un-blue font-semibold text-un-blue-text',
        className
      )}
    >
      <Link href={entry.href} aria-current={active ? 'page' : undefined}>
        {entry.label}
      </Link>
    </DropdownMenuItem>
  )
}

function SiteMenu({ activeHref }: { activeHref: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={menuText.label}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-un-blue/50 focus-visible:outline-none"
        >
          <Menu aria-hidden className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {narrowOnlyMenuItems.map((entry) => (
          <SiteMenuItem
            key={entry.href}
            entry={entry}
            activeHref={activeHref}
            className="lg:hidden"
          />
        ))}
        <DropdownMenuSeparator className="lg:hidden" />
        {menuItems.map((entry) => (
          <SiteMenuItem
            key={entry.href}
            entry={entry}
            activeHref={activeHref}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const activeHref = pathname.startsWith('/secretariat/')
    ? '/secretariat'
    : pathname
  const headerContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const header = headerContainer.current?.querySelector('header')
    if (!header) return
    const updateHeight = () =>
      document.documentElement.style.setProperty(
        '--site-header-height',
        `${header.getBoundingClientRect().height}px`
      )
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--site-header-height')
    }
  }, [])
  return (
    <div ref={headerContainer} className="contents">
      <SharedSiteHeader
        brand="United Nations"
        descriptor="Mandate Registry"
        href="/secretariat"
        homeLabel="Mandate Registry — home"
        navItems={navItems}
        activeHref={activeHref}
        transparency="none"
        showMobileMenu={false}
        emblemPlacement="outboard"
        containerClassName="max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16"
        badge={
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help rounded-md border border-un-blue-text/30 bg-un-blue-surface px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap text-un-blue-text md:px-2 md:py-1 md:text-xs">
                Beta Version
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-56">
              <p className="text-sm">
                The development of the mandate registry is still ongoing. Go to
                the{' '}
                <Link
                  href="/about"
                  className="font-medium text-un-blue-text underline hover:text-shuttle-gray"
                >
                  About page
                </Link>{' '}
                for information on the current scope.
              </p>
            </TooltipContent>
          </Tooltip>
        }
      >
        <SiteMenu activeHref={activeHref} />
      </SharedSiteHeader>
    </div>
  )
}
