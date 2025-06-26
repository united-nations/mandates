'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Mandate, CitationInfo } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';
import { FileText, Building, Calendar, Link, Users, FileCheck, Target, Columns, Sparkles, X } from 'lucide-react';
import { EntityName } from './ui/entity-name';
import { TooltipProvider } from './ui/tooltip';
import { toTitleCase } from '@/lib/utils';

interface MandateDetailsProps {
  mandate: Mandate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEntities?: { entity: string; entity_long: string }[];
  onEntityChange?: (entityName: string) => void;
}

const MetadataItem = ({ label, children }: { label: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-baseline text-xs py-1">
        <div className="w-28 font-medium text-muted-foreground flex-shrink-0 pr-3">{label}</div>
        <div className="flex-grow">{children}</div>
    </div>
);

export function MandateDetails({ mandate, open, onOpenChange, allEntities = [], onEntityChange }: MandateDetailsProps) {
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum distance for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Close dialog on right swipe
    if (isRightSwipe) {
      onOpenChange(false);
    }
  };

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    'ppb2026': 'Proposed Programme Budget for 2026',
    'PPB 2026': 'Proposed Programme Budget for 2026',
    'pko': 'Budget of Peacekeeping Operations 2025/26',
    'PPB 2026/Plan Outline': 'Plan Outline',
  };

  // Create entity lookup function
  const getEntityLongName = useCallback((shortName: string): string => {
    const entity = allEntities.find(e => e.entity === shortName);
    return entity?.entity_long || shortName;
  }, [allEntities]);

  const entityCounts = useMemo(() => {
    if (!mandate || !mandate.citation_info) return [];

    const counts: { [key: string]: { longName: string; count: number } } = {};

    mandate.citation_info.forEach(citation => {
        const shortName = citation.entity;
        if (shortName) {
            if (!counts[shortName]) {
                // Use lookup function instead of citation data
                counts[shortName] = { 
                  longName: getEntityLongName(shortName), 
                  count: 0 
                };
            }
            counts[shortName].count++;
        }
    });

    return Object.entries(counts).sort(([shortNameA, dataA], [shortNameB, dataB]) => {
      if (dataB.count !== dataA.count) {
        return dataB.count - dataA.count;
      }
      return shortNameA.localeCompare(shortNameB);
    });
  }, [mandate, getEntityLongName]);

  const programmeCounts = useMemo(() => {
    if (!mandate || !mandate.citation_info) return [];

    const counts: { [key: string]: number } = {};

    mandate.citation_info.forEach(citation => {
      const programmeTitle = citation.programme_title;
      if (programmeTitle) {
        if (!counts[programmeTitle]) {
          counts[programmeTitle] = 0;
        }
        counts[programmeTitle]++;
      }
    });

    return Object.entries(counts).sort(([titleA, countA], [titleB, countB]) => {
      if (countB !== countA) {
        return countB - countA;
      }
      return titleA.localeCompare(titleB);
    });
  }, [mandate]);

  const budgetDocuments = useMemo(() => {
    if (!mandate || !mandate.citation_info) return [];
    const uniqueDocs = new Set<string>();
    mandate.citation_info.forEach(citation => {
      if (citation.origin_document) {
        uniqueDocs.add(citation.origin_document);
      }
    });
    return Array.from(uniqueDocs);
  }, [mandate]);

  if (!mandate) {
    return null;
  }
  
  const hasSubjects = mandate.subject_headings && mandate.subject_headings.length > 0;
  const displaySymbol = mandate.full_document_symbol || mandate.symbol;
  const pdfUrl = mandate.link;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full md:max-w-5xl light flex flex-col h-screen md:max-h-[85vh] md:h-auto md:p-6 px-3 pt-20 pb-3 md:m-4 m-0 md:rounded-lg rounded-none focus:outline-none focus:ring-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="border-b pr-12 pb-2 md:pb-4">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Mandate Document</p>
            <DialogTitle className="text-lg md:text-2xl font-bold mt-1 leading-tight">
              {mandate.body === "Security Council" && mandate.uniform_title && mandate.uniform_title.length > 0
                ? mandate.uniform_title[0]
                : mandate.title || mandate.description}
            </DialogTitle>
            <DialogDescription className="mt-0.5 md:mt-1 text-xs md:text-sm">
                {displaySymbol}
            </DialogDescription>
            {pdfUrl ? (
                <Button asChild className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm bg-un-blue text-white hover:bg-un-blue/90 transition-colors">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 md:gap-2">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        View PDF
                    </a>
                </Button>
            ) : (
                <Button disabled variant="primary" className="mt-1.5 md:mt-4 h-7 md:h-10 text-xs md:text-sm inline-flex items-center gap-1.5 md:gap-2">
                    <FileText className="h-3 w-3 md:h-4 md:w-4" />
                    View PDF
                </Button>
            )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto overflow-x-hidden">
            <div className="space-y-4 pr-2">

              {/* AI Summary */}
              <div className="space-y-1">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Document Summary</span>
                </h3>
              </div>

              {/* Compact Metadata List */}
              <div className="space-y-1 rounded-lg">
                <MetadataItem label="Organ">
                  {mandate.body ? <Badge variant="stronger" className="text-xs">{mandate.body}</Badge> : <span className="text-muted-foreground">—</span>}
                </MetadataItem>
                <MetadataItem label="Document Type">
                  {mandate.type ? <Badge variant="stronger" className="text-xs">{mandate.type}</Badge> : <span className="text-muted-foreground">—</span>}
                </MetadataItem>
                <MetadataItem label="Year">
                  {mandate.year ? <Badge variant="stronger" className="text-xs">{mandate.year}</Badge> : <span className="text-muted-foreground">—</span>}
                </MetadataItem>
                <MetadataItem label="Budget Document">
                  {budgetDocuments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {budgetDocuments.map((doc, index) => {
                        const displayName = budgetDocumentDisplayNames[doc] || doc;
                        return (
                          <Badge key={index} variant="stronger" className="text-xs">
                            {displayName}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </MetadataItem>
                {mandate.subject_headings && mandate.subject_headings.length > 0 && (
                  <MetadataItem 
                    label={
                      <a href="https://metadata.un.org/thesaurus/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                        UN Library Subjects
                      </a>
                    }
                  >
                    <div className="flex flex-wrap gap-1 pt-2">
                      {mandate.subject_headings.map((heading, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal !border-un-blue">
                          {toTitleCase(heading)}
                        </Badge>
                      ))}
                    </div>
                  </MetadataItem>
                )}
              </div>

              {/* AI Summary Content */}
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  Document summaries and operative paragraphs are coming soon.
                </p>
              </div>

              {/* Entities Mentioned */}
              {entityCounts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Entities Citing this Document ({entityCounts.length} total)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {entityCounts.map(([shortName, data]) => (
                      <div key={shortName} className="flex gap-2">
                        <span className="text-muted-foreground font-mono flex-shrink-0 leading-[1.5] py-1">{data.count}x</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                          <Badge 
                            variant="secondary" 
                            className="text-xs w-fit px-2 py-1 !bg-un-blue !text-white hover:!bg-un-blue/90 cursor-pointer transition-colors"
                            onClick={() => {
                              // Open filtered results in a new window
                              const url = new URL(window.location.href);
                              url.searchParams.set('entity', shortName);
                              window.open(url.toString(), '_blank');
                            }}
                          >
                            {shortName}
                          </Badge>
                          <span className="text-muted-foreground break-words">{data.longName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Programme Counts */}
              {programmeCounts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Programmes Citing this Document ({programmeCounts.length} total)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {programmeCounts.map(([programmeTitle, count]) => (
                      <div key={programmeTitle} className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono flex-shrink-0">{count}x</span>
                        <div className="min-w-0 flex-1">
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-2 py-1 whitespace-normal leading-relaxed inline-block max-w-full"
                          >
                            {toTitleCase(programmeTitle)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}