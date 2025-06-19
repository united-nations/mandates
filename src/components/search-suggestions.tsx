'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Clock, TrendingUp } from 'lucide-react';

interface SearchSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  isVisible: boolean;
}

const popularSearches = [
  'climate change',
  'sustainable development',
  'human rights',
  'peacekeeping',
  'Security Council',
  'General Assembly',
  'UNEP',
  'UNDP',
  'refugee protection',
  'economic development',
  'gender equality',
  'humanitarian assistance'
];

const searchTips = [
  'Use quotes for exact phrases: "human rights"',
  'Search by UN organ: Security Council',
  'Find entities: UNEP, UNDP, WHO',
  'Look for topics: climate, development, peace'
];

export function SearchSuggestions({ onSuggestionClick, isVisible }: SearchSuggestionsProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSuggestionClick = (suggestion: string) => {
    saveRecentSearch(suggestion);
    onSuggestionClick(suggestion);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg z-50 p-4 max-h-96 overflow-y-auto">
      {recentSearches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors duration-200 active:scale-95"
                onClick={() => handleSuggestionClick(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Popular Searches</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((search, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors duration-200 active:scale-95"
              onClick={() => handleSuggestionClick(search)}
            >
              {search}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Search Tips</span>
        </div>
        <div className="space-y-1">
          {searchTips.map((tip, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
