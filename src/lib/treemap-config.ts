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
// Semantic ordering: long → short (reversed), with Unknown last on right
export const lengthBuckets: BucketDefinition[] = [
  { id: '>5k', label: '>5K', min: 5001, max: null, description: 'Over 5,000 words' },
  { id: '2k-5k', label: '2K⎼5K', min: 2001, max: 5000, description: '2,000 to 5,000 words' },
  { id: '1k-2k', label: '1K⎼2K', min: 1001, max: 2000, description: '1,000 to 2,000 words' },
  { id: '0.5k-1k', label: '0.5K⎼1K', min: 501, max: 1000, description: '500 to 1,000 words' },
  { id: '<0.5k', label: '<0.5K', min: 0, max: 500, description: 'Under 500 words' },
  { id: 'unknown', label: 'Unknown', min: null, max: null, description: 'No word count data' },
];

// Similarity buckets (similarity_to_previous dimension)
// Semantic ordering: most similar → different, with New/First last
export const similarityBuckets: BucketDefinition[] = [
  { id: '>90', label: '>90%', min: 0.90, max: 1.00, description: 'Nearly identical' },
  { id: '70-90', label: '70%⎼90%', min: 0.70, max: 0.90, description: 'Very similar' },
  { id: '30-70', label: '30%⎼70%', min: 0.30, max: 0.70, description: 'Moderately similar' },
  { id: '<30', label: '<30%', min: 0, max: 0.30, description: 'Very different' },
  { id: 'new', label: 'New/First', min: null, max: null, description: 'No previous version' },
];

// Frequency buckets (distance_to_previous dimension)
// Semantic ordering: most frequent → least frequent, with One-time last
export const frequencyBuckets: BucketDefinition[] = [
  { id: '<1', label: '<1 year', min: 0, max: 0, description: 'Less than 1 year ago' },
  { id: '1', label: '1 year', min: 1, max: 1, description: '1 year ago' },
  { id: '2', label: '2 years', min: 2, max: 2, description: '2 years ago' },
  { id: '3-5', label: '3⎼5 years', min: 3, max: 5, description: '3 to 5 years ago' },
  { id: '>5', label: '>5 years', min: 6, max: null, description: 'More than 5 years ago' },
  { id: 'one-time', label: 'One-time', min: null, max: null, description: 'One-time document' },
];

// Color mappings for length dimension (inline styles)
// Uses custom palette from tailwind.config.ts
// Red to green gradient: longest documents (red) → shortest documents (green)
export const lengthColors: Record<string, string> = {
  'unknown': '#E5E7EB',  // gray-200 (neutral for unknown)
  '>5k': '#A0665C',      // au-chico (reddish - longest)
  '2k-5k': '#6C5B7B',    // smoky (purple)
  '1k-2k': '#7D8471',    // camouflage-green
  '0.5k-1k': '#9BBB7A',  // pale-oyster (yellow-green)
  '<0.5k': '#4A7C7E',    // faded-jade (greenish - shortest)
};

// Color mappings for similarity dimension (inline styles)
// Red to green gradient: most similar (red/au-chico) → least similar (green/faded-jade)
export const similarityColors: Record<string, string> = {
  'new': '#E5E7EB',      // gray-200 (neutral for new/first)
  '>90': '#A0665C',      // au-chico (reddish - nearly identical, highest similarity)
  '70-90': '#6C5B7B',    // smoky (purple - very similar)
  '30-70': '#7D8471',    // camouflage-green (moderate similarity)
  '<30': '#4A7C7E',      // faded-jade (greenish - very different, low similarity)
};

// Color mappings for frequency dimension (inline styles)
// Red to green gradient: less frequent/longer gaps (red) → more frequent/shorter gaps (green)
export const frequencyColors: Record<string, string> = {
  'one-time': '#E5E7EB', // gray-200 (neutral for one-time)
  '>5': '#A0665C',       // au-chico (reddish - least frequent, longest gap)
  '3-5': '#6C5B7B',      // smoky (purple)
  '2': '#7D8471',        // camouflage-green
  '1': '#9BBB7A',        // pale-oyster (yellow-green)
  '<1': '#4A7C7E',       // faded-jade (greenish - most frequent, shortest gap)
};

// Helper function to determine which bucket a value falls into
export function getBucketForValue(
  value: number | null,
  buckets: BucketDefinition[]
): string {
  if (value === null) {
    // Find the "unknown" or "new" bucket (the one with min and max both null)
    const unknownBucket = buckets.find(b => b.min === null && b.max === null);
    return unknownBucket?.id || buckets[0].id;
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
  const unknownBucket = buckets.find(b => b.min === null && b.max === null);
  return unknownBucket?.id || buckets[0].id;
}
