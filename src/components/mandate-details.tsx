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
import { FileText, Building, Calendar, Link, Users, FileCheck, List, Target, Columns, Sparkles } from 'lucide-react';
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

interface HierarchicalCitation {
  programme: string | null;
  programme_title: string | null;
  entities: {
    [entityName: string]: {
      subprogrammes: {
        [subprogramme: string]: number;
      };
      total: number;
    };
  };
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

  const hierarchicalCitations = useMemo(() => {
    if (!mandate || !mandate.citation_info) return {};

    const grouped: { [key: string]: HierarchicalCitation } = {};

    mandate.citation_info.forEach((citation: CitationInfo) => {
      const programmeDisplay = citation.programme && citation.programme_title 
        ? `${citation.programme} - ${citation.programme_title}`
        : citation.programme_title || citation.programme?.toString() || 'No Programme';
      const programmeKey = programmeDisplay;
      const entityName = citation.entity_long || citation.entity || 'Unknown Entity';
      const subprogramme = citation['sub-programme'] || 'No Subprogramme';

      if (!grouped[programmeKey]) {
        grouped[programmeKey] = {
          programme: citation.programme?.toString() || null,
          programme_title: citation.programme_title || null,
          entities: {}
        };
      }

      if (!grouped[programmeKey].entities[entityName]) {
        grouped[programmeKey].entities[entityName] = {
          subprogrammes: {},
          total: 0
        };
      }

      if (!grouped[programmeKey].entities[entityName].subprogrammes[subprogramme]) {
        grouped[programmeKey].entities[entityName].subprogrammes[subprogramme] = 0;
      }

      grouped[programmeKey].entities[entityName].subprogrammes[subprogramme]++;
      grouped[programmeKey].entities[entityName].total++;
    });

    return grouped;
  }, [mandate]);

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
  }

  const displaySymbol = mandate.full_document_symbol || mandate.symbol;
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full light flex flex-col max-h-[600px] p-4" style={parentContext ? dialogStyle : undefined}>
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
            <div className="flex-grow">
                <p className="text-sm font-medium text-muted-foreground">Mandate Document</p>
                <DialogTitle className="text-2xl font-bold mt-1">{mandate.title || 'Mandate Details'}</DialogTitle>
                <DialogDescription className="mt-1">
                    {displaySymbol}
                </DialogDescription>
            </div>
            {pdfUrl && (
                <Button asChild variant="outline" size="sm" className="ml-4 flex-shrink-0">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                        <Link className="h-3.5 w-3.5" />
                        View Document
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
                <MetadataItem label="Priority Area">
                  {mandate.priority_area ? <Badge variant="secondary" className="text-xs">{mandate.priority_area}</Badge> : <span className="text-muted-foreground">Not available</span>}
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
                  <p className="text-sm leading-relaxed">
                    {mandate.ai_summary 
                      ? mandate.ai_summary 
                      : <span className="text-muted-foreground italic">AI summary for this document is not available yet.</span>}
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

              {/* Hierarchical Citations */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Citations by Programme
                </h3>
                
                {Object.keys(hierarchicalCitations).length > 0 ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(hierarchicalCitations).map(([programmeKey, programmeData]) => {
                      const totalCitations = Object.values(programmeData.entities).reduce((sum, entity) => sum + entity.total, 0);
                      
                      return (
                        <div key={programmeKey}>
                          {/* Programme Level */}
                          <div className="flex items-center gap-2 py-1">
                            <div className="w-1.5 h-1.5 bg-gray-700 rounded-full flex-shrink-0"></div>
                            <span className="font-medium text-gray-900 flex-1">{programmeKey}</span>
                            <span className="text-xs text-gray-500 font-medium">{totalCitations}</span>
                          </div>
                          
                          {/* Entity Level */}
                          {Object.entries(programmeData.entities).map(([entityName, entityData]) => {
                            // Filter out meaningless subprogrammes
                            const meaningfulSubprogrammes = Object.entries(entityData.subprogrammes).filter(([subprogramme]) => {
                              const lower = subprogramme.toLowerCase();
                              return !lower.includes('all subprogrammes') && 
                                     !lower.includes('no subprogramme') &&
                                     lower !== 'no subprogramme' &&
                                     lower !== 'all subprogrammes';
                            });
                            
                            return (
                              <div key={entityName}>
                                <div className="flex items-center gap-2 py-0.5 ml-4">
                                  <div className="w-1 h-1 bg-gray-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-gray-800 flex-1">{entityName}</span>
                                  <span className="text-xs text-gray-500 font-medium">{entityData.total}</span>
                                </div>
                                
                                {/* Subprogramme Level - only show meaningful ones */}
                                {meaningfulSubprogrammes.map(([subprogramme, count]) => (
                                  <div key={subprogramme} className="flex items-center gap-2 py-0.5 ml-8">
                                    <div className="w-0.5 h-0.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs text-gray-600 flex-1">{subprogramme}</span>
                                    <span className="text-xs text-gray-500">{count}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No citation information available
                  </div>
                )}
              </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}