import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { FilterEngine } from '@/lib/api/filter-engine';
import { ApiUtils } from '@/lib/api/api-utils';

export async function GET(request: Request) {
  return ApiUtils.handleAsync(async () => {
    // Load data
    const allMandates = await DataService.getMandates();
    
    // Parse filter parameters
    const { searchParams } = new URL(request.url);
    const filterParams = ApiUtils.parseFilterParams(searchParams);
    
    // Validate pagination
    const { page, limit } = ApiUtils.validatePagination(
      filterParams.page, 
      filterParams.limit
    );
    
    // Set validated pagination back to params
    filterParams.page = page.toString();
    filterParams.limit = limit.toString();
    
    // Apply filters
    const filterResult = FilterEngine.filterMandates(allMandates, filterParams);
    
    // Format and return response
    const response = ApiUtils.formatMandatesResponse(filterResult);
    return response;
  }, 'Failed to load mandate data');
}