/**
 * Decode URL segments - used by all dynamic pages
 */
export function decodeUrlSegments(segments: string | string[]): string {
  if (Array.isArray(segments)) {
    // For mandate pages with multiple segments
    return segments.map((segment) => decodeURIComponent(segment)).join("/");
  }
  // For entity/organ pages with single segment
  return decodeURIComponent(segments);
}
