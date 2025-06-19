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
import { FileText, Building, Calendar, Link, Users, FileCheck, List } from 'lucide-react';
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
            <div>
                <p className="text-sm font-medium text-muted-foreground">Mandate Document</p>
                <DialogTitle className="text-2xl font-bold mt-1">{mandate.title || 'Mandate Details'}</DialogTitle>
                <DialogDescription className="mt-1">
                    {displaySymbol}
                </DialogDescription>
            </div>
            {pdfUrl && (
                <div className="relative flex-shrink-0" style={{ top: '-0.5rem' }}>
                    <Button asChild variant="link" className="p-0 h-auto ml-4 mr-8">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm">
                            <Link className="h-4 w-4" />
                            View Document
                        </a>
                    </Button>
                </div>
            )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-grow mt-3 overflow-y-auto">
            <div className="space-y-4 pr-2">
              {/* Metadata Row - Compact */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Organ
                  </p>
                  <div className="text-sm">
                    {mandate.body ? <Badge variant="secondary" className="text-xs">{mandate.body}</Badge> : <Badge variant="outline" className="text-xs">Not available</Badge>}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Document Type
                  </p>
                  <div className="text-sm">
                    {mandate.collection_level3 && mandate.collection_level3.length > 0 ? <Badge variant="secondary" className="text-xs">{mandate.collection_level3[0]}</Badge> : <Badge variant="outline" className="text-xs">Not available</Badge>}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Year
                  </p>
                  <div className="text-sm">
                    {mandate.year ? <Badge variant="secondary" className="text-xs">{mandate.year}</Badge> : <Badge variant="outline" className="text-xs">Not available</Badge>}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileCheck className="h-3 w-3" />
                    Budget Document
                  </p>
                  <div className="text-sm">
                    {mandate.origin_document ? <Badge variant="secondary" className="text-xs">{mandate.origin_document}</Badge> : <Badge variant="outline" className="text-xs">Not Available</Badge>}
                  </div>
                </div>
              </div>

                             {/* AI Summary */}
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                   <FileText className="h-5 w-5" />
                   Document Summary (GenAI)
                 </h3>
                 <div className="p-3 bg-muted/30 rounded-lg">
                   <p className="text-sm text-muted-foreground italic">
                     (AI summary of the mandate will be displayed here. This is a placeholder.)
                     Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
                   </p>
                 </div>
               </div>

                             {/* Hierarchical Citations */}
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                   <List className="h-5 w-5" />
                   Citations by Programme & Entity ({mandate.citation_info?.length || 0} total)
                 </h3>
                 
                                  {Object.keys(hierarchicalCitations).length > 0 ? (
                   <div className="space-y-2">
                     {Object.entries(hierarchicalCitations).map(([programmeKey, programmeData]) => {
                       const totalCitations = Object.values(programmeData.entities).reduce((sum, entity) => sum + entity.total, 0);
                       
                       return (
                         <div key={programmeKey} className="border border-gray-200 rounded-lg bg-gray-50/50">
                           {/* Programme Level */}
                           <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-200 bg-gray-100/70">
                             <div className="w-2 h-2 bg-gray-600 rounded-full flex-shrink-0"></div>
                             <span className="font-medium text-sm text-gray-900 flex-1">{programmeKey}</span>
                             <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700 border-gray-300">{totalCitations}</Badge>
                           </div>
                           
                           {/* Entity Level */}
                           <div className="px-3 py-1">
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
                                 <div key={entityName} className="py-1">
                                   <div className="flex items-center gap-2 py-1">
                                     <div className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0"></div>
                                     <span className="text-sm text-gray-800 flex-1 font-medium">{entityName}</span>
                                     <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600 border-gray-300">{entityData.total}</Badge>
                                   </div>
                                   
                                   {/* Subprogramme Level - only show meaningful ones */}
                                   {meaningfulSubprogrammes.length > 0 && (
                                     <div className="ml-6 mt-1 space-y-1">
                                       {meaningfulSubprogrammes.map(([subprogramme, count]) => (
                                         <div key={subprogramme} className="flex items-center gap-2 py-0.5">
                                           <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                                           <span className="text-xs text-gray-600 flex-1">{subprogramme}</span>
                                           <span className="text-xs text-gray-500 font-medium">{count}</span>
                                         </div>
                                       ))}
                                     </div>
                                   )}
                                 </div>
                               );
                             })}
                           </div>
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