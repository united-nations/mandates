"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Mandate, ApiResponse, Entity, Organ } from "@/types";
import { MandateList } from "@/components/mandate-list";
import { FilterControls } from "@/components/filter-controls";
import { PaginationControls } from "@/components/pagination-controls";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  FileText,
  Landmark,
  Building,
  Quote,
  ChevronUp,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react";
import { DataCard } from "@/components/data-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarAccordion } from "@/components/ui/sidebar-accordion";
import { explainerTexts } from "@/lib/explainer-texts";

import { EntityListSidebar } from "@/components/entity-list-sidebar";
import { OrganListSidebar } from "@/components/organ-list-sidebar";
import { CrossCitationsSidebar } from "@/components/cross-citations-sidebar";
import { useFilters } from "@/contexts/FilterContext";
import { Button } from "@/components/ui/button";
import { FILTER_PARAMS, FILTER_ONLY_PARAMS } from "@/lib/filter-constants";

interface MandateExplorerProps {
  // Explicit filters for entity/organ pages
  entityFilter?: string;
  organFilter?: string;
  // Page type for conditional rendering
  pageType: "main" | "entity" | "organ";
  // Callback to pass entity details to parent component
  onEntityDetailsLoaded?: (entities: Entity[]) => void;
  // Callback to pass organ details to parent component
  onOrganDetailsLoaded?: (organs: Organ[]) => void;
  // Callback to pass API data to parent component
  onDataLoaded?: (data: ApiResponse) => void;
}

