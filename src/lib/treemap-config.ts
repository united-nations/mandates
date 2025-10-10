/**
 * Treemap configuration for resolutions page
 * Defines buckets and color mappings for length and similarity dimensions
 */

export interface BucketDefinition {
  id: string;           // URL-safe: 'unknown', '<0.5k', '0.5k-1k'
  label: string;        // Display: 'Unknown', '<0.5K', '0.5K⎼1K'
  min: number | null;   // null for unknown/new buckets
  max: number | null;   // null for open-ended ranges or unknown buckets
  description: string;  // For tooltips
}

// Length buckets (word_count dimension)
export const lengthBuckets: BucketDefinition[] = [
  { id: 'unknown', label: 'Unknown', min: null, max: null, description: 'No word count data' },
  { id: '<0.5k', label: '<0.5K', min: 0, max: 500, description: 'Under 500 words' },
  { id: '0.5k-1k', label: '0.5K⎼1K', min: 501, max: 1000, description: '500 to 1,000 words' },
  { id: '1k-2k', label: '1K⎼2K', min: 1001, max: 2000, description: '1,000 to 2,000 words' },
  { id: '2k-5k', label: '2K⎼5K', min: 2001, max: 5000, description: '2,000 to 5,000 words' },
  { id: '>5k', label: '>5K', min: 5001, max: null, description: 'Over 5,000 words' },
];

// Similarity buckets (similarity_to_previous dimension)
export const similarityBuckets: BucketDefinition[] = [
  { id: 'new', label: 'New/First', min: null, max: null, description: 'No previous version' },
  { id: '<30', label: '<30%', min: 0, max: 0.30, description: 'Very different' },
  { id: '30-70', label: '30%⎼70%', min: 0.30, max: 0.70, description: 'Moderately similar' },
  { id: '70-90', label: '70%⎼90%', min: 0.70, max: 0.90, description: 'Very similar' },
  { id: '>90', label: '>90%', min: 0.90, max: 1.00, description: 'Nearly identical' },
];

// Color mappings for length dimension (inline styles)
// Uses colors from globals.css, spectrum from faded-jade to pale-oyster
export const lengthColors: Record<string, string> = {
  'unknown': '#E5E7EB',  // gray-200 (neutral for unknown)
  '<0.5k': '#4A7C7E',    // faded-jade
  '0.5k-1k': '#009edb',  // un-blue
  '1k-2k': '#7D8471',    // camouflage-green
  '2k-5k': '#9B8B7A',    // pale-oyster
  '>5k': '#596B7D',      // shuttle-gray
};

// Color mappings for similarity dimension (inline styles)
// Blue gradient from light to dark
export const similarityColors: Record<string, string> = {
  'new': '#E5E7EB',      // gray-200 (neutral for new/first)
  '<30': '#BFDBFE',      // light blue
  '30-70': '#60A5FA',    // medium blue
  '70-90': '#2563EB',    // dark blue
  '>90': '#1E40AF',      // darkest blue
};

// Helper function to determine which bucket a value falls into
export function getBucketForValue(
  value: number | null,
  buckets: BucketDefinition[]
): string {
  if (value === null) {
    // First bucket is always the "unknown" or "new" bucket
    return buckets[0].id;
  }

  for (const bucket of buckets) {
    if (bucket.min === null || bucket.max === null) {
      continue; // Skip unknown/new buckets
    }

    if (bucket.max === null) {
      // Open-ended range (e.g., ">5k")
      if (value >= bucket.min) {
        return bucket.id;
      }
    } else {
      // Closed range
      if (value >= bucket.min && value <= bucket.max) {
        return bucket.id;
      }
    }
  }

  // Fallback to unknown bucket if no match found
  return buckets[0].id;
}
