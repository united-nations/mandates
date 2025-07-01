// Standardized API response types

export interface ApiResponse<T> {
  items: T[]
  totalItems: number
  totalPages: number
  page: number
  limit: number
  metadata?: Record<string, any>
}

export interface MandateApiResponse extends ApiResponse<Mandate> {
  metadata: {
    uniqueEntities: number
    uniqueOrgans: number
    totalCitations: number
    yearRange?: {
      min: number
      max: number
    }
    yearDistribution?: { [year: string]: number }
  }
}

export interface EntityWithCount {
  name: string
  count: number
}

export interface OrganWithCount {
  name: string
  count: number
}

export interface EntityApiResponse extends ApiResponse<EntityWithCount> {
  metadata?: {
    totalEntities: number
  }
}

export interface OrganApiResponse extends ApiResponse<OrganWithCount> {
  metadata?: {
    totalOrgans: number
  }
}

export interface CrossCitationEntity {
  entity: string
  sharedMandatesCount: number
  totalMandatesCount: number
}

export interface CrossCitationOrgan {
  organ: string
  sharedMandatesCount: number
  totalMandatesCount: number
}

// Import existing types
import type { Mandate } from './index' 