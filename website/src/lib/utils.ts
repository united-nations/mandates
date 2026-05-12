import type { Mandate } from '@/types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { titleCase } from 'title-case'

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
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!text || !searchTerm) return text

  // Escape special regex characters in search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Create regex for case-insensitive search
  const regex = new RegExp(`(${escapedTerm})`, 'gi')

  // Replace matches with highlighted version
  return text.replace(
    regex,
    '<mark class="bg-[#b3d9f0] text-[#00557a] px-0.5 rounded">$1</mark>'
  )
}

/**
 * Safely highlights search terms in text, handling null/undefined values
 * @param text The text to highlight (can be null/undefined)
 * @param searchTerm The search term to highlight
 * @returns Highlighted text or original text if no highlighting possible
 */
export function safeHighlightSearchTerms(
  text: string | null | undefined,
  searchTerm: string
): string | undefined {
  if (!text || !searchTerm) return text || undefined
  return highlightSearchTerms(text, searchTerm)
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
  // Security Council resolutions use the catalogue title field directly
  if (mandate.issuing_body === 'Security Council') {
    if (mandate.title && mandate.title.trim()) {
      return titleCase(cleanTitle(mandate.title).toLowerCase())
    }
  }
  // 1. proper_title from source_documents_metadata_clean (strip trailing colon)
  if (mandate.proper_title && mandate.proper_title.trim()) {
    const cleaned = cleanTitle(mandate.proper_title).replace(/:$/, '').trim()
    if (cleaned) return titleCase(cleaned.toLowerCase())
  }
  // 2. ppb_description from source_documents
  if (mandate.description && mandate.description.trim()) {
    return titleCase(cleanTitle(mandate.description).toLowerCase())
  }
  // Final fallback
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
