import type { Mandate } from '@/types'
import { findMarkRanges, type SearchMarker } from '@/lib/paragraph-search'
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { titleCase } from 'title-case'

/**
 * `text-micro` (10px) and `text-mini` (11px) are font sizes from the shared
 * theme, below Tailwind's own scale. tailwind-merge only knows the scale it
 * ships with, so to a bare twMerge they are not sizes at all - they parse as
 * `text-<colour>`, which means they conflict with the text colour beside them
 * and lose to it, and the size disappears with no warning, no error and no
 * lint. It has cost us a rendered size at least once already; the note on
 * MandateDetailUi's headingMarkClassName records that one, which had to be
 * fixed by routing that string around `cn` entirely.
 *
 * Declaring both in the font-size group is the fix at the source: they now
 * conflict with `text-xs` and the rest, which is what they actually do, and
 * the last size written wins the way every other size does. Any custom size
 * added to the theme has to be added here too, or it inherits the same bug.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': ['text-micro', 'text-mini'] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a URL for display by removing protocol, www prefix, and trailing slash
 * Optionally truncates long URLs to show domain + "..." for better readability
 * @param url - The URL to format
 * @param maxLength - Optional max length before truncating (default: no truncation)
 * @returns Formatted URL string
 */
export function formatUrlForDisplay(url: string, maxLength?: number): string {
  if (!url) return ''

  // Clean the URL by removing protocol, www prefix, and trailing slash
  const cleanUrl = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')

  // If no max length specified or URL is short enough, return as is
  if (!maxLength || cleanUrl.length <= maxLength) {
    return cleanUrl
  }

  // Otherwise show domain + ...
  const domain = cleanUrl.split('/')[0]
  return `${domain}/...`
}

/**
 * Highlights search terms in text with HTML mark tags
 * @param text The text to highlight
 * @param searchTerm The search term to highlight
 * @returns Text with highlighted search terms
 */
export function highlightSearchTerms(text: string, marker: SearchMarker): string {
  if (!text || marker.patterns.length === 0) return text

  // The ranges come from the paragraph search's marker over the parsed
  // query, so the marks follow the query grammar: each positive term marks
  // where it occurs, with the fold's tolerance for spelling, and an excluded
  // term marks nothing. Ranges arrive merged and in order, so the text can
  // be sliced straight through them.
  let out = ''
  let at = 0
  for (const { start, end } of findMarkRanges(text, marker)) {
    out +=
      text.slice(at, start) +
      '<mark class="bg-accent text-un-blue-text underline decoration-un-blue/50 underline-offset-2 px-0.5 rounded">' +
      text.slice(start, end) +
      '</mark>'
    at = end
  }
  return out + text.slice(at)
}

/**
 * Safely highlights search terms in text, handling null/undefined values
 * @param text The text to highlight (can be null/undefined)
 * @param marker The compiled search marker for the query
 * @returns Highlighted text or original text if no highlighting possible
 */
export function safeHighlightSearchTerms(
  text: string | null | undefined,
  marker: SearchMarker
): string | undefined {
  if (!text) return text || undefined
  return highlightSearchTerms(text, marker)
}

/**
 * Clean up a title by removing trailing punctuation and whitespace
 */
function cleanTitle(title: string): string {
  return title
    .trim()
    .replace(/[\s:]+$/, '')
    .trim()
}

/**
 * Get the display title for a mandate using the same logic as the API
 * This ensures consistency across all components
 */
export function getMandateDisplayTitle(mandate: Mandate): string {
  // Digital Library-derived display title (unified_documents.display_title):
  // authoritative and broadest coverage (resolutions/decisions/PRSTs, incl.
  // DL-only docs). Routed through cleanup for consistent casing; strip a
  // trailing colon just in case.
  if (mandate.display_title && mandate.display_title.trim()) {
    const cleaned = cleanTitle(mandate.display_title).replace(/:$/, '').trim()
    if (cleaned) return titleCase(cleaned.toLowerCase())
  }
  // Fallback: the raw source description (for docs with no DL display_title).
  if (mandate.description && mandate.description.trim()) {
    return titleCase(cleanTitle(mandate.description).toLowerCase())
  }
  return 'Untitled'
}

/**
 * Lookup object for deliverable type display labels
 * Maps deliverable type enum values to their display labels
 */
export const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  inter_coordination: 'Inter‑Coordination',
  other_substantive: 'Other Substantive',
  meeting_servicing: 'Meeting Servicing',
  admin_support: 'Administrative Support',
  conferencing_servicing: 'Conferencing Servicing',
} as const

/**
 * Get the display label for a deliverable type
 * @param type - The deliverable type string (e.g., "inter_coordination")
 * @returns Display label (e.g., "Inter Coordination") or the original type if not found
 */
export function getDeliverableTypeLabel(type: string): string {
  return DELIVERABLE_TYPE_LABELS[type] || type
}

export function decodeUrlSegments(segments: string | string[]): string {
  if (Array.isArray(segments)) {
    return segments.map((segment) => decodeURIComponent(segment)).join('/')
  }
  return decodeURIComponent(segments)
}
