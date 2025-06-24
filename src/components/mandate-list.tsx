'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EntityName } from './ui/entity-name';
import { FileText, Calendar, Landmark, Target, Info, Search } from 'lucide-react';
import { explainerTexts } from '@/lib/explainer-texts';

interface Organ {
  short: string;
  long: string;
}


interface MandateListProps {
  mandates: Mandate[];
  onMandateClick: (mandate: Mandate) => void;
  organsData: Organ[];
}

const EntityBadges = ({ entities }: { entities: string[] }) => {
  const validEntities = entities.filter(entity => entity !== null).sort();

  if (validEntities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {validEntities.map(entity => (
          <Badge key={entity} variant="secondary" className="font-bold text-xs !bg-un-blue/75 !text-white hover:!bg-un-blue/60">
            <EntityName entityName={entity} showUnderline={false} />
          </Badge>
      ))}
    </div>
  );
};

// Component to safely render HTML content with highlighting
const HighlightedContent = ({ content, fallback }: { content?: string; fallback: string }) => {
  if (content && content !== fallback) {
    return (
      <span dangerouslySetInnerHTML={{ __html: content }} />
    );
  }
  return <span>{fallback}</span>;
};

export function MandateList({ mandates, onMandateClick, organsData }: MandateListProps) {
  // Helper function to find organ data by matching both short and long names
  const findOrganData = (organName: string): Organ | undefined => {
    return organsData.find(organ => 
      organ.short === organName || organ.long === organName
    );
  };

  // Helper function to get the long name for display
  const getOrganLongName = (organName: string): string => {
    const organData = findOrganData(organName);
    return organData ? organData.long : organName;
  };

  // Helper function to check if mandate is referenced in Plan Outline
  const isReferencedInPlanOutline = (mandate: Mandate): boolean => {
    return mandate.citation_info?.some(citation => 
      citation.origin_document === 'PPB 2026/Plan Outline'
    ) || false;
  };

  // Helper function to get citation display text
  const getCitationDisplayText = (mandate: Mandate): string => {
    const isPlanOutline = isReferencedInPlanOutline(mandate);
    const hasEntities = mandate.num_entities > 0;
    
    if (isPlanOutline && !hasEntities) {
      return "Referenced in Plan Outline, but not cited by any entities";
    }
    
    return `Cited ${mandate.num_citations} time${mandate.num_citations !== 1 ? 's' : ''} by ${mandate.num_entities} entit${mandate.num_entities !== 1 ? 'ies' : 'y'}`;
  };

  // Helper function to truncate document symbol if too long
  const getTruncatedSymbol = (symbol: string): string => {
    if (symbol.length > 20) {
      return symbol.substring(0, 20) + '...';
    }
    return symbol;
  };
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {mandates.map((mandate, index) => {
          const hasSearchMatches = (mandate as any).match_details && (mandate as any).match_details.length > 0;
          const searchScore = (mandate as any).searchScore || 0;
          const displaySymbol = mandate.full_document_symbol || mandate.symbol;
          
          return (
            <motion.div
              key={mandate.full_document_symbol || mandate.document_symbol}
              className={`relative p-3 sm:p-4 rounded-lg bg-[#F6F7F8] hover:bg-un-blue/10 transition-all cursor-pointer ${
                hasSearchMatches ? 'ring-2 ring-primary/20 bg-accent/5' : ''
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onMandateClick(mandate)}
            >
              <div className="flex flex-col gap-3">
                {/* Details button - positioned absolute, smaller on mobile */}
                <Button 
                  variant="details"
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 h-auto !bg-trout !text-white hover:!bg-trout/90"
                >
                  <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Details</span>
                </Button>

                <div className="pr-20 sm:pr-32">
                  <h3 className="text-sm sm:text-base font-semibold leading-tight break-words hyphens-auto">
                    <HighlightedContent 
                      content={(mandate as any).highlightedTitle || (mandate as any).highlightedFields?.title} 
                      fallback={
                        mandate.body === "Security Council" && mandate.uniform_title && mandate.uniform_title.length > 0
                          ? mandate.uniform_title[0]
                          : mandate.title || mandate.description || 'Untitled'
                      } 
                    />
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium">{getTruncatedSymbol(displaySymbol)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">{displaySymbol}</p>
                        <p className="text-xs text-muted-foreground">{explainerTexts.mandateList.documentSymbol}</p>
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
                          <p className="font-medium">{explainerTexts.mandateList.issuingOrgan.title}</p>
                          <p>{getOrganLongName(mandate.body)}</p>
                          <p className="text-xs text-muted-foreground">{explainerTexts.mandateList.issuingOrgan.description}</p>
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
                
                {/* Match details and highlighted content */}
                {/* {hasSearchMatches && (
                  <div className="text-sm space-y-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-medium text-muted-foreground">Matches found in:</span>
                      {mandate.match_details!.map((detail, idx) => (
                        <Badge key={idx} variant="outline">
                          {detail}
                        </Badge>
                      ))}
                    </div>
                    
                    {mandate.highlightedFields && Object.entries(mandate.highlightedFields).map(([field, content]) => {
                      if (field === 'title') return null; // Already shown in title
                      if (field === 'ai_summary') return null; // Skip AI summary field
                      
                      // Ensure content is a string
                      const contentStr = typeof content === 'string' ? content : '';
                      
                      // Truncate if too long
                      const shouldTruncate = contentStr.length > 200;
                      const displayContent = shouldTruncate 
                        ? contentStr.substring(0, 200) + '...' 
                        : contentStr;
                      
                      // Create better field names for display
                      const getFieldDisplayName = (fieldName: string) => {
                        const displayNames: { [key: string]: string } = {
                          'subject_headings': 'Subject Headings',
                          'abstract': 'Abstract',
                          'issuing_body': 'Issuing Body',
                          'entities': 'Entities',
                          'priority_area': 'Priority Area',
                          'pillar': 'Pillar',
                          'programme_titles': 'Programme Titles',
                          'section_titles': 'Section Titles',
                          'descriptions': 'Descriptions',
                          'operative_paragraphs': 'Operative Paragraphs',
                          'note': 'Notes',
                          'subtitle': 'Subtitle',
                          'uniform_title': 'Uniform Title',
                          'translated_title': 'Translated Title'
                        };
                        return displayNames[fieldName] || fieldName.replace('_', ' ');
                      };
                      
                      return (
                        <div key={field} className="text-sm">
                          <span className="font-medium text-muted-foreground">{getFieldDisplayName(field)}:</span>{' '}
                          <span dangerouslySetInnerHTML={{ __html: displayContent }} />
                        </div>
                      );
                    })}
                  </div>
                )} */}

                {/* Citations and Entities */}
                {(mandate.num_citations > 0 || (mandate.entities && mandate.entities.length > 0)) && (
                  <div className="pt-2 border-t border-border/30">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs sm:text-sm font-medium mb-2 text-muted-foreground cursor-help">
                          {getCitationDisplayText(mandate)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{explainerTexts.mandateList.citationCount}</p>
                      </TooltipContent>
                    </Tooltip>
                    <EntityBadges entities={mandate.entities || []} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}