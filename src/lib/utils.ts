import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  const smallWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
  ]);

  // Updated regex to handle both straight (') and smart/curly (\u2019) apostrophes
  return str.replace(
    /\b\w+(?:[''\u2019][a-z]*)*\b/g,
    (word, index) => {
      // Handle possessives and contractions properly (both straight and curly apostrophes)
      if (word.includes("'") || word.includes("'") || word.includes("\u2019")) {
        // Split on any type of apostrophe
        const parts = word.split(/[''\u2019]/);
        const firstPart = parts[0].toLowerCase();
        const restPart = parts.slice(1).join("'").toLowerCase(); // Use straight apostrophe in output

        // Check if the first part (before apostrophe) is a small word
        if (index > 0 && smallWords.has(firstPart)) {
          return firstPart + "'" + restPart;
        }
        return (
          firstPart.charAt(0).toUpperCase() +
          firstPart.slice(1) +
          "'" +
          restPart
        );
      }

      const lowerWord = word.toLowerCase();
      if (index > 0 && smallWords.has(lowerWord)) {
        return lowerWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  );
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
