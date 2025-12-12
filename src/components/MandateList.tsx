'use client'

import type { Mandate } from '@/types'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EntityName } from './EntityName'
import {
  FileText,
  Calendar,
  Landmark,
  Info,
} from 'lucide-react'
import { explainerTexts } from '@/lib/explainer-texts'
import Link from 'next/link'

interface Organ {
  short: string
  long: string
}

interface Entity {
  entity: string
  entity_long: string
}

interface MandateListProps {
  mandates: Mandate[]
  organsData: Organ[]
  entitiesData: Entity[]
}

const EntityBadges = ({
  entities,
  entitiesData,
}: {
  entities: string[]
  entitiesData: Entity[]
}) => {
  const validEntities = entities.filter((entity) => entity !== null).sort()

  if (validEntities.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {validEntities.map((entity) => (
        <Link
          key={entity}
          href={`/entity/${encodeURIComponent(entity)}`}
          prefetch={false}
        >
          <Badge
            variant="secondary"
            className="cursor-pointer border-0 bg-un-blue/75! text-xs font-bold text-white! transition-colors hover:bg-un-blue/60!"
          >
            <EntityName
              entityName={entity}
              entityLong={
                entitiesData.find((e) => e.entity === entity)?.entity_long
              }
              showUnderline={false}
            />
          </Badge>
        </Link>
      ))}
    </div>
  )
}

// Component to safely render HTML content with highlighting
const HighlightedContent = ({
  content,
  fallback,
}: {
  content?: string
  fallback: string
}) => {
  if (content && content !== fallback) {
    return <span dangerouslySetInnerHTML={{ __html: content }} />
  }
  return <span>{fallback}</span>
}

export function MandateList({
  mandates,
  organsData,
  entitiesData,
}: MandateListProps) {
  // Helper function to find organ data by matching both short and long names
  const findOrganData = (organName: string): Organ | undefined => {
    return organsData.find(
      (organ) => organ.short === organName || organ.long === organName
    )
  }

  // Helper function to get the long name for display
  const getOrganLongName = (organName: string): string => {
    const organData = findOrganData(organName)
    return organData ? organData.long : organName
  }

  // Helper function to check if mandate is referenced in Plan Outline
  const isReferencedInPlanOutline = (mandate: Mandate): boolean => {
    return (
      mandate.citation_info?.some(
        (citation) => citation.origin_document === 'PPB 2026/Plan Outline'
      ) || false
    )
  }

  // Helper function to get citation display text
  const getCitationDisplayText = (mandate: Mandate): string => {
    const isPlanOutline = isReferencedInPlanOutline(mandate)
    const hasEntities = mandate.num_entities > 0

    if (isPlanOutline && !hasEntities) {
      return 'Referenced in Plan Outline, but not cited by any entities'
    }

    return `Cited ${mandate.num_citations} time${mandate.num_citations !== 1 ? 's' : ''} by ${mandate.num_entities} entit${mandate.num_entities !== 1 ? 'ies' : 'y'}`
  }

  // Helper function to truncate document symbol if too long
  const getTruncatedSymbol = (symbol: string): string => {
    if (symbol.length > 20) {
      return symbol.substring(0, 20) + '...'
    }
    return symbol
  }

  // Helper function to generate mandate page URL
  const getMandateUrl = (mandate: Mandate): string => {
    // Always use full_document_symbol as the primary source of truth
    const documentSymbol = mandate.full_document_symbol
    if (!documentSymbol) {
      console.warn('Mandate missing full_document_symbol:', mandate)
      return '/mandate/unknown'
    }
    // Split by forward slash and encode each segment individually
    const segments = documentSymbol
      .split('/')
      .map((segment) => encodeURIComponent(segment))
    return `/mandate/${segments.join('/')}`
  }

  // Helper function to handle mandate click
  const handleMandateClick = (mandate: Mandate, event: React.MouseEvent) => {
    event.preventDefault()
    const url = getMandateUrl(mandate)
    const currentUrl = window.location.href

    // Store the current URL for return navigation
    sessionStorage.setItem('mandateReturnUrl', currentUrl)

    // Open the window with clean URL
    window.open(url, '_blank')
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {mandates.map((mandate, index) => {
          const hasSearchMatches =
            mandate.match_details && mandate.match_details.length > 0
          const searchScore = mandate.searchScore || 0
          const displaySymbol = mandate.full_document_symbol
          const hasHighlighting =
            mandate.highlightedFields &&
            Object.keys(mandate.highlightedFields).length > 0

          return (
            <div
              key={mandate.full_document_symbol}
              onClick={(e) => handleMandateClick(mandate, e)}
              className="block cursor-pointer"
            >
              <motion.div
                className="relative cursor-pointer rounded-lg bg-[#F6F7F8] p-3 transition-all hover:bg-un-blue/10 sm:p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex flex-col gap-3">
                  {/* Details button - positioned absolute, smaller on mobile */}
                  <div className="absolute top-2 right-2 inline-flex h-auto shrink-0 items-center gap-1 rounded bg-trout px-2 py-1 text-xs text-white sm:top-3 sm:right-3 sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm">
                    <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Details</span>
                  </div>

                  <div className="pr-20 sm:pr-32">
                    <h3 className="text-sm leading-tight font-semibold wrap-break-word hyphens-auto sm:text-base">
                      <HighlightedContent
                        content={mandate.highlightedFields?.title}
                        fallback={mandate.displayTitle || 'Untitled'}
                      />
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium">
                            <HighlightedContent
                              content={
                                mandate.highlightedFields
                                  ?.full_document_symbol
                              }
                              fallback={getTruncatedSymbol(displaySymbol)}
                            />
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{displaySymbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {explainerTexts.mandateList.documentSymbol}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {mandate.body && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Landmark className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="font-medium">{mandate.body}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {explainerTexts.mandateList.issuingOrgan.title}
                            </p>
                            <p>{getOrganLongName(mandate.body)}</p>
                            <p className="text-xs text-muted-foreground">
                              {
                                explainerTexts.mandateList.issuingOrgan
                                  .description
                              }
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {mandate.year && mandate.year !== '-' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="font-medium">{mandate.year}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{explainerTexts.mandateList.year}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Search matches in fields not normally displayed */}
                  {hasHighlighting &&
                    mandate.highlightedFields?.subject_headings && (
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">
                          Subject headings:
                        </span>{' '}
                        <span
                          className="text-slate-700"
                          dangerouslySetInnerHTML={{
                            __html:
                              mandate.highlightedFields
                                .subject_headings.length > 200
                                ? mandate.highlightedFields.subject_headings.substring(
                                    0,
                                    200
                                  ) + '...'
                                : mandate.highlightedFields
                                    .subject_headings,
                          }}
                        />
                      </div>
                    )}

                  {/* Citations and Entities */}
                  {(mandate.num_citations > 0 ||
                    (mandate.entities && mandate.entities.length > 0)) && (
                    <div className="border-t border-border/30 pt-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="mb-2 cursor-help text-xs font-medium text-muted-foreground sm:text-sm">
                            {getCitationDisplayText(mandate)}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{explainerTexts.mandateList.citationCount}</p>
                        </TooltipContent>
                      </Tooltip>
                      <EntityBadges
                        entities={mandate.entities || []}
                        entitiesData={entitiesData}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
