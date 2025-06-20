'use client';

import { useState, useMemo } from 'react';
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
import { FileText, Building, Calendar, Link, Users, FileCheck, Target, Columns, Sparkles } from 'lucide-react';
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

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    'ppb2026': 'Proposed Programme Budget for 2026',
    'PPB 2026': 'Proposed Programme Budget for 2026',
    'pko': 'Budget of Peacekeeping Operations 2025/26',
    'PPB 2026/Plan Outline': 'Plan Outline',
  };

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
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl w-full light flex flex-col max-h-[85vh] p-6" 
      >
        {/* Header */}
        <div className="border-b pb-4">
            <p className="text-sm font-medium text-muted-foreground">Mandate Document</p>
            <DialogTitle className="text-2xl font-bold mt-1">{mandate.title || mandate.description}</DialogTitle>
            <DialogDescription className="mt-1">
                {displaySymbol}
            </DialogDescription>
            {pdfUrl && (
                <Button asChild className="mt-4">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        View PDF
                    </a>
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
                  {mandate.collection_level3 && mandate.collection_level3.length > 0 ? <Badge variant="stronger" className="text-xs">{mandate.collection_level3[0]}</Badge> : <span className="text-muted-foreground">—</span>}
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
                      <div key={shortName} className="flex items-center gap-2">
                        <span className="w-8 text-right text-muted-foreground">{data.count}x</span>
                        <Badge variant="secondary" className="text-xs">{shortName}</Badge>
                        <span className="text-muted-foreground">{data.longName}</span>
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
                        <span className="w-8 text-right text-muted-foreground">{count}x</span>
                        <Badge variant="secondary" className="text-xs">{toTitleCase(programmeTitle)}</Badge>
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