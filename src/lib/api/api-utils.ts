import { NextResponse } from 'next/server';
import type { FilterResult } from './filter-engine';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MandatesApiResponse {
  items: any[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  metadata: {
    uniqueEntities: number;
    uniqueOrgans: number;
    totalCitations: number;
    uniqueEntitiesWithCount?: Array<{ name: string; count: number }>;
    uniqueOrgansWithCount?: Array<{ name: string; count: number }>;
    organBreakdown?: Array<{ name: string; count: number }>;
    yearDistribution?: { [year: string]: number };
    yearRange?: { min: number; max: number } | null;
    uniqueProgrammes?: string[];
    uniqueSubjects?: string[];
  };
  // Legacy fields for backward compatibility
  totalCitations: number;
  uniqueEntitiesCount: number;
  uniqueBodiesCount: number;
  organBreakdown: Array<{ name: string; count: number }>;
  uniqueProgrammesCount: number;
  uniqueProgrammes: string[];
  uniqueSections: string[];
}

/**
 * Custom error class for API errors with specific status codes
 */
export class ApiError extends Error {
  public status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * API utilities for consistent response formatting and error handling
 */
export class ApiUtils {
  /**
   * Create a success response
   */
  static success<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  /**
   * Create an error response
   */
  static error(message: string, status: number = 500): NextResponse {
    console.error(`API Error (${status}):`, message);
    return NextResponse.json({ 
      success: false,
      error: message,
      message 
    }, { status });
  }

  /**
   * Format filter results for mandates API response
   */
  static formatMandatesResponse(result: FilterResult): MandatesApiResponse {
    const { filteredMandates, metadata, pagination } = result;

    return {
      items: filteredMandates,
      totalItems: metadata.totalItems,
      totalPages: pagination.totalPages,
      currentPage: pagination.currentPage,
      metadata: {
        uniqueEntities: metadata.uniqueEntities,
        uniqueOrgans: metadata.uniqueOrgans,
        totalCitations: metadata.totalCitations,
        uniqueEntitiesWithCount: metadata.uniqueEntitiesWithCount,
        uniqueOrgansWithCount: metadata.uniqueOrgansWithCount,
        organBreakdown: metadata.organBreakdown,
        yearDistribution: metadata.yearDistribution,
        yearRange: metadata.yearRange,
        uniqueProgrammes: metadata.uniqueProgrammes,
        uniqueSubjects: metadata.uniqueSubjects,
      },
      // Legacy fields for backward compatibility
      totalCitations: metadata.totalCitations,
      uniqueEntitiesCount: metadata.uniqueEntities,
      uniqueBodiesCount: metadata.uniqueOrgans,
      organBreakdown: metadata.organBreakdown,
      uniqueProgrammesCount: metadata.uniqueProgrammes.length,
      uniqueProgrammes: metadata.uniqueProgrammes,
      uniqueSections: [], // Legacy field, keeping for compatibility
    };
  }

  /**
   * Parse filter parameters from URL search params
   */
  static parseFilterParams(searchParams: URLSearchParams): Record<string, string> {
    const params: Record<string, string> = {};
    
    // List of valid filter parameters
    const validParams = [
      'entity', 'organ', 'keyword', 'programme', 'subject', 
      'start_year', 'end_year', 'budget_document', 'pillar', 
      'cross_entity', 'sort_by', 'page', 'limit'
    ];

    validParams.forEach(param => {
      const value = searchParams.get(param);
      if (value && value !== 'all') {
        params[param] = value;
      }
    });

    return params;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: string, limit?: string): { page: number; limit: number } {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return {
      page: Math.max(1, isNaN(pageNum) ? 1 : pageNum),
      limit: Math.max(1, Math.min(1000, isNaN(limitNum) ? 10 : limitNum)) // Cap at 1000
    };
  }

  /**
   * Handle async operations with proper error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Internal Server Error'
  ): Promise<NextResponse> {
    try {
      const result = await operation();
      return this.success(result);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      
      if (error instanceof ApiError) {
        return this.error(error.message, error.status);
      }
      
      return this.error(errorMessage, 500);
    }
  }

  /**
   * Validate required parameters
   */
  static validateRequired(params: Record<string, any>, required: string[]): string | null {
    for (const param of required) {
      if (!params[param]) {
        return `Missing required parameter: ${param}`;
      }
    }
    return null;
  }

  /**
   * Sanitize and validate entity/organ names
   */
  static sanitizeName(name: string): string {
    return decodeURIComponent(name).trim();
  }
}
