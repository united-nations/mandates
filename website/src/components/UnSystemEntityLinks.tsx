'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UnSystemContact, UnSystemPage } from '@/types'
import { ExternalLink, Globe, Info, Mail } from 'lucide-react'

const iconButton =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-un-blue transition-colors hover:bg-un-blue/10'

function contactHref(contact: UnSystemContact) {
  return contact.email ? `mailto:${contact.email}` : contact.url!
}

function LinkList({
  items,
}: {
  items: { label: string | null; href: string; external: boolean }[]
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
          >
            {item.external ? (
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Mail className="h-3.5 w-3.5 shrink-0" />
            )}
            {item.label ??
              item.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * Compact icon cluster for one UN system entity: official page(s),
 * secretariat contact(s), and an optional explanatory note.
 * Single targets link directly (with a tooltip); multiple open a popover.
 */
export function UnSystemEntityLinks({
  entity,
  pages,
  contacts,
  note,
}: {
  entity: string
  pages: UnSystemPage[]
  contacts: UnSystemContact[]
  note: string | null
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {pages.length === 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={pages[0].url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${entity} — official page`}
              className={iconButton}
            >
              <Globe className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">
            {pages[0].label ?? 'Official page'}
          </TooltipContent>
        </Tooltip>
      )}
      {pages.length > 1 && (
        <Popover>
          <PopoverTrigger
            aria-label={`${entity} — official pages`}
            className={iconButton}
          >
            <Globe className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto max-w-80 p-3">
            <LinkList
              items={pages.map((p) => ({
                label: p.label,
                href: p.url,
                external: true,
              }))}
            />
          </PopoverContent>
        </Popover>
      )}
      {contacts.length === 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contactHref(contacts[0])}
              target={contacts[0].email ? undefined : '_blank'}
              rel={contacts[0].email ? undefined : 'noopener noreferrer'}
              aria-label={`${entity} — secretariat contact`}
              className={iconButton}
            >
              <Mail className="h-4 w-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">
            {contacts[0].label ?? 'Secretariat contact'}
          </TooltipContent>
        </Tooltip>
      )}
      {contacts.length > 1 && (
        <Popover>
          <PopoverTrigger
            aria-label={`${entity} — secretariat contacts`}
            className={iconButton}
          >
            <Mail className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto max-w-80 p-3">
            <LinkList
              items={contacts.map((c) => ({
                label: c.label,
                href: contactHref(c),
                external: !c.email,
              }))}
            />
          </PopoverContent>
        </Popover>
      )}
      {note && (
        <Tooltip>
          <TooltipTrigger
            aria-label={`${entity} — note`}
            className={`${iconButton} text-muted-foreground hover:bg-muted`}
          >
            <Info className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64">
            {note}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
