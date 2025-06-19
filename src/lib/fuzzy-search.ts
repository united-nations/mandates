// Fuzzy search utility with multi-field support and highlighting
export interface FuzzySearchOptions {
  threshold?: number;
  maxDistance?: number;
  includeScore?: boolean;
  includeMatches?: boolean;
  minMatchCharLength?: number;
  shouldSort?: boolean;
  tokenize?: boolean;
  matchAllTokens?: boolean;
}

export interface SearchField {
  name: string;
  weight: number;
  getValue?: (item: any) => string | string[] | null | undefined;
}

export interface FuzzyMatch {
  indices: [number, number][];
  value: string;
  key: string;
  score: number;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
  matches: FuzzyMatch[];
  highlightedFields: { [key: string]: string };
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Find all matches of a pattern in text with fuzzy matching
function findFuzzyMatches(text: string, pattern: string, maxDistance: number = 2): FuzzyMatch[] {
  const matches: FuzzyMatch[] = [];
  const normalizedText = text.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  
  // Exact matches first
  let index = normalizedText.indexOf(normalizedPattern);
  while (index !== -1) {
    matches.push({
      indices: [[index, index + pattern.length - 1]],
      value: text.substring(index, index + pattern.length),
      key: '',
      score: 1.0
    });
    index = normalizedText.indexOf(normalizedPattern, index + 1);
  }
  
  // If we have exact matches, prioritize them
  if (matches.length > 0) {
    return matches;
  }
  
  // Fuzzy matches for shorter patterns
  if (pattern.length <= 50) {
    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const distance = levenshteinDistance(normalizedPattern, word);
      const similarity = 1 - (distance / Math.max(normalizedPattern.length, word.length));
      
      if (distance <= maxDistance && similarity >= 0.6) {
        const wordStart = normalizedText.indexOf(word, i === 0 ? 0 : normalizedText.indexOf(words[i - 1]) + words[i - 1].length);
        if (wordStart !== -1) {
          matches.push({
            indices: [[wordStart, wordStart + word.length - 1]],
            value: text.substring(wordStart, wordStart + word.length),
            key: '',
            score: similarity
          });
        }
      }
    }
  }
  
  return matches;
}

// Highlight matches in text with HTML
export function highlightMatches(text: string, matches: FuzzyMatch[], className: string = 'search-highlight'): string {
  if (!matches.length) return text;
  
  const highlights: { start: number; end: number; score: number }[] = [];
  
  matches.forEach(match => {
    match.indices.forEach(([start, end]) => {
      highlights.push({ start, end: end + 1, score: match.score });
    });
  });
  
  // Sort by start position
  highlights.sort((a, b) => a.start - b.start);
  
  // Merge overlapping highlights
  const merged: typeof highlights = [];
  for (const highlight of highlights) {
    if (merged.length === 0 || merged[merged.length - 1].end < highlight.start) {
      merged.push(highlight);
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, highlight.end);
      merged[merged.length - 1].score = Math.max(merged[merged.length - 1].score, highlight.score);
    }
  }
  
  let result = '';
  let lastIndex = 0;
  
  for (const highlight of merged) {
    result += text.slice(lastIndex, highlight.start);
    const highlightedText = text.slice(highlight.start, highlight.end);
    const scoreClass = highlight.score > 0.9 ? 'exact' : 'fuzzy';
    result += `<mark class="${className} ${className}-${scoreClass}">${highlightedText}</mark>`;
    lastIndex = highlight.end;
  }
  
  result += text.slice(lastIndex);
  return result;
}

// Tokenize query for better matching
function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

// Main fuzzy search function
export function fuzzySearch<T>(
  items: T[],
  query: string,
  fields: SearchField[],
  options: FuzzySearchOptions = {}
): FuzzyResult<T>[] {
  const {
    threshold = 0.3,
    maxDistance = 2,
    includeScore = true,
    includeMatches = true,
    minMatchCharLength = 1,
    shouldSort = true,
    tokenize = true,
    matchAllTokens = false
  } = options;
  
  if (!query.trim()) return [];
  
  const tokens = tokenize ? tokenizeQuery(query) : [query.toLowerCase()];
  const results: FuzzyResult<T>[] = [];
  
  for (const item of items) {
    let totalScore = 0;
    let matchCount = 0;
    const allMatches: FuzzyMatch[] = [];
    const highlightedFields: { [key: string]: string } = {};
    
    for (const field of fields) {
      const value = field.getValue ? field.getValue(item) : (item as any)[field.name];
      
      if (!value) continue;
      
      const values = Array.isArray(value) ? value : [value];
      
      for (const val of values) {
        if (typeof val !== 'string') continue;
        
        let fieldScore = 0;
        let fieldMatches: FuzzyMatch[] = [];
        
        for (const token of tokens) {
          if (token.length < minMatchCharLength) continue;
          
          const matches = findFuzzyMatches(val, token, maxDistance);
          if (matches.length > 0) {
            fieldMatches = fieldMatches.concat(matches);
            fieldScore += Math.max(...matches.map(m => m.score));
            matchCount++;
          }
        }
        
        if (fieldMatches.length > 0) {
          // Apply field weight
          fieldScore *= field.weight;
          totalScore += fieldScore;
          
          // Store matches with field info
          fieldMatches.forEach(match => {
            match.key = field.name;
            allMatches.push(match);
          });
          
          // Create highlighted version
          highlightedFields[field.name] = highlightMatches(val, fieldMatches);
        }
      }
    }
    
    // Calculate final score
    const finalScore = totalScore / Math.max(1, matchCount);
    
    // Apply threshold and token matching rules
    if (finalScore >= threshold && (!matchAllTokens || matchCount >= tokens.length)) {
      results.push({
        item,
        score: finalScore,
        matches: includeMatches ? allMatches : [],
        highlightedFields
      });
    }
  }
  
  if (shouldSort) {
    results.sort((a, b) => b.score - a.score);
  }
  
  return results;
}

// Generate search suggestions based on content
export function generateSearchSuggestions(items: any[], fields: SearchField[]): string[] {
  const suggestions = new Set<string>();
  
  for (const item of items) {
    for (const field of fields) {
      const value = field.getValue ? field.getValue(item) : item[field.name];
      
      if (!value) continue;
      
      const values = Array.isArray(value) ? value : [value];
      
      for (const val of values) {
        if (typeof val === 'string' && val.length > 0) {
          // Extract meaningful phrases
          const words = val.split(/\s+/);
          for (let i = 0; i < words.length; i++) {
            // Single important words
            if (words[i].length >= 3) {
              suggestions.add(words[i].toLowerCase());
            }
            
            // Two-word phrases
            if (i < words.length - 1) {
              const phrase = `${words[i]} ${words[i + 1]}`.toLowerCase();
              if (phrase.length >= 6) {
                suggestions.add(phrase);
              }
            }
          }
        }
      }
    }
  }
  
  return Array.from(suggestions)
    .filter(s => s.length >= 3)
    .sort()
    .slice(0, 100); // Limit suggestions
} 