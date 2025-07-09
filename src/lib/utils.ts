import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FilterType } from '@/contexts/FilterContext';

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

/**
 * Get active filters text for sidebar descriptions
 * @param filters - Current filters
 * @param pageType - Type of page ('main' | 'entity' | 'organ')
 * @param entityFilter - Current entity filter (for entity pages)
 * @param organFilter - Current organ filter (for organ pages)
 * @returns Formatted text describing active filters, or empty string if none
 */
export function getActiveFiltersText(
  filters: FilterType,
  pageType: 'main' | 'entity' | 'organ',
  entityFilter?: string,
  organFilter?: string
): string {
  const activeFilters: string[] = [];
  
  // Define which filters to check based on page type
  const filtersToCheck = { ...filters };
  
  // Exclude implicit filters and pagination
  delete filtersToCheck.page;
  delete filtersToCheck.limit;
  delete filtersToCheck.sort_by;
  
  // Exclude implicit filters based on page type
  if (pageType === 'entity' && entityFilter) {
    // On entity page, exclude the entity filter itself
    delete filtersToCheck.entity;
  } else if (pageType === 'organ' && organFilter) {
    // On organ page, exclude the organ filter itself
    delete filtersToCheck.organ;
  }
  
  // Check each remaining filter
  if (filtersToCheck.entity) activeFilters.push('entity');
  if (filtersToCheck.organ) activeFilters.push('organ');
  if (filtersToCheck.crossCitingEntity) activeFilters.push('cross-citing entity');
  if (filtersToCheck.keyword) activeFilters.push('keyword');
  if (filtersToCheck.programme) activeFilters.push('programme');
  if (filtersToCheck.subject) activeFilters.push('subject');
  if (filtersToCheck.start_year || filtersToCheck.end_year) activeFilters.push('year range');
  if (filtersToCheck.budget_document) activeFilters.push('budget document');
  
  if (activeFilters.length === 0) {
    return '';
  }
  
  if (activeFilters.length === 1) {
    return `(with ${activeFilters[0]} filter) `;
  }
  
  if (activeFilters.length === 2) {
    return `(with ${activeFilters[0]} and ${activeFilters[1]} filters) `;
  }
  
  return `(with ${activeFilters.length} active filters) `;
}