export function MandateExplorer({
  entityFilter,
  organFilter,
  pageType,
  onEntityDetailsLoaded,
  onOrganDetailsLoaded,
  onDataLoaded,
}: MandateExplorerProps) {
  const { filters, setFilter } = useFilters();
  const searchParams = useSearchParams();

  // Helper function to extract URL parameters using constants
  const getUrlParam = (key: string, defaultValue: string = "") => {
    const value = searchParams.get(key);
    if (key === "sort_by" && !value) {
      return searchParams.get("keyword") ? "default" : "citing_entities_desc";
    }
    return value || defaultValue;
  };

  // Get current URL parameters directly (this is always up-to-date)
  const currentUrlParams = Object.fromEntries(
    FILTER_PARAMS.map((param) => [
      param,
      getUrlParam(
        param,
        param === "page" ? "1" : param === "limit" ? "10" : "",
      ),
    ]),
  ) as Record<(typeof FILTER_PARAMS)[number], string>;

  // Simplified state management - only what's needed for UI
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [originalYearDistribution, setOriginalYearDistribution] = useState<{
    [year: string]: number;
  } | null>(null);

  // Data card popover states (preserved for exact same behavior)
  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false);
  const [unOrgansPopover, setUnOrgansPopover] = useState(false);
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false);
  const [citationsPopover, setCitationsPopover] = useState(false);

  // Get current page and page size from URL params directly (always up-to-date)
  const currentPage = Number(currentUrlParams.page);
  const pageSize = Number(currentUrlParams.limit);
  const sortBy = currentUrlParams.sort_by;

  // Fetch data when URL parameters change - use URL params directly
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();

        // For entity/organ pages: only use implicit filter + any additional URL filters from within-page filtering
        if (pageType === "entity" && entityFilter) {
          params.set("entity", entityFilter);
        } else if (pageType === "organ" && organFilter) {
          params.set("organ", organFilter);
        }

        // Add URL-based filters directly from searchParams (not from context)
        const urlFilters = Object.fromEntries(
          FILTER_ONLY_PARAMS.map((param) => [param, currentUrlParams[param]]),
        ) as Record<(typeof FILTER_ONLY_PARAMS)[number], string>;

        Object.entries(urlFilters).forEach(([key, value]) => {
          if (value && value !== "all") {
            // Skip entity/organ filters if we already set them implicitly above
            if (
              (pageType === "entity" && key === "entity") ||
              (pageType === "organ" && key === "organ")
            ) {
              return;
            }
            params.set(key, value);
          }
        });

        // Set defaults using current values
        params.set("page", currentPage.toString());
        params.set("limit", pageSize.toString());
        params.set("sort_by", sortBy);

        const response = await fetch(`/api/mandates?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        setApiData(data);

        // Store original year distribution if no year filters are currently applied
        const hasYearFilters =
          currentUrlParams.start_year || currentUrlParams.end_year;
        if (
          !hasYearFilters &&
          data.filterOptions?.yearDistribution &&
          !originalYearDistribution
        ) {
          setOriginalYearDistribution(data.filterOptions.yearDistribution);
        }

        // Call callback to pass entity details to parent component
        if (onEntityDetailsLoaded && data.reference?.entities) {
          onEntityDetailsLoaded(data.reference.entities);
        }

        // Call callback to pass organ details to parent component
        if (onOrganDetailsLoaded && data.reference?.organs) {
          onOrganDetailsLoaded(data.reference.organs);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    searchParams,
    currentPage,
    pageSize,
    sortBy,
    entityFilter,
    organFilter,
    pageType,
  ]);

  // Handle sort change (preserved exact function)
  const handleSortChange = useCallback(
    (value: string) => {
      setFilter("sort_by", value);
    },
    [setFilter],
  );

  // Loading skeleton (now using reusable component)
  const LoadingSkeletonComponent = () => (
    <LoadingSkeleton variant="list" count={4} />
  );

  // Extract data for components (with same fallbacks as before)
  const mandates = apiData?.mandates || [];
  const pagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    totalPages: 0,
    totalItems: 0,
  };
  const counts = apiData?.counts || {
    totalDocuments: 0,
    totalEntities: 0,
    totalOrgans: 0,
    totalCitations: 0,
  };
  const filterOptions = apiData?.filterOptions || {
    programmes: [],
    subjects: [],
    yearRange: { min: 2000, max: 2024 },
    yearDistribution: {},
  };
  const allOrgans = apiData?.reference.organs || [];
  const allEntities = apiData?.reference.entities || [];
  const crossCitations = apiData?.sidebar.crossCitations || [];

  // Data cards section (preserved exact JSX structure and logic)
  const dataCardsSection = (
    <>
      <DataCard
        title={explainerTexts.dataCards.sourceDocuments.title}
        value={counts.totalDocuments}
        icon={FileText}
        description={explainerTexts.dataCards.sourceDocuments.description}
        isOpen={sourceDocumentsPopover}
        onOpenChange={setSourceDocumentsPopover}
        isLoading={isLoading}
      />
      {/* Always show organs card; on organ page show short name, else show count */}
      <DataCard
        title={
          pageType === "organ"
            ? "UN Organ / Body"
            : explainerTexts.dataCards.unOrgans.title
        }
        value={pageType === "organ" ? organFilter || "" : counts.totalOrgans}
        icon={Landmark}
        description={explainerTexts.dataCards.unOrgans.description}
        isOpen={unOrgansPopover}
        onOpenChange={setUnOrgansPopover}
        isLoading={isLoading && pageType !== "organ"}
      />
      {/* Always show entity card; on entity page show short name, else show count */}
      <DataCard
        title={
          pageType === "entity"
            ? "Entity"
            : explainerTexts.dataCards.unEntities.title
        }
        value={
          pageType === "entity" ? entityFilter || "" : counts.totalEntities
        }
        icon={Building}
        description={explainerTexts.dataCards.unEntities.description}
        isOpen={unEntitiesPopover}
        onOpenChange={setUnEntitiesPopover}
        isLoading={isLoading && pageType !== "entity"}
      />
      <DataCard
        title={
          pageType === "entity"
            ? explainerTexts.dataCards.citationsByEntity.title
            : explainerTexts.dataCards.citations.title
        }
        value={counts.totalCitations}
        icon={Quote}
        description={
          pageType === "entity"
            ? explainerTexts.dataCards.citationsByEntity.description
            : explainerTexts.dataCards.citations.description
        }
        isOpen={citationsPopover}
        onOpenChange={setCitationsPopover}
        isLoading={isLoading}
      />
    </>
  );

  return (
    <div>
      {/* Summary Cards - horizontal scroll on mobile, grid on larger screens */}
      <section
        aria-labelledby="summary-heading"
        className="overflow-x-auto sm:overflow-x-visible scroll-smooth -mx-4 sm:mx-0"
        style={{
          scrollSnapType: "x mandatory",
          scrollPadding: "0 1rem",
        }}
      >
        <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 min-w-max sm:min-w-0 px-4 sm:px-0">
          {dataCardsSection}
        </div>
      </section>

      <div>
        <div className="mt-6 pt-4">
          {/* Collapsible sidebars for smaller screens (preserved exact logic) */}
          {pageType === "main" && (
            <SidebarAccordion
              items={[
                {
                  id: "organs",
                  title: "UN Organs",
                  icon: Landmark,
                  content: (
                    <OrganListSidebar
                      organs={apiData?.sidebar?.organs || []}
                      allOrgans={allOrgans.map((organ) => ({
                        short: organ.short,
                        long: organ.long,
                        count: 0,
                      }))}
                      isLoading={isLoading}
                      hideHeader={true}
                      borderless={true}
                      pageType="main"
                    />
                  ),
                },
                {
                  id: "entities",
                  title: "UN Entities",
                  icon: Building,
                  content: (
                    <EntityListSidebar
                      entities={apiData?.sidebar?.entities || []}
                      allEntities={allEntities.map((entity) => ({
                        entity: entity.entity,
                        entity_long: entity.entity_long,
                        count: 0,
                      }))}
                      isLoading={isLoading}
                      hideHeader={true}
                      borderless={true}
                      pageType="main"
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Collapsible sidebars for entity pages */}
          {pageType === "entity" && (
            <SidebarAccordion
              items={[
                {
                  id: "organs",
                  title: "UN Organs",
                  icon: Landmark,
                  content: (
                    <OrganListSidebar
                      organs={apiData?.sidebar?.organs || []}
                      allOrgans={allOrgans}
                      isLoading={isLoading}
                      pageType={pageType}
                      entityFilter={entityFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
                {
                  id: "cross-citations",
                  title: "Cross-Citations",
                  icon: LinkIcon,
                  content: (
                    <CrossCitationsSidebar
                      crossCitations={crossCitations}
                      allEntities={allEntities}
                      isLoading={isLoading}
                      pageType={pageType}
                      entityFilter={entityFilter}
                      organFilter={organFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Collapsible sidebars for organ pages */}
          {pageType === "organ" && (
            <SidebarAccordion
              items={[
                {
                  id: "entities",
                  title: "UN Entities",
                  icon: Building,
                  content: (
                    <EntityListSidebar
                      entities={apiData?.sidebar?.entities || []}
                      allEntities={allEntities}
                      isLoading={isLoading}
                      pageType={pageType}
                      organFilter={organFilter}
                      hideHeader={true}
                      borderless={true}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* Main content with mandates list and sidebars */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main mandates content */}
            <div className="flex-1 min-w-0">
              {/* Section Title with Icon and Sort Controls + FilterControls (preserved exact JSX) */}
              <div className="mb-4">
                <div className="flex items-center gap-3 justify-between flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-un-blue" />
                    <h2 className="text-2xl font-bold tracking-tight">
                      {explainerTexts.dataCards.sectionTitle}
                      {/* Detail page title: cited by/issued by (preserved exact logic) */}
                      {pageType === "entity" && <> cited by {entityFilter}</>}
                      {pageType === "organ" && <> issued by {organFilter}</>}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                      className="shrink-0 flex items-center gap-2 px-2 text-left text-slate-600 hover:text-slate-900 hover:bg-transparent whitespace-nowrap"
                    >
                      <span className="text-sm font-medium">
                        {showAdvancedSearch
                          ? "Hide Advanced Filters"
                          : "Show Advanced Filters"}
                      </span>
                      {showAdvancedSearch ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[80px]" id="sort-by">
                        Sort
                      </SelectTrigger>
                      <SelectContent align="end">
                        {filters.keyword ? (
                          <SelectItem value="default">
                            Search Relevance
                          </SelectItem>
                        ) : null}
                        <SelectItem value="citing_entities_desc">
                          Number of citing entities ↓
                        </SelectItem>
                        <SelectItem value="citing_entities_asc">
                          Number of citing entities ↑
                        </SelectItem>
                        <SelectItem value="citations_desc">
                          Citations ↓
                        </SelectItem>
                        <SelectItem value="citations_asc">
                          Citations ↑
                        </SelectItem>
                        <SelectItem value="year_desc">Year ↓</SelectItem>
                        <SelectItem value="year_asc">Year ↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <FilterControls
                  programmeOptions={filterOptions.programmes}
                  subjectOptions={filterOptions.subjects}
                  yearRange={filterOptions.yearRange}
                  yearDistribution={filterOptions.yearDistribution}
                  originalYearDistribution={
                    originalYearDistribution || undefined
                  }
                  showAdvancedSearch={showAdvancedSearch}
                  setShowAdvancedSearch={setShowAdvancedSearch}
                  entitiesData={allEntities}
                  allOrgans={allOrgans}
                  entityFilter={entityFilter}
                  organFilter={organFilter}
                  pageType={pageType}
                />
              </div>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Mandates List (preserved exact structure) */}
                <div className="flex-1">
                  <div className="mb-6">
                    {isLoading ? (
                      <LoadingSkeletonComponent />
                    ) : (
                      <>
                        <MandateList
                          mandates={mandates}
                          organsData={allOrgans}
                          entitiesData={allEntities}
                        />
                        <div className="mt-4">
                          <PaginationControls
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            pageSize={pageSize}
                            totalItems={pagination.totalItems}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar - render internally based on page type */}
            <div className="hidden lg:block lg:w-80 shrink-0 space-y-6">
              {/* Entity pages show cross-citations and organs */}
              {pageType === "entity" && (
                <>
                  <OrganListSidebar
                    organs={apiData?.sidebar?.organs || []}
                    allOrgans={allOrgans}
                    isLoading={isLoading}
                    pageType={pageType}
                    entityFilter={entityFilter}
                  />
                  <CrossCitationsSidebar
                    crossCitations={crossCitations}
                    allEntities={allEntities}
                    isLoading={isLoading}
                    pageType={pageType}
                    entityFilter={entityFilter}
                    organFilter={organFilter}
                  />
                </>
              )}

              {/* Organ pages show entities only */}
              {pageType === "organ" && (
                <EntityListSidebar
                  entities={apiData?.sidebar?.entities || []}
                  allEntities={allEntities}
                  isLoading={isLoading}
                  pageType={pageType}
                  organFilter={organFilter}
                />
              )}

              {/* Main page shows entities and organs */}
              {pageType === "main" && (
                <>
                  <OrganListSidebar
                    organs={apiData?.sidebar?.organs || []}
                    allOrgans={allOrgans}
                    isLoading={isLoading}
                    pageType={pageType}
                  />
                  <EntityListSidebar
                    entities={apiData?.sidebar?.entities || []}
                    allEntities={allEntities}
                    isLoading={isLoading}
                    pageType={pageType}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
