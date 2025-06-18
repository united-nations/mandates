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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  
  const dialogStyle: React.CSSProperties = {};
  if (parentContext) {
    const { scrollY, viewportHeight, iframeTop } = parentContext;
    // Calculate the center of the parent's viewport
    const viewportCenter = scrollY + viewportHeight / 2;
    // Position the dialog's top edge at that center, relative to the iframe's top.
    const topInIframe = viewportCenter - iframeTop;

    dialogStyle.position = 'absolute';
    dialogStyle.top = `${topInIframe}px`;
    // We want to be centered horizontally, and since top is now the center, also centered vertically.
    dialogStyle.transform = 'translate(-50%, -50%)';
  }

  const displaySymbol = mandate.full_document_symbol || mandate.symbol;
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setIsPdfVisible(false);
        }
    }}>
      <DialogContent className="max-w-4xl w-full p-0 light" style={parentContext ? dialogStyle : undefined}>
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-2xl font-bold">{mandate.title || 'Mandate Details'}</DialogTitle>
              <DialogDescription>
                {displaySymbol}
              </DialogDescription>
            </DialogHeader>
            
            {pdfUrl && (
              <Accordion type="single" collapsible onValueChange={(value) => setIsPdfVisible(value === 'pdf-viewer')}>
                  <AccordionItem value="pdf-viewer">
                      <AccordionTrigger>View Document</AccordionTrigger>
                      <AccordionContent>
                          {isPdfVisible ? (
                              <iframe
                                  src={pdfUrl}
                                  className="w-full h-[80vh]"
                                  title={`PDF viewer for ${mandate.full_document_symbol}`}
                              />
                          ) : (
                              <p>Loading PDF...</p>
                          )}
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Summary</h3>
                  <p className="text-muted-foreground italic">
                    (AI summary of the mandate will be displayed here. This is a placeholder.)
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
                  </p>
                </div>

                {mandate.operative_paragraphs && mandate.operative_paragraphs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Operative Paragraphs</h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-2">
                        {mandate.operative_paragraphs.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Symbol</span>
                      <span>{mandate.symbol}</span>
                    </div>
                    {mandate.body && (
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Issuing Body</span>
                        <span>{mandate.body}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Citing Entities ({mandate.entities.length})</h3>
                  <div className="flex flex-wrap gap-1">
                    {mandate.entities.filter(e => e).map(entity => (
                      <Badge key={entity} variant="secondary">{entity}</Badge>
                    ))}
                  </div>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold mb-2">Priority Area</h3>
                  <Badge variant="default">{mandate.priority_area}</Badge>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 