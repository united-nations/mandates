import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { FilterEngine } from '@/lib/api/filter-engine';
import { ApiUtils } from '@/lib/api/api-utils';

// Cache for global metadata
let globalMetadataCache: any = null;

async function getGlobalMetadata() {
  if (globalMetadataCache) {
    return globalMetadataCache;
  }

  // Get all mandates and calculate global metadata
  const allMandates = await DataService.getMandates();
  const filterResult = FilterEngine.filterMandates(allMandates, {}); // No filters = global data
  
  globalMetadataCache = {
    uniqueEntities: filterResult.metadata.uniqueEntitiesWithCount,
    uniqueBodies: filterResult.metadata.uniqueOrgansWithCount.map(o => o.name),
    uniqueBodiesWithCount: filterResult.metadata.uniqueOrgansWithCount,
    uniquePriorityAreas: [], // Legacy field
    uniqueSubjects: filterResult.metadata.uniqueSubjects,
    totalDocuments: filterResult.metadata.totalItems,
    totalEntities: filterResult.metadata.uniqueEntities,
    totalCitations: filterResult.metadata.totalCitations,
    uniqueBodiesCount: filterResult.metadata.uniqueOrgans,
    uniqueProgrammesCount: filterResult.metadata.uniqueProgrammes.length,
    uniqueProgrammes: filterResult.metadata.uniqueProgrammes,
    uniquePillars: [], // Legacy field
    yearRange: filterResult.metadata.yearRange,
    yearDistribution: filterResult.metadata.yearDistribution,
  };

  return globalMetadataCache;
}

export async function GET(request: Request) {
  return ApiUtils.handleAsync(async () => {
    const { searchParams } = new URL(request.url);
    const filterParams = ApiUtils.parseFilterParams(searchParams);
    
    // If no filters are provided, return cached global metadata
    if (Object.keys(filterParams).length === 0) {
      return await getGlobalMetadata();
    }
    
    // If filters are provided, calculate filtered metadata
    const allMandates = await DataService.getMandates();
    
    // Set a high limit to get all filtered results for accurate metadata
    const metaParams = { ...filterParams, limit: '10000' };
    const filterResult = FilterEngine.filterMandates(allMandates, metaParams);
    
    // Return filtered metadata in the expected format
    return {
      uniqueEntities: filterResult.metadata.uniqueEntitiesWithCount,
      uniqueBodies: filterResult.metadata.uniqueOrgansWithCount.map(o => o.name),
      uniqueBodiesWithCount: filterResult.metadata.uniqueOrgansWithCount,
      totalDocuments: filterResult.metadata.totalItems,
      totalEntities: filterResult.metadata.uniqueEntities,
      totalCitations: filterResult.metadata.totalCitations,
      uniqueBodiesCount: filterResult.metadata.uniqueOrgans,
      uniqueProgrammesCount: filterResult.metadata.uniqueProgrammes.length,
      uniqueProgrammes: filterResult.metadata.uniqueProgrammes,
      uniqueSubjects: filterResult.metadata.uniqueSubjects,
      yearRange: filterResult.metadata.yearRange,
      yearDistribution: filterResult.metadata.yearDistribution,
    };
  }, 'Failed to load metadata');
} 