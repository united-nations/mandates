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

interface ParentContext {
  scrollY: number;
  viewportHeight: number;
  iframeTop: number;
}

interface MandateDetailsProps {
  mandate: Mandate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentContext: ParentContext | null;
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

const MetadataItem = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex items-start text-xs py-1">
    <p className="w-28 font-medium text-muted-foreground flex-shrink-0">{label}</p>
    <div className="flex-grow">{children}</div>
  </div>
);

export function MandateDetails({ mandate, open, onOpenChange, parentContext }: MandateDetailsProps) {
  const [isPdfVisible, setIsPdfVisible] = useState(false);

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

    return Object.entries(counts).sort(([, a], [, b]) => b.count - a.count);
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

    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [mandate]);

  if (!mandate) {
    return null;
  }
  
  const validEntities = mandate.entities ? mandate.entities.filter(e => e && e.trim()) : [];

  const dialogStyle: React.CSSProperties = {};
  
  if (parentContext) {
    const { scrollY, iframeTop, viewportHeight } = parentContext;
    dialogStyle.position = 'absolute';
    dialogStyle.top = `${scrollY + (viewportHeight / 2) - iframeTop}px`;
    dialogStyle.left = '50%';
    dialogStyle.transform = 'translate(-50%, -50%)';
    
    // Use 85% of viewport height, with min 400px and max 800px
    const calculatedHeight = Math.min(Math.max(viewportHeight * 0.85, 400), 800);
    dialogStyle.maxHeight = `${calculatedHeight}px`;
  }

  const displaySymbol = mandate.full_document_symbol || mandate.symbol;
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl w-full light flex flex-col max-h-[600px] p-4" 
        style={dialogStyle}
      >
        {/* Header */}
        <div className="border-b pb-4">
            <p className="text-sm font-medium text-muted-foreground">Mandate Document</p>
            <DialogTitle className="text-2xl font-bold mt-1">{mandate.title || mandate.description || 'Mandate Details'}</DialogTitle>
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
        <ScrollArea className="flex-grow mt-3 overflow-y-auto">
            <div className="space-y-6 pr-2">

              {/* Compact Metadata List */}
              <div className="space-y-1 p-3 border rounded-lg">
                <MetadataItem label="Organ">
                  {mandate.body ? <Badge variant="secondary" className="text-xs">{mandate.body}</Badge> : <span className="text-muted-foreground">Not available</span>}
                </MetadataItem>
                <MetadataItem label="Document Type">
                  {mandate.collection_level3 && mandate.collection_level3.length > 0 ? <Badge variant="secondary" className="text-xs">{mandate.collection_level3[0]}</Badge> : <span className="text-muted-foreground">Not available</span>}
                </MetadataItem>
                <MetadataItem label="Year">
                  {mandate.year ? <Badge variant="secondary" className="text-xs">{mandate.year}</Badge> : <span className="text-muted-foreground">Not available</span>}
                </MetadataItem>
                <MetadataItem label="Budget Document">
                  {mandate.origin_document ? <Badge variant="secondary" className="text-xs">{mandate.origin_document}</Badge> : <span className="text-muted-foreground">Not Available</span>}
                </MetadataItem>
                {mandate.subject_headings && mandate.subject_headings.length > 0 && (
                  <MetadataItem label="Subject Headings">
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
                  <span>Summary</span>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal border-primary/50 text-primary bg-primary/10">
                    <Sparkles className="h-3 w-3" />
                    AI-generated
                  </Badge>
                </h3>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    Summaries are coming soon.
                  </p>
                </div>
              </div>

              {/* Entities Mentioned */}
              {entityCounts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Entities Citing this Document ({entityCounts.reduce((sum, [, data]) => sum + data.count, 0)} total)
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
                    Programmes Citing this Document ({programmeCounts.reduce((sum, [, count]) => sum + count, 0)} total)
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {programmeCounts.map(([programmeTitle, count]) => (
                      <div key={programmeTitle} className="flex items-center gap-2">
                        <span className="w-8 text-right text-muted-foreground">{count}x</span>
                        <Badge variant="secondary" className="text-xs">{programmeTitle}</Badge>
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