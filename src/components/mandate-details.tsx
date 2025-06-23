'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Mandate, CitationInfo } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { FileText, Building, Calendar, Link, Users, FileCheck, Target, Columns, Sparkles, ChevronLeft } from 'lucide-react';
import { EntityName } from './ui/entity-name';
import { TooltipProvider } from './ui/tooltip';

interface MandateDetailsProps {
  mandate: Mandate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs']);
  
  return str.replace(/\w+/g, (word, index) => {
    const lowerWord = word.toLowerCase();
    if (index > 0 && smallWords.has(lowerWord)) {
      return lowerWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

const MetadataItem = ({ label, children }: { label: React.ReactNode, children: React.ReactNode }) => (
    <div className="flex items-baseline text-xs py-1">
        <div className="w-28 font-medium text-muted-foreground flex-shrink-0">{label}</div>
        <div className="flex-grow">{children}</div>
    </div>
);

export function MandateDetails({ mandate, open, onOpenChange }: MandateDetailsProps) {
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    'ppb2026': 'Proposed Programme Budget for 2026',
    'PPB 2026': 'Proposed Programme Budget for 2026',
    'pko': 'Budget of Peacekeeping Operations 2025/26',
    'PPB 2026/Plan Outline': 'Plan Outline',
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    
    // Hide swipe hint on first interaction
    if (showSwipeHint) {
      setShowSwipeHint(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    
    // Only start dragging if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const threshold = 100; // Minimum swipe distance
    
    // Swipe right to close (left-to-right swipe)
    if (deltaX > threshold) {
      onOpenChange(false);
    }
    
    isDragging.current = false;
  };

  // Auto-hide swipe hint after 3 seconds
  useEffect(() => {
    if (open && showSwipeHint) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, showSwipeHint]);

  // Reset swipe hint when dialog opens
  useEffect(() => {
    if (open) {
      setShowSwipeHint(true);
    }
  }, [open]);

  const entityCounts = useMemo(() => {
    if (!mandate || !mandate.citation_info) return [];

    const counts: { [key: string]: { longName: string; count: number } } = {};

    mandate.citation_info.forEach(citation => {
        const shortName = citation.entity;
        const longName = citation.entity_long || citation.entity;
        if (shortName) {
            if (!counts[shortName]) {
                counts[shortName] = { longName, count: 0 };
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
  }, [mandate]);

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
        ref={contentRef}
        className="max-w-5xl w-full light flex flex-col max-h-[85vh] p-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="border-b pb-4">
            {/* Mobile swipe indicator - only show on small screens */}
            {showSwipeHint && (
              <div className="flex items-center justify-between mb-2 sm:hidden animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ChevronLeft className="h-3 w-3" />
                  <span>Swipe right to close</span>
                </div>
                <div className="w-8 h-1 bg-muted rounded-full"></div>
              </div>
            )}
            
            <p className="text-sm font-medium text-muted-foreground">Mandate Document</p>
            <DialogTitle className="text-2xl font-bold mt-1">
              {mandate.body === "Security Council" && mandate.uniform_title && mandate.uniform_title.length > 0
                ? mandate.uniform_title[0]
                : mandate.title || mandate.description}
            </DialogTitle>
            <DialogDescription className="mt-1">
                {displaySymbol}
            </DialogDescription>
            {pdfUrl ? (
                <Button asChild className="mt-4">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        View PDF
                    </a>
                </Button>
            ) : (
                <Button disabled className="mt-4 inline-flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View PDF
                </Button>
            )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-grow overflow-y-auto">
            <div className="space-y-6 pr-2">

              {/* Compact Metadata List */}
              <div className="space-y-1 p-3 border rounded-lg">
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
                    <div className="flex flex-wrap gap-1">
                      {mandate.subject_headings.map((heading, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal">
                          {toTitleCase(heading)}
                        </Badge>
                      ))}
                    </div>
                  </MetadataItem>
                )}
              </div>

              {/* AI Summary */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Document Summary</span>
                </h3>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    Document summaries and operative paragraphs are coming soon.
                  </p>
                </div>
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
                      <div key={shortName} className="flex items-start gap-2 sm:items-center">
                        <span className="w-8 text-right text-muted-foreground font-mono flex-shrink-0 mt-0.5 sm:mt-0">{data.count}x</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                          <Badge variant="secondary" className="text-xs w-fit">{shortName}</Badge>
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
                      <div key={programmeTitle} className="flex items-start gap-2 sm:items-center">
                        <span className="w-8 text-right text-muted-foreground font-mono flex-shrink-0 mt-0.5 sm:mt-0">{count}x</span>
                        <div className="min-w-0 flex-1">
                          <Badge variant="secondary" className="text-xs w-fit">{toTitleCase(programmeTitle)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}