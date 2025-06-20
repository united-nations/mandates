// Simplified search utility with multi-field support and highlighting
export interface FuzzySearchOptions {
  includeMatches?: boolean;
  minMatchCharLength?: number;
  tokenize?: boolean;
  matchAllTokens?: boolean;
}

export interface SearchField {
  name: string;
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

// Find all matches of a pattern in text
function findFuzzyMatches(text: string, pattern: string): FuzzyMatch[] {
  const matches: FuzzyMatch[] = [];
  const normalizedText = text.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  
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
    .replace(/[^\w\s\/-]/g, ' ') // Allow slashes
    .split(/\s+/)
    .filter(token => token.length > 0);
}

// Main search function
export function fuzzySearch<T>(
  items: T[],
  query: string,
  fields: SearchField[],
  options: FuzzySearchOptions = {}
): FuzzyResult<T>[] {
  const {
    includeMatches = true,
    minMatchCharLength = 1,
    tokenize = true,
    matchAllTokens = false
  } = options;
  
  if (!query.trim()) return [];
  
  const tokens = tokenize ? tokenizeQuery(query) : [query.toLowerCase()];
  const results: FuzzyResult<T>[] = [];
  
  for (const item of items) {
    const allMatches: FuzzyMatch[] = [];
    const highlightedFields: { [key: string]: string } = {};
    const matchedTokens = new Set<string>();
    
    for (const field of fields) {
      const value = field.getValue ? field.getValue(item) : (item as any)[field.name];
      
      if (!value) continue;
      
      const values = Array.isArray(value) ? value : [value];
      
      for (const val of values) {
        if (typeof val !== 'string') continue;
        
        let fieldMatches: FuzzyMatch[] = [];
        
        for (const token of tokens) {
          if (token.length < minMatchCharLength) continue;
          
          const matches = findFuzzyMatches(val, token);
          if (matches.length > 0) {
            matchedTokens.add(token);
            fieldMatches = fieldMatches.concat(matches);
          }
        }
        
        if (fieldMatches.length > 0) {
          fieldMatches.forEach(match => {
            match.key = field.name;
            allMatches.push(match);
          });
          
          // Create highlighted version
          highlightedFields[field.name] = highlightMatches(val, fieldMatches);
        }
      }
    }
    
    const matchCondition = matchAllTokens ? matchedTokens.size >= tokens.length : matchedTokens.size > 0;

    if (matchCondition) {
      results.push({
        item,
        score: 0, // Score is not used for ranking
        matches: includeMatches ? allMatches : [],
        highlightedFields
      });
    }
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