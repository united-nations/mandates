'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
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

export function MandateDetails({ mandate, open, onOpenChange, parentContext }: MandateDetailsProps) {
  const [isPdfVisible, setIsPdfVisible] = useState(false);

  if (!mandate) {
    return null;
  }
  
  const validEntities = mandate.entities ? mandate.entities.filter(e => e && e.trim()) : [];

  const dialogStyle: React.CSSProperties = {};
  if (parentContext) {
    const { scrollY, iframeTop } = parentContext;
    dialogStyle.position = 'absolute';
    dialogStyle.top = `${scrollY + 20 - iframeTop}px`;
    dialogStyle.left = '50%';
    dialogStyle.transform = 'translateX(-50%)';
  }

  const displaySymbol = mandate.full_document_symbol || mandate.symbol_x;
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full light flex flex-col max-h-[90vh] p-6" style={parentContext ? dialogStyle : undefined}>
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
        <ScrollArea className="flex-grow mt-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Column 1: AI Summary */}
              <div className="space-y-4 md:col-span-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Document Summary (GenAI)</h3>
                <p className="text-sm text-muted-foreground italic">
                    (AI summary of the mandate will be displayed here. This is a placeholder.)
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
                </p>
              </div>

              {/* Column 2: Metadata */}
              <div className="space-y-4 md:col-span-3">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Building className="h-5 w-5" />Organ</h3>
                  <div className="flex flex-wrap gap-2">
                    {mandate.body ? <Badge variant="secondary">{mandate.body}</Badge> : <Badge variant="outline">Not available</Badge>}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5" />Document Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {mandate.collection_level3 && mandate.collection_level3.length > 0 ? <Badge variant="secondary">{mandate.collection_level3[0]}</Badge> : <Badge variant="outline">Not available</Badge>}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Calendar className="h-5 w-5" />Year</h3>
                  <div className="flex flex-wrap gap-2">
                    {mandate.year ? <Badge variant="secondary">{mandate.year}</Badge> : <Badge variant="outline">Not available</Badge>}
                  </div>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileCheck className="h-5 w-5" />Budget Document</h3>
                  <div className="flex flex-wrap gap-2">
                    {mandate.origin_document ? <Badge variant="secondary">{mandate.origin_document}</Badge> : <Badge variant="outline">Not Available</Badge>}
                  </div>
                </div>
              </div>

              {/* Column 3: Entities */}
              <div className="space-y-4 md:col-span-5">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Users className="h-5 w-5" />List of Entities ({validEntities.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {validEntities.length > 0 ? (
                      validEntities.map((entity, index) => (
                        <Badge key={index}>{entity}</Badge>
                      ))
                    ) : (
                      <Badge variant="outline">No entities listed</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}