'use client';

import { useState, useEffect } from 'react';
import type { OperativeParagraph } from '@/types';

interface UseParagraphsParams {
  full_document_symbol: string;
  is_op_para?: string; // 'true', 'false', or undefined for all
  deliverable_type?: string;
}

export function useParagraphs(params: UseParagraphsParams) {
  const [paragraphs, setParagraphs] = useState<OperativeParagraph[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParagraphs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set('full_document_symbol', params.full_document_symbol);
        
        if (params.is_op_para) {
          searchParams.set('is_op_para', params.is_op_para);
        }
        
        if (params.deliverable_type) {
          searchParams.set('deliverable_type', params.deliverable_type);
        }

        const response = await fetch(`/api/paragraphs?${searchParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setParagraphs(data.paragraphs || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Failed to fetch paragraphs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.full_document_symbol) {
      fetchParagraphs();
    }
  }, [params.full_document_symbol, params.is_op_para, params.deliverable_type]);

  return {
    paragraphs,
    isLoading,
    error
  };
}
