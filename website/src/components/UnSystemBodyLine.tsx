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
import type { UnSystemBody, UnSystemContact } from '@/types'
import { ExternalLink, Globe, Info, Mail } from 'lucide-react'

const iconButton =
  'inline-flex h-5 w-5 items-center justify-center rounded text-un-blue transition-colors hover:bg-un-blue/10'

function contactHref(contact: UnSystemContact) {
  return contact.email ? `mailto:${contact.email}` : contact.url!
}

/**
 * One governing body as a list line: name followed by its own page and
 * contact icons. Single targets link directly (with a tooltip); multiple
 * contacts open a popover.
 */
export function UnSystemBodyLine({ body }: { body: UnSystemBody }) {
  const contacts = body.contacts ?? []
  return (
    <li className="flex items-center gap-1 leading-snug">
      <span>{body.name}</span>
      {body.url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={body.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${body.name} — official page`}
              className={iconButton}
            >
              <Globe className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">
            {body.overview
              ? 'Governing bodies — overview page'
              : 'Official page'}
          </TooltipContent>
        </Tooltip>
      )}
      {contacts.length === 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contactHref(contacts[0])}
              target={contacts[0].email ? undefined : '_blank'}
              rel={contacts[0].email ? undefined : 'noopener noreferrer'}
              aria-label={`${body.name} — contact`}
              className={iconButton}
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">
            {contacts[0].label ?? 'Contact'}
          </TooltipContent>
        </Tooltip>
      )}
      {contacts.length > 1 && (
        <Popover>
          <PopoverTrigger
            aria-label={`${body.name} — contacts`}
            className={iconButton}
          >
            <Mail className="h-3.5 w-3.5" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto max-w-80 p-3">
            <ul className="space-y-1.5">
              {contacts.map((contact) => (
                <li key={contactHref(contact)}>
                  <a
                    href={contactHref(contact)}
                    target={contact.email ? undefined : '_blank'}
                    rel={contact.email ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                  >
                    {contact.email ? (
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {contact.label ?? contact.email ?? contact.url}
                  </a>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
      {body.note && (
        <Tooltip>
          <TooltipTrigger
            aria-label={`${body.name} — note`}
            className={`${iconButton} text-muted-foreground hover:bg-muted`}
          >
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64">
            {body.note}
          </TooltipContent>
        </Tooltip>
      )}
    </li>
  )
}
