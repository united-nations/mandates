'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Mandate } from '@/types';

export interface MandateApiResponse {
  items: Mandate[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  metadata: {
    uniqueEntities: number;
    uniqueOrgans: number;
    totalCitations: number;
  };
  // Legacy fields
  totalCitations: number;
  uniqueEntitiesCount: number;
  uniqueBodiesCount: number;
  organBreakdown: Array<{ name: string; count: number }>;
  uniqueProgrammesCount: number;
  uniqueProgrammes: string[];
  uniqueSections: string[];
}

export interface UseMandatesOptions {
  // Base filters that should be applied automatically
  baseFilters?: Record<string, string>;
  // Whether to fetch immediately on mount
  autoFetch?: boolean;
}

export function useMandates(options: UseMandatesOptions = {}) {
  const { baseFilters = {}, autoFetch = true } = options;
  const searchParams = useSearchParams();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State
  const [data, setData] = useState<MandateApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Build API URL from current search params and base filters
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    // Add base filters first
    Object.entries(baseFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });
    
    // Add search params (these override base filters)
    searchParams.forEach((value, key) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });
    
    // Set defaults if not provided
    if (!params.has('page')) params.set('page', '1');
    if (!params.has('limit')) params.set('limit', '10');
    if (!params.has('sort_by')) {
      const hasKeyword = params.has('keyword');
      params.set('sort_by', hasKeyword ? 'default' : 'citing_entities_desc');
    }
    
    return `/api/mandates?${params.toString()}`;
  }, [searchParams, baseFilters]);
  
  // Fetch function
  const fetchMandates = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const apiUrl = buildApiUrl();
      const response = await fetch(apiUrl, {
        signal: abortController.signal,
      });
      
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Failed to fetch mandates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [buildApiUrl]);
  
  // Refetch when search params change
  useEffect(() => {
    if (autoFetch) {
      fetchMandates();
    }
  }, [fetchMandates, autoFetch]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    data,
    isLoading,
    error,
    refetch: fetchMandates,
    // Convenience accessors
    mandates: data?.items || [],
    totalItems: data?.totalItems || 0,
    totalPages: data?.totalPages || 0,
    currentPage: data?.currentPage || 1,
    metadata: data?.metadata || {
      uniqueEntities: 0,
      uniqueOrgans: 0,
      totalCitations: 0,
    },
  };
}
