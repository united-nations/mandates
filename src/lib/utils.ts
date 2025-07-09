import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a URL for display by removing protocol, www prefix, and trailing slash
 * Optionally truncates long URLs to show domain + "..." for better readability
 * @param url - The URL to format
 * @param maxLength - Optional max length before truncating (default: no truncation)
 * @returns Formatted URL string
 */
export function formatUrlForDisplay(url: string, maxLength?: number): string {
  if (!url) return "";
  
  // Clean the URL by removing protocol, www prefix, and trailing slash
  const cleanUrl = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  
  // If no max length specified or URL is short enough, return as is
  if (!maxLength || cleanUrl.length <= maxLength) {
    return cleanUrl;
  }
  
  // Otherwise show domain + ...
  const domain = cleanUrl.split('/')[0];
  return `${domain}/...`;
}

/**
 * Highlights search terms in text with HTML mark tags
 * @param text The text to highlight
 * @param searchTerm The search term to highlight
 * @returns Text with highlighted search terms
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!text || !searchTerm) return text;
  
  // Escape special regex characters in search term
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive search
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  
  // Replace matches with highlighted version
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded">$1</mark>');
}

/**
 * Safely highlights search terms in text, handling null/undefined values
 * @param text The text to highlight (can be null/undefined)
 * @param searchTerm The search term to highlight
 * @returns Highlighted text or original text if no highlighting possible
 */
export function safeHighlightSearchTerms(text: string | null | undefined, searchTerm: string): string | undefined {
  if (!text || !searchTerm) return text || undefined;
  return highlightSearchTerms(text, searchTerm);
}
