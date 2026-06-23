'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: ReactNode
}

/**
 * Anchor that opens in a new tab and announces that fact to assistive tech via
 * a visually-hidden suffix.
 */
export function ExternalLink({ children, ...rest }: ExternalLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  )
}
